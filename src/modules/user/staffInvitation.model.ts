import { Schema, model, models, HydratedDocument, Types } from 'mongoose';
import { ROLES } from '../../config/constants';

export type StaffInvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface IStaffInvitation {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  targetRole: string;
  status: StaffInvitationStatus;
  notes?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffInvitationSchema = new Schema<IStaffInvitation>(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientEmail: { type: String, trim: true, lowercase: true },
    recipientPhone: { type: String, trim: true },
    recipientName: { type: String, trim: true },
    targetRole: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.SALES_STAFF,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, trim: true },
    respondedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

staffInvitationSchema.index({ recipient: 1, status: 1 });
staffInvitationSchema.index({ sender: 1, createdAt: -1 });

export type StaffInvitationDocument = HydratedDocument<IStaffInvitation>;

export const StaffInvitationModel =
  models.StaffInvitation || model<IStaffInvitation>('StaffInvitation', staffInvitationSchema);
