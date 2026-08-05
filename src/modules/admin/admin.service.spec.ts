import { describe, expect, it, vi } from 'vitest';
import { adminRepository } from './admin.repository';
import { adminService } from './admin.service';

vi.mock('./admin.repository');

describe('AdminService Unit Tests', () => {
  it('should call getDashboardSummary from adminRepository', async () => {
    const mockSummary = {
      salesSummary: {
        totalRevenue: 5000,
        totalOrders: 10,
        totalPosSales: 5,
        totalPosRevenue: 2000,
        combinedRevenue: 7000,
        todayRevenue: 1000,
        todayOrdersCount: 2,
      },
      orderStatusBreakdown: {
        pending: 2,
        processing: 3,
        shipped: 1,
        delivered: 4,
        cancelled: 0,
        total: 10,
      },
      userMetrics: {
        totalCustomers: 50,
        totalPrescriptions: 12,
        pendingPrescriptions: 3,
      },
      lowStockItemsCount: 4,
    };

    vi.mocked(adminRepository.getDashboardSummary).mockResolvedValue(mockSummary);

    const result = await adminService.getDashboardSummary();
    expect(result).toEqual(mockSummary);
    expect(adminRepository.getDashboardSummary).toHaveBeenCalledTimes(1);
  });
});
