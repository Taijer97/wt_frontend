# Etapa de build: compila el frontend con Vite
FROM node:20-alpine AS build
WORKDIR /app

# Variables de entorno para Vite (solo lectura en tiempo de build)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Instala dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Copia el resto del código y construye
COPY . .
RUN npm run build

# Etapa de producción: sirve estáticos con Nginx
FROM nginx:alpine AS runner

# Copia configuración de Nginx con fallback para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia artefactos construidos
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

