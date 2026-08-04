import app from './app';
import { config } from './config/env';
import { connectDatabase } from './database/connection';
import { redisClient } from './redis/client';
import { initSocket } from './socket';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Connect to Redis (if available)
    if (redisClient && redisClient.status === 'wait') {
      await redisClient.connect().catch((err) => {
        console.warn('⚠️ Redis connection note:', err.message);
      });
    }

    // 3. Start Express HTTP Server
    const server = app.listen(config.PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 mediShop Backend API Server Running`);
      console.log(`📍 Environment : ${config.NODE_ENV}`);
      console.log(`🌐 Base URL    : http://localhost:${config.PORT}`);
      console.log(`🏥 Health Check: http://localhost:${config.PORT}/health`);
      console.log(`📚 Swagger UI  : http://localhost:${config.PORT}/api/v1/docs`);
      console.log(`====================================================`);
    });

    // 4. Initialize Real-Time Socket.io Server
    initSocket(server);
    console.log(`🔌 Socket.io Real-time Event Server Initialized`);

    // Unhandled Rejection & Uncaught Exception Handlers
    process.on('unhandledRejection', (reason: Error) => {
      console.error('💥 UNHANDLED REJECTION! Shutting down...', reason);
      server.close(() => {
        process.exit(1);
      });
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('💥 UNCAUGHT EXCEPTION! Shutting down...', error);
      process.exit(1);
    });

    // Graceful Shutdown Handler
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
