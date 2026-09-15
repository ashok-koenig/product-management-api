import express from 'express';
import productsRouter from './routes/products.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use('/products', productsRouter);

  app.use((req, res) => {
    res.status(404).json({ success: false, data: null, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
};
