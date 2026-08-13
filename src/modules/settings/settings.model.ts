import { Schema, model } from 'mongoose';
import { SiteSettingsDocumentData } from './settings.types';

const siteSettingsSchema = new Schema<SiteSettingsDocumentData>(
  {
    general: {
      siteName: { type: String, default: 'mediShop' },
      tagline: { type: String, default: 'Online Pharmacy & Healthcare BD' },
      logoLight: { type: String, default: '/images/logo.png' },
      logoDark: { type: String, default: '/images/logo.png' },
      favicon: { type: String, default: '/favicon.ico' },
      contactEmail: { type: String, default: 'support@medishop.com.bd' },
      contactPhone: { type: String, default: '+880 1742-643763' },
      address: { type: String, default: 'House 42, Road 11, Banani, Dhaka-1213, Bangladesh' },
    },
    branding: {
      primaryColor: { type: String, default: '#1D4ED8' },
      accentColor: { type: String, default: '#F59E0B' },
      fontHeading: { type: String, default: 'Inter' },
      fontBody: { type: String, default: 'Inter' },
    },
    payment: {
      codEnabled: { type: Boolean, default: true },
      minOrderForCod: { type: Number, default: 0 },
      enabledGateways: { type: [String], default: ['cod', 'bkash', 'nagad', 'card'] },
    },
    shipping: {
      freeShippingThreshold: { type: Number, default: 1000 },
      defaultDeliveryChargeInsideDhaka: { type: Number, default: 60 },
      defaultDeliveryChargeOutsideDhaka: { type: Number, default: 120 },
      estimatedDeliveryDays: { type: String, default: '2 - 4 working days' },
    },
    seo: {
      defaultMetaTitle: { type: String, default: 'mediShop — Online Pharmacy BD' },
      defaultMetaDescription: {
        type: String,
        default: 'Buy authentic medicines, prescription items, & healthcare products online in Bangladesh.',
      },
      ogImage: { type: String, default: '/images/og-banner.png' },
      googleAnalyticsId: { type: String, default: '' },
      facebookPixelId: { type: String, default: '' },
    },
    legal: {
      termsContent: {
        type: String,
        default: 'Welcome to mediShop. By using our website, you agree to our terms and conditions.',
      },
      privacyContent: {
        type: String,
        default: 'We protect your personal data and health information with strict confidentiality.',
      },
      refundPolicyContent: {
        type: String,
        default: 'Returns are accepted within 7 days for unopened sealed packages.',
      },
    },
    maintenanceMode: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
);

export const SiteSettingsModel = model<SiteSettingsDocumentData>('SiteSettings', siteSettingsSchema);
