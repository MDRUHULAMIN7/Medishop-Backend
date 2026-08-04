import { FilterQuery, Types } from 'mongoose';
import { PrescriptionModel } from './prescription.model';
import {
  CreatePrescriptionInput,
  PrescriptionFilterQuery,
  PrescriptionResponse,
  ReviewPrescriptionInput,
} from './prescription.types';

const toResponse = (prescription: any): PrescriptionResponse => {
  const userObj =
    prescription.user && typeof prescription.user === 'object'
      ? {
          id: prescription.user._id.toString(),
          name: prescription.user.name,
          phone: prescription.user.phone,
          email: prescription.user.email,
        }
      : { id: prescription.user?.toString() || '', name: '' };

  const reviewerObj =
    prescription.reviewedBy && typeof prescription.reviewedBy === 'object'
      ? {
          id: prescription.reviewedBy._id.toString(),
          name: prescription.reviewedBy.name,
        }
      : prescription.reviewedBy
      ? { id: prescription.reviewedBy.toString(), name: '' }
      : null;

  return {
    id: prescription._id.toString(),
    user: userObj,
    images: Array.isArray(prescription.images) ? prescription.images : [],
    note: prescription.note,
    status: prescription.status,
    reviewedBy: reviewerObj,
    rejectionReason: prescription.rejectionReason,
    reviewedAt: prescription.reviewedAt ? new Date(prescription.reviewedAt) : null,
    createdAt: prescription.createdAt,
    updatedAt: prescription.updatedAt,
  };
};

export class PrescriptionRepository {
  async findWithFilters(query: PrescriptionFilterQuery) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<any> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const [prescriptions, total] = await Promise.all([
      PrescriptionModel.find(filter)
        .populate('user', 'name phone email')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PrescriptionModel.countDocuments(filter),
    ]);

    return {
      prescriptions: prescriptions.map(toResponse),
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findByUserId(userId: string) {
    const prescriptions = await PrescriptionModel.find({ user: new Types.ObjectId(userId) })
      .populate('user', 'name phone email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return prescriptions.map(toResponse);
  }

  async findById(id: string) {
    const prescription = await PrescriptionModel.findById(id)
      .populate('user', 'name phone email')
      .populate('reviewedBy', 'name')
      .lean();

    return prescription ? toResponse(prescription) : null;
  }

  async findRawById(id: string) {
    return PrescriptionModel.findById(id);
  }

  async create(userId: string, data: CreatePrescriptionInput) {
    const created = await PrescriptionModel.create({
      user: new Types.ObjectId(userId),
      images: data.images || [],
      note: data.note,
      status: 'pending',
    });

    const populated = await created.populate([
      { path: 'user', select: 'name phone email' },
    ]);

    return toResponse(populated.toObject());
  }

  async review(id: string, reviewerId: string, data: ReviewPrescriptionInput) {
    const updated = await PrescriptionModel.findByIdAndUpdate(
      id,
      {
        status: data.status,
        reviewedBy: new Types.ObjectId(reviewerId),
        reviewedAt: new Date(),
        ...(data.status === 'rejected' && { rejectionReason: data.rejectionReason }),
      },
      { new: true, runValidators: true }
    )
      .populate('user', 'name phone email')
      .populate('reviewedBy', 'name')
      .lean();

    return updated ? toResponse(updated) : null;
  }
}

export const prescriptionRepository = new PrescriptionRepository();
