#!/usr/bin/env node

/**
 * Prisma Schema Compiler
 * Combines split schema files from /prisma/schemas/ into a single /prisma/schema.prisma
 * This allows developers to work with organized files while Prisma gets one compiled schema
 */

const fs = require("fs");
const path = require("path");

const SCHEMAS_DIR = path.join(__dirname, "schemas");
const OUTPUT_FILE = path.join(__dirname, "schema.prisma");

// Read all .prisma files from schemas directory, sorted by filename
const files = fs
  .readdirSync(SCHEMAS_DIR)
  .filter((file) => file.endsWith(".prisma"))
  .sort();

if (files.length === 0) {
  console.error("❌ No .prisma files found in prisma/schemas/");
  process.exit(1);
}

console.log(`📚 Compiling schema from ${files.length} files...`);

// Read and combine all files
let combinedSchema = `// ========================================
// GENERATED SCHEMA - Do not edit manually!
// ========================================
// This file is auto-generated from /prisma/schemas/*.prisma
// Edit the individual files in /prisma/schemas/ instead
// Last generated: ${new Date().toISOString()}
//
// To regenerate: npm run prisma:compile
// ========================================

`;

files.forEach((file) => {
  const filePath = path.join(SCHEMAS_DIR, file);
  const content = fs.readFileSync(filePath, "utf-8");

  // Add section separator
  combinedSchema += `\n// ============ From: ${file} ============\n\n`;
  combinedSchema += content;
  combinedSchema += "\n";

  console.log(`  ✓ ${file}`);
});

// Add footer
combinedSchema += `\n// ========================================
// End of compiled schema
// ========================================
`;

// Write combined schema
fs.writeFileSync(OUTPUT_FILE, combinedSchema);
console.log(`\n✅ Schema compiled to: prisma/schema.prisma`);
