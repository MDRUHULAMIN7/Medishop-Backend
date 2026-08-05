import { emitToAdmins } from '../../socket';
import { AppError, NotFoundError, ValidationError } from '../../utils/AppError';
import { notificationService } from '../notification/notification.service';
import { prescriptionRepository } from './prescription.repository';
import { CreatePrescriptionInput, PrescriptionFilterQuery, ReviewPrescriptionInput } from './prescription.types';

export class PrescriptionService {
  async uploadPrescription(userId: string, input: CreatePrescriptionInput) {
    if (!input.images || input.images.length === 0) {
      throw new ValidationError('At least one prescription image is required');
    }

    const prescription = await prescriptionRepository.create(userId, input);

    // Create & Persist Notification Feed Item
    await notificationService.createAndSendNotification({
      userId,
      type: 'prescription_submitted',
      title: 'Prescription Submitted',
      message: 'Your prescription has been submitted and is currently being reviewed by our licensed pharmacist.',
      data: { prescriptionId: prescription.id },
    });

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

    // Create & Persist Notification Feed Item (Exit Criteria)
    const isApproved = reviewed.status === 'approved';
    await notificationService.createAndSendNotification({
      userId: reviewed.user.id,
      type: isApproved ? 'prescription_approved' : 'prescription_rejected',
      title: isApproved ? 'Prescription Approved' : 'Prescription Rejected',
      message: isApproved
        ? 'Your uploaded prescription has been verified and approved by our pharmacist! You can now proceed to checkout.'
        : `Your prescription was rejected: ${reviewed.rejectionReason}`,
      data: {
        prescriptionId: reviewed.id,
        status: reviewed.status,
        rejectionReason: reviewed.rejectionReason,
      },
    });

    return reviewed;
  }
}

export const prescriptionService = new PrescriptionService();
