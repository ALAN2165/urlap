// backend/src/index.ts
import 'dotenv/config';
import app from './app';
import './queues/executionWorker'; // starts the BullMQ worker alongside the API

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 urlap API running on port ${PORT}`));