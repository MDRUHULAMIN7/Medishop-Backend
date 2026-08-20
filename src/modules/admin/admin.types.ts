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

export type AdminReportChannel = 'all' | 'online' | 'pos';

export interface AdminReportFilters {
  dateFrom?: string;
  dateTo?: string;
  channel?: AdminReportChannel;
  productId?: string;
  categoryId?: string;
  staffId?: string;
  includeRows?: boolean;
}

export interface AdminReportRow {
  date: string;
  channel: 'Online' | 'POS';
  reference: string;
  product: string;
  quantity: number;
  unitPrice: number;
  buyingCost: number;
  revenue: number;
  profit: number;
}

export interface AdminAnalyticsResponse {
  filters: AdminReportFilters;
  summary: {
    totalSales: number;
    revenue: number;
    grossProfit: number;
    loss: number;
    productSales: number;
    stockValue: number;
    lowStock: number;
    outOfStock: number;
    purchaseCost: number;
    sellingValue: number;
    profitMargin: number;
    onlineSales: number;
    posSales: number;
    refundCount: number;
    refundAmount: number;
    auditActivity: number;
  };
  trend: Array<{ date: string; revenue: number; buyingCost: number; profit: number }>;
  channels: Array<{ name: 'Online' | 'POS'; value: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number; profit: number }>;
  lowSellingProducts: Array<{ name: string; quantity: number; revenue: number; profit: number }>;
  stockStatus: Array<{ name: 'In stock' | 'Low stock' | 'Out of stock'; value: number }>;
  rows?: AdminReportRow[];
}

export interface ProductInsightsResponse {
  product: {
    id: string;
    name: string;
    genericName?: string;
    category?: string;
    brand?: string;
    stock: number;
    lowStockThreshold: number;
    price: number;
    buyingPrice: number;
    unit: string;
    image?: string;
    expiryDate?: Date | null;
  };
  sales: {
    onlineQuantity: number;
    onlineRevenue: number;
    posQuantity: number;
    posRevenue: number;
    totalQuantity: number;
    totalRevenue: number;
    profit: number;
    lastSaleAt?: Date;
  };
  stockMovements: number;
}
