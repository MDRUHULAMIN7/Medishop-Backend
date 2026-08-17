import { Types } from 'mongoose';

export interface DynamicPaymentMethod {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  accountNumber?: string;
  instructionsBn?: string;
  instructionsEn?: string;
  icon?: string;
  logo?: string;
  isActive: boolean;
  isDefault?: boolean;
}

export interface DynamicDeliveryOption {
  id: string;
  code: string;
  nameBn: string;
  nameEn: string;
  charge: number;
  estimatedDaysBn: string;
  estimatedDaysEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  isActive: boolean;
  isDefault?: boolean;
}

export interface BannerSlide {
  id: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  badgeBn?: string;
  badgeEn?: string;
  ctaTextBn: string;
  ctaTextEn: string;
  ctaLink: string;
  isActive: boolean;
  priority: number;
  image?: string;
}

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
  methods: DynamicPaymentMethod[];
}

export interface ShippingSettings {
  freeShippingThreshold?: number;
  defaultDeliveryChargeInsideDhaka: number;
  defaultDeliveryChargeOutsideDhaka: number;
  estimatedDeliveryDays: string;
  options: DynamicDeliveryOption[];
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
  invoiceTerms?: string;
  warrantyPolicyContent?: string;
}

export interface SiteSettingsDocumentData {
  general: GeneralSettings;
  branding: BrandingSettings;
  banners: BannerSlide[];
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
  banners?: BannerSlide[];
  payment: PaymentSettings;
  shipping: ShippingSettings;
  seo: SEOSettings;
  legal?: LegalSettings;
  maintenanceMode: boolean;
  updatedAt?: Date;
}

export interface UpdateSiteSettingsInput {
  general?: Partial<GeneralSettings>;
  branding?: Partial<BrandingSettings>;
  banners?: BannerSlide[];
  payment?: Partial<PaymentSettings>;
  shipping?: Partial<ShippingSettings>;
  seo?: Partial<SEOSettings>;
  legal?: Partial<LegalSettings>;
  maintenanceMode?: boolean;
}
