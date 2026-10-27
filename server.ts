import express from 'express';
import path from 'path';
import {
  fetchShopierOrders,
  verifyAndCreditShopierOrders,
  getProcessedOrdersStore,
} from './src/server/shopierService';
import { analyzeTerrainImage } from './src/server/geminiService';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'terrascan-server', time: new Date().toISOString() });
  });

  // AI Field Camera Terrain & Geological Vision Analysis
  app.post('/api/gemini/analyze-terrain', async (req, res) => {
    try {
      const { image, mimeType, coordinates, prompt } = req.body || {};
      if (!image) {
        return res.status(400).json({ success: false, error: 'Görsel verisi (base64) gereklidir.' });
      }
      const analysis = await analyzeTerrainImage(image, mimeType, coordinates, prompt);
      res.json({ success: true, analysis });
    } catch (err: any) {
      console.error('[API /api/gemini/analyze-terrain] Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Shopier raw orders query
  app.get('/api/shopier/orders', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
      const orders = await fetchShopierOrders(limit);
      res.json({ success: true, count: orders.length, orders });
    } catch (err: any) {
      console.error('[API /api/shopier/orders] Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Shopier automatic verify and credit endpoint
  app.post('/api/shopier/verify-and-credit', async (req, res) => {
    try {
      const { email, userId, orderId } = req.body || {};
      const result = await verifyAndCreditShopierOrders({ email, userId, orderId });
      res.json(result);
    } catch (err: any) {
      console.error('[API /api/shopier/verify-and-credit] Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get completed / processed orders registry
  app.get('/api/shopier/processed-orders', (_req, res) => {
    try {
      const store = getProcessedOrdersStore();
      res.json({ success: true, store });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development (dynamically imported so production hosting doesn't require vite devDependency)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '7d', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TerraScan Server] Server listening on port ${PORT}`);
  });
}

startServer();
