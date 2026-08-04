import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { swaggerSpec } from './config/swagger';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import { ApiResponse } from './utils/ApiResponse';
import { NotFoundError } from './utils/AppError';

const app: Application = express();

// Security & Core Middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health Check Endpoint
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Server Health Check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy and running
 */
app.get('/health', (req: Request, res: Response) => {
  return ApiResponse.success(res, 'Server is healthy and running', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Swagger UI & OpenAPI Specification Routes
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/v1/docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 404 Route Handler
app.use((req: Request, res: Response, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Central Error Handler Middleware
app.use(errorHandler);

export default app;
