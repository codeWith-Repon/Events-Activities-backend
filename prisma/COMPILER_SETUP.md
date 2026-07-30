# Prisma Schema - Automated Compilation

This setup uses an **automated compiler** to combine split schema files into a single working schema.

## 📁 How It Works

```
Developer edits:          Compiler processes:       Prisma uses:
/prisma/schemas/          compile-schema.js         /prisma/schema.prisma
├─ 00-config.prisma       (Node.js script)          (generated)
├─ 01-enums.prisma   →    reads files in order  →  (auto-generated)
├─ 02-user.prisma         combines them             (do not edit)
├─ 03-event.prisma        outputs single file
└─ 04-payment.prisma
```

---

## 🚀 Commands

### **Compile Schema (generates schema.prisma from split files)**
```bash
npm run prisma:compile
```

### **Generate Prisma Types (compiles + generates client)**
```bash
npm run prisma:generate
```

### **Create Database Migration**
```bash
npm run prisma:migrate
```

### **Deploy Migrations**
```bash
npm run migrate
```

---

## 📝 Workflow

### **1. Add a new model**

Edit `/prisma/schemas/03-event.prisma`:
```prisma
model MyNewModel {
  id String @id @default(uuid())
  name String
  
  @@map("my_new_model")
}
```

Then run:
```bash
npm run prisma:generate
```

✨ The compiler automatically:
- Combines all schemas into `schema.prisma`
- Generates Prisma types
- You can now use it in your code!

---

### **2. Update an existing model**

Edit the model in its file (e.g., `/prisma/schemas/02-user.prisma`)

Run:
```bash
npm run prisma:generate
```

---

### **3. Add a new enum**

Add to `/prisma/schemas/01-enums.prisma`:
```prisma
enum MyEnum {
  VALUE_A
  VALUE_B
}
```

Run:
```bash
npm run prisma:generate
```

---

## 📂 File Organization

| File | Purpose | Max Complexity |
|------|---------|---|
| `00-config.prisma` | Generator & datasource | Keep simple |
| `01-enums.prisma` | All enum definitions | ~50 lines |
| `02-user.prisma` | User & Host models | ~50 lines |
| `03-event.prisma` | Event & Participants | ~75 lines |
| `04-payment.prisma` | Payment model | ~40 lines |

Each file is **small, focused, and easy to read** ✓

---

## ✅ What Happens Automatically

### **On `npm run prisma:compile`:**
1. Read all `.prisma` files from `/prisma/schemas/` in alphabetical order
2. Combine them with section separators
3. Write to `/prisma/schema.prisma`
4. Timestamp added for tracking

### **On `npm run prisma:generate`:**
1. Run compile first
2. Prisma reads the combined `schema.prisma`
3. Generates types in `src/generated/prisma/`

### **On `npm install` (postinstall):**
1. Automatically runs `npm run prisma:generate`
2. New team members just need to run `npm install` ✓

---

## ⚠️ Important Notes

- **Do NOT edit** `/prisma/schema.prisma` manually
- **Always edit** files in `/prisma/schemas/`
- Run `npm run prisma:compile` before committing if you changed schemas
- The generated `schema.prisma` has a warning header at the top

---

## 🔍 Check the Generated File

```bash
cat prisma/schema.prisma
```

You'll see:
```prisma
// ========================================
// GENERATED SCHEMA - Do not edit manually!
// ========================================
// This file is auto-generated from /prisma/schemas/*.prisma
// Edit the individual files in /prisma/schemas/ instead
//
// ============ From: 00-config.prisma ============
// [config content]
//
// ============ From: 01-enums.prisma ============
// [enums content]
// ... etc
```

Each section clearly marked so you can trace where things came from!

---

## 📚 Related Files

- **SCHEMA_STRUCTURE.md** — Design decisions & query patterns
- **schemas/README.md** — Reference guide
- **compile-schema.js** — The compiler script
- **package.json** — npm scripts configuration

---

## 💡 Tips

✅ Keep schema files organized by numbering  
✅ Run `npm run prisma:compile` before pushing code  
✅ Each schema file should have a clear purpose  
✅ Use comments to explain complex models  
✅ Indexes are already added on key columns
