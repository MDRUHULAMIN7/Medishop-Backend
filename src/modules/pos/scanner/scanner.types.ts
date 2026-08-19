import { Types } from 'mongoose';

export type ScannerSessionStatus = 'created' | 'connected' | 'closed' | 'expired';

export interface IScannerSession {
  _id: Types.ObjectId;
  sessionId: string;
  posUserId: Types.ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  status: ScannerSessionStatus;
  connectedAt?: Date;
  lastSeenAt?: Date;
}

export interface ScannerSessionResponse {
  sessionId: string;
  scannerUrl?: string;
  expiresAt: Date;
  status: ScannerSessionStatus;
  connectedAt?: Date;
}
