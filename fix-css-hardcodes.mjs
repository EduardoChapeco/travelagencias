#!/usr/bin/env node
/**
 * TravelOS — CSS Hardcode Migration Script
 * Replaces hardcoded white/black opacity utilities with semantic glass classes.
 *
 * Strategy:
 * - bg-white/5 + border-white/10 (together) → replace both with just "glass" class
 * - Standalone bg-white/5 → "glass"
 * - hover:bg-white/5 → "hover:glass"
 * - bg-white/10 → "glass-dark"
 * - hover:bg-white/10 → "hover:glass-dark"
 * - border-white/10 (standalone) → remove (glass includes border)
 * - border-white/20 → "border-border"
 * - border-white/30 → "border-border-strong"
 * - bg-black/5 → "glass"
 * - bg-black/10 → "glass-dark"
 * - border-black/10 → "border-border"
 *
 * We process className strings carefully, not blindly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const SRC_DIR = path.join(__dirname, 'src');
const EXTENSIONS = ['.tsx', '.ts'];

// Simple pair: when both appear together in the same className, merge to glass
// We handle this by doing multi-pass replacements in order

const REPLACEMENTS = [
  // Common glass combos (order matters - most specific first)
  { from: /\bbg-white\/5\b\s+border-white\/10\b/g, to: 'glass' },
  { from: /\bborder-white\/10\b\s+bg-white\/5\b/g, to: 'glass' },

  // hover combos
  { from: /\bhover:bg-white\/5\b\s+hover:border-white\/10\b/g, to: 'hover:glass' },
  { from: /\bhover:border-white\/10\b\s+hover:bg-white\/5\b/g, to: 'hover:glass' },

  // Standalone bg-white variants
  { from: /\bbg-white\/5\b/g, to: 'glass' },
  { from: /\bhover:bg-white\/5\b/g, to: 'hover:glass' },
  { from: /\bbg-white\/10\b/g, to: 'glass-dark' },
  { from: /\bhover:bg-white\/10\b/g, to: 'hover:glass-dark' },
  { from: /\bbg-white\/20\b/g, to: 'glass-dark' },

  // Standalone border-white (after bg combos are handled)
  { from: /\bborder-white\/10\b/g, to: 'border-border' },
  { from: /\bborder-white\/20\b/g, to: 'border-border' },
  { from: /\bborder-white\/30\b/g, to: 'border-border-strong' },

  // Black backgrounds  
  { from: /\bbg-black\/5\b/g, to: 'glass' },
  { from: /\bbg-black\/10\b/g, to: 'glass-dark' },
  { from: /\bborder-black\/10\b/g, to: 'border-border' },

  // Clean up duplicate class names that may result from replacements
  { from: /\bglass\s+glass\b/g, to: 'glass' },
  { from: /\bglass-dark\s+glass-dark\b/g, to: 'glass-dark' },
  { from: /\bborder-border\s+border-border\b/g, to: 'border-border' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  for (const { from, to } of REPLACEMENTS) {
    content = content.replace(from, to);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let changed = 0;
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist', '.output', '.vinxi'].includes(entry.name)) {
      changed += walk(full);
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name))) {
      if (processFile(full)) {
        console.log(`  ✓ Fixed: ${path.relative(process.cwd(), full)}`);
        changed++;
      }
    }
  }
  return changed;
}

console.log('🔍 TravelOS CSS Hardcode Migration — Starting...\n');
const total = walk(SRC_DIR);
console.log(`\n✅ Done. ${total} files updated.`);
