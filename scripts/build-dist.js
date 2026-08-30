/**
 * NexusOne POS — Distribution ZIP Builder
 * Creates a proper installation-ready ZIP (not source code)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST_NAME = 'NexusOne-POS-v3.1.1';
const DIST_DIR = path.join(ROOT, 'dist-build');
const ZIP_NAME = DIST_NAME + '.zip';
const ZIP_PATH = path.join(ROOT, 'download', ZIP_NAME);

// Clean previous
if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true });
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'download'), { recursive: true });

console.log('Building distribution: ' + DIST_NAME);

// Files/dirs to include from ROOT
const includes = [
  // App source
  'src/',
  'public/',
  'prisma/',
  'printer-agent/',
  'caddy/',
  
  // Config
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'postcss.config.js',
  'tailwind.config.ts',
  '.env.example',
  
  // Installer files
  'INSTALAR-LIMPIO.vbs',
  'PROGRESS.hta',
  'INSTALAR-VISUAL.hta',
  'INICIAR-TODO.bat',
  'INICIAR-TODO-OCULTO.vbs',
  'DETENER-TODO.bat',
  'RESPALDAR-BD.bat',
  'SALUD-SISTEMA.bat',
  'CREAR-ADMIN.bat',
  'RECONSTRUIR.bat',
  'ACTUALIZAR.bat',
  'ACTUALIZAR.vbs',
  'CONFIGURAR-CADDY.bat',
];

for (const item of includes) {
  const src = path.join(ROOT, item);
  const dst = path.join(DIST_DIR, item);
  if (!fs.existsSync(src)) {
    console.log('  WARN: missing ' + item);
    continue;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.cpSync(src, dst, { recursive: true, filter: (f) => {
      const rel = path.relative(src, f);
      // Skip dev databases, logs, caches
      if (rel.startsWith('respaldos')) return false;
      if (/\.db$/.test(rel) && rel.startsWith('prisma')) return false;
      if (/\.db-(journal|wal|shm)$/.test(rel)) return false;
      if (rel === 'dev.log' || rel.endsWith('.log')) return false;
      if (rel === 'spool' || rel.startsWith('spool/')) return false;
      if (rel === 'mobile-data' || rel.startsWith('mobile-data/')) return false;
      if (rel === 'caddy.exe' || rel === 'local-ip.txt') return false;
      return true;
    }});
    console.log('  DIR  ' + item);
  } else {
    fs.copyFileSync(src, dst);
    console.log('  FILE ' + item);
  }
}

// Create ZIP
console.log('\nCreating ZIP...');
try {
  execSync('zip -r "' + ZIP_PATH + '" "' + DIST_NAME + '"', {
    cwd: path.dirname(DIST_DIR),
    stdio: 'pipe'
  });
  const stats = fs.statSync(ZIP_PATH);
  console.log('ZIP created: ' + ZIP_PATH + ' (' + (stats.size / 1024 / 1024).toFixed(1) + ' MB)');
} catch(e) {
  console.error('zip failed, trying tar + gzip...');
  execSync('cd "' + path.dirname(DIST_DIR) + '" && tar czf "' + ZIP_PATH + '.tar.gz" "' + DIST_NAME + '"', { stdio: 'pipe' });
  console.log('tar.gz created: ' + ZIP_PATH + '.tar.gz');
}

// Clean temp
fs.rmSync(DIST_DIR, { recursive: true });
console.log('\nDone!');
