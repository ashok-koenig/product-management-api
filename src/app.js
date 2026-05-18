import express from 'express';
import productsRouter from './routes/products.js';
import errorHandler from './middleware/errorHandler.js';

const createApp = () => {
  const app = express();

  app.use(express.json());

  app.use('/products', productsRouter);

  app.use(errorHandler);

  return app;
};

export default createApp;
