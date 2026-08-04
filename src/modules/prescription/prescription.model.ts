import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IPrescription } from './prescription.types';

const prescriptionSchema = new Schema<IPrescription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    images: { type: [String], required: true, default: [] },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, trim: true },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

prescriptionSchema.index({ user: 1, status: 1 });
prescriptionSchema.index({ createdAt: -1 });

export type PrescriptionDocument = HydratedDocument<IPrescription>;

export const PrescriptionModel =
  models.Prescription || model<IPrescription>('Prescription', prescriptionSchema);
