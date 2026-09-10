# Apollo Elevator Frontend Requirements

## 1. Overview
This frontend is a React + Vite application for managing elevator service operations for Apollo Elevator. It supports two user roles:

- Admin
- Engineer

The UI interacts with a Spring Boot backend through authenticated API endpoints and is designed around customer management, AMC tracking, billing, notifications, and engineer service reporting.

## 2. User Roles and Access

### 2.1 Admin
Admins can:
- Sign in with username and password
- View a business dashboard with AMC income, active contracts, service/payment due lists, and customer KPIs
- Search, create, edit, delete, and view customers
- Manage lift details and AMC contract records
- Download AMC contract PDFs
- Generate GST or non-GST bills from customer/AMC data
- Preview and edit bill details before PDF generation
- Send bills via email or WhatsApp
- Send generic email or WhatsApp notifications
- Refresh the backend security configuration

### 2.2 Engineer
Engineers can:
- Sign in with a role-based engineer account
- View their personal dashboard with upcoming services and recent reports
- Search for assigned customer records
- Select a customer and AMC contract for a service visit
- Complete a structured service checklist with yes/no and descriptive responses
- Submit service reports
- Download generated service report PDFs
- View their service report history

## 3. Functional Requirements

### 3.1 Authentication and Session Management
- The app must allow login using username and password.
- On successful login, the frontend stores accessToken, refreshToken, userRole, and username in localStorage.
- Authenticated requests must include the Authorization header using the stored access token.
- If a request returns 401, the app must clear tokens and redirect the user to /login.
- Protected routes must enforce role-based access:
  - Admin routes allowed only for ADMIN
  - Engineer routes allowed for ENGINEER and ADMIN

### 3.2 Dashboard
The admin dashboard must provide:
- Financial-year and month-based filtering
- KPI cards for:
  - AMC income
  - Active AMC count
  - Payments due in 30 days
  - Services due in 30 days
  - Expired AMC count
  - Total customer count
- Monthly income chart by financial year
- AMC status distribution chart
- Due-payment and due-service tables
- Recent customer list with quick navigation to customer details

The engineer dashboard must provide:
- Services today
- Services this month
- Total submitted reports
- Upcoming services list in the next 30 days
- Recent reports summary

### 3.3 Customer Management
The system must support:
- Customer search by name, code, mobile number, email, city, or state
- Pagination for customer listing
- Creating a new customer with contact details and address
- Editing existing customer records
- Deleting customer records
- Viewing a customer summary page with:
  - contact and address
  - number of lifts
  - number of AMC contracts
  - active AMC count
- Display of lift-level technical details and AMC contract details
- Downloading AMC contract PDFs from the customer detail screen

### 3.4 Lift and AMC Data Management
- Customer forms must support multiple lifts per customer.
- Each lift should capture: lift type, drive type, door type, floors, capacity, brand, model, installation details, serial number, and machine details.
- AMC contract details must include status, contract number, type, amount, payment frequency, service dates, and status timeline.
- The UI must display AMC statuses such as ACTIVE, PENDING, EXPIRED, and CANCELLED.
- The dashboard should derive KPIs and due alerts from AMC data.

### 3.5 Bill Generation and PDF Handling
The billing workflow must support:
- Customer search and selection
- Document type selection:
  - GST Bill
  - Without GST Bill
- Fetching a customer-specific bill preview from backend data
- Editing bill details before generation
- Previewing the generated PDF in a modal or browser viewer
- Downloading the generated PDF
- Sending the generated bill by email or WhatsApp

Bill data includes:
- invoice number/date
- customer and billing party details
- GST-related fields when applicable
- line items with description, quantity, rate, and amount
- summary totals

### 3.6 Notifications
The admin communication module must allow:
- Sending plain email messages
- Sending plain WhatsApp messages
- Sending contract-based email messages for a customer
- Sending contract-based WhatsApp messages for a customer

Required fields include recipient email/phone number and message content, depending on selected mode.

### 3.7 Security Configuration
The admin security screen must allow the operator to refresh backend runtime security configuration without restarting the application.

### 3.8 Engineer Service Reporting
The engineer service workflow must include:
- Search for a customer
- Select a valid AMC contract associated with the customer
- Capture visit date
- Load a standard checklist template from the backend
- Answer yes/no questions and descriptive questions
- Add overall notes and observations
- Submit the report to the backend
- Download the generated service report PDF after submission
- View historical service reports

## 4. External Interfaces
The frontend calls these backend endpoints:

- Authentication:
  - /api/auth/login
  - /api/auth/me
  - /api/auth/refresh

- Admin customer and document APIs:
  - /api/admin/customers/*
  - /api/admin/documents/customers/{id}/amc-contract
  - /api/admin/documents/customers/{id}
  - /api/admin/documents/bills/generate
  - /api/admin/documents/bills/send-email
  - /api/admin/documents/bills/send-whatsapp

- Admin notifications and security:
  - /api/admin/notifications/*
  - /api/admin/security/config/refresh

- Engineer APIs:
  - /api/engineer/dashboard
  - /api/engineer/customers
  - /api/engineer/service-reports
  - /api/engineer/service-reports/checklist-template

## 5. Non-Functional Requirements

### 5.1 Security
- JWT-based authentication must be used for protected API access.
- Tokens must be stored in browser localStorage for this implementation.
- Authorization should be enforced both by route guarding and API access requirements.

### 5.2 Performance
- API responses are cached for 60 seconds in the frontend for repeat calls such as customer listings/details.
- Search and listing screens should support pagination and delayed search to reduce unnecessary requests.

### 5.3 Usability
- The app should provide clear role-based navigation and quick access to core workflows.
- Forms should be structured in modular sections (customer details, lift details, bill details, checklist sections).
- Action buttons should support common task flows such as preview, download, send, and back-navigation.

### 5.4 Local Development
- Vite dev server should proxy /api requests to the backend to avoid browser CORS issues locally.
- The frontend should not be configured to point directly to localhost backend URLs in the browser for local development.

## 6. Business Rules Derived from Existing Code
- A customer may have one or more lifts.
- A lift may have one or more AMC contracts.
- AMC status and due dates are central to dashboard metrics.
- Billing is generated from AMC/customer records and can be edited before download or sending.
- Service reports are linked to a specific customer and AMC contract.
- The app is strongly oriented around operational service accounting and field service management.

## 7. Constraints and Assumptions
- This document reflects requirements inferred from the frontend implementation and API usage, not from separate formal product requirements.
- The frontend assumes the backend already provides the domain entities and document generation services.
- The app currently does not include a dedicated role management screen beyond login and route gating.
- The current implementation focuses on operational admin and engineer workflows rather than customer self-service or public portal features.
