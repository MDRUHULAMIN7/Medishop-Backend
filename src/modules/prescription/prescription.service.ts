import { emitToAdmins, emitToUser } from '../../socket';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { prescriptionRepository } from './prescription.repository';
import { CreatePrescriptionInput, PrescriptionFilterQuery, ReviewPrescriptionInput } from './prescription.types';

export class PrescriptionService {
  async uploadPrescription(userId: string, input: CreatePrescriptionInput) {
    if (!input.images || input.images.length === 0) {
      throw new ValidationError('At least one prescription image is required');
    }

    const prescription = await prescriptionRepository.create(userId, input);

    // Emit real-time socket notification to Admin / Pharmacist review queue
    emitToAdmins('prescription:submitted', {
      event: 'prescription:submitted',
      message: `New prescription submitted by ${prescription.user.name}`,
      prescription,
    });

    return prescription;
  }

  async getMyPrescriptions(userId: string) {
    return prescriptionRepository.findByUserId(userId);
  }

  async getMyPrescriptionById(userId: string, prescriptionId: string) {
    const prescription = await prescriptionRepository.findById(prescriptionId);
    if (!prescription || prescription.user.id !== userId) {
      throw new NotFoundError('Prescription not found', 'PRESCRIPTION_NOT_FOUND');
    }
    return prescription;
  }

  async getPrescriptionQueue(query: PrescriptionFilterQuery) {
    return prescriptionRepository.findWithFilters(query);
  }

  async getPrescriptionById(id: string) {
    const prescription = await prescriptionRepository.findById(id);
    if (!prescription) {
      throw new NotFoundError('Prescription not found', 'PRESCRIPTION_NOT_FOUND');
    }
    return prescription;
  }

  async reviewPrescription(id: string, reviewerId: string, input: ReviewPrescriptionInput) {
    const existing = await prescriptionRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError('Prescription not found', 'PRESCRIPTION_NOT_FOUND');
    }

    if (input.status === 'rejected' && !input.rejectionReason) {
      throw new ValidationError('Rejection reason is required when rejecting a prescription');
    }

    const reviewed = await prescriptionRepository.review(id, reviewerId, input);
    if (!reviewed) {
      throw new NotFoundError('Prescription not found', 'PRESCRIPTION_NOT_FOUND');
    }

    // Emit real-time socket notification to specific user
    emitToUser(reviewed.user.id, 'prescription:updated', {
      event: 'prescription:updated',
      status: reviewed.status,
      message:
        reviewed.status === 'approved'
          ? 'Your prescription has been approved by our pharmacist!'
          : `Your prescription was rejected: ${reviewed.rejectionReason}`,
      prescription: reviewed,
    });

    return reviewed;
  }
}

export const prescriptionService = new PrescriptionService();
