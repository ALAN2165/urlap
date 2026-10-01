// backend/src/index.ts
import 'dotenv/config';
import app from './app';
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 urlap API running on port ${port}`);
});