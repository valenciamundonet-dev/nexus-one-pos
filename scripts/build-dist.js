#!/usr/bin/env node
/**
 * NexusOne POS — Build Distribution ZIP v2.0
 * 
 * Genera un ZIP limpio para instalacion desde cero.
 * Incluye SOLO lo necesario para que INSTALAR-LIMPIO.vbs funcione.
 * 
 * Uso:
 *   node scripts/build-dist.js              # genera ZIP en download/
 *   node scripts/build-dist.js --dry-run    # lista archivos sin generar ZIP
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// Read version
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const VERSION = pkg.version;
const OUTPUT_DIR = path.join(ROOT, 'download');

// ============================================================
// PATTERNS TO EXCLUDE (applied to relative paths)
// ============================================================
const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', '.prisma', '.git', '.vscode', '.idea',
  'respaldos', 'download', 'skills', 'tool-results', 'upload', 'cache',
  '.cache', 'nexus-one-pos', 'nexus-repo', 'myecommerce-repo',
  'caddy/mobile-data', 'printer-agent/spool', 'scripts/pos-arch',
  'src/types/types', 'build', 'dist', 'out',
]);

const EXCLUDE_FILES = new Set([
  '.env', '.env.local', '.env.*.local',
  'prisma/dev.db', 'prisma/dev.db-journal', 'prisma/dev.db-wal', 'prisma/dev.db-shm',
  'caddy/caddy.exe', 'caddy/local-ip.txt',
  'printer-agent/agent-startup.log', 'printer-agent/rawprint.ps1',
  '.DS_Store', 'Thumbs.db', 'desktop.ini',
  '*.log', '__cmd_out.tmp', 'npm-debug-output.txt', 'install-log.txt',
  '.caddy-domain', '.caddy-env.bat', 'crea_acc.vbs', 'local-ip.txt',
  'BACKUP_*.zip', 'BACKUP_*',
]);

function shouldExclude(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];
  
  // Check directory exclusion
  for (let i = 0; i < parts.length; i++) {
    const partial = parts.slice(0, i + 1).join('/');
    if (EXCLUDE_DIRS.has(partial)) return true;
  }
  
  // Check file exclusions by full relative path
  if (EXCLUDE_FILES.has(normalized)) return true;
  
  // Exclude by filename pattern
  if (fileName.endsWith('.log')) return true;
  if (fileName.startsWith('BACKUP_')) return true;
  if (fileName === '.DS_Store' || fileName === 'Thumbs.db') return true;
  if (fileName === 'desktop.ini') return true;
  
  // Exclude DB files anywhere under prisma/
  if (normalized.startsWith('prisma/') && (fileName.endsWith('.db') || fileName.endsWith('.db-journal') || fileName.endsWith('.db-wal') || fileName.endsWith('.db-shm'))) return true;
  
  // Exclude development/build artifacts
  if (fileName === 'tsconfig.tsbuildinfo' || fileName === 'next-env.d.ts') return true;
  if (fileName === 'worklog.md') return true;
  
  // Exclude python scripts and generated diagrams in scripts/
  if (normalized.startsWith('scripts/') && fileName.endsWith('.py')) return true;
  if (normalized.startsWith('scripts/') && fileName.endsWith('.png')) return true;
  if (normalized.startsWith('scripts/') && fileName.endsWith('.html')) return true;
  
  return false;
}

function collectFiles(dir, base) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  
  for (const entry of entries) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    
    if (shouldExclude(relPath)) continue;
    
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, relPath));
    } else {
      results.push(relPath);
    }
  }
  return results;
}

// Collect from root
let allFiles = collectFiles(ROOT, '');
allFiles.sort();

// ============================================================
// BUILD ZIP
// ============================================================

const zipName = `NexusOne-POS-v${VERSION}-Instalacion-Limpia.zip`;

if (DRY_RUN) {
  console.log(`\n  NexusOne POS v${VERSION} — File List (${allFiles.length} files)\n`);
  for (const f of allFiles) {
    console.log(`  ${f}`);
  }
  console.log(`\n  Total: ${allFiles.length} files\n`);
  process.exit(0);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const zipPath = path.join(OUTPUT_DIR, zipName);

console.log(`\n  NexusOne POS v${VERSION} — Build Distribution`);
console.log(`  Files: ${allFiles.length}`);
console.log(`  Output: ${zipPath}\n`);

try {
  const fileListStr = allFiles.map(f => `"${f}"`).join(' ');
  execSync(
    `cd "${ROOT}" && zip -r "${zipPath}" ${fileListStr}`,
    { stdio: 'inherit', maxBuffer: 50 * 1024 * 1024 }
  );
  
  const stats = fs.statSync(zipPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
  console.log(`\n  ZIP created: ${zipPath} (${sizeMB} MB)`);
  console.log(`  Ready for upload to GitHub Releases.\n`);
} catch (err) {
  console.error(`\n  ERROR: ${err.message}\n`);
  process.exit(1);
}
