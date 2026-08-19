import { Schema, model, models, HydratedDocument } from 'mongoose';
import { IScannerSession } from './scanner.types';

const scannerSessionSchema = new Schema<IScannerSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    posUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // The raw pairing token is only sent once in the QR URL. Store a digest at rest.
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['created', 'connected', 'closed', 'expired'], default: 'created', index: true },
    connectedAt: { type: Date },
    lastSeenAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

// MongoDB removes expired sessions automatically. Service-level checks still reject them immediately.
scannerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type ScannerSessionDocument = HydratedDocument<IScannerSession>;
export const ScannerSessionModel =
  models.ScannerSession || model<IScannerSession>('ScannerSession', scannerSessionSchema);
