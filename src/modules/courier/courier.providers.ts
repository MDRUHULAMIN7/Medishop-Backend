import { randomBytes } from 'crypto';
import { config } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { COURIER_DEFAULT_PICKUP_WINDOW_HOURS, DEFAULT_COURIER_ZONES } from './courier.constants';
import {
  CalculateCourierFeeInput,
  CreateCourierShipmentInput,
  CourierPickupRequest,
  CourierProvider,
  CourierProviderName,
  CourierProviderStatus,
  CourierQuote,
  CourierShipmentStatus,
} from './courier.types';

interface LiveCourierConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  tokenPath: string;
  quotePath: string;
  shipmentPath: string;
  trackingPath: string;
  cancelPath: string;
  pickupPath: string;
}

const buildTrackingId = (prefix: string) => {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3)
    .toString('hex')
    .toUpperCase()}`;
};

const determineZone = (district: string) => {
  const normalizedDistrict = district.trim().toLowerCase();

  return (
    DEFAULT_COURIER_ZONES.find((zone) =>
      zone.districts.some((item) => item.toLowerCase() === normalizedDistrict)
    ) ?? DEFAULT_COURIER_ZONES[DEFAULT_COURIER_ZONES.length - 1]
  );
};

const buildQuote = (provider: CourierProviderName, input: CalculateCourierFeeInput): CourierQuote => {
  const zone = determineZone(input.destinationDistrict);
  const serviceType = input.serviceType ?? 'standard';
  const weightKg = input.weightKg ?? 1;
  const parcelValue = input.parcelValue ?? 0;
  const codAmount = input.codAmount ?? 0;
  const extraWeightKg = Math.max(0, weightKg - 1);
  const weightCharge = Math.round(extraWeightKg * 15);
  const baseCharge = serviceType === 'express' ? zone.expressCharge : zone.baseCharge;
  const codCharge = codAmount > 0 ? 20 : 0;
  const totalCharge = baseCharge + weightCharge + codCharge;

  return {
    provider,
    zoneCode: zone.code,
    zoneNameEn: zone.labelEn,
    zoneNameBn: zone.labelBn,
    serviceType,
    currency: 'BDT',
    baseCharge,
    weightCharge,
    codCharge,
    totalCharge,
    estimatedDeliveryEn: zone.estimatedDeliveryEn,
    estimatedDeliveryBn: zone.estimatedDeliveryBn,
    freeDeliveryApplied: parcelValue >= 1000 && serviceType === 'standard' && zone.code === 'dhaka_metro',
    remarks:
      parcelValue > 0
        ? `Parcel value noted at ৳${parcelValue}.`
        : 'Quote calculated from destination zone and parcel weight.',
  };
};

class MockCourierProvider implements CourierProvider {
  readonly name: CourierProviderName = 'mock';

  getStatus(): CourierProviderStatus {
    return {
      provider: this.name,
      isConfigured: true,
      isLiveMode: false,
      fallbackProvider: 'mock',
      missingCredentials: [],
      readyForProduction: false,
    };
  }

  async calculateDeliveryFee(input: CalculateCourierFeeInput): Promise<CourierQuote> {
    return buildQuote(this.name, input);
  }

  async createShipment(
    _input: CreateCourierShipmentInput,
    fee: CourierQuote,
    trackingNumber: string
  ) {
    return {
      providerReferenceId: `MOCK-${trackingNumber}`,
      pickupReferenceId: `PICKUP-${randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'pending_pickup' as CourierShipmentStatus,
      remark: `Mock shipment created locally with ৳${fee.totalCharge} courier charge.`,
    };
  }

  async trackShipment(trackingNumber: string) {
    return {
      providerReferenceId: `MOCK-${trackingNumber}`,
      status: 'in_transit' as CourierShipmentStatus,
      remark: 'Mock tracking snapshot returned from local courier repository.',
    };
  }

  async cancelShipment(trackingNumber: string, reason?: string) {
    return {
      providerReferenceId: `MOCK-${trackingNumber}`,
      status: 'cancelled' as CourierShipmentStatus,
      remark: reason ?? `Mock shipment ${trackingNumber} cancelled.`,
    };
  }

  async requestPickup(input: CourierPickupRequest) {
    return {
      pickupReferenceId: input.pickupReferenceId ?? `PICKUP-${randomBytes(4).toString('hex').toUpperCase()}`,
      status: 'scheduled',
      scheduledAt: input.scheduledAt,
      remark: 'Mock pickup requested successfully.',
    };
  }
}

class PathaoCourierProvider implements CourierProvider {
  readonly name: CourierProviderName = 'pathao';

  private accessToken: string | null = null;

  private accessTokenExpiresAt: number | null = null;

  constructor(private readonly liveConfig: LiveCourierConfig) {}

  getStatus(): CourierProviderStatus {
    const missingCredentials = this.getMissingCredentials();
    const isConfigured = missingCredentials.length === 0;

    return {
      provider: this.name,
      isConfigured,
      isLiveMode: true,
      fallbackProvider: 'mock',
      missingCredentials,
      readyForProduction: isConfigured,
    };
  }

  async calculateDeliveryFee(input: CalculateCourierFeeInput): Promise<CourierQuote> {
    await this.ensureConfigured();
    return this.requestJson<CourierQuote>(this.liveConfig.quotePath, {
      method: 'POST',
      body: JSON.stringify({
        destinationDistrict: input.destinationDistrict,
        destinationThana: input.destinationThana,
        serviceType: input.serviceType ?? 'standard',
        weightKg: input.weightKg ?? 1,
        parcelValue: input.parcelValue ?? 0,
        codAmount: input.codAmount ?? 0,
      }),
    });
  }

  async createShipment(input: CreateCourierShipmentInput, fee: CourierQuote, trackingNumber: string) {
    await this.ensureConfigured();

    return this.requestJson<{
      providerReferenceId: string;
      pickupReferenceId?: string;
      status: CourierShipmentStatus;
      remark?: string;
    }>(this.liveConfig.shipmentPath, {
      method: 'POST',
      body: JSON.stringify({
        trackingNumber,
        orderId: input.orderId,
        referenceId: input.referenceId,
        sender: input.sender,
        recipient: input.recipient,
        pickupAddress: input.pickupAddress ?? input.sender,
        parcelDescription: input.parcelDescription,
        destinationDistrict: input.destinationDistrict,
        destinationThana: input.destinationThana,
        serviceType: input.serviceType ?? 'standard',
        weightKg: input.weightKg ?? 1,
        parcelValue: input.parcelValue ?? 0,
        codAmount: input.codAmount ?? 0,
        specialInstructions: input.specialInstructions,
        fee,
        storeId: this.liveConfig.storeId,
      }),
    });
  }

  async trackShipment(trackingNumber: string) {
    await this.ensureConfigured();
    return this.requestJson<{
      providerReferenceId?: string;
      status: CourierShipmentStatus;
      remark?: string;
    }>(this.buildPath(this.liveConfig.trackingPath, trackingNumber), {
      method: 'GET',
    });
  }

  async cancelShipment(trackingNumber: string, reason?: string) {
    await this.ensureConfigured();
    return this.requestJson<{
      providerReferenceId?: string;
      status: CourierShipmentStatus;
      remark?: string;
    }>(this.buildPath(this.liveConfig.cancelPath, trackingNumber), {
      method: 'POST',
      body: JSON.stringify({
        reason,
        trackingNumber,
      }),
    });
  }

  async requestPickup(input: CourierPickupRequest) {
    await this.ensureConfigured();
    return this.requestJson<{
      pickupReferenceId: string;
      status: string;
      scheduledAt: string;
      remark?: string;
    }>(this.liveConfig.pickupPath, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  private async ensureConfigured() {
    const missingCredentials = this.getMissingCredentials();

    if (missingCredentials.length > 0) {
      throw new AppError(
        `Pathao courier is not configured. Missing: ${missingCredentials.join(', ')}`,
        503,
        'COURIER_PROVIDER_NOT_CONFIGURED'
      );
    }
  }

  private getMissingCredentials() {
    const requiredFields: Array<keyof LiveCourierConfig> = [
      'baseUrl',
      'clientId',
      'clientSecret',
      'username',
      'password',
      'storeId',
    ];

    return requiredFields.filter((field) => !this.liveConfig[field]?.trim());
  }

  private async getAccessToken() {
    if (this.accessToken && this.accessTokenExpiresAt && this.accessTokenExpiresAt > Date.now()) {
      return this.accessToken;
    }

    const response = await this.requestJson<{
      access_token?: string;
      token?: string;
      expires_in?: number;
      expiresIn?: number;
    }>(this.liveConfig.tokenPath, {
      method: 'POST',
      body: JSON.stringify({
        client_id: this.liveConfig.clientId,
        client_secret: this.liveConfig.clientSecret,
        username: this.liveConfig.username,
        password: this.liveConfig.password,
        grant_type: 'password',
      }),
      authless: true,
    });

    const token = response.access_token ?? response.token;

    if (!token) {
      throw new AppError('Pathao token response did not include an access token.', 502, 'COURIER_TOKEN_ERROR');
    }

    const expiresIn = response.expires_in ?? response.expiresIn ?? 3600;
    this.accessToken = token;
    this.accessTokenExpiresAt = Date.now() + expiresIn * 1000;
    return token;
  }

  private buildPath(pathname: string, trackingNumber: string) {
    return pathname.replace(':trackingNumber', encodeURIComponent(trackingNumber));
  }

  private async requestJson<T>(
    pathname: string,
    options: {
      method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
      body?: string;
      authless?: boolean;
    }
  ): Promise<T> {
    const url = new URL(pathname, this.liveConfig.baseUrl).toString();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!options.authless) {
      headers.Authorization = `Bearer ${await this.getAccessToken()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body,
        signal: controller.signal,
      });

      const text = await response.text();
      const parsed = text ? (JSON.parse(text) as T) : ({} as T);

      if (!response.ok) {
        throw new AppError(
          `Pathao request failed with status ${response.status}.`,
          502,
          'COURIER_PROVIDER_ERROR'
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        error instanceof Error ? error.message : 'Unknown Pathao courier error',
        502,
        'COURIER_PROVIDER_ERROR'
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const resolveCourierProvider = (): CourierProvider => {
  const pathaoProvider = new PathaoCourierProvider({
    baseUrl: config.PATHAO_BASE_URL,
    clientId: config.PATHAO_CLIENT_ID,
    clientSecret: config.PATHAO_CLIENT_SECRET,
    username: config.PATHAO_USERNAME,
    password: config.PATHAO_PASSWORD,
    storeId: config.PATHAO_STORE_ID,
    tokenPath: config.PATHAO_TOKEN_PATH,
    quotePath: config.PATHAO_QUOTE_PATH,
    shipmentPath: config.PATHAO_SHIPMENT_PATH,
    trackingPath: config.PATHAO_TRACKING_PATH,
    cancelPath: config.PATHAO_CANCEL_PATH,
    pickupPath: config.PATHAO_PICKUP_PATH,
  });

  if (config.COURIER_PROVIDER === 'pathao' && pathaoProvider.getStatus().isConfigured) {
    return pathaoProvider;
  }

  return new MockCourierProvider();
};

export const generateCourierTrackingNumber = () => buildTrackingId('MED');

export const generateCourierPickupReference = () => `PICKUP-${randomBytes(4).toString('hex').toUpperCase()}`;

export const createDefaultPickupRequest = (
  trackingNumber: string,
  pickupAddress: CourierPickupRequest['pickupAddress'],
  provider: CourierProviderName
): CourierPickupRequest => {
  return {
    pickupReferenceId: generateCourierPickupReference(),
    trackingNumber,
    provider,
    pickupAddress,
    pickupWindowHours: COURIER_DEFAULT_PICKUP_WINDOW_HOURS,
    notes: undefined,
    scheduledAt: new Date(
      Date.now() + COURIER_DEFAULT_PICKUP_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString(),
  };
};
