// frontend/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

// إضافة Interceptor عشان يبعت التوكن تلقائياً مع كل طلب
api.interceptors.request.use(
  (config) => {
    // التأكد إننا في بيئة المتصفح مش السيرفر
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token'); // تأكد إن اسم التوكن هنا مطابق للي بتحفظه وقت الـ Login
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);