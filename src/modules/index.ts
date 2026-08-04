import { Application } from 'express';
import authRouter from './auth/auth.route';
import courierRouter from './courier/courier.route';

export const registerModuleRoutes = (app: Application) => {
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/courier', courierRouter);
};
