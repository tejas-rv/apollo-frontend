# Apollo Elevator Frontend

React + Vite + JSX frontend mapped to the supplied Spring Boot backend.

## Backend API used
- `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`
- `/api/admin/customers/*`
- `/api/admin/enquiries/*`, `/api/admin/quotations/*`, `/api/admin/work-orders`
- `/api/admin/users`, `/api/admin/users/{id}`, `/api/admin/users/{id}/status` — Users page (ADMIN / OFFICE / ENGINEER CRUD, reset password, activate/deactivate, delete)
- `/api/auth/reset-password` (admin-only)
- `/api/admin/notifications/html-to-pdf`
- `/api/admin/documents/customers/{id}/amc-contract`
- `/api/admin/notifications/*`
- `/api/admin/security/config/refresh`
- `/api/engineer/*`
- `/api/google-drive/*`

## Run
1. Copy `.env.example` to `.env` and set `VITE_BACKEND_URL` if the backend is not running on port `9071`.
2. `npm install`
3. `npm run dev`

The frontend stores the backend JWT access/refresh tokens in localStorage and sends `Authorization: Bearer <token>` on protected calls.

The admin portal includes customer and AMC management, bills, enquiries, quotations,
work-order conversion, engineer account creation, notifications, and security settings.
The engineer portal includes assigned customer views, service reporting, report history,
and report PDF downloads.


## CORS / local development

The frontend is configured to avoid browser CORS during local development.
Do **not** set `VITE_API_BASE_URL` to the backend URL for the Vite dev server.

Instead:
- Browser requests go to `http://localhost:5173/api/...`
- Vite proxies `/api` to `http://localhost:9071` by default (the backend's configured port)
- Spring Boot therefore receives the request server-to-server and the browser does not enforce cross-origin CORS.

If your backend is actually on another port, change `VITE_BACKEND_URL` in `.env`.

For production, either serve the frontend from the same origin as the API or configure Spring Security CORS explicitly.
