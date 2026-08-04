import { CourierPickupRequest, CourierShipmentRecord } from './courier.types';

class CourierRepository {
  private readonly shipments = new Map<string, CourierShipmentRecord>();

  private readonly pickupRequests = new Map<string, CourierPickupRequest>();

  saveShipment(record: CourierShipmentRecord): CourierShipmentRecord {
    this.shipments.set(record.trackingNumber, record);
    return record;
  }

  findShipmentByTrackingNumber(trackingNumber: string): CourierShipmentRecord | null {
    return this.shipments.get(trackingNumber) ?? null;
  }

  updateShipment(
    trackingNumber: string,
    updates: Partial<CourierShipmentRecord>
  ): CourierShipmentRecord | null {
    const current = this.shipments.get(trackingNumber);

    if (!current) {
      return null;
    }

    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.shipments.set(trackingNumber, updated);
    return updated;
  }

  listShipments(): CourierShipmentRecord[] {
    return Array.from(this.shipments.values()).sort(
      (left, right) => right.updatedAt.localeCompare(left.updatedAt)
    );
  }

  savePickupRequest(request: CourierPickupRequest): CourierPickupRequest {
    const pickupReferenceId = request.pickupReferenceId ?? request.trackingNumber;
    const normalized = {
      ...request,
      pickupReferenceId,
    };

    this.pickupRequests.set(pickupReferenceId, normalized);
    return normalized;
  }

  findPickupRequest(pickupReferenceId: string): CourierPickupRequest | null {
    return this.pickupRequests.get(pickupReferenceId) ?? null;
  }

  reset() {
    this.shipments.clear();
    this.pickupRequests.clear();
  }
}

export const courierRepository = new CourierRepository();
