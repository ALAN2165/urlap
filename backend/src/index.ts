import 'dotenv/config';
import './queues/executionWorker'; // شيل علامتين التعليق من هنا
import app from './app';
// import './queues/executionWorker'; // تأكد إن السطر ده لسه معمول له تعليق (Comment) عشان السيرفر ما يقعش

const port = Number(process.env.PORT) || 8080;

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 urlap API running on port ${port}`);
});