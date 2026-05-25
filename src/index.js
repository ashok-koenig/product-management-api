import createApp from './app.js';

const PORT = 3000;
const app = createApp();

app.listen(PORT, () => {
   console.log(`Product Management API running on port ${PORT}`); 
  console.log(`REST API:  http://localhost:${PORT}/products`); 
  console.log(`MCP:       http://localhost:${PORT}/mcp`); 
});
