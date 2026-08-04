import { NotFoundError, ValidationError } from '../../utils/AppError';
import { DEFAULT_COURIER_ZONES, COURIER_DEFAULT_PICKUP_WINDOW_HOURS } from './courier.constants';
import { courierRepository } from './courier.repository';
import {
  createDefaultPickupRequest,
  generateCourierTrackingNumber,
  resolveCourierProvider,
} from './courier.providers';
import {
  CalculateCourierFeeInput,
  CreateCourierShipmentInput,
  CourierPickupRequest,
  CourierProviderStatus,
  CourierShipmentEvent,
  CourierShipmentRecord,
} from './courier.types';

const courierProvider = resolveCourierProvider();

const createTimelineEvent = (status: CourierShipmentEvent['status'], note: string): CourierShipmentEvent => ({
  status,
  note,
  occurredAt: new Date().toISOString(),
});

const appendTimelineEvent = (
  record: CourierShipmentRecord,
  status: CourierShipmentEvent['status'],
  note: string
) => {
  return [...record.timeline, createTimelineEvent(status, note)];
};

export class CourierService {
  getProviderStatus(): CourierProviderStatus {
    return courierProvider.getStatus();
  }

  getZones(district?: string) {
    if (!district) {
      return DEFAULT_COURIER_ZONES;
    }

    const normalizedDistrict = district.trim().toLowerCase();
    return DEFAULT_COURIER_ZONES.filter((zone) =>
      zone.districts.some((item) => item.toLowerCase() === normalizedDistrict)
    );
  }

  async calculateDeliveryFee(input: CalculateCourierFeeInput) {
    if (!input.destinationDistrict?.trim()) {
      throw new ValidationError('destinationDistrict is required');
    }

    const quote = await courierProvider.calculateDeliveryFee({
      ...input,
      weightKg: input.weightKg ?? 1,
      serviceType: input.serviceType ?? 'standard',
    });

    return {
      providerStatus: this.getProviderStatus(),
      quote,
    };
  }

  async createShipment(input: CreateCourierShipmentInput) {
    const trackingNumber = input.trackingNumber ?? generateCourierTrackingNumber();
    const fee = await courierProvider.calculateDeliveryFee({
      destinationDistrict: input.destinationDistrict,
      destinationThana: input.destinationThana,
      serviceType: input.serviceType ?? 'standard',
      weightKg: input.weightKg ?? 1,
      parcelValue: input.parcelValue ?? 0,
      codAmount: input.codAmount ?? 0,
    });

    const providerResult = await courierProvider.createShipment(input, fee, trackingNumber);
    const pickupAddress = input.pickupAddress ?? input.sender;
    const now = new Date().toISOString();

    const record: CourierShipmentRecord = {
      trackingNumber,
      orderId: input.orderId,
      referenceId: input.referenceId,
      provider: courierProvider.name,
      providerReferenceId: providerResult.providerReferenceId,
      pickupReferenceId: providerResult.pickupReferenceId,
      status: providerResult.status,
      serviceType: input.serviceType ?? 'standard',
      zoneCode: fee.zoneCode,
      zoneNameEn: fee.zoneNameEn,
      zoneNameBn: fee.zoneNameBn,
      parcelDescription: input.parcelDescription,
      sender: input.sender,
      recipient: input.recipient,
      pickupAddress,
      specialInstructions: input.specialInstructions,
      fee,
      codAmount: input.codAmount ?? 0,
      weightKg: input.weightKg ?? 1,
      timeline: [
        createTimelineEvent('draft', 'Shipment request created.'),
        createTimelineEvent(providerResult.status, providerResult.remark ?? 'Courier shipment created.'),
      ],
      createdAt: now,
      updatedAt: now,
    };

    courierRepository.saveShipment(record);

    return {
      providerStatus: this.getProviderStatus(),
      shipment: record,
    };
  }

  async trackShipment(trackingNumber: string) {
    const shipment = courierRepository.findShipmentByTrackingNumber(trackingNumber);

    if (!shipment) {
      throw new NotFoundError(`Courier shipment ${trackingNumber} not found`, 'COURIER_SHIPMENT_NOT_FOUND');
    }

    if (shipment.provider === 'pathao' && this.getProviderStatus().isConfigured) {
      const liveSnapshot = await courierProvider.trackShipment(trackingNumber);
      if (liveSnapshot.status !== shipment.status || liveSnapshot.providerReferenceId) {
        const updated = courierRepository.updateShipment(trackingNumber, {
          status: liveSnapshot.status,
          providerReferenceId: liveSnapshot.providerReferenceId ?? shipment.providerReferenceId,
          timeline: appendTimelineEvent(
            shipment,
            liveSnapshot.status,
            liveSnapshot.remark ?? 'Live tracking update received.'
          ),
        });

        if (updated) {
          return {
            providerStatus: this.getProviderStatus(),
            shipment: updated,
          };
        }
      }
    }

    return {
      providerStatus: this.getProviderStatus(),
      shipment,
    };
  }

  async cancelShipment(trackingNumber: string, reason?: string) {
    const shipment = courierRepository.findShipmentByTrackingNumber(trackingNumber);

    if (!shipment) {
      throw new NotFoundError(`Courier shipment ${trackingNumber} not found`, 'COURIER_SHIPMENT_NOT_FOUND');
    }

    if (shipment.status === 'delivered') {
      throw new ValidationError('Delivered shipments cannot be cancelled.');
    }

    const providerResult = await courierProvider.cancelShipment(trackingNumber, reason);

    const updated = courierRepository.updateShipment(trackingNumber, {
      status: 'cancelled',
      cancellationReason: reason ?? providerResult.remark,
      providerReferenceId: providerResult.providerReferenceId ?? shipment.providerReferenceId,
      timeline: appendTimelineEvent(
        shipment,
        'cancelled',
        providerResult.remark ?? reason ?? 'Shipment cancelled.'
      ),
    });

    if (!updated) {
      throw new NotFoundError(`Courier shipment ${trackingNumber} not found`, 'COURIER_SHIPMENT_NOT_FOUND');
    }

    return {
      providerStatus: this.getProviderStatus(),
      shipment: updated,
    };
  }

  async requestPickup(input: CourierPickupRequest) {
    const shipment = courierRepository.findShipmentByTrackingNumber(input.trackingNumber);

    if (!shipment) {
      throw new NotFoundError(`Courier shipment ${input.trackingNumber} not found`, 'COURIER_SHIPMENT_NOT_FOUND');
    }

    const pickupRequest = input.pickupReferenceId
      ? input
      : createDefaultPickupRequest(input.trackingNumber, input.pickupAddress, shipment.provider);

    const scheduledAt =
      input.scheduledAt ??
      new Date(Date.now() + COURIER_DEFAULT_PICKUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const finalPickupRequest: CourierPickupRequest = {
      ...pickupRequest,
      pickupReferenceId: pickupRequest.pickupReferenceId,
      pickupWindowHours: input.pickupWindowHours ?? COURIER_DEFAULT_PICKUP_WINDOW_HOURS,
      notes: input.notes,
      scheduledAt,
    };

    courierRepository.savePickupRequest(finalPickupRequest);

    const providerResult = await courierProvider.requestPickup(finalPickupRequest);

    const updated = courierRepository.updateShipment(input.trackingNumber, {
      status: 'pending_pickup',
      pickupReferenceId: providerResult.pickupReferenceId,
      timeline: appendTimelineEvent(
        shipment,
        'pending_pickup',
        providerResult.remark ?? 'Pickup request submitted.'
      ),
    });

    return {
      providerStatus: this.getProviderStatus(),
      pickupRequest: finalPickupRequest,
      shipment: updated ?? shipment,
    };
  }

  getStoredShipments() {
    return courierRepository.listShipments();
  }
}

export const courierService = new CourierService();
