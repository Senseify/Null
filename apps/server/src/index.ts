import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rate-limit.middleware';
import { getSocketManager } from './sockets/socket.manager';
import { runMigrations, getDatabaseClient } from '@null/database';

async function bootstrap() {
  console.log('==============================================');
  console.log('            NULL BACKEND SERVER               ');
  console.log('==============================================');

  // 1. Run database migrations
  try {
    console.log('[Bootstrap] Initializing database & running migrations...');
    await runMigrations();
    console.log('[Bootstrap] Database migrations ready.');
  } catch (err) {
    console.error('[Bootstrap Critical] Failed to run database migrations:', err);
    process.exit(1);
  }

  // 2. Setup Express application
  const app = express();

  // Helmet with cross-origin resource policy for media/file previews
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow mobile/desktop clients (origin might be undefined or custom protocol)
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('tauri://') || origin.startsWith('http://tauri.')) {
          callback(null, true);
        } else if (ENV.CORS_ORIGIN.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-friendly permissive CORS
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Static uploads directory
  app.use('/uploads', express.static(ENV.UPLOAD_DIR));

  // Request logger for development
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (!req.path.startsWith('/api/health')) {
        console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Mount API endpoints with rate limiting
  app.use('/api', apiLimiter, apiRoutes);

  // Global Error Handler
  app.use(errorHandler);

  // 3. Create HTTP server & Socket.IO instance
  const httpServer = http.createServer(app);
  const socketManager = getSocketManager();
  socketManager.initialize(httpServer);

  // 4. Start listening
  httpServer.listen(ENV.PORT, ENV.HOST, () => {
    console.log(`[Server] NULL API listening on http://${ENV.HOST}:${ENV.PORT}`);
    console.log(`[Server] Health check: http://localhost:${ENV.PORT}/api/health`);
    console.log(`[Server] Environment: ${ENV.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
    httpServer.close(async () => {
      try {
        const db = getDatabaseClient();
        await db.close();
        console.log('[Server] Database connections closed.');
      } catch (e) {}
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });

    // Force exit after 5 seconds if lingering
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server Bootstrap Fatal Error]', err);
  process.exit(1);
});
