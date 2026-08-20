import { adminRepository } from './admin.repository';
import { AdminReportFilters } from './admin.types';

export class AdminService {
  async getDashboardSummary() {
    return adminRepository.getDashboardSummary();
  }

  async getSalesSummary(filters?: AdminReportFilters) {
    return adminRepository.getSalesSummary(filters);
  }

  async getOrderStatusBreakdown() {
    return adminRepository.getOrderStatusBreakdown();
  }

  async getLowStockReport(threshold = 10) {
    return adminRepository.getLowStockReport(threshold);
  }

  async getAnalytics(filters: AdminReportFilters = {}) {
    return adminRepository.getAnalytics(filters);
  }

  async getProductInsights(productId: string) {
    return adminRepository.getProductInsights(productId);
  }
}

export const adminService = new AdminService();
