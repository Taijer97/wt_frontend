<div align="center">
  <h1>WasiTech – MYPE Gestión RMT (Frontend)</h1>
  <p>Gestión integral para empresas RMT en Perú: inventario, ventas, gastos, RRHH y contabilidad</p>
</div>

## Descripción
- Aplicación SPA construida con React + Vite y Tailwind que consume un backend FastAPI.
- Incluye módulos: Dashboard, Compras RUC 10/20, Inventario/Transferencias, Ventas, Gastos, RRHH/Planillas, SIRE/Contabilidad, Configuración y Historial de ventas.
- Integraciones útiles:
  - Consulta RUC vía ApisPeru con token
  - Consulta DNI vía API privada (si está disponible) con fallback a ApisPeru
  - Mensajería por WebSocket para eventos del sistema

## Tecnologías
- React + Vite
- TypeScript
- Tailwind CSS
- Axios
- Nginx (servir estáticos en producción con Docker)

## Requisitos
- Node.js 20+
- npm 10+
- Token de ApisPeru para RUC/DNI (recomendado)
- Backend FastAPI operando y accesible

## Instalación y ejecución (desarrollo)
1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno. Crea un archivo `.env` en la raíz del frontend basado en [.env.example](file:///d:/proyectos_test/proyecto_wasitech/frontend/.env.example):

```
VITE_API_BASE_URL=http://127.0.0.1:8000

VITE_API_DNI_URL=http://127.0.0.1:5400
VITE_API_DNI_USER=n8n
VITE_API_DNI_PASSWORD=mi_password

VITE_API_RUC_URL=https://dniruc.apisperu.com/api/v1/ruc
VITE_API_RUC_TOKEN=tu_token_de_apisperu
```

- Importante: no usar comillas/backticks ni espacios alrededor del `=`.

3. Ejecutar el servidor de desarrollo:

```bash
npm run dev
```

- El proxy de desarrollo está configurado para evitar CORS hacia el backend y la API privada de DNI. Revisa [vite.config.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/vite.config.ts).

## Build de producción

```bash
npm run build
npm run preview
```

## Docker
- Multi-stage con Node para build y Nginx para servir estáticos.
- Archivos clave:
  - [Dockerfile](file:///d:/proyectos_test/proyecto_wasitech/frontend/Dockerfile)
  - [nginx.conf](file:///d:/proyectos_test/proyecto_wasitech/frontend/nginx.conf)
  - [.dockerignore](file:///d:/proyectos_test/proyecto_wasitech/frontend/.dockerignore)
  - [docker-compose.yml](file:///d:/proyectos_test/proyecto_wasitech/frontend/docker-compose.yml)

Construcción y ejecución:

```bash
docker build -t wasitech-frontend . --build-arg VITE_API_BASE_URL=http://tu-backend:8000
docker run -p 3000:80 --name wasitech-frontend wasitech-frontend
```

Compose:

```bash
# PowerShell en Windows
$env:VITE_API_BASE_URL="http://tu-backend:8000"
docker compose up -d --build
```

Acceso: http://localhost:3000

## Variables de entorno
- Backend:
  - VITE_API_BASE_URL: URL base del backend FastAPI
- DNI:
  - VITE_API_DNI_URL, VITE_API_DNI_USER, VITE_API_DNI_PASSWORD para API privada (opcional)
  - VITE_API_DNI_TOKEN opcional. Si no está, usa VITE_API_RUC_TOKEN
- RUC:
  - VITE_API_RUC_URL: Endpoint de ApisPeru
  - VITE_API_RUC_TOKEN: Token de ApisPeru

Ejemplo completo: [.env.example](file:///d:/proyectos_test/proyecto_wasitech/frontend/.env.example)

## WebSocket
- En desarrollo, la app conecta a `ws://localhost:3000/ws/updates` y Vite lo proxya al backend.
- En producción, usa `ws://<host_backend>/ws/updates` calculado desde VITE_API_BASE_URL.
- Implementación: [App.tsx](file:///d:/proyectos_test/proyecto_wasitech/frontend/App.tsx#L52-L58)

## Estructura del proyecto
- Componentes principales:
  - Layout y navegación: [Layout.tsx](file:///d:/proyectos_test/proyecto_wasitech/frontend/components/Layout.tsx)
  - Login y registro: [Login.tsx](file:///d:/proyectos_test/proyecto_wasitech/frontend/components/Login.tsx), [Register.tsx](file:///d:/proyectos_test/proyecto_wasitech/frontend/components/Register.tsx)
  - Configuración y CRUD: [SettingsModule.tsx](file:///d:/proyectos_test/proyecto_wasitech/frontend/components/SettingsModule.tsx)
  - Módulos operativos: Dashboard, Ventas, Compras, Inventario, Gastos, Planillas, SIRE
- Servicios:
  - Backend API: [api.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/services/api.ts)
  - Consultas RUC: [rucService.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/services/rucService.ts)
  - Consultas DNI: [dniService.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/services/dniService.ts)
  - Lógica Core: [backendService.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/services/backendService.ts), [dataService.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/services/dataService.ts)

## Uso rápido
- Proveedores:
  - Ingresa RUC; se completa razón social y dirección automáticamente desde ApisPeru si el token es válido.
- Intermediarios y Colaboradores:
  - Ingresa DNI; al tener 8 dígitos se consulta automáticamente a tu API privada o ApisPeru como fallback y se completa nombre y dirección. Botón “Buscar” disponible.

## Resolución de problemas
- CORS en desarrollo:
  - Usa `npm run dev` y el proxy en [vite.config.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/vite.config.ts).
- 401 en ApisPeru:
  - Verifica VITE_API_RUC_TOKEN sin comillas/backticks ni espacios.
- WebSocket error:
  - Confirma que el backend expone `/ws/updates` y que VITE_API_BASE_URL apunta a tu servidor.
- DNI privado:
  - Si tu API usa rutas distintas, ajusta el normalizador en [dniService.ts](file:///d:/proyectos_test/proyecto_wasitech/frontend/services/dniService.ts) para incluir las claves que retorna.

## Scripts
- `npm run dev`: desarrollo con proxy
- `npm run build`: build de producción
- `npm run preview`: server estático de prueba post-build

## Seguridad
- No incluir tokens ni credenciales reales en commits.
- Mantener tokens de ApisPeru en `.env`.

## Licencia
- Proyecto interno para WasiTech. Uso restringido.

## Contacto
- Soporte técnico: equipo WasiTech
