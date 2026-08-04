import { CourierQuote, CourierZone } from './courier.types';

export const COURIER_PROVIDER_NAMES = ['mock', 'pathao'] as const;

export const COURIER_STATUSES = [
  'draft',
  'quoted',
  'pending_pickup',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export const DEFAULT_COURIER_ZONES: CourierZone[] = [
  {
    code: 'dhaka_metro',
    labelEn: 'Dhaka Metro',
    labelBn: 'ঢাকা মেট্রো',
    districts: ['Dhaka'],
    baseCharge: 60,
    expressCharge: 100,
    estimatedDeliveryEn: '2-4 Hours',
    estimatedDeliveryBn: '২-৪ ঘণ্টা',
  },
  {
    code: 'dhaka_suburban',
    labelEn: 'Dhaka Suburban',
    labelBn: 'ঢাকা আশেপাশে',
    districts: ['Gazipur', 'Narayanganj', 'Narsingdi', 'Munshiganj', 'Manikganj'],
    baseCharge: 80,
    expressCharge: 120,
    estimatedDeliveryEn: 'Same Day / Next Day',
    estimatedDeliveryBn: 'একই দিন / পরদিন',
  },
  {
    code: 'nationwide',
    labelEn: 'Nationwide',
    labelBn: 'সারা বাংলাদেশ',
    districts: [],
    baseCharge: 120,
    expressCharge: 180,
    estimatedDeliveryEn: '1-3 Days',
    estimatedDeliveryBn: '১-৩ দিন',
  },
];

export const DEFAULT_COURIER_QUOTE: CourierQuote = {
  provider: 'mock',
  zoneCode: 'nationwide',
  zoneNameEn: 'Nationwide',
  zoneNameBn: 'সারা বাংলাদেশ',
  serviceType: 'standard',
  currency: 'BDT',
  baseCharge: 120,
  weightCharge: 0,
  codCharge: 0,
  totalCharge: 120,
  estimatedDeliveryEn: '1-3 Days',
  estimatedDeliveryBn: '১-৩ দিন',
  freeDeliveryApplied: false,
};

export const COURIER_TRACKING_PREFIX = 'MED';
export const COURIER_DEFAULT_WEIGHT_KG = 1;
export const COURIER_MAX_WEIGHT_KG = 50;
export const COURIER_DEFAULT_PICKUP_WINDOW_HOURS = 4;
