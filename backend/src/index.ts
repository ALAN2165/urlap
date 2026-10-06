import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocket } from './realtime/socket';
import './queues/executionWorker';
import './queues/announcementEmailWorker';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => console.log(`🚀 urlap API (+ realtime) running on port ${PORT}`));