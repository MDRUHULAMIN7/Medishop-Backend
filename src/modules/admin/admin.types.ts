export interface SalesSummaryResponse {
  totalRevenue: number;
  totalOrders: number;
  totalPosSales: number;
  totalPosRevenue: number;
  combinedRevenue: number;
  todayRevenue: number;
  todayOrdersCount: number;
  totalCost: number;
  grossProfit: number;
  grossLoss: number;
  marginPercent: number;
}

export interface OrderStatusBreakdownResponse {
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  total: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  slug: string;
  dosageForm: string;
  unitType: string;
  stock: number;
  price: number;
  images: string[];
}

export interface DashboardSummaryResponse {
  salesSummary: SalesSummaryResponse;
  orderStatusBreakdown: OrderStatusBreakdownResponse;
  userMetrics: {
    totalCustomers: number;
    totalPrescriptions: number;
    pendingPrescriptions: number;
  };
  lowStockItemsCount: number;
}
