import axios from 'axios';

// Configuración base de Axios apuntando al backend FastAPI
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://100.116.47.110:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
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
