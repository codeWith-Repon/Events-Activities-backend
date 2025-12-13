# 🎉 Events & Activities – Backend API

A production-ready **backend API** for an **Event & Activity Management platform**. This server handles authentication, role-based access, event management, image uploads, and secure payments.

---

## 📌 Project Overview

The **Events & Activities Platform** connects individuals who want to participate in local events, sports, or hobbies but lack companions. Whether it’s a **concert, hiking trip, board game night, or tech meetup**, users can easily find like-minded people to join them.

This platform bridges the gap between **online discovery and offline participation**, ensuring no one misses out on an experience just because they don’t have someone to go with. It focuses on building real-world social connections through shared interests and activities.

---

## 🎯 Objectives

- Build a social platform that connects people through events and activities
- Enable seamless event creation and participant matching
- Allow users to create profiles highlighting hobbies and interests
- Ensure secure authentication and data handling
- Support role-based access for users, hosts, and admins

---

## ✨ Core Features

### 🔐 User Authentication & Roles

**Authentication**

- Email & Password based login/registration
- JWT-based authentication (Access & Refresh Tokens)
- Secure password hashing using bcrypt

**Roles**

- **User:** Join events, browse activities, manage profile
- **Host:** Create & manage events, view participants, receive payments
- **Admin:** Manage users, hosts, and events, moderate content

---

### 👤 User Profile Management (CRUD)

- Full name & profile image (Cloudinary)
- Bio / About section
- Interests (Music, Sports, Gaming, Art, etc.)
- Location (City / Area)
- Public profiles viewable by other users

---

### 📅 Event & Activity Management (CRUD)

- Event name & category (Concert, Hike, Dinner, Meetup)
- Date & time
- Location
- Minimum & maximum participants
- Description & event image (Cloudinary)
- Joining fee
- Event status: **Open, Full, Cancelled, Completed**
- Events are searchable and visible to other users

---

### 🔍 Search & Matching System

Users can search events based on:

- Event type / category
- Date & time
- Location

---

### ⭐ Review & Rating System

- Users can rate and review hosts after attending events
- Rating scale: **1–5 stars**
- Ratings are publicly visible on host profiles

---

### 💳 Payment Integration

- Hosts can set joining fees for events
- Users must complete payment to join paid events
- Secure payment processing using **SSLCommerz**
- Payment validation and status handling handled server-side

---

## 🛠 Tech Stack

- 🔐 JWT-based authentication (Access & Refresh tokens)
- 👤 Role-based system (Super Admin supported)
- 📅 Event & Activity management
- 🖼 Image upload with Cloudinary
- 💳 SSLCommerz payment integration
- ✅ Strong request validation using Zod
- 🧱 Modular & scalable project structure
- 🌍 CORS support for frontend integration

---

## 📁 Project Structure (Simplified)

```
src/
 ├── app/
 │   ├── modules/
 │   ├── middlewares/
 │   ├── routes/
 │   └── utils/
 ├── server.ts
 └── app.ts
prisma/
 ├── schema.prisma
 └── migrations/
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory and configure the following:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require

FRONTEND_URL=http://localhost:3000
FRONTEND_LIVE_URL=https://xyz.app

# Super Admin
SUPER_ADMIN_NAME=superadmin
SUPER_ADMIN_EMAIL=superadmin@gmail.com
SUPER_ADMIN_PASSWORD=123456

# Bcrypt
BCRYPT_SALT_ROUND=10

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRES=1d
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES=30d

# SSLCommerz
SSL_STORE_ID=your_store_id
SSL_STORE_PASS=your_store_password
SSL_PAYMENT_API=https://sandbox.sslcommerz.com/gwprocess/v3/api.php
SSL_VALIDATION_API=https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php

SSL_IPN_API=http://localhost:5000/api/v1/payment/validate-payment

# SSLCommerz Backend URLs
SSL_SUCCESS_BACKEND_URL=http://localhost:5000/api/v1/payment/success
SSL_FAIL_BACKEND_URL=http://localhost:5000/api/v1/payment/fail
SSL_CANCEL_BACKEND_URL=http://localhost:5000/api/v1/payment/cancel

# SSLCommerz Frontend URLs
SSL_SUCCESS_FRONTEND_URL=http://localhost:3000/payment/success
SSL_FAIL_FRONTEND_URL=http://localhost:3000/payment/fail
SSL_CANCEL_FRONTEND_URL=http://localhost:3000/payment/cancel
```

> ⚠️ **Never commit `.env` files to GitHub**

---

## 🚀 Getting Started (Local Setup)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/codeWith-Repon/Events-Activities-backend.git
cd Events-Activities-backend
```

### 2️⃣ Install Dependencies

```bash
pnpm install
```

### 3️⃣ Generate Prisma Client

```bash
pnpm prisma generate
```

### 4️⃣ Run Database Migrations

```bash
pnpm migrate
```

### 5️⃣ Start Development Server

```bash
pnpm dev
```

Server will run on:

```
http://localhost:5000
```

---

## 📜 Available Scripts

```bash
pnpm dev       # Start development server
pnpm build     # Build TypeScript
pnpm start     # Run production build
pnpm migrate   # Deploy prisma migrations
pnpm lint      # Run ESLint
```

---

## 📌 API Base URL

```
/api/v1
```

---

## 🧠 Author

**Md Repon**
GitHub: [https://github.com/codeWith-Repon](https://github.com/codeWith-Repon)

---

## 📄 License

This project is licensed under the **ISC License**.

---

⭐ If you find this project useful, don’t forget to give it a star on GitHub!
