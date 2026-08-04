import { z } from 'zod';
import { COURIER_MAX_WEIGHT_KG, COURIER_PROVIDER_NAMES } from './courier.constants';

export const courierPartySchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  district: z.string().min(2),
  thana: z.string().min(2),
  addressLine: z.string().min(5),
  area: z.string().min(2).optional(),
  postalCode: z.string().min(3).optional(),
});

export const calculateCourierFeeSchema = z.object({
  destinationDistrict: z.string().min(2),
  destinationThana: z.string().min(2).optional(),
  serviceType: z.enum(['standard', 'express']).default('standard'),
  weightKg: z.coerce.number().positive().max(COURIER_MAX_WEIGHT_KG).default(1),
  parcelValue: z.coerce.number().nonnegative().optional(),
  codAmount: z.coerce.number().nonnegative().optional(),
});

export const createCourierShipmentSchema = z.object({
  trackingNumber: z.string().min(6).optional(),
  orderId: z.string().min(1).optional(),
  referenceId: z.string().min(1).optional(),
  destinationDistrict: z.string().min(2),
  destinationThana: z.string().min(2).optional(),
  serviceType: z.enum(['standard', 'express']).default('standard'),
  weightKg: z.coerce.number().positive().max(COURIER_MAX_WEIGHT_KG).default(1),
  parcelValue: z.coerce.number().nonnegative().optional(),
  codAmount: z.coerce.number().nonnegative().default(0),
  parcelDescription: z.string().min(3),
  sender: courierPartySchema,
  recipient: courierPartySchema,
  pickupAddress: courierPartySchema.optional(),
  specialInstructions: z.string().max(500).optional(),
});

export const trackCourierShipmentParamsSchema = z.object({
  trackingNumber: z.string().min(6),
});

export const cancelCourierShipmentParamsSchema = z.object({
  trackingNumber: z.string().min(6),
});

export const cancelCourierShipmentSchema = z.object({
  reason: z.string().min(3).max(250).optional(),
});

export const requestCourierPickupSchema = z.object({
  trackingNumber: z.string().min(6),
  pickupAddress: courierPartySchema,
  pickupWindowHours: z.coerce.number().positive().max(24).default(4),
  notes: z.string().max(250).optional(),
});

export const courierProviderQuerySchema = z.object({
  provider: z.enum(COURIER_PROVIDER_NAMES).optional(),
});

export const courierZoneQuerySchema = z.object({
  district: z.string().min(2).optional(),
});
