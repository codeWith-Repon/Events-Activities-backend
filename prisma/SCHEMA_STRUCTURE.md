# Prisma Schema Structure Documentation

## Overview

The Events & Activities backend uses a well-organized Prisma schema divided into logical sections for maintainability and clarity. All models are in a single `schema.prisma` file but organized by domain.

---

## Schema Sections

### 1. **Generator & Datasource** (Lines 1-14)
Configuration for Prisma client generation and PostgreSQL database connection.

```prisma
generator client { ... }
datasource db { ... }
```

---

### 2. **Enums** (Lines 17-51)
All enumeration types used across the application.

| Enum | Values | Purpose |
|------|--------|---------|
| `UserRole` | SUPER_ADMIN, ADMIN, USER, HOST | User access levels & permissions |
| `UserStatus` | ACTIVE, INACTIVE, BLOCKED | User account status |
| `Gender` | MALE, FEMALE | User demographic |
| `EventStatus` | OPEN, FULL, CANCELLED, COMPLETED | Event lifecycle status |
| `JoinStatus` | PENDING, APPROVED, REJECTED, CANCELLED | Participant approval status |
| `PaymentStatus` | PENDING, PAID, CANCELLED, REJECTED, FAILED, REFUNDED | Payment transaction status |

---

### 3. **Auth & User Models** (Lines 54-109)
User authentication and profile management.

#### **User Model** (Lines 56-95)
Core user record with authentication credentials and profile information.

**Key Fields:**
- `id` — UUID primary key
- `email` — Unique email for login
- `password` — Hashed password
- `role` — Authorization level (USER/HOST/ADMIN/SUPER_ADMIN)
- `status` — Account status (ACTIVE/INACTIVE/BLOCKED)
- `profile fields` — name, gender, dob, address, contactNumber, bio, profileImage

**Relations:**
- `hosts` — One-to-one relationship with Host model
- `eventParticipants` — One-to-many: user as participant
- `payments` — One-to-many: user's payments

---

#### **Host Model** (Lines 97-109)
Tracks users who host events and their metadata.

**Key Fields:**
- `id` — UUID primary key
- `userId` — FK to User (one-to-one, unique)
- `rating` — Host's average rating (0-5)
- `totalEventsHosted` — Counter for hosted events

**Relations:**
- `user` — Reference to User model
- `events` — One-to-many: events hosted by this user

**Usage Pattern:**
- When a USER creates an event, their role changes to HOST and a Host record is created
- Host record persists even after events are cancelled/completed
- Used to verify authorization for event management operations

---

### 4. **Event Models** (Lines 112-184)
Event creation, management, and participation tracking.

#### **Event Model** (Lines 114-161)
Represents an event that users can create and participate in.

**Key Fields:**
- `id` — UUID primary key
- `slug` — SEO-friendly unique identifier
- `title`, `category`, `description` — Event information
- `date`, `time`, `location` — Event scheduling & location
- `minParticipants`, `maxParticipants` — Capacity constraints
- `fee` — Registration fee (0 = free event)
- `images` — Array of Cloudinary image URLs
- `status` — Event lifecycle status
- `hostId` — FK to Host (event organizer)

**Relations:**
- `host` — Event organizer (many-to-one)
- `eventParticipants` — One-to-many: registered participants
- `payments` — One-to-many: payment records for paid events

**Indexes:**
- `status` — Filter events by OPEN/FULL/CANCELLED/COMPLETED
- `category` — Filter by event category
- `hostId` — Find events by host
- `createdAt` — Sort by recency

**Capacity Management:**
- Calculate current participants: `SELECT COUNT(*) FROM event_participants WHERE eventId=X AND joinStatus='APPROVED'`
- Check if full: `count >= maxParticipants`
- When full, status automatically changes to FULL

---

#### **EventParticipant Model** (Lines 163-184)
Junction table linking users to events as participants.

**Key Fields:**
- `id` — UUID primary key
- `eventId` — FK to Event
- `userId` — FK to User (the participant)
- `joinStatus` — Approval status (PENDING/APPROVED/REJECTED/CANCELLED)
- `paymentStatus` — Payment status for paid events

**Constraints:**
- `@@unique([eventId, userId])` — Prevent duplicate participation in same event

**Relations:**
- `event` — Reference to Event
- `user` — Reference to User
- `payments` — One-to-many: payment records for this participation

**Indexes:**
- `joinStatus` — Filter participants by approval status
- `paymentStatus` — Filter by payment status
- `createdAt` — Sort by join date

---

### 5. **Payment Models** (Lines 187-223)
Payment processing integration with SSLCommerz gateway.

#### **Payment Model** (Lines 189-223)
Records all payment transactions.

**Key Fields:**
- `id` — UUID primary key
- `userId` — FK to User (payer)
- `eventId` — FK to Event (for context)
- `participantId` — FK to EventParticipant (the specific participation being paid for)
- `amount` — Payment amount in BDT
- `transactionId` — Unique identifier from SSLCommerz (UNIQUE)
- `paymentStatus` — Transaction status
- `paymentGatewayData` — Full SSLCommerz response JSON
- `invoiceUrl` — Generated invoice URL

**Relations:**
- `user` — Payment payer
- `event` — Event being paid for
- `participant` — Optional direct link to EventParticipant

**Critical Design Note:**
- Always use `participantId` to link payments to specific participations
- **Never** use just `userId + eventId` combination (ambiguous if user joins same event multiple times)
- This ensures accurate payment tracking and auditability

**Indexes:**
- `transactionId` — Fast lookup by gateway transaction ID
- `paymentStatus` — Filter by PAID/PENDING/FAILED
- `participantId` — Link to specific participation
- `userId` — Find all user payments
- `createdAt` — Sort by payment date

---

## Key Design Decisions

### 1. **No totalParticipants Counter**
Instead of maintaining a counter column, calculate on-demand:
```sql
SELECT COUNT(*) FROM event_participants 
WHERE eventId = X AND joinStatus = 'APPROVED'
```

**Why:** Counters can drift due to transaction failures or manual deletes. Queries are always accurate.

---

### 2. **Host Tracking via Role + Host Table**
Instead of a boolean `isHost` field:
- Use `User.role === HOST` for permission checks
- Use existence of `Host` record for tracking host status
- A user can be a HOST and simultaneously a participant in other events

**Why:** Single source of truth; cleaner semantics.

---

### 3. **Payment-Participant Linking**
Always use `Payment.participantId`:
- Direct FK to `EventParticipant`
- Replaces the old pattern of `userId + eventId`
- Supports edge cases where same user pays for same event multiple times

**Why:** Unambiguous, accurate audit trail.

---

### 4. **Optional Gender Field**
`Gender` is nullable (no default):
- Users can choose not to provide gender
- No assumption of defaults
- Respectful of privacy

---

## Common Queries

### Find all participants in an event (approved only)
```prisma
const participants = await prisma.eventParticipant.findMany({
  where: {
    eventId: eventId,
    joinStatus: 'APPROVED'
  },
  include: { user: true }
})
```

### Get event capacity status
```prisma
const approvedCount = await prisma.eventParticipant.count({
  where: { eventId: eventId, joinStatus: 'APPROVED' }
})
const event = await prisma.event.findUnique({ where: { id: eventId } })
const isFull = approvedCount >= event.maxParticipants
```

### Find all payments for a specific participation
```prisma
const payments = await prisma.payment.findMany({
  where: { participantId: participantId }
})
```

### Check if user is a host
```prisma
const hostRecord = await prisma.host.findUnique({ where: { userId } })
const isHost = !!hostRecord && user.role === 'HOST'
```

---

## Migration & Maintenance

### Schema Changes
1. Update `schema.prisma`
2. Run: `npx prisma db push --accept-data-loss` (development)
3. Run: `npx prisma generate` (regenerate client types)
4. Update affected TypeScript files if model fields changed

### Adding Indexes
Add to model's `@@index` section:
```prisma
model Event {
  ...
  @@index([fieldName])  // Single field index
  @@index([field1, field2])  // Composite index
}
```

### Adding Fields
1. Add to model in schema
2. Run migrations to add column to database
3. Update service files to handle new field

---

## Related Documentation
- **API_DOCS.md** — Full endpoint documentation
- **README.md** — Project overview
- **Prisma Docs** — https://www.prisma.io/docs/
