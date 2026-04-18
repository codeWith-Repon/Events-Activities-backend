# Prisma Schema - Organized Structure

## 📁 Directory Layout

```
/prisma/
├─ schema.prisma                    ← MAIN (what Prisma uses)
├─ SCHEMA_STRUCTURE.md              ← Full documentation
├─ schemas/                         ← Reference files (organized by domain)
│  ├─ 00-config.prisma              ← Generator & Datasource config
│  ├─ 01-enums.prisma               ← All enum definitions
│  ├─ 02-user.prisma                ← User & Host models (auth)
│  ├─ 03-event.prisma               ← Event & EventParticipant models
│  └─ 04-payment.prisma             ← Payment model
├─ migrations/                      ← Database migration history
└─ README.md                        ← This file
```

---

## 🎯 Why This Structure?

### **schema.prisma (Root)**
- **The active schema** that Prisma reads and loads
- Contains all models, enums, and configuration
- Includes section comments showing where code comes from
- **1 file for Prisma to compile** ✓

### **schemas/ folder**
- **Reference & documentation** files
- Organized by domain/concern:
  - `00-config.prisma` — Generator, datasource
  - `01-enums.prisma` — All enum types
  - `02-user.prisma` — User & Host models
  - `03-event.prisma` — Event & Participants
  - `04-payment.prisma` — Payments
- Easy to navigate and understand
- Can be copy-pasted or updated in bulk
- Numbered for reading order

---

## 📖 When to Update

### Add a new model?
1. Edit `/prisma/schemas/{XX}-{domain}.prisma` with your model
2. Copy the model into `/prisma/schema.prisma` under the appropriate section
3. Run `npx prisma generate`

### Update an existing model?
1. Update both:
   - `/prisma/schemas/{XX}-{domain}.prisma` (for reference)
   - `/prisma/schema.prisma` (working schema)
2. Run `npx prisma generate`

### Add an enum?
1. Add to `/prisma/schemas/01-enums.prisma`
2. Add to `/prisma/schema.prisma` in the Enums section
3. Run `npx prisma generate`

---

## 🔄 Workflow

```
Edit schema → Run prisma generate → TypeScript types updated → Code compiles
```

Example:
```bash
# Update the schema
nano prisma/schema.prisma

# Regenerate types
npx prisma generate

# TypeScript now knows about your changes
npm run build
```

---

## 📚 Documentation

| File | Contains |
|------|----------|
| `SCHEMA_STRUCTURE.md` | Complete data model docs, design decisions, common queries |
| `schema.prisma` | Active schema with inline section comments |
| `schemas/*.prisma` | Reference files organized by domain |

**Start here:** Read `SCHEMA_STRUCTURE.md` for full understanding

---

## ✅ Current Schema Overview

| Section | Models | Purpose |
|---------|--------|---------|
| **Auth** | User, Host | User accounts, hosting metadata |
| **Events** | Event, EventParticipant | Event creation, registration tracking |
| **Payments** | Payment | Transaction records (SSLCommerz) |

**Total:** 5 models, 6 enums, 14 indexes

---

## 🚀 Pro Tips

- Keep `schemas/` files in sync with `schema.prisma` for documentation
- Always run `npx prisma generate` after schema changes
- Use indexes on frequently filtered columns (already done)
- Refer to `SCHEMA_STRUCTURE.md` for query examples

