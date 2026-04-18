# Events & Activities — API Documentation

**Base URL:** `http://localhost:5000/api/v1`  
**Auth:** JWT via HTTP-only cookies (`accessToken`, `refreshToken`)  
**Response Format:**
```json
{ "success": true, "message": "...", "statusCode": 200, "data": {} }
```

---

## Authentication

All protected endpoints require the `accessToken` cookie (set automatically on login).  
Send credentials via cookies. For non-browser clients, pass `Authorization: Bearer <token>` header.

---

## 1. Auth `/api/v1/auth`

### `POST /auth/login`
**Public**

```json
// Request
{ "email": "user@example.com", "password": "min6chars" }

// Response
{
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "userId": "string",
    "role": "USER | ADMIN | SUPER_ADMIN | HOST"
  }
}
```
> Sets `accessToken` and `refreshToken` HTTP-only cookies.

---

### `POST /auth/logout`
**Public**

No body required. Clears auth cookies.

---

### `POST /auth/get-new-token`
**Public** — requires `refreshToken` cookie

No body required. Returns new access + refresh tokens and resets cookies.

---

### `POST /auth/reset-password`
**Auth required (any role)**

```json
{ "newPassword": "min6chars" }
```

---

### `POST /auth/change-password`
**Auth required (any role)**

```json
{ "currentPassword": "string", "newPassword": "string" }
```

---

## 2. Users `/api/v1/users`

### `POST /users/register`
**Public**

```json
// Request
{ "name": "string (min 3)", "email": "string", "password": "string (min 6)" }

// Response 201
{
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "USER",
    "isHost": false,
    "gender": "MALE | FEMALE | null",
    "dob": "date | null",
    "address": "string | null",
    "contactNumber": "string | null",
    "bio": "string | null",
    "profileImage": "url | null",
    "status": "ACTIVE",
    "isVerified": false,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

---

### `GET /users/`
**Auth required: ADMIN, SUPER_ADMIN**

| Query Param  | Type   | Description                                |
|--------------|--------|--------------------------------------------|
| `page`       | number | Default: 1                                 |
| `limit`      | number | Default: 10                                |
| `sortBy`     | string | Default: createdAt                         |
| `sortOrder`  | string | `asc` or `desc`                            |
| `searchTerm` | string | Searches name, email, contactNumber, etc.  |
| `status`     | string | `ACTIVE` \| `INACTIVE` \| `BLOCKED`        |
| `role`       | string | `USER` \| `ADMIN` \| `SUPER_ADMIN` \| `HOST` |
| `gender`     | string | `MALE` \| `FEMALE`                         |

```json
// Response
{
  "data": {
    "meta": { "page": 1, "limit": 10, "totalPage": 5, "total": 50 },
    "data": [{ /* User objects */ }]
  }
}
```

---

### `GET /users/me`
**Auth required (any role)**

Returns current user's profile (no password field).

---

### `GET /users/:userId`
**Auth required (any role)**

Returns user by UUID (no password field).

---

### `PATCH /users/`
**Auth required (any role)** — Updates current user profile

Send as `multipart/form-data` if uploading a profile image (key: `file`).  
All fields optional:

```json
{
  "name": "string (min 2)",
  "email": "string",
  "gender": "MALE | FEMALE",
  "dob": "date",
  "address": "string (min 3)",
  "contactNumber": "string (min 10 digits)",
  "bio": "string",
  "profileImage": "url"
}
```

---

### `DELETE /users/:userId`
**Auth required: ADMIN, SUPER_ADMIN**

Deletes user by UUID. Returns deleted user object.

---

## 3. Events `/api/v1/events`

### `POST /events/create-event`
**Auth required: USER, HOST, ADMIN, SUPER_ADMIN**

Send as `multipart/form-data`. Images key: `files` (jpg/png only, multiple allowed).

```json
// Form fields
{
  "title": "string (min 3)",
  "category": "string (min 2)",
  "description": "string (min 10)",
  "date": "2025-12-01",
  "time": "14:00",
  "location": "string (min 3)",
  "minParticipants": "5",
  "maxParticipants": "50",
  "fee": "0"
}

// Response 201
{
  "data": {
    "id": "uuid",
    "title": "string",
    "slug": "string (auto-generated, unique)",
    "category": "string",
    "description": "string",
    "date": "timestamp",
    "time": "string",
    "location": "string",
    "minParticipants": 5,
    "maxParticipants": 50,
    "totalParticipants": 0,
    "fee": 0,
    "images": ["cloudinary-url"],
    "status": "OPEN",
    "hostId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```
> If a USER creates an event, their role automatically upgrades to HOST.

---

### `GET /events/`
**Public**

| Query Param  | Type   | Description                                      |
|--------------|--------|--------------------------------------------------|
| `page`       | number | Default: 1                                       |
| `limit`      | number | Default: 10                                      |
| `sortBy`     | string | Default: createdAt                               |
| `sortOrder`  | string | `asc` or `desc`                                  |
| `searchTerm` | string | Searches title, category, location, description  |
| `status`     | string | `OPEN` \| `FULL` \| `CANCELLED` \| `COMPLETED`   |
| `category`   | string | Filter by category                               |
| `hostId`     | string | Filter by host UUID                              |

---

### `GET /events/category`
**Public**

Returns list of all unique event categories.

```json
{ "data": ["Music", "Sports", "Tech", ...] }
```

---

### `GET /events/:slug`
**Public**

Returns full event object by slug.

---

### `PATCH /events/update/:slug`
**Auth required: event creator only**

Send as `multipart/form-data` if uploading new images (key: `files`).  
All fields optional:

```json
{
  "title": "string",
  "category": "string",
  "description": "string",
  "date": "date",
  "time": "string",
  "location": "string",
  "minParticipants": 5,
  "maxParticipants": 100,
  "fee": 0,
  "deleteImages": ["url-to-remove"],
  "status": "OPEN | FULL | CANCELLED | COMPLETED"
}
```

---

### `DELETE /events/:slug`
**Auth required: event creator only**

Deletes event by slug.

---

## 4. Event Participants `/api/v1/event-participants`

### `POST /event-participants/join-event`
**Auth required (any role)**

```json
// Request
{ "eventId": "uuid" }

// Response 201
{
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "userId": "uuid",
    "hostId": "uuid",
    "joinStatus": "PENDING | APPROVED",
    "paymentStatus": "PENDING | PAID",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```
> If event fee is **0**: `joinStatus` auto-set to `APPROVED`, `paymentStatus` auto-set to `PAID`.  
> If event fee > 0: both remain `PENDING` until payment is made.  
> Cannot join own event, cancelled/full/completed events, or same event twice.

---

### `GET /event-participants/`
**Public**

| Query Param      | Type   | Description                                               |
|------------------|--------|-----------------------------------------------------------|
| `page`           | number | Default: 1                                                |
| `limit`          | number | Default: 10                                               |
| `searchTerm`     | string | Searches user name, email, host name, event title         |
| `joinStatus`     | string | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`     |
| `paymentStatus`  | string | `PENDING` \| `PAID` \| `CANCELLED` \| `REJECTED` \| `FAILED` \| `REFUNDED` |
| `eventId`        | string | Filter by event UUID                                      |
| `userId`         | string | Filter by user UUID                                       |
| `hostId`         | string | Filter by host UUID                                       |

---

### `GET /event-participants/:id`
**Auth required (any role)**

Returns single participant record by UUID.

---

### `PATCH /event-participants/:id`
**Auth required — participant only**

```json
{ "joinStatus": "CANCELLED" }
```
> Only `CANCELLED` or `REJECTED` values accepted.

---

### `DELETE /event-participants/:id`
**Auth required: ADMIN, SUPER_ADMIN**

Deletes participant record by UUID.

---

## 5. Payment `/api/v1/payment`

### `POST /payment/init-payment/:participantId`
**Public**

Initializes SSLCommerz payment for a participant.

```json
// Response
{ "data": { "paymentUrl": "https://sslcommerz-gateway-url..." } }
```
> Redirect user to `paymentUrl` to complete payment.

---

### `POST /payment/success`
**Webhook — SSLCommerz callback**

Handles successful payment. Redirects user to frontend success page.  
Updates `paymentStatus → PAID` and `joinStatus → APPROVED`.

---

### `POST /payment/fail`
**Webhook — SSLCommerz callback**

Handles failed payment. Redirects to frontend fail page.

---

### `POST /payment/cancel`
**Webhook — SSLCommerz callback**

Handles cancelled payment. Redirects to frontend cancel page.

---

### `POST /payment/validate-payment`
**Webhook — SSLCommerz IPN**

Validates payment via Instant Payment Notification.

---

## 6. Dashboard `/api/v1/dashboard`

### `GET /dashboard/meta-data`
**Auth required: ADMIN, SUPER_ADMIN**

| Query Param  | Type   | Description                          |
|--------------|--------|--------------------------------------|
| `startDate`  | string | ISO date (optional)                  |
| `endDate`    | string | ISO date (optional)                  |
| `duration`   | string | `7days` \| `15days` \| `1month`      |

```json
// Response
{
  "data": {
    "totalUsers": 100,
    "totalEvents": 25,
    "totalRevenue": 5000,
    "totalParticipants": 300
  }
}
```

---

## Enums Reference

| Enum             | Values                                                      |
|------------------|-------------------------------------------------------------|
| **Role**         | `USER`, `HOST`, `ADMIN`, `SUPER_ADMIN`                      |
| **UserStatus**   | `ACTIVE`, `INACTIVE`, `BLOCKED`                             |
| **Gender**       | `MALE`, `FEMALE`                                            |
| **EventStatus**  | `OPEN`, `FULL`, `CANCELLED`, `COMPLETED`                    |
| **JoinStatus**   | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`              |
| **PaymentStatus**| `PENDING`, `PAID`, `CANCELLED`, `REJECTED`, `FAILED`, `REFUNDED` |

---

## Quick Reference Table

| Method   | Endpoint                                   | Auth             | Public |
|----------|--------------------------------------------|------------------|--------|
| `POST`   | `/auth/login`                              | —                | ✅     |
| `POST`   | `/auth/logout`                             | —                | ✅     |
| `POST`   | `/auth/get-new-token`                      | —                | ✅     |
| `POST`   | `/auth/reset-password`                     | Any role         | ❌     |
| `POST`   | `/auth/change-password`                    | Any role         | ❌     |
| `POST`   | `/users/register`                          | —                | ✅     |
| `GET`    | `/users/`                                  | ADMIN+           | ❌     |
| `GET`    | `/users/me`                                | Any role         | ❌     |
| `GET`    | `/users/:userId`                           | Any role         | ❌     |
| `PATCH`  | `/users/`                                  | Any role         | ❌     |
| `DELETE` | `/users/:userId`                           | ADMIN+           | ❌     |
| `POST`   | `/events/create-event`                     | Any role         | ❌     |
| `GET`    | `/events/`                                 | —                | ✅     |
| `GET`    | `/events/category`                         | —                | ✅     |
| `GET`    | `/events/:slug`                            | —                | ✅     |
| `PATCH`  | `/events/update/:slug`                     | Creator only     | ❌     |
| `DELETE` | `/events/:slug`                            | Creator only     | ❌     |
| `POST`   | `/event-participants/join-event`           | Any role         | ❌     |
| `GET`    | `/event-participants/`                     | —                | ✅     |
| `GET`    | `/event-participants/:id`                  | Any role         | ❌     |
| `PATCH`  | `/event-participants/:id`                  | Participant only | ❌     |
| `DELETE` | `/event-participants/:id`                  | ADMIN+           | ❌     |
| `POST`   | `/payment/init-payment/:participantId`     | —                | ✅     |
| `POST`   | `/payment/success`                         | Webhook          | ✅     |
| `POST`   | `/payment/fail`                            | Webhook          | ✅     |
| `POST`   | `/payment/cancel`                          | Webhook          | ✅     |
| `POST`   | `/payment/validate-payment`               | Webhook          | ✅     |
| `GET`    | `/dashboard/meta-data`                     | ADMIN+           | ❌     |