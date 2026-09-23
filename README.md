# Apollo Elevators

Apollo Elevators is a React/Vite web application for elevator customer,
contract, billing, enquiry, notification, and engineer service-report
workflows. The UI consumes the Spring Boot API in `apollo-backend`.

## Requirements

- Node.js 20 or newer
- npm
- The backend running locally on port `8080` (see
  [`apollo-backend/README.md`](apollo-backend/README.md))

## Development

```bash
npm install
npm run dev
```

Vite starts the application at `http://localhost:5173`. Requests to `/api`,
`/swagger-ui`, `/v3`, and `/actuator` are proxied to the backend. Set
`VITE_BACKEND_URL` in `.env` only when the backend is not at
`http://localhost:8080`.

For a production build:

```bash
npm run build
npm run preview
```

## Application areas

- Public home and contact pages
- Admin dashboard, customer and lift management, billing, enquiries,
  notifications, and security settings
- Engineer dashboard, restricted customer views, and service reports

Authentication uses the backend JWT endpoints. Access and refresh tokens are
kept in browser local storage and are attached to protected API requests.
Unauthorized responses clear the local session and return the user to login.

## Project layout

```text
src/
  components/       Shared public UI components
  pages/            Public, admin, and engineer screens
  services/api.js   Centralized HTTP client
  services/auth.js  Session storage helpers
public/             Logo and elevator imagery
vite.config.js      Development proxy configuration
```

Do not commit `.env` files or tokens. The tracked frontend lives at the
repository root; `apollo-backend` is a separate Git repository containing the
API service.
