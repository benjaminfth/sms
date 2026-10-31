# Brightloop SMS — API Contracts & Endpoint Specification

Base URL: `/api/v1`

All responses follow the unified envelope:
```json
{
  "success": true,
  "data": {},
  "meta": null,
  "error": null
}
```

---

## 1. Authentication Endpoints

### `POST /api/v1/auth/register`
Creates an account and linked customer profile in a single transaction.
- **Request:**
```json
{
  "email": "customer@example.com",
  "password": "StrongPass!2026",
  "fullName": "Demo Customer",
  "phone": "+91 98765 43210",
  "companyName": "Demo Technologies Pvt Ltd"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c1f7a0b5-...",
      "email": "customer@example.com",
      "fullName": "Demo Customer",
      "role": "CUSTOMER"
    },
    "customer": {
      "id": "e9a1b2c3-...",
      "companyName": "Demo Technologies Pvt Ltd"
    }
  },
  "meta": null,
  "error": null
}
```

### `POST /api/v1/auth/login`
Authenticates credentials, returns access token, and sets refresh token in `HttpOnly` cookie.
- **Request:**
```json
{
  "email": "admin@brightloop.demo",
  "password": "Brightloop!2026"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "a1b2c3d4-...",
      "email": "admin@brightloop.demo",
      "fullName": "Brightloop Admin",
      "role": "ADMIN"
    }
  },
  "meta": null,
  "error": null
}
```

### `POST /api/v1/auth/refresh`
Rotates refresh token and issues new JWT access token.
- **Cookie:** `refreshToken=<token>`
- **Response (200 OK):** Returns fresh `accessToken` and user object.

### `POST /api/v1/auth/logout`
Revokes refresh token and clears cookie.
- **Response (200 OK):** `{ "message": "Logged out successfully" }`

### `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password`
Handles password recovery with single-use hashed tokens.

---

## 2. User & Staff Management (`ADMIN` only)

- `POST /api/v1/users/staff`: Create a new Staff or Admin account.
- `GET /api/v1/users`: List users with pagination and search.
- `PATCH /api/v1/users/:id`: Update user profile and active status.
- `PUT /api/v1/users/:id/role`: Change user role (`ADMIN`, `STAFF`, `CUSTOMER`). Protects against removing the last active Admin.

---

## 3. Customer Management (`ADMIN`, `STAFF`, `CUSTOMER`)

- `POST /api/v1/customers`: Create customer profile directly (`ADMIN`, `STAFF`).
- `GET /api/v1/customers`: Paginated search across name, company, email, phone (`ADMIN`, `STAFF`).
- `GET /api/v1/customers/:id`: Retrieve customer. Customers can only retrieve their own record.
- `PATCH /api/v1/customers/:id`: Update customer details (address, tax ID, notes).

---

## 4. Product Management (`ADMIN`, `STAFF`)

- `POST /api/v1/products`: Create a product with base selling price (in minor units) and optional variants.
- `GET /api/v1/products`: List products with active/archived filters.
- `GET /api/v1/products/:id`: Get product and variant details.
- `PATCH /api/v1/products/:id`: Update product fields.
- `DELETE /api/v1/products/:id`: Archives the product (soft-delete) to preserve historical integrity.
- `POST /api/v1/products/:id/variants`: Add surcharge-based variant.
- `PATCH /api/v1/products/:id/variants/:variantId`: Update variant surcharge and active status.

---

## 5. Plan Management (`ADMIN`, `STAFF`)

- `POST /api/v1/plans`: Create subscription plan with price tiers (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) and included items. Validates that referenced products/variants are active.
- `GET /api/v1/plans`: List plans with prices and items.
- `GET /api/v1/plans/:id`: Retrieve single plan.
- `PATCH /api/v1/plans/:id`: Update plan metadata (name, description, dates).
- `POST /api/v1/plans/:id/activate`: Activate plan.
- `POST /api/v1/plans/:id/deactivate`: Deactivate plan.
