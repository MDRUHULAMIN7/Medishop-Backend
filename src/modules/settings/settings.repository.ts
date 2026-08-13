import { Types } from 'mongoose';
import { SiteSettingsModel } from './settings.model';
import { PublicSiteSettings, SiteSettingsDocumentData, UpdateSiteSettingsInput } from './settings.types';
import { deleteRedisCacheKeys, getRedisCache, setRedisCache } from '../../utils/redisCache';

const PUBLIC_SETTINGS_CACHE_KEY = 'settings:public';
const CACHE_TTL_SECONDS = 86400; // 24 Hours TTL

const toPublicSettings = (doc: SiteSettingsDocumentData): PublicSiteSettings => ({
  general: doc.general,
  branding: doc.branding,
  shipping: doc.shipping,
  seo: doc.seo,
  maintenanceMode: doc.maintenanceMode,
  updatedAt: doc.updatedAt,
});

export class SettingsRepository {
  /**
   * Get public settings with aggressive Redis caching
   */
  async getPublicSettings(): Promise<PublicSiteSettings> {
    const cached = await getRedisCache<PublicSiteSettings>(PUBLIC_SETTINGS_CACHE_KEY);
    if (cached) return cached;

    let settingsDoc = await SiteSettingsModel.findOne().lean();
    if (!settingsDoc) {
      const created = await SiteSettingsModel.create({});
      settingsDoc = created.toObject();
    }

    const publicSettings = toPublicSettings(settingsDoc as any);
    await setRedisCache(PUBLIC_SETTINGS_CACHE_KEY, publicSettings, CACHE_TTL_SECONDS);

    return publicSettings;
  }

  /**
   * Get full settings document (Admin only)
   */
  async getFullSettings(): Promise<SiteSettingsDocumentData> {
    let settingsDoc = await SiteSettingsModel.findOne().lean();
    if (!settingsDoc) {
      const created = await SiteSettingsModel.create({});
      settingsDoc = created.toObject();
    }
    return settingsDoc as any;
  }

  /**
   * Upsert settings document and invalidate Redis cache key
   */
  async updateSettings(
    input: UpdateSiteSettingsInput,
    adminId?: string
  ): Promise<{ settings: SiteSettingsDocumentData; cacheWarning: boolean }> {
    let current = await SiteSettingsModel.findOne();
    if (!current) {
      current = new SiteSettingsModel({});
    }

    if (input.general) {
      current.general = { ...current.general, ...input.general };
    }
    if (input.branding) {
      current.branding = { ...current.branding, ...input.branding };
    }
    if (input.payment) {
      current.payment = { ...current.payment, ...input.payment };
    }
    if (input.shipping) {
      current.shipping = { ...current.shipping, ...input.shipping };
    }
    if (input.seo) {
      current.seo = { ...current.seo, ...input.seo };
    }
    if (input.legal) {
      current.legal = { ...current.legal, ...input.legal };
    }
    if (typeof input.maintenanceMode === 'boolean') {
      current.maintenanceMode = input.maintenanceMode;
    }
    if (adminId) {
      current.updatedBy = new Types.ObjectId(adminId);
    }

    await current.save();
    const updatedDoc = current.toObject();

    let cacheWarning = false;
    try {
      await deleteRedisCacheKeys(PUBLIC_SETTINGS_CACHE_KEY);
      // Re-prime Redis cache immediately
      const publicSettings = toPublicSettings(updatedDoc as any);
      await setRedisCache(PUBLIC_SETTINGS_CACHE_KEY, publicSettings, CACHE_TTL_SECONDS);
    } catch (err) {
      console.error('Failed to invalidate/re-prime Redis settings cache:', err);
      cacheWarning = true;
    }

    return {
      settings: updatedDoc as any,
      cacheWarning,
    };
  }
}

export const settingsRepository = new SettingsRepository();
