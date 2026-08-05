import { adminRepository } from './admin.repository';

export class AdminService {
  async getDashboardSummary() {
    return adminRepository.getDashboardSummary();
  }

  async getSalesSummary() {
    return adminRepository.getSalesSummary();
  }

  async getOrderStatusBreakdown() {
    return adminRepository.getOrderStatusBreakdown();
  }

  async getLowStockReport(threshold = 10) {
    return adminRepository.getLowStockReport(threshold);
  }
}

export const adminService = new AdminService();
