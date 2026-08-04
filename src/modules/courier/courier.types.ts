import { COURIER_PROVIDER_NAMES, COURIER_STATUSES } from './courier.constants';

export type CourierProviderName = (typeof COURIER_PROVIDER_NAMES)[number];
export type CourierShipmentStatus = (typeof COURIER_STATUSES)[number];
export type CourierServiceType = 'standard' | 'express';
export type CourierCurrency = 'BDT';

export interface CourierZone {
  code: string;
  labelEn: string;
  labelBn: string;
  districts: string[];
  baseCharge: number;
  expressCharge: number;
  estimatedDeliveryEn: string;
  estimatedDeliveryBn: string;
}

export interface CourierQuote {
  provider: CourierProviderName;
  zoneCode: string;
  zoneNameEn: string;
  zoneNameBn: string;
  serviceType: CourierServiceType;
  currency: CourierCurrency;
  baseCharge: number;
  weightCharge: number;
  codCharge: number;
  totalCharge: number;
  estimatedDeliveryEn: string;
  estimatedDeliveryBn: string;
  freeDeliveryApplied: boolean;
  remarks?: string;
}

export interface CourierParty {
  name: string;
  phone: string;
  district: string;
  thana: string;
  addressLine: string;
  area?: string;
  postalCode?: string;
}

export interface CalculateCourierFeeInput {
  destinationDistrict: string;
  destinationThana?: string;
  serviceType?: CourierServiceType;
  weightKg?: number;
  parcelValue?: number;
  codAmount?: number;
}

export interface CreateCourierShipmentInput extends CalculateCourierFeeInput {
  trackingNumber?: string;
  orderId?: string;
  referenceId?: string;
  parcelDescription: string;
  sender: CourierParty;
  recipient: CourierParty;
  pickupAddress?: CourierParty;
  specialInstructions?: string;
}

export interface CourierShipmentEvent {
  status: CourierShipmentStatus;
  note: string;
  occurredAt: string;
}

export interface CourierShipmentRecord {
  trackingNumber: string;
  orderId?: string;
  referenceId?: string;
  provider: CourierProviderName;
  providerReferenceId?: string;
  status: CourierShipmentStatus;
  serviceType: CourierServiceType;
  zoneCode: string;
  zoneNameEn: string;
  zoneNameBn: string;
  parcelDescription: string;
  sender: CourierParty;
  recipient: CourierParty;
  pickupAddress: CourierParty;
  specialInstructions?: string;
  fee: CourierQuote;
  codAmount: number;
  weightKg: number;
  timeline: CourierShipmentEvent[];
  pickupReferenceId?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourierPickupRequest {
  pickupReferenceId?: string;
  trackingNumber: string;
  provider: CourierProviderName;
  pickupAddress: CourierParty;
  pickupWindowHours: number;
  notes?: string;
  scheduledAt: string;
}

export interface CourierProviderStatus {
  provider: CourierProviderName;
  isConfigured: boolean;
  isLiveMode: boolean;
  fallbackProvider: CourierProviderName;
  missingCredentials: string[];
  readyForProduction: boolean;
}

export interface CourierProvider {
  readonly name: CourierProviderName;
  getStatus(): CourierProviderStatus;
  calculateDeliveryFee(input: CalculateCourierFeeInput): Promise<CourierQuote>;
  createShipment(
    input: CreateCourierShipmentInput,
    fee: CourierQuote,
    trackingNumber: string
  ): Promise<{
    providerReferenceId: string;
    pickupReferenceId?: string;
    status: CourierShipmentStatus;
    remark?: string;
  }>;
  trackShipment(trackingNumber: string): Promise<{
    providerReferenceId?: string;
    status: CourierShipmentStatus;
    remark?: string;
  }>;
  cancelShipment(trackingNumber: string, reason?: string): Promise<{
    providerReferenceId?: string;
    status: CourierShipmentStatus;
    remark?: string;
  }>;
  requestPickup(input: CourierPickupRequest): Promise<{
    pickupReferenceId: string;
    status: string;
    scheduledAt: string;
    remark?: string;
  }>;
}
