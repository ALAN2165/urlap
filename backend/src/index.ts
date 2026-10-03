import 'dotenv/config';
import app from './app';
import './queues/executionWorker';
import './queues/announcementEmailWorker';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 urlap API running on port ${PORT}`));