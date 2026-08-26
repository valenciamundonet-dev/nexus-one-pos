import { NextRequest, NextResponse } from 'next/server';
import { execSync, exec, spawn } from 'child_process';
import { writeFile, mkdir, cp, rm, readdir, stat } from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const GITHUB_REPO = 'valenciamundonet-dev/nexus-one-pos';

// Carpetas y archivos que se PRESERVAN al actualizar
const PRESERVE_LIST = [
  'prisma/dev.db',
  'prisma/dev.db-wal',
  'prisma/dev.db-shm',
  'prisma/dev.db-journal',
  'data/',
  'BACKUPS/',
  'caddy/caddy.exe',
  'caddy/local-ip.txt',
  'BACKUP_PRE-ACTUALIZACION_',
  'releases/',
  'BACKUP_AUTO_',
];

// Archivos/carpetas a copiar de la nueva version
const UPDATE_ITEMS = [
  'src',
  'public',
  'prisma/schema.prisma',
  'prisma/migrations',
  'package.json',
  'package-lock.json',
  'next.config.mjs',
  'next.config.js',
  'next.config.ts',
  'tsconfig.json',
  'middleware.ts',
  'src/middleware.ts',
  'tailwind.config.ts',
  'tailwind.config.js',
  'postcss.config.mjs',
  'postcss.config.js',
  'components.json',
  '.env',
  '.env.local',
  'INSTALAR.bat',
  'INSTALAR-LIMPIO.vbs',
  'INICIAR-TODO.bat',
  'INICIAR-TODO-OCULTO.vbs',
  'DETENER-TODO.bat',
  'RESPALDAR-BD.bat',
  'CREAR-ADMIN.bat',
  'SALUD-SISTEMA.bat',
  'PROGRESS.hta',
  'caddy/Caddyfile',
  'caddy/Caddyfile-mobile',
  'printer-agent/agent.js',
];

interface UpdateProgress {
  step: string;
  message: string;
  percent: number;
}

function sendProgress(controller: ReadableStreamDefaultController, data: UpdateProgress) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

// Verificar si una ruta debe preservarse
function shouldPreserve(relativePath: string): boolean {
  return PRESERVE_LIST.some(item => {
    if (item.endsWith('/')) {
      return relativePath.startsWith(item) || relativePath === item.slice(0, -1);
    }
    return relativePath === item || relativePath.startsWith(item.replace(/[^/]+$/, ''));
  });
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const runUpdate = async () => {
        const BASE = process.cwd();

        try {
          // Leer body
          const body = await req.json();
          const targetVersion = body.version || body.targetVersion;
          const providedDownloadUrl = body.downloadUrl;

          if (!targetVersion) {
            sendProgress(controller, { step: 'error', message: 'Version no especificada', percent: 0 });
            controller.close();
            return;
          }

          // ── PASO 1: Verificar prerequisitos ──
          sendProgress(controller, { step: 'check', message: 'Verificando sistema...', percent: 5 });

          if (!existsSync(join(BASE, 'prisma', 'dev.db'))) {
            sendProgress(controller, { step: 'error', message: 'No se encontro base de datos. Sistema no instalado.', percent: 0 });
            controller.close();
            return;
          }

          // Leer version local
          let localVersion = '0.0.0';
          try {
            const fs = await import('fs');
            const pkg = JSON.parse(fs.readFileSync(join(BASE, 'package.json'), 'utf-8'));
            localVersion = pkg.version || '0.0.0';
          } catch {}

          // Detectar si es upgrade o downgrade (rollback)
          const localParts = localVersion.split('.').map(Number);
          const targetParts = targetVersion.split('.').map(Number);
          let isRollback = false;
          for (let i = 0; i < 3; i++) {
            if ((targetParts[i] || 0) < (localParts[i] || 0)) {
              isRollback = true;
              break;
            } else if ((targetParts[i] || 0) > (localParts[i] || 0)) {
              isRollback = false;
              break;
            }
          }

          const action = isRollback ? 'RESTAURANDO (Rollback)' : 'ACTUALIZANDO';
          sendProgress(controller, { step: 'check', message: `${action}: v${localVersion} -> v${targetVersion}`, percent: 10 });

          // ── PASO 2: Respaldar ──
          const backupLabel = isRollback ? 'RESTAURACION' : 'ACTUALIZACION';
          sendProgress(controller, { step: 'backup', message: `Creando respaldo de seguridad (${backupLabel})...`, percent: 15 });

          const now = new Date();
          const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
          const backupDir = join(BASE, `BACKUP_AUTO_${isRollback ? 'ROLLBACK' : 'v' + localVersion}_${dateStr}`);

          if (!existsSync(backupDir)) await mkdir(backupDir, { recursive: true });

          const fs = await import('fs/promises');
          const fsSync = await import('fs');

          // Respaldar BD
          const dbFiles = ['dev.db', 'dev.db-wal', 'dev.db-shm', 'dev.db-journal'];
          for (const f of dbFiles) {
            const src = join(BASE, 'prisma', f);
            if (existsSync(src)) await cp(src, join(backupDir, f));
          }

          // Respaldar schema
          const schemaSrc = join(BASE, 'prisma', 'schema.prisma');
          if (existsSync(schemaSrc)) await cp(schemaSrc, join(backupDir, 'schema.prisma'));

          // Respaldar uploads
          const uploadsDir = join(BASE, 'data', 'uploads');
          if (existsSync(uploadsDir)) {
            await cp(uploadsDir, join(backupDir, 'uploads'), { recursive: true });
          }

          // Respaldar store logo
          const logoDir = join(BASE, 'data', 'store-logo');
          if (existsSync(logoDir)) {
            await cp(logoDir, join(backupDir, 'store-logo'), { recursive: true });
          }

          sendProgress(controller, { step: 'backup', message: 'Respaldo completado', percent: 25 });

          // ── PASO 3: Descargar nueva version ──
          const tagName = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`;

          // Construir URL de descarga
          let downloadUrl = providedDownloadUrl;
          if (!downloadUrl) {
            // Buscar asset en GitHub Releases
            const token = process.env.GITHUB_TOKEN;
            try {
              const headers: Record<string, string> = {
                'Accept': 'application/vnd.github.v3+json',
              };
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const relRes = await fetch(
                `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tagName}`,
                { headers }
              );
              if (relRes.ok) {
                const rel = await relRes.json();
                const asset = rel.assets?.find((a: any) => a.name.includes('.zip'));
                if (asset) downloadUrl = asset.browser_download_url;
              }
            } catch {}
            // Fallback a archive
            if (!downloadUrl) {
              downloadUrl = `https://github.com/${GITHUB_REPO}/archive/refs/tags/${tagName}.zip`;
            }
          }

          const tempZip = join(BASE, 'temp_online_update.zip');
          sendProgress(controller, { step: 'download', message: `Descargando v${targetVersion}...`, percent: 30 });

          // Descargar con fetch nativo + token si es URL de GitHub
          const fetchHeaders: Record<string, string> = {};
          if (downloadUrl.includes('github.com') && process.env.GITHUB_TOKEN) {
            fetchHeaders['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
          }

          const res = await fetch(downloadUrl, {
            redirect: 'follow',
            headers: fetchHeaders,
          });
          if (!res.ok || !res.body) {
            sendProgress(controller, { step: 'error', message: `Error al descargar: HTTP ${res.status}. Verifique el token y la URL.`, percent: 0 });
            controller.close();
            return;
          }

          // Stream a archivo
          const fileStream = fsSync.createWriteStream(tempZip);
          await pipeline(Readable.fromWeb(res.body as any), fileStream);

          // Verificar tamaño
          const zipStat = await stat(tempZip);
          if (zipStat.size < 100000) {
            sendProgress(controller, { step: 'error', message: 'Archivo descargado demasiado pequeno (' + (zipStat.size / 1024).toFixed(0) + ' KB). Error de descarga.', percent: 0 });
            try { await rm(tempZip); } catch {}
            controller.close();
            return;
          }

          sendProgress(controller, { step: 'download', message: `Descargado (${(zipStat.size / 1024 / 1024).toFixed(1)}MB)`, percent: 50 });

          // ── PASO 4: Extraer ZIP ──
          sendProgress(controller, { step: 'extract', message: 'Extrayendo archivos...', percent: 55 });

          const tempExtract = join(BASE, 'temp_online_extract');
          if (existsSync(tempExtract)) await rm(tempExtract, { recursive: true });
          await mkdir(tempExtract, { recursive: true });

          try {
            execSync(
              `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip.replace(/'/g, "''")}' -DestinationPath '${tempExtract.replace(/'/g, "''")}' -Force"`,
              { cwd: BASE, timeout: 120000, stdio: 'pipe' }
            );
          } catch (err: any) {
            sendProgress(controller, { step: 'error', message: 'Error al extraer ZIP: ' + (err?.message || 'Desconocido'), percent: 0 });
            try { await rm(tempZip); } catch {}
            controller.close();
            return;
          }

          // Encontrar la carpeta del repo extraida
          const extractEntries = await readdir(tempExtract);
          let extractedDir = '';
          for (const entry of extractEntries) {
            const fullPath = join(tempExtract, entry);
            const s = await stat(fullPath);
            if (s.isDirectory() && entry.includes('NexusOne')) {
              extractedDir = fullPath;
              break;
            }
          }

          if (!extractedDir) {
            for (const entry of extractEntries) {
              const fullPath = join(tempExtract, entry);
              const s = await stat(fullPath);
              if (s.isDirectory()) { extractedDir = fullPath; break; }
            }
          }

          if (!extractedDir) {
            sendProgress(controller, { step: 'error', message: 'No se pudo encontrar la carpeta extraida dentro del ZIP', percent: 0 });
            try { await rm(tempZip); await rm(tempExtract, { recursive: true }); } catch {}
            controller.close();
            return;
          }

          sendProgress(controller, { step: 'extract', message: 'Archivos extraidos', percent: 60 });

          // ── PASO 5: Copiar archivos nuevos ──
          sendProgress(controller, { step: 'copy', message: 'Actualizando archivos del sistema...', percent: 65 });

          let copied = 0;
          for (const item of UPDATE_ITEMS) {
            const srcPath = join(extractedDir, item);
            if (!existsSync(srcPath)) continue;

            const destPath = join(BASE, item);

            try {
              const s = await stat(srcPath);
              if (s.isDirectory()) {
                // Eliminar destino y copiar completo
                if (existsSync(destPath)) await rm(destPath, { recursive: true });
                await cp(srcPath, destPath, { recursive: true });
              } else {
                // Asegurar que el directorio padre existe
                const parentDir = join(destPath, '..');
                if (!existsSync(parentDir)) await mkdir(parentDir, { recursive: true });
                await cp(srcPath, destPath);
              }
              copied++;
            } catch (err: any) {
              console.warn(`[update] Error copiando ${item}:`, err?.message);
            }
          }

          // Crear carpetas data si no existen
          const dataDirs = ['data', 'data/uploads', 'data/uploads/products', 'data/uploads/thumbs', 'releases'];
          for (const d of dataDirs) {
            const dp = join(BASE, d);
            if (!existsSync(dp)) await mkdir(dp, { recursive: true });
          }

          sendProgress(controller, { step: 'copy', message: `${copied} elementos actualizados`, percent: 75 });

          // ── PASO 6: Limpiar temporales ──
          sendProgress(controller, { step: 'cleanup', message: 'Limpiando archivos temporales...', percent: 80 });
          try { await rm(tempZip); } catch {}
          try { await rm(tempExtract, { recursive: true }); } catch {}

          // ── PASO 7: Migrar base de datos ──
          sendProgress(controller, { step: 'migrate', message: 'Migrando base de datos...', percent: 85 });

          try {
            execSync('npx prisma generate', { cwd: BASE, timeout: 60000, stdio: 'pipe' });
          } catch (err: any) {
            console.warn('[update] prisma generate warning:', err?.message);
          }

          try {
            execSync('npx prisma db push', { cwd: BASE, timeout: 60000, stdio: 'pipe' });
          } catch (err: any) {
            try {
              execSync('npx prisma migrate deploy', { cwd: BASE, timeout: 60000, stdio: 'pipe' });
            } catch (err2: any) {
              console.warn('[update] migration warning:', err2?.message);
            }
          }

          sendProgress(controller, { step: 'migrate', message: 'Base de datos migrada', percent: 88 });

          // ── PASO 8: Rebuild + Reinicio automatico via script detached ──
          sendProgress(controller, { step: 'build', message: 'Preparando reconstruccion y reinicio automatico...', percent: 90 });

          // Crear script batch que se ejecuta en segundo plano
          // Esto funciona incluso si el servidor se detiene durante el rebuild
          const rebuildBatContent = `@echo off
chcp 65001 >nul 2>&1
cd /d "${BASE.replace(/\//g, '\\')}"
echo [%date% %time%] Iniciando rebuild post-actualizacion... >> update-rebuild.log
call npm run build >> update-rebuild.log 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] Build exitoso, deteniendo servicios... >> update-rebuild.log
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 3 /nobreak >nul
    echo [%date% %time%] Iniciando servicios... >> update-rebuild.log
    start "" /b cmd /c "INICIAR-TODO-OCULTO.vbs"
    echo [%date% %time%] Proceso completado. >> update-rebuild.log
) else (
    echo [%date% %time%] ERROR en build. >> update-rebuild.log
)
del "%~f0" >nul 2>&1
`;

          const rebuildBatPath = join(BASE, '_rebuild_post_update.bat');
          await writeFile(rebuildBatPath, rebuildBatContent);

          // Ejecutar en segundo plano (detached) - no bloquea el update
          const rebuildProc = spawn('cmd.exe', ['/c', rebuildBatPath], {
            cwd: BASE,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          });
          rebuildProc.unref();

          sendProgress(controller, { step: 'build', message: 'Reconstruccion en curso (ver barra en navegador)...', percent: 95 });

          // ── PASO 9: Completado ──
          const finalMsg = isRollback
            ? `RESTAURADO a v${targetVersion} (era v${localVersion})`
            : `Actualizado de v${localVersion} a v${targetVersion}`;

          sendProgress(controller, {
            step: 'complete',
            message: `${finalMsg}. La app se reconstruira y reiniciara automaticamente en 1-2 min.`,
            percent: 100,
          });

          controller.close();

        } catch (err: any) {
          console.error('[update] Error:', err);
          sendProgress(controller, {
            step: 'error',
            message: `Error inesperado: ${err?.message || 'Desconocido'}`,
            percent: 0,
          });
          controller.close();
        }
      };

      runUpdate();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
