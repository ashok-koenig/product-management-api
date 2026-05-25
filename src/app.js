import express from 'express';
import productsRouter from './routes/products.js';
import errorHandler from './middleware/errorHandler.js';
// Add this import alongside the existing route imports 
import { createMcpRouter } from './mcp.js'; 

const createApp = () => {
  const app = express();

  app.use(express.json());

  app.use('/products', productsRouter);
   
// MCP endpoint — add this line 
app.use('/mcp', createMcpRouter()); 

  app.use(errorHandler);

  return app;
};

export default createApp;
