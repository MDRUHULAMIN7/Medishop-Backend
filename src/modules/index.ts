import { Application } from 'express';
import adminRouter from './admin/admin.route';
import authRouter from './auth/auth.route';
import brandRouter from './brand/brand.route';
import cartRouter from './cart/cart.route';
import categoryRouter from './category/category.route';
import couponRouter from './coupon/coupon.route';
import courierRouter from './courier/courier.route';
import notificationRouter from './notification/notification.route';
import orderRouter from './order/order.route';
import posRouter from './pos/pos.route';
import prescriptionRouter from './prescription/prescription.route';
import productRouter from './product/product.route';
import userRouter from './user/user.route';

import inventoryRouter from './inventory/inventory.routes';

export const registerModuleRoutes = (app: Application) => {
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/brands', brandRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/coupons', couponRouter);
  app.use('/api/v1/prescriptions', prescriptionRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/pos', posRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/courier', courierRouter);
};
