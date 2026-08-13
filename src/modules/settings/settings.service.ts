import { settingsRepository } from './settings.repository';
import { UpdateSiteSettingsInput } from './settings.types';

export class SettingsService {
  async getPublicSettings() {
    return settingsRepository.getPublicSettings();
  }

  async getFullSettings() {
    return settingsRepository.getFullSettings();
  }

  async updateSettings(input: UpdateSiteSettingsInput, adminId?: string) {
    return settingsRepository.updateSettings(input, adminId);
  }
}

export const settingsService = new SettingsService();
