// frontend/src/lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

// إضافة Interceptor عشان يبعت التوكن تلقائياً مع كل طلب
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // تم تعديل الكلمة هنا لـ urlap_token
      const token = localStorage.getItem('urlap_token'); 
      
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