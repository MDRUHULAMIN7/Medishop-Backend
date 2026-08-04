import { Application } from 'express';
import courierRouter from './courier/courier.route';

export const registerModuleRoutes = (app: Application) => {
  app.use('/api/v1/courier', courierRouter);
};
