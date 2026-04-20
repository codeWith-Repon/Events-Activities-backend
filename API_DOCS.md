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

### `PATCH /users/:userId/status`
**Auth required: ADMIN, SUPER_ADMIN**

Block or unblock a user account.

```json
// Request
{ "status": "BLOCKED" }   // or "ACTIVE"

// Response
{ "data": { /* updated user object (no password) */ } }
```

> A `BLOCKED` user cannot log in. Does not delete any data.

---

### `PATCH /users/:userId/role`
**Auth required: SUPER_ADMIN only**

Promote or demote a user's role. Promoting to `HOST` automatically creates a `Host` record if one doesn't exist.

```json
// Request
{ "role": "HOST" }   // "USER" | "HOST" | "ADMIN"

// Response
{ "data": { /* updated user object (no password) */ } }
```

> Only `SUPER_ADMIN` can use this endpoint to prevent privilege escalation.

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
> If event is **FULL**: `joinStatus` is set to `WAITLISTED`. When an approved participant cancels or is rejected, the oldest waitlisted participant is automatically approved and the event stays `FULL`. If no one is waitlisted, the event returns to `OPEN`.  
> Cannot join own event, cancelled/completed events, or same event twice.

---

### `GET /event-participants/`
**Public**

| Query Param      | Type   | Description                                               |
|------------------|--------|-----------------------------------------------------------|
| `page`           | number | Default: 1                                                |
| `limit`          | number | Default: 10                                               |
| `searchTerm`     | string | Searches user name, email, host name, event title         |
| `joinStatus`     | string | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED` \| `WAITLISTED` |
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

### `GET /payment`
**Auth required: ADMIN, SUPER_ADMIN**

Lists all payments with optional filters.

| Query Param     | Type   | Description                                      |
|-----------------|--------|--------------------------------------------------|
| `paymentStatus` | string | `PENDING` \| `PAID` \| `FAILED` \| `REFUNDED` etc |
| `eventId`       | string | Filter by event UUID                             |
| `userId`        | string | Filter by user UUID                              |
| `page`          | number | Default: 1                                       |
| `limit`         | number | Default: 10                                      |

```json
// Response
{
  "data": {
    "meta": { "page": 1, "limit": 10, "totalPage": 3, "total": 28 },
    "data": [
      {
        "id": "uuid",
        "amount": 500,
        "paymentStatus": "PAID",
        "transactionId": "TXN-...",
        "user": { "name": "Alice", "email": "alice@example.com" },
        "event": { "title": "Beach Cleanup", "slug": "beach-cleanup" },
        "createdAt": "timestamp"
      }
    ]
  }
}
```

---

### `PATCH /payment/:paymentId/refund`
**Auth required: ADMIN, SUPER_ADMIN**

Manually refunds a `PAID` payment. Sets payment to `REFUNDED` and participant `joinStatus` to `CANCELLED`.

```json
// Response
{ "data": null, "message": "Payment refunded" }
```

> Only `PAID` payments can be refunded. Returns `400` for any other status.

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

### `GET /dashboard/revenue-report`
**Auth required: ADMIN, SUPER_ADMIN**

Returns platform-wide revenue analytics.

```json
// Response
{
  "data": {
    "topEvents": [
      { "id": "uuid", "title": "Beach Cleanup", "slug": "beach-cleanup", "revenue": 2500 }
    ],
    "topHosts": [
      { "hostId": "uuid", "name": "John Doe", "revenue": 4800 }
    ],
    "monthlyRevenue": [
      { "month": "2026-01", "revenue": 1200 },
      { "month": "2026-02", "revenue": 1750 }
    ]
  }
}
```

> `topEvents` and `topHosts` are limited to top 10. `monthlyRevenue` covers all time.

---

## 7. Notifications `/api/v1/notifications`

> All endpoints require authentication. Each user only sees their own notifications.

**Notification types**

| Type | Trigger |
|------|---------|
| `PARTICIPANT_APPROVED` | Joined a free event / host approves |
| `PARTICIPANT_REJECTED` | Host rejects a join request |
| `PARTICIPANT_WAITLISTED` | Joined a full event (added to waitlist) |
| `WAITLIST_PROMOTED` | Auto-approved when a spot opens up |
| `EVENT_CANCELLED` | Host cancels an event you're approved for |
| `EVENT_REMINDER` | 24 h before an event you're attending (cron, hourly) |

---

### `GET /notifications/`
**Auth required (any role)**

Returns all notifications for the logged-in user, newest first.

```json
// Response
{
  "data": [
    {
      "id": "uuid",
      "type": "PARTICIPANT_APPROVED",
      "title": "You're in!",
      "message": "Your spot for \"Beach Volleyball\" has been confirmed.",
      "isRead": false,
      "createdAt": "timestamp"
    }
  ]
}
```

---

### `GET /notifications/unread-count`
**Auth required (any role)**

```json
{ "data": { "unread": 3 } }
```

---

### `PATCH /notifications/read-all`
**Auth required (any role)**

Marks every unread notification as read.

```json
{ "data": { "updated": 3 } }
```

---

### `PATCH /notifications/:notificationId/read`
**Auth required (any role)**

Marks a single notification as read.

---

### `DELETE /notifications/:notificationId`
**Auth required (any role)**

Deletes a single notification.

---

## 8. Invitations `/api/v1/invitations`

> **Business rules:**
> - Only the event's **host** can send, revoke, or list invitations.
> - Invitations expire after **7 days**. Accepting an expired token returns `410 Gone`.
> - One active invitation per email per event. Re-inviting after `DECLINED` or `REVOKED` creates a fresh invitation (new token).
> - Accepting an invitation auto-sets `joinStatus: APPROVED` regardless of event capacity — the host chose to invite them.
> - For **paid** events the accepted participant still needs to complete payment (`paymentStatus` stays `PENDING`).
> - If SMTP env vars are not set, no email is sent but the `inviteLink` is still returned in the API response.

---

### `POST /invitations/send`
**Auth required — host only**

```json
// Request
{ "eventId": "uuid", "email": "invitee@example.com" }

// Response 201
{
  "data": {
    "invitation": {
      "id": "uuid",
      "eventId": "uuid",
      "hostId": "uuid",
      "email": "invitee@example.com",
      "token": "hex-string",
      "status": "PENDING",
      "expiresAt": "timestamp",
      "createdAt": "timestamp"
    },
    "inviteLink": "https://your-frontend.com/events/invite/accept?token=..."
  }
}
```

| Status | Reason |
|--------|--------|
| 403    | Authenticated user is not a host, or does not own the event |
| 404    | Event not found |
| 400    | Event is CANCELLED or COMPLETED |
| 409    | Active invitation already exists for this email |

---

### `POST /invitations/accept/:token`
**Auth required (any role)**

The frontend extracts `token` from the invite link query param and calls this endpoint after the user logs in.

```json
// Response 200
{
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "userId": "uuid",
    "joinStatus": "APPROVED",
    "paymentStatus": "PAID | PENDING",
    "createdAt": "timestamp"
  }
}
```

| Status | Reason |
|--------|--------|
| 404    | Token not found |
| 400    | Invitation already accepted / declined / revoked |
| 410    | Invitation has expired |
| 400    | Event is CANCELLED or COMPLETED |
| 409    | User has already joined the event |

---

### `POST /invitations/decline/:token`
**Auth required (any role)**

```json
// Response 200 — returns updated invitation with status: "DECLINED"
```

---

### `PATCH /invitations/revoke/:invitationId`
**Auth required — host only**

Cancels a pending invitation. The token becomes invalid.

```json
// Response 200 — returns updated invitation with status: "REVOKED"
```

---

### `GET /invitations/events/:eventId`
**Auth required — host only**

Returns all invitations for the given event (all statuses), newest first.

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "email": "string",
      "status": "PENDING | ACCEPTED | DECLINED | REVOKED",
      "expiresAt": "timestamp",
      "createdAt": "timestamp"
    }
  ]
}
```

---

## 8. Ratings `/api/v1/ratings`

> **Business rules:**
> - A user can only rate an event they **participated in** (must have a valid `eventParticipant` record).
> - The event must be in **COMPLETED** status before a rating can be submitted.
> - A host **cannot** rate their own event.
> - Each user can submit **one rating per event**. Use `PATCH` to update it.
> - On every create / update / delete, the **host's overall rating** (average across all their completed-event ratings) is automatically recalculated and saved on the `Host` record.

---

### `POST /ratings/create`
**Auth required (any role)**

```json
// Request
{
  "participantId": "uuid",   // your eventParticipant record ID
  "rating": 4,               // integer 1–5
  "review": "Great event!"   // optional, max 500 chars
}

// Response 201
{
  "data": {
    "id": "uuid",
    "eventId": "uuid",
    "userId": "uuid",
    "participantId": "uuid",
    "rating": 4,
    "review": "Great event!",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "rater": { "id": "uuid", "name": "string", "email": "string", "profileImage": "url | null" },
    "event": { "id": "uuid", "title": "string", "slug": "string" }
  }
}
```

**Error cases**

| Status | Reason |
|--------|--------|
| 404    | Participant record not found |
| 403    | Authenticated user is not the participant |
| 400    | Event is not COMPLETED yet |
| 400    | User is the host of the event |
| 409    | Rating already exists for this event — use PATCH |

---

### `GET /ratings/events/:eventId`
**Public**

Returns paginated ratings for a specific event. The `meta` object includes `avgRating` — the mean rating across **all** reviews for that event (not affected by active filters).

| Query Param    | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| `page`         | number | Default: 1                                     |
| `limit`        | number | Default: 10                                    |
| `sortBy`       | string | Default: `createdAt`                           |
| `sortOrder`    | string | `asc` or `desc`                                |
| `searchTerm`   | string | Searches `review`, `event.title`, `rater.name`, `rater.email` |
| `rating`       | number | Filter by exact star value (`1`–`5`)           |
| `participantId`| string | Filter by participant UUID                     |

```json
// Response
{
  "meta": { "page": 1, "limit": 10, "totalPage": 3, "total": 25, "avgRating": 4.2 },
  "data": [
    {
      "id": "uuid",
      "rating": 4,
      "review": "string | null",
      "createdAt": "timestamp",
      "rater": { "id": "uuid", "name": "string", "email": "string", "profileImage": "url | null" },
      "event": { "id": "uuid", "title": "string", "slug": "string" }
    }
  ]
}
```

---

### `GET /ratings/users/:userId`
**Public**

Returns paginated ratings submitted by a specific user.

| Query Param    | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| `page`         | number | Default: 1                                     |
| `limit`        | number | Default: 10                                    |
| `sortBy`       | string | Default: `createdAt`                           |
| `sortOrder`    | string | `asc` or `desc`                                |
| `searchTerm`   | string | Searches `review`, `event.title`, `rater.name`, `rater.email` |
| `rating`       | number | Filter by exact star value (`1`–`5`)           |
| `eventId`      | string | Filter by event UUID                           |
| `participantId`| string | Filter by participant UUID                     |

```json
// Response
{
  "meta": { "page": 1, "limit": 10, "totalPage": 1, "total": 3 },
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "review": "string | null",
      "createdAt": "timestamp",
      "event": {
        "id": "uuid",
        "title": "string",
        "slug": "string",
        "host": { "user": { "name": "string", "email": "string" } }
      }
    }
  ]
}
```

---

### `GET /ratings/:ratingId`
**Public**

Returns a single rating by UUID.

```json
// Response
{
  "data": {
    "id": "uuid",
    "rating": 4,
    "review": "string | null",
    "eventId": "uuid",
    "userId": "uuid",
    "participantId": "uuid",
    "createdAt": "timestamp",
    "updatedAt": "timestamp",
    "rater": { "id": "uuid", "name": "string", "email": "string", "profileImage": "url | null" },
    "event": { "id": "uuid", "title": "string", "slug": "string" }
  }
}
```

---

### `PATCH /ratings/:ratingId`
**Auth required — rating creator only**

At least one field must be provided.

```json
// Request
{
  "rating": 5,              // optional, integer 1–5
  "review": "Updated text"  // optional, max 500 chars, send empty string to clear
}
```

> If `rating` value changes, the host's overall average is automatically recalculated.

---

### `DELETE /ratings/:ratingId`
**Auth required — rating creator only**

Deletes the rating and recalculates the host's overall average rating.

```json
// Response
{ "data": null, "message": "Rating deleted successfully" }
```

---

## 10. Check-in `/api/v1/check-in`

Handles QR-based attendance tracking on event day.

**Flow:**
1. Approved participant calls `GET /check-in/qr/:participantId` → receives a `checkInToken`
2. Frontend renders a QR code from that token (e.g. `react-qr-code`)
3. Host scans the QR on event day → frontend sends the decoded token to `POST /check-in`
4. Host can view the full attendance summary via `GET /check-in/attendance/:eventId`

---

### `GET /check-in/qr/:participantId`
**Auth required — participant themselves or the event host**

Returns the raw check-in token for an approved participant. The frontend uses this to render a QR code.

```json
// Response
{
  "data": {
    "checkInToken": "a3f8c2e1...",   // 32-char hex token — encode this as QR
    "eventTitle": "Beach Cleanup",
    "eventDate": "2026-05-10T09:00:00.000Z"
  }
}
```

> Only available when `joinStatus` is `APPROVED`. Returns `400` for pending/waitlisted/cancelled participants.

---

### `POST /check-in`
**Auth required — event host only**

Marks a participant as attended. The `token` comes from scanning the participant's QR code.

```json
// Request
{ "token": "a3f8c2e1..." }

// Response
{
  "data": {
    "id": "string",
    "checkedIn": true,
    "checkedInAt": "2026-05-10T09:14:32.000Z",
    "joinStatus": "APPROVED",
    ...
  }
}
```

**Error cases:**
| Status | Reason |
|--------|--------|
| `404`  | Token not found / invalid |
| `400`  | Already checked in |
| `400`  | Participant not approved |
| `400`  | Not event day (`checkedInAt` date ≠ today) |
| `403`  | Caller is not the event host |

---

### `GET /check-in/attendance/:eventId`
**Auth required — event host only**

Returns a full attendance summary for an event.

```json
// Response
{
  "data": {
    "total": 20,
    "attended": 14,
    "absent": 6,
    "participants": [
      {
        "id": "string",
        "checkedIn": true,
        "checkedInAt": "2026-05-10T09:14:32.000Z",
        "user": { "name": "Alice", "email": "alice@example.com", "profileImage": "url" }
      }
    ]
  }
}
```

> Only `APPROVED` participants are included. Results are ordered by `checkedInAt` (most recent first, unchecked participants last).

---

## 11. Co-hosts `/api/v1/co-hosts`

Allows a primary host to delegate event management to other hosts. Co-hosts share most host permissions except deleting the event or managing other co-hosts.

**Co-host permissions:**
| Action | Primary Host | Co-host |
|---|---|---|
| Update event details | ✅ | ✅ |
| Approve / reject participants | ✅ | ✅ |
| Check in participants | ✅ | ✅ |
| Send invitations | ✅ | ✅ |
| View attendance | ✅ | ✅ |
| Delete event | ✅ | ❌ |
| Add / remove co-hosts | ✅ | ❌ |

---

### `GET /co-hosts/events/:eventId`
**Public**

Lists all co-hosts assigned to an event.

```json
// Response
{
  "data": [
    {
      "id": "string",
      "eventId": "string",
      "hostId": "string",
      "assignedAt": "2026-05-01T10:00:00.000Z",
      "host": {
        "user": { "name": "Jane Doe", "email": "jane@example.com", "profileImage": "url" }
      }
    }
  ]
}
```

---

### `POST /co-hosts/events/:eventId`
**Auth required — primary host only**

Assigns a host as co-host for an event. The target user must already have a host account.

```json
// Request
{ "userId": "target-user-uuid" }

// Response
{
  "data": {
    "id": "string",
    "eventId": "string",
    "hostId": "string",
    "assignedAt": "2026-05-01T10:00:00.000Z",
    "host": {
      "user": { "name": "Jane Doe", "email": "jane@example.com", "profileImage": "url" }
    }
  }
}
```

**Error cases:**
| Status | Reason |
|--------|--------|
| `403`  | Caller is not the primary host of this event |
| `404`  | Target user is not a host |
| `400`  | Target user is the primary host (already owns the event) |
| `400`  | User is already a co-host |

---

### `DELETE /co-hosts/events/:eventId/:hostId`
**Auth required — primary host only**

Removes a co-host from an event. `:hostId` is the `Host.id` (not `userId`).

```json
// Response
{ "data": null, "message": "Co-host removed" }
```

---

## 12. Event Analytics `/api/v1/events`

Per-event statistics available to the primary host and co-hosts. View count increments on every public `GET /events/:slug` call.

---

### `GET /events/:slug/analytics`
**Auth required — host or co-host only**

Returns a full stats breakdown for a single event.

```json
// Response
{
  "data": {
    "views": 312,
    "participants": {
      "total": 48,
      "approved": 30,
      "pending": 5,
      "rejected": 3,
      "cancelled": 4,
      "waitlisted": 6
    },
    "capacity": {
      "max": 50,
      "filled": 30,
      "fillRate": 0.6        // approved / maxParticipants
    },
    "revenue": {
      "collected": 1500,     // sum of PAID payments
      "pending": 250,        // sum of PENDING payments
      "refunded": 0          // sum of REFUNDED payments
    },
    "checkin": {
      "checkedIn": 22,
      "absent": 8,
      "attendanceRate": 0.73  // checkedIn / approved
    }
  }
}
```

> `revenue` fields are `0` for free events. `checkin` stats are `0` until event day check-ins begin.

---

## 13. Event Moderation `/api/v1/events`

Admin-only actions on any event regardless of host ownership.

---

### `PATCH /events/:eventId/force-cancel`
**Auth required: ADMIN, SUPER_ADMIN**

Force-cancels any event by its UUID. Notifies all approved participants via in-app notification and email.

```json
// Response
{ "data": null, "message": "Event force-cancelled" }
```

**Error cases:**
| Status | Reason |
|--------|--------|
| `404`  | Event not found |
| `400`  | Event is already cancelled |

---

## 14. Host Management `/api/v1/hosts`

Admin endpoints for managing host accounts and viewing host performance.

---

### `GET /hosts`
**Auth required: ADMIN, SUPER_ADMIN**

Paginated list of all hosts with their user info and event count.

| Query Param | Type   | Description        |
|-------------|--------|--------------------|
| `page`      | number | Default: 1         |
| `limit`     | number | Default: 10        |
| `sortBy`    | string | Default: createdAt |
| `sortOrder` | string | `asc` or `desc`    |

```json
// Response
{
  "data": {
    "meta": { "page": 1, "limit": 10, "totalPage": 2, "total": 15 },
    "data": [
      {
        "id": "uuid",
        "isVerified": true,
        "rating": 4.5,
        "totalEventsHosted": 8,
        "user": { "name": "Jane", "email": "jane@example.com", "profileImage": "url", "status": "ACTIVE" },
        "_count": { "events": 8 }
      }
    ]
  }
}
```

---

### `GET /hosts/:hostId/stats`
**Auth required: ADMIN, SUPER_ADMIN**

Returns detailed stats for a single host.

```json
// Response
{
  "data": {
    "host": {
      "id": "uuid",
      "rating": 4.5,
      "isVerified": true,
      "user": { "name": "Jane", "email": "jane@example.com", "profileImage": "url" }
    },
    "stats": {
      "totalEvents": 8,
      "totalParticipants": 142,
      "totalRevenue": 7100,
      "averageRating": 4.5
    }
  }
}
```

---

### `PATCH /hosts/:hostId/verify`
**Auth required: ADMIN, SUPER_ADMIN**

Toggle the verified badge on a host account.

```json
// Request
{ "isVerified": true }   // or false to revoke

// Response
{ "data": { /* updated host object */ } }
```

---

## 15. Content Reports `/api/v1/reports`

Users can report events or ratings. Admins review and resolve them.

---

### `POST /reports`
**Auth required (any role)**

Submit a report about an event or a rating.

```json
// Request
{
  "type": "EVENT",          // "EVENT" | "RATING"
  "targetId": "uuid",       // eventId or ratingId
  "reason": "Misleading description"
}

// Response 201
{
  "data": {
    "id": "uuid",
    "type": "EVENT",
    "targetId": "uuid",
    "reason": "Misleading description",
    "status": "PENDING",
    "reporterId": "uuid",
    "createdAt": "timestamp"
  }
}
```

---

### `GET /reports`
**Auth required: ADMIN, SUPER_ADMIN**

Lists all reports with optional filters.

| Query Param | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `type`      | string | `EVENT` \| `RATING`                      |
| `status`    | string | `PENDING` \| `RESOLVED` \| `DISMISSED`   |
| `page`      | number | Default: 1                               |
| `limit`     | number | Default: 10                              |

```json
// Response
{
  "data": {
    "meta": { "page": 1, "limit": 10, "totalPage": 1, "total": 4 },
    "data": [
      {
        "id": "uuid",
        "type": "EVENT",
        "targetId": "uuid",
        "reason": "Misleading description",
        "status": "PENDING",
        "adminNote": null,
        "reporter": { "name": "Alice", "email": "alice@example.com" },
        "createdAt": "timestamp"
      }
    ]
  }
}
```

---

### `PATCH /reports/:reportId`
**Auth required: ADMIN, SUPER_ADMIN**

Resolve or dismiss a pending report. Optionally add an admin note.

```json
// Request
{
  "status": "RESOLVED",           // "RESOLVED" | "DISMISSED"
  "adminNote": "Content removed"  // optional
}

// Response
{ "data": { /* updated report object */ } }
```

> Returns `400` if the report is already resolved or dismissed.

---

## Enums Reference

| Enum             | Values                                                      |
|------------------|-------------------------------------------------------------|
| **Role**         | `USER`, `HOST`, `ADMIN`, `SUPER_ADMIN`                      |
| **UserStatus**   | `ACTIVE`, `INACTIVE`, `BLOCKED`                             |
| **Gender**       | `MALE`, `FEMALE`                                            |
| **EventStatus**  | `OPEN`, `FULL`, `CANCELLED`, `COMPLETED`                    |
| **JoinStatus**       | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `WAITLISTED` |
| **InvitationStatus** | `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED`                              |
| **NotificationType** | `EVENT_REMINDER`, `PARTICIPANT_APPROVED`, `PARTICIPANT_REJECTED`, `PARTICIPANT_WAITLISTED`, `WAITLIST_PROMOTED`, `EVENT_CANCELLED` |
| **PaymentStatus**| `PENDING`, `PAID`, `CANCELLED`, `REJECTED`, `FAILED`, `REFUNDED` |
| **ReportType**   | `EVENT`, `RATING`                                           |
| **ReportStatus** | `PENDING`, `RESOLVED`, `DISMISSED`                          |

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
| `PATCH`  | `/users/:userId/status`                    | ADMIN+           | ❌     |
| `PATCH`  | `/users/:userId/role`                      | SUPER_ADMIN      | ❌     |
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
| `GET`    | `/payment`                                 | ADMIN+           | ❌     |
| `PATCH`  | `/payment/:paymentId/refund`               | ADMIN+           | ❌     |
| `GET`    | `/dashboard/meta-data`                     | ADMIN+           | ❌     |
| `GET`    | `/dashboard/revenue-report`                | ADMIN+           | ❌     |
| `PATCH`  | `/events/:eventId/force-cancel`            | ADMIN+           | ❌     |
| `GET`    | `/hosts`                                   | ADMIN+           | ❌     |
| `GET`    | `/hosts/:hostId/stats`                     | ADMIN+           | ❌     |
| `PATCH`  | `/hosts/:hostId/verify`                    | ADMIN+           | ❌     |
| `POST`   | `/reports`                                 | Any role         | ❌     |
| `GET`    | `/reports`                                 | ADMIN+           | ❌     |
| `PATCH`  | `/reports/:reportId`                       | ADMIN+           | ❌     |
| `POST`   | `/invitations/send`                        | Host only        | ❌     |
| `POST`   | `/invitations/accept/:token`               | Any role         | ❌     |
| `POST`   | `/invitations/decline/:token`              | Any role         | ❌     |
| `PATCH`  | `/invitations/revoke/:invitationId`        | Host only        | ❌     |
| `GET`    | `/invitations/events/:eventId`             | Host only        | ❌     |
| `GET`    | `/notifications/`                          | Any role         | ❌     |
| `GET`    | `/notifications/unread-count`              | Any role         | ❌     |
| `PATCH`  | `/notifications/read-all`                  | Any role         | ❌     |
| `PATCH`  | `/notifications/:notificationId/read`      | Any role         | ❌     |
| `DELETE` | `/notifications/:notificationId`           | Any role         | ❌     |
| `GET`    | `/check-in/qr/:participantId`              | Participant/Host | ❌     |
| `POST`   | `/check-in`                                | Host only        | ❌     |
| `GET`    | `/check-in/attendance/:eventId`            | Host only        | ❌     |
| `GET`    | `/events/:slug/analytics`                  | Host/Co-host     | ❌     |
| `GET`    | `/co-hosts/events/:eventId`                | —                | ✅     |
| `POST`   | `/co-hosts/events/:eventId`                | Primary host     | ❌     |
| `DELETE` | `/co-hosts/events/:eventId/:hostId`        | Primary host     | ❌     |
| `POST`   | `/ratings/create`                          | Any role         | ❌     |
| `GET`    | `/ratings/events/:eventId`                 | —                | ✅     |
| `GET`    | `/ratings/users/:userId`                   | —                | ✅     |
| `GET`    | `/ratings/:ratingId`                       | —                | ✅     |
| `PATCH`  | `/ratings/:ratingId`                       | Creator only     | ❌     |
| `DELETE` | `/ratings/:ratingId`                       | Creator only     | ❌     |