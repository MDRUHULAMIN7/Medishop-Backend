import { OrderModel } from '../order/order.model';
import { PosSaleModel } from '../pos/pos.model';
import { PrescriptionModel } from '../prescription/prescription.model';
import { ProductModel } from '../product/product.model';
import { UserModel } from '../user/user.model';
import {
  DashboardSummaryResponse,
  LowStockItem,
  OrderStatusBreakdownResponse,
  SalesSummaryResponse,
} from './admin.types';

export class AdminRepository {
  async getSalesSummary(): Promise<SalesSummaryResponse> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [onlineSalesStats, posSalesStats, todayStats] = await Promise.all([
      OrderModel.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalOrders: { $sum: 1 },
          },
        },
      ]),
      PosSaleModel.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalPosRevenue: { $sum: '$grandTotal' },
            totalPosSales: { $sum: 1 },
          },
        },
      ]),
      OrderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart },
            orderStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: '$grandTotal' },
            todayOrdersCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalRevenue = onlineSalesStats.length > 0 ? onlineSalesStats[0].totalRevenue : 0;
    const totalOrders = onlineSalesStats.length > 0 ? onlineSalesStats[0].totalOrders : 0;

    const totalPosRevenue = posSalesStats.length > 0 ? posSalesStats[0].totalPosRevenue : 0;
    const totalPosSales = posSalesStats.length > 0 ? posSalesStats[0].totalPosSales : 0;

    const todayRevenue = todayStats.length > 0 ? todayStats[0].todayRevenue : 0;
    const todayOrdersCount = todayStats.length > 0 ? todayStats[0].todayOrdersCount : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      totalPosSales,
      totalPosRevenue: Number(totalPosRevenue.toFixed(2)),
      combinedRevenue: Number((totalRevenue + totalPosRevenue).toFixed(2)),
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrdersCount,
    };
  }

  async getOrderStatusBreakdown(): Promise<OrderStatusBreakdownResponse> {
    const stats = await OrderModel.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    let total = 0;
    for (const stat of stats) {
      if (counts[stat._id] !== undefined) {
        counts[stat._id] = stat.count;
      }
      total += stat.count;
    }

    return {
      pending: counts.pending,
      processing: counts.processing,
      shipped: counts.shipped,
      delivered: counts.delivered,
      cancelled: counts.cancelled,
      total,
    };
  }

  async getLowStockReport(threshold = 10): Promise<LowStockItem[]> {
    const products = await ProductModel.find({
      isActive: true,
      stock: { $lte: threshold },
    })
      .sort({ stock: 1 })
      .lean();

    return products.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      dosageForm: p.dosageForm,
      unitType: p.unitType,
      stock: p.stock,
      price: Number(p.price),
      images: p.images || [],
    }));
  }

  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    const [salesSummary, orderStatusBreakdown, totalCustomers, totalPrescriptions, pendingPrescriptions, lowStockProducts] = await Promise.all([
      this.getSalesSummary(),
      this.getOrderStatusBreakdown(),
      UserModel.countDocuments({ role: 'customer' }),
      PrescriptionModel.countDocuments(),
      PrescriptionModel.countDocuments({ status: 'pending' }),
      ProductModel.countDocuments({ isActive: true, stock: { $lte: 10 } }),
    ]);

    return {
      salesSummary,
      orderStatusBreakdown,
      userMetrics: {
        totalCustomers,
        totalPrescriptions,
        pendingPrescriptions,
      },
      lowStockItemsCount: lowStockProducts,
    };
  }
}

export const adminRepository = new AdminRepository();
