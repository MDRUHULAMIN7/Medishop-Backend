import { Types } from 'mongoose';

export type PrescriptionStatus = 'pending' | 'approved' | 'rejected';

export interface IPrescription {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  images: string[];
  note?: string;
  status: PrescriptionStatus;
  reviewedBy?: Types.ObjectId | null;
  rejectionReason?: string;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrescriptionResponse {
  id: string;
  user: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  images: string[];
  note?: string;
  status: PrescriptionStatus;
  reviewedBy?: {
    id: string;
    name: string;
  } | null;
  rejectionReason?: string;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePrescriptionInput {
  images?: string[];
  note?: string;
}

export interface ReviewPrescriptionInput {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface PrescriptionFilterQuery {
  status?: PrescriptionStatus;
  page?: number;
  limit?: number;
}
