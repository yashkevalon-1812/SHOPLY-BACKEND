import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';

import authRoutes from './Routes/authRoutes.js';
import productRoutes from './Routes/productRoutes.js';
import orderRoutes from './Routes/orderRoutes.js';
import sellerRoutes from './Routes/sellerRoutes.js';
import adminRoutes from './Routes/adminRoutes.js';
import contactRoutes from './Routes/contactRoutes.js';
import couponRoutes from './Routes/couponRoutes.js';
import promotionRoutes from './Routes/promotionRoutes.js';
import notificationRoutes from './Routes/notificationRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Render/Vercel sit behind a proxy, so req.ip is the proxy's IP unless we trust it.
app.set('trust proxy', 1);

// Middlewares
// Pre-configured default local development origins
const defaultLocalOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://shoply-frontend-tq0m.onrender.com',
  'https://shoply-frontend-hjos.onrender.com',
];

// CLIENT_URL accepts a comma-separated list for custom and production domains
const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultLocalOrigins, ...envOrigins])];

app.use(
  cors({
    origin(origin, callback) {
      // 1. No Origin header: curl, health checks, native/mobile clients, Postman
      if (!origin) return callback(null, true);

      // 2. Explicitly allowed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // 3. Any localhost or 127.0.0.1 on any port (Vite, Next.js, preview servers)
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }

      // 4. Render and Vercel deployments (*.onrender.com, *.vercel.app)
      if (/\.onrender\.com$/.test(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // 5. In local development, permit any origin
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/notifications', notificationRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Health check endpoint
// Shoply API Routes mounted
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve frontend static build files (SPA)
const frontendDistPath = path.resolve(__dirname, '../SHOPLY FRONTEND/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  // For all non-API GET requests, serve index.html for React Router client-side routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(frontendIndexPath);
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'healthy',
      message: 'Shoply API is running. The frontend is deployed separately.',
      health: '/api/health',
    });
  });

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.status(404).json({
        message: 'Frontend is not deployed with this API.',
        health: '/api/health',
      });
    }
    next();
  });
}

// Fallback 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ message: `API route not found - ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error('Server error:', err.message);
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Shoply API server listening on http://localhost:${PORT}`);
});
