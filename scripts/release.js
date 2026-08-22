/**
 * Nexus One POS — Release Script v1.0
 * 
 * Usage:
 *   node scripts/release.js          # patch bump (2.9.73 -> 2.9.74)
 *   node scripts/release.js minor    # minor bump (2.9.73 -> 2.10.0)
 *   node scripts/release.js major    # major bump (2.9.73 -> 3.0.0)
 * 
 * Generates:
 *   - Version bump in package.json
 *   - Git tag
 *   - Distribution zip in download/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Parse args
const bumpType = process.argv[2] || 'patch';

function bump(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    default: return `${major}.${minor}.${patch + 1}`;
  }
}

const oldVersion = pkg.version;
const newVersion = bump(oldVersion, bumpType);

console.log(`\x1b[36m  Nexus One POS — Release Builder\x1b[0m`);
console.log(`  ${oldVersion}  ->  ${newVersion}  (${bumpType})\n`);

// 1. Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`  [1/4] package.json updated to v${newVersion}`);

// 2. Git tag (if in a git repo)
try {
  execSync(`git add package.json`, { cwd: ROOT, stdio: 'pipe' });
  execSync(`git commit -m "release: v${newVersion}"`, { cwd: ROOT, stdio: 'pipe' });
  execSync(`git tag v${newVersion}`, { cwd: ROOT, stdio: 'pipe' });
  console.log(`  [2/4] Git tag v${newVersion} created`);
} catch {
  console.log(`  [2/4] Git tag skipped (not a git repo or no changes)`);
}

// 3. Build distribution zip
const distDir = path.join(ROOT, 'download');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

const zipName = `NexusOne-v${newVersion}.zip`;
const zipPath = path.join(distDir, zipName);

try {
  execSync(
    `zip -r "${zipPath}" src/ public/ prisma/ package.json bun.lockb next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts .env.example .github/ -x "src/app/.next/*"`,
    { cwd: ROOT, stdio: 'pipe' }
  );
  const stats = fs.statSync(zipPath);
  console.log(`  [3/4] ${zipName} (${(stats.size / 1024).toFixed(0)} KB)`);
} catch {
  console.log(`  [3/4] Zip generation skipped (zip not available)`);
}

// 4. Summary
console.log(`\n  \x1b[32m Release v${newVersion} ready!\x1b[0m`);
console.log(`  Zip: download/${zipName}`);
console.log(`  Git:  git push origin main --tags\n`);
