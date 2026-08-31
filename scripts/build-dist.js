/**
 * NexusOne POS — Build Distribution ZIP v2.0
 * 
 * Genera un ZIP completo para instalacion limpia desde cero en Windows.
 * Incluye: codigo fuente, instalador VBS, scripts BAT, Caddy, printer-agent.
 * EXCLUYE: node_modules, .next, .git, .env, BD, respaldos, logs.
 * 
 * Usage:
 *   node scripts/build-dist.js                    # usa version de package.json
 *   node scripts/build-dist.js v3.1.2-test        # version personalizada
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const version = (process.argv[2] || pkg.version).replace(/^v/, '');

const zipBaseName = `NexusOne-POS-v${version}-Instalacion-Limpia`;
const zipFileName = `${zipBaseName}.zip`;
const distDir = path.join(ROOT, 'dist');
const zipPath = path.join(distDir, zipFileName);

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

console.log(`\x1b[36m  NexusOne POS — Distribution Builder\x1b[0m`);
console.log(`  Version: ${version}`);
console.log(`  Output:  dist/${zipFileName}\n`);

const includePaths = [
  'src/', 'public/', 'prisma/schema.prisma',
  'package.json', 'package-lock.json', 'next.config.js',
  'tsconfig.json', 'postcss.config.js', 'tailwind.config.ts', '.env.example',
  'INSTALAR-LIMPIO.vbs', 'PROGRESS.hta', 'INSTALAR.bat',
  'INICIAR-TODO.bat', 'INICIAR-TODO-OCULTO.vbs', 'DETENER-TODO.bat',
  'CREAR-ADMIN.bat', 'RESPALDAR-BD.bat', 'SALUD-SISTEMA.bat',
  'caddy/Caddyfile', 'caddy/Caddyfile-mobile',
  'printer-agent/', 'README.md',
];

const missingFiles = includePaths.filter(p => !fs.existsSync(path.join(ROOT, p)));
if (missingFiles.length > 0) {
  console.log('\x1b[33m  WARNING: Archivos faltantes:\x1b[0m');
  missingFiles.forEach(f => console.log(`    - ${f}`));
}

const existingPaths = includePaths.filter(p => fs.existsSync(path.join(ROOT, p)));
const tmpDir = '/tmp/nexus-pos-dist';

try {
  console.log('  [1/3] Preparando archivos...');
  execSync(`rm -rf "${tmpDir}" && mkdir -p "${tmpDir}/${zipBaseName}"`, { stdio: 'pipe' });
  
  for (const p of existingPaths) {
    const src = path.join(ROOT, p);
    const dst = path.join(tmpDir, zipBaseName, p);
    const dstDir = path.dirname(dst);
    if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }

  // Limpiar archivos no deseados dentro del ZIP
  const cleanTargets = [
    'node_modules', '.next', '.git', '.env', 'respaldos', 'dist',
    'prisma/dev.db', 'prisma/dev.db-journal', 'prisma/dev.db-wal', 'prisma/dev.db-shm',
  ];
  for (const t of cleanTargets) {
    const full = path.join(tmpDir, zipBaseName, t);
    try { fs.rmSync(full, { recursive: true, force: true }); } catch {}
  }

  console.log('  [2/3] Comprimiendo ZIP...');
  execSync(`cd "${tmpDir}" && zip -r "${zipPath}" "${zipBaseName}/"`, {
    stdio: 'pipe', maxBuffer: 50 * 1024 * 1024
  });

  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  [3/3] \x1b[32mZIP generado\x1b[0m`);
    console.log(`\n  Archivo: dist/${zipFileName}`);
    console.log(`  Tamano:  ${sizeMB} MB\n`);
  } else {
    console.error('\x1b[31m  ERROR: ZIP no se genero\x1b[0m');
    process.exit(1);
  }
} catch (err) {
  console.error('\x1b[31m  ERROR:\x1b[0m', err.message);
  process.exit(1);
} finally {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}
