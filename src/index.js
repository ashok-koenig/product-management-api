import { createApp } from './app.js';

const PORT = 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Product Management API listening on port ${PORT}`);
});
