import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Token expired or user no longer exists — clear and redirect
      // But don't redirect if we're already on auth pages (prevents loop)
      const path = window.location.pathname;
      if (path !== '/register' && path !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/register';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
