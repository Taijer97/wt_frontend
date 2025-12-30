import axios from 'axios';

// Configuración base de Axios apuntando al backend FastAPI
const isDev = !!(import.meta as any).env?.DEV;
const api = axios.create({
  // En desarrollo usamos rutas relativas para que Vite proxy resuelva CORS.
  // En producción usamos la variable VITE_API_BASE_URL.
  baseURL: isDev ? '' : ((import.meta as any).env?.VITE_API_BASE_URL || 'http://100.116.47.110:8000'),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: true,
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
