# Apollo Elevators Frontend

React + Vite + JSX frontend mapped to the supplied Spring Boot backend.

## Backend API used
- `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`
- `/api/admin/customers/*`
- `/api/admin/documents/customers/{id}/amc-contract`
- `/api/admin/notifications/*`
- `/api/admin/security/config/refresh`

## Run
1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if needed.
2. `npm install`
3. `npm run dev`

The frontend stores the backend JWT access/refresh tokens in localStorage and sends `Authorization: Bearer <token>` on protected calls.

The customer form covers the core customer/lift fields exposed by the backend; AMC/service-history editing can be added as a dedicated workflow if desired.


## CORS / local development

The frontend is configured to avoid browser CORS during local development.
Do **not** set `VITE_API_BASE_URL=http://localhost:8080` for the Vite dev server.

Instead:
- Browser requests go to `http://localhost:5173/api/...`
- Vite proxies `/api` to `http://localhost:8080`
- Spring Boot therefore receives the request server-to-server and the browser does not enforce cross-origin CORS.

If your backend is actually on another port, change `VITE_BACKEND_URL` in `.env`.

For production, either serve the frontend from the same origin as the API or configure Spring Security CORS explicitly.
