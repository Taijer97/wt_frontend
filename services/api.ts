import axios from 'axios';

// Configuración base de Axios apuntando al backend FastAPI
const isDev = !!(import.meta as any).env?.DEV;
const configuredBaseUrl = String((import.meta as any).env?.VITE_API_BASE_URL || '').trim();
const api = axios.create({
  // Si VITE_API_BASE_URL está configurada, la usamos también en desarrollo.
  // Si no, Vite proxy resuelve las rutas relativas.
  baseURL: configuredBaseUrl || (isDev ? '' : 'http://100.116.47.110:8000'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const session = localStorage.getItem('mype_session');
    if (session) {
      const user = JSON.parse(session);
      if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch (e) {}
  return config;
});

// Interceptor para manejo de errores global (opcional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
