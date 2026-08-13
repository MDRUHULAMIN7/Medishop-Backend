import { Types } from 'mongoose';

export interface GeneralSettings {
  siteName: string;
  tagline?: string;
  logoLight: string;
  logoDark?: string;
  favicon: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface BrandingSettings {
  primaryColor: string; // e.g. '#1D4ED8'
  accentColor: string;  // e.g. '#F59E0B'
  fontHeading?: string;
  fontBody?: string;
}

export interface PaymentSettings {
  codEnabled: boolean;
  minOrderForCod?: number;
  enabledGateways: string[]; // e.g. ['cod', 'bkash', 'nagad', 'card']
}

export interface ShippingSettings {
  freeShippingThreshold?: number;
  defaultDeliveryChargeInsideDhaka: number;
  defaultDeliveryChargeOutsideDhaka: number;
  estimatedDeliveryDays: string;
}

export interface SEOSettings {
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  ogImage?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

export interface LegalSettings {
  termsContent: string;
  privacyContent: string;
  refundPolicyContent: string;
}

export interface SiteSettingsDocumentData {
  general: GeneralSettings;
  branding: BrandingSettings;
  payment: PaymentSettings;
  shipping: ShippingSettings;
  seo: SEOSettings;
  legal: LegalSettings;
  maintenanceMode: boolean;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PublicSiteSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  shipping: ShippingSettings;
  seo: SEOSettings;
  maintenanceMode: boolean;
  updatedAt?: Date;
}

export interface UpdateSiteSettingsInput {
  general?: Partial<GeneralSettings>;
  branding?: Partial<BrandingSettings>;
  payment?: Partial<PaymentSettings>;
  shipping?: Partial<ShippingSettings>;
  seo?: Partial<SEOSettings>;
  legal?: Partial<LegalSettings>;
  maintenanceMode?: boolean;
}
