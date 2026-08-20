import { Types, PipelineStage } from 'mongoose';
import { OrderModel } from '../order/order.model';
import { PosSaleModel } from '../pos/pos.model';
import { PrescriptionModel } from '../prescription/prescription.model';
import { ProductModel } from '../product/product.model';
import { UserModel } from '../user/user.model';
import { StockLedgerModel } from '../inventory/stockLedger.model';
import { getRedisCache, setRedisCache } from '../../utils/redisCache';
import {
  AdminAnalyticsResponse,
  AdminReportFilters,
  AdminReportRow,
  DashboardSummaryResponse,
  LowStockItem,
  OrderStatusBreakdownResponse,
  ProductInsightsResponse,
  SalesSummaryResponse,
} from './admin.types';

type AggregateRow = Record<string, unknown>;

interface ItemAggregateRow {
  date?: string;
  reference?: string;
  productId?: unknown;
  product?: string;
  quantity?: number;
  unitPrice?: number;
  revenue?: number;
  buyingCost?: number;
  channel: 'Online' | 'POS';
}

const numberValue = (value: unknown): number => Number(value || 0);

const roundMoney = (value: number): number => Number(value.toFixed(2));

const objectIdOrUndefined = (value?: string): Types.ObjectId | undefined =>
  value && Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : undefined;

const getDateMatch = (filters: AdminReportFilters): Record<string, unknown> => {
  const createdAt: Record<string, Date> = {};
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    if (!Number.isNaN(dateFrom.getTime())) createdAt.$gte = dateFrom;
  }
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo);
    if (!Number.isNaN(dateTo.getTime())) {
      dateTo.setHours(23, 59, 59, 999);
      createdAt.$lte = dateTo;
    }
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
};

const buildItemPipeline = (
  source: 'order' | 'pos',
  filters: AdminReportFilters,
  includeRows: boolean,
): PipelineStage[] => {
  const match: Record<string, unknown> = {
    ...getDateMatch(filters),
    ...(source === 'order' ? { orderStatus: { $ne: 'cancelled' } } : { status: 'completed' }),
  };
  const staffId = objectIdOrUndefined(filters.staffId);
  if (source === 'pos' && staffId) match.soldBy = staffId;

  const productId = objectIdOrUndefined(filters.productId);
  const categoryId = objectIdOrUndefined(filters.categoryId);
  const itemMatch: Record<string, unknown> = {};
  if (productId) itemMatch['items.product'] = productId;
  if (categoryId) itemMatch['productMeta.category'] = categoryId;

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productMeta' } },
    { $unwind: '$productMeta' },
  ];
  if (Object.keys(itemMatch).length) pipeline.push({ $match: itemMatch });

  pipeline.push({
    $project: {
      date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      reference: source === 'order' ? '$orderNumber' : '$invoiceNumber',
      productId: '$items.product',
      product: '$items.name',
      quantity: { $ifNull: ['$items.quantity', 0] },
      unitPrice: { $ifNull: ['$items.effectiveUnitPrice', '$items.unitPrice'] },
      revenue: { $ifNull: ['$items.totalPrice', 0] },
      buyingCost: {
        $multiply: [
          { $ifNull: ['$items.buyingPrice', '$productMeta.buyingPrice'] },
          { $ifNull: ['$items.quantity', 0] },
        ],
      },
    },
  });

  if (!includeRows) pipeline.push({ $limit: 10000 });
  return pipeline;
};

const buildOrderMatch = (source: 'order' | 'pos', filters: AdminReportFilters): Record<string, unknown> => {
  const match: Record<string, unknown> = {
    ...getDateMatch(filters),
    ...(source === 'order' ? { orderStatus: { $ne: 'cancelled' } } : { status: 'completed' }),
  };
  const staffId = objectIdOrUndefined(filters.staffId);
  if (source === 'pos' && staffId) match.soldBy = staffId;
  const productId = objectIdOrUndefined(filters.productId);
  if (productId) match.items = { $elemMatch: { product: productId } };
  return match;
};

export class AdminRepository {
  async getSalesSummary(_filters?: AdminReportFilters): Promise<SalesSummaryResponse> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [onlineSalesStats, posSalesStats, onlineCostStats, posCostStats, todayStats] = await Promise.all([
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
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $group: { _id: null, totalCost: { $sum: { $multiply: [{ $ifNull: ['$items.buyingPrice', 0] }, '$items.quantity'] } } } },
      ]),
      PosSaleModel.aggregate([
        { $match: { status: 'completed' } },
        { $unwind: '$items' },
        { $group: { _id: null, totalCost: { $sum: { $multiply: [{ $ifNull: ['$items.buyingPrice', 0] }, '$items.quantity'] } } } },
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

    const totalCost = Number(((onlineCostStats.length ? onlineCostStats[0].totalCost : 0) + (posCostStats.length ? posCostStats[0].totalCost : 0)));
    const combinedRevenue = Number(totalRevenue + totalPosRevenue);
    const grossProfit = Math.max(0, combinedRevenue - totalCost);
    const grossLoss = Math.max(0, totalCost - combinedRevenue);
    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      totalPosSales,
      totalPosRevenue: Number(totalPosRevenue.toFixed(2)),
      combinedRevenue: Number(combinedRevenue.toFixed(2)),
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrdersCount,
      totalCost: Number(totalCost.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      marginPercent: combinedRevenue > 0 ? Number(((grossProfit / combinedRevenue) * 100).toFixed(2)) : 0,
    };
  }

  async getAnalytics(filters: AdminReportFilters = {}): Promise<AdminAnalyticsResponse> {
    const cacheKey = `cache:admin:analytics:${JSON.stringify(filters)}`;
    const cached = await getRedisCache<AdminAnalyticsResponse>(cacheKey);
    if (cached) return cached;

    const channel = filters.channel || 'all';
    const includeRows = Boolean(filters.includeRows);
    const itemSources: Array<'order' | 'pos'> = channel === 'online' ? ['order'] : channel === 'pos' ? ['pos'] : ['order', 'pos'];

    const itemResults = await Promise.all(
      itemSources.map(async (source) => {
        const model = source === 'order' ? OrderModel : PosSaleModel;
        const rows = await model.aggregate(buildItemPipeline(source, filters, includeRows));
        return { source, rows: rows as unknown as ItemAggregateRow[] };
      }),
    );

    const itemRows: ItemAggregateRow[] = itemResults.flatMap(({ source, rows }) =>
      rows.map((row) => ({
        ...row,
        channel: source === 'order' ? 'Online' as const : 'POS' as const,
      })),
    );

    const [onlineOrderStats, posOrderStats, refundStats, rawStockRows, auditActivity] = await Promise.all([
      channel === 'pos'
        ? Promise.resolve([] as AggregateRow[])
        : OrderModel.aggregate([
            { $match: buildOrderMatch('order', filters) },
            { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, totalSales: { $sum: 1 } } },
          ]),
      channel === 'online'
        ? Promise.resolve([] as AggregateRow[])
        : PosSaleModel.aggregate([
            { $match: buildOrderMatch('pos', filters) },
            { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, totalSales: { $sum: 1 } } },
          ]),
      channel === 'pos'
        ? Promise.resolve([] as AggregateRow[])
        : OrderModel.aggregate([
            { $match: { ...getDateMatch(filters), refundStatus: { $in: ['refund_pending', 'refunded', 'refund_processing'] } } },
            { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: { $ifNull: ['$refundAmount', 0] } } } },
          ]),
      ProductModel.aggregate([
        { $match: { isActive: true, ...(objectIdOrUndefined(filters.productId) ? { _id: objectIdOrUndefined(filters.productId) } : {}), ...(objectIdOrUndefined(filters.categoryId) ? { category: objectIdOrUndefined(filters.categoryId) } : {}) } },
        { $project: { name: 1, stock: 1, price: 1, buyingPrice: 1, lowStockThreshold: 1 } },
      ]),
      StockLedgerModel.countDocuments(getDateMatch(filters)),
    ]);

    const stockRows = rawStockRows as unknown as AggregateRow[];
    const hasItemFilter = Boolean(filters.productId || filters.categoryId);
    const filteredOnlineRows = itemRows.filter((row) => row.channel === 'Online');
    const filteredPosRows = itemRows.filter((row) => row.channel === 'POS');
    const onlineRevenue = hasItemFilter
      ? filteredOnlineRows.reduce((total, row) => total + numberValue(row.revenue), 0)
      : numberValue(onlineOrderStats[0]?.totalRevenue);
    const posRevenue = hasItemFilter
      ? filteredPosRows.reduce((total, row) => total + numberValue(row.revenue), 0)
      : numberValue(posOrderStats[0]?.totalRevenue);
    const onlineSales = hasItemFilter
      ? new Set(filteredOnlineRows.map((row) => row.reference)).size
      : numberValue(onlineOrderStats[0]?.totalSales);
    const posSales = hasItemFilter
      ? new Set(filteredPosRows.map((row) => row.reference)).size
      : numberValue(posOrderStats[0]?.totalSales);
    const revenue = channel === 'all' ? onlineRevenue + posRevenue : channel === 'online' ? onlineRevenue : posRevenue;
    const purchaseCost = itemRows.reduce((total, row) => total + numberValue(row.buyingCost), 0);
    const productSales = itemRows.reduce((total, row) => total + numberValue(row.quantity), 0);
    const grossProfit = revenue - purchaseCost;

    const stockValue = stockRows.reduce((total, row) => total + numberValue(row.stock) * numberValue(row.buyingPrice), 0);
    const sellingValue = stockRows.reduce((total, row) => total + numberValue(row.stock) * numberValue(row.price), 0);
    const lowStock = stockRows.filter((row) => numberValue(row.stock) > 0 && numberValue(row.stock) <= (numberValue(row.lowStockThreshold) || 10)).length;
    const outOfStock = stockRows.filter((row) => numberValue(row.stock) <= 0).length;

    const trendMap = new Map<string, { revenue: number; buyingCost: number; profit: number }>();
    const productMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    for (const row of itemRows) {
      const date = String(row.date || 'Unknown');
      const revenueValue = numberValue(row.revenue);
      const buyingCostValue = numberValue(row.buyingCost);
      const trend = trendMap.get(date) || { revenue: 0, buyingCost: 0, profit: 0 };
      trend.revenue += revenueValue;
      trend.buyingCost += buyingCostValue;
      trend.profit += revenueValue - buyingCostValue;
      trendMap.set(date, trend);

      const productKey = String(row.productId || row.product || 'unknown');
      const product = productMap.get(productKey) || { name: String(row.product || 'Unknown'), quantity: 0, revenue: 0, profit: 0 };
      product.quantity += numberValue(row.quantity);
      product.revenue += revenueValue;
      product.profit += revenueValue - buyingCostValue;
      productMap.set(productKey, product);
    }

    const productValues = [...productMap.values()].map((row) => ({
      name: row.name,
      quantity: roundMoney(row.quantity),
      revenue: roundMoney(row.revenue),
      profit: roundMoney(row.profit),
    }));
    const refunds = refundStats[0] || {};
    const rows: AdminReportRow[] = includeRows
      ? itemRows.map((row) => {
          const rowRevenue = numberValue(row.revenue);
          const rowCost = numberValue(row.buyingCost);
          return {
            date: String(row.date || ''),
            channel: row.channel as 'Online' | 'POS',
            reference: String(row.reference || ''),
            product: String(row.product || ''),
            quantity: numberValue(row.quantity),
            unitPrice: numberValue(row.unitPrice),
            buyingCost: roundMoney(rowCost),
            revenue: roundMoney(rowRevenue),
            profit: roundMoney(rowRevenue - rowCost),
          };
        })
      : [];

    const response: AdminAnalyticsResponse = {
      filters,
      summary: {
        totalSales: onlineSales + posSales,
        revenue: roundMoney(revenue),
        grossProfit: roundMoney(Math.max(0, grossProfit)),
        loss: roundMoney(Math.max(0, -grossProfit)),
        productSales: roundMoney(productSales),
        stockValue: roundMoney(stockValue),
        lowStock,
        outOfStock,
        purchaseCost: roundMoney(purchaseCost),
        sellingValue: roundMoney(sellingValue),
        profitMargin: revenue > 0 ? roundMoney((Math.max(0, grossProfit) / revenue) * 100) : 0,
        onlineSales: roundMoney(onlineRevenue),
        posSales: roundMoney(posRevenue),
        refundCount: numberValue(refunds.count),
        refundAmount: roundMoney(numberValue(refunds.amount)),
        auditActivity,
      },
      trend: [...trendMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, values]) => ({
        date,
        revenue: roundMoney(values.revenue),
        buyingCost: roundMoney(values.buyingCost),
        profit: roundMoney(values.profit),
      })),
      channels: [
        { name: 'Online', value: roundMoney(onlineRevenue) },
        { name: 'POS', value: roundMoney(posRevenue) },
      ],
      topProducts: productValues.sort((a, b) => b.quantity - a.quantity).slice(0, 8),
      lowSellingProducts: productValues.sort((a, b) => a.quantity - b.quantity).slice(0, 8),
      stockStatus: [
        { name: 'In stock', value: stockRows.filter((row) => numberValue(row.stock) > (numberValue(row.lowStockThreshold) || 10)).length },
        { name: 'Low stock', value: lowStock },
        { name: 'Out of stock', value: outOfStock },
      ],
      ...(includeRows ? { rows } : {}),
    };
    await setRedisCache(cacheKey, response, includeRows ? 30 : 60);
    return response;
  }

  async getProductInsights(productId: string): Promise<ProductInsightsResponse> {
    if (!Types.ObjectId.isValid(productId)) throw new Error('Invalid product id');
    const objectId = new Types.ObjectId(productId);
    const productResult = await ProductModel.findById(objectId)
      .select('+buyingPrice')
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();
    if (!productResult) throw new Error('Product not found');
    const product = productResult as unknown as {
      _id: Types.ObjectId;
      name: string;
      genericName?: string;
      category?: { name?: string } | Types.ObjectId;
      brand?: { name?: string } | Types.ObjectId;
      stock: number;
      lowStockThreshold?: number;
      price: number;
      buyingPrice?: number;
      unitType: string;
      images?: string[];
      expiryDate?: Date | null;
    };

    const [online, pos, stockMovements] = await Promise.all([
      OrderModel.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' }, 'items.product': objectId } },
        { $unwind: '$items' },
        { $match: { 'items.product': objectId } },
        { $group: { _id: null, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' }, lastSaleAt: { $max: '$createdAt' } } },
      ]),
      PosSaleModel.aggregate([
        { $match: { status: 'completed', 'items.product': objectId } },
        { $unwind: '$items' },
        { $match: { 'items.product': objectId } },
        { $group: { _id: null, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalPrice' }, lastSaleAt: { $max: '$createdAt' } } },
      ]),
      StockLedgerModel.countDocuments({ product: objectId }),
    ]);
    const onlineQuantity = numberValue(online[0]?.quantity);
    const posQuantity = numberValue(pos[0]?.quantity);
    const onlineRevenue = numberValue(online[0]?.revenue);
    const posRevenue = numberValue(pos[0]?.revenue);
    const category = product.category && typeof product.category === 'object' && 'name' in product.category ? String(product.category.name) : undefined;
    const brand = product.brand && typeof product.brand === 'object' && 'name' in product.brand ? String(product.brand.name) : undefined;
    const lastSaleAt = [online[0]?.lastSaleAt, pos[0]?.lastSaleAt].filter(Boolean).sort().pop();

    return {
      product: {
        id: String(product._id),
        name: product.name,
        genericName: product.genericName,
        category,
        brand,
        stock: numberValue(product.stock),
        lowStockThreshold: numberValue(product.lowStockThreshold) || 10,
        price: numberValue(product.price),
        buyingPrice: numberValue(product.buyingPrice),
        unit: product.unitType,
        image: product.images?.[0],
        expiryDate: product.expiryDate,
      },
      sales: {
        onlineQuantity,
        onlineRevenue: roundMoney(onlineRevenue),
        posQuantity,
        posRevenue: roundMoney(posRevenue),
        totalQuantity: onlineQuantity + posQuantity,
        totalRevenue: roundMoney(onlineRevenue + posRevenue),
        profit: roundMoney(onlineRevenue + posRevenue - (onlineQuantity + posQuantity) * numberValue(product.buyingPrice)),
        ...(lastSaleAt ? { lastSaleAt } : {}),
      },
      stockMovements,
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
