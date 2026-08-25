import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const GITHUB_REPO = 'valenciamundonet-dev/valenciamundonet';

// Comparador de versiones: retorna >0 si a>b, <0 si a<b, 0 si iguales
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

// Calcular fecha relativa
function relativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return `Hace ${Math.floor(diffDays / 365)} anos`;
  } catch {
    return dateStr;
  }
}

// Interfaz de versiones
interface VersionEntry {
  version: string;
  nombre: string;
  notas: string;
  fecha: string;
  fechaRelativa: string;
  tipo: string;
  isNewer: boolean;
  isOlder: boolean;
  isCurrent: boolean;
  downloadUrl: string;
  size?: string;
}

interface VersionCheckResult {
  localVersion: string;
  status: string;
  statusMessage: string;
  source: 'github' | 'local' | 'error';
  versions: VersionEntry[];
  githubRepo: string;
  releasesUrl: string;
}

export async function GET() {
  try {
    // 1. Leer version local
    let localVersion = '0.0.0';
    try {
      const pkgPath = join(process.cwd(), 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        localVersion = pkg.version || '0.0.0';
      }
    } catch {}

    // 2. Intentar GitHub Releases API (primario)
    const githubToken = process.env.GITHUB_TOKEN;
    let result: VersionCheckResult | null = null;

    if (githubToken) {
      result = await fetchFromGitHub(localVersion, githubToken);
    }

    // 3. Fallback a versions.json local
    if (!result || result.status === 'error') {
      result = await fetchFromLocal(localVersion);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[check-version] Error:', err);
    return NextResponse.json({
      localVersion: '0.0.0',
      status: 'error',
      statusMessage: 'Error interno al verificar version',
      source: 'error',
      versions: [],
      githubRepo: GITHUB_REPO,
      releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
    }, { status: 500 });
  }
}

// === GITHUB RELEASES API ===
async function fetchFromGitHub(localVersion: string, token: string): Promise<VersionCheckResult> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Nexus One-Update-System',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`,
      { headers, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return {
          localVersion,
          status: 'error',
          statusMessage: 'Repositorio no encontrado en GitHub',
          source: 'github',
          versions: [],
          githubRepo: GITHUB_REPO,
          releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
        };
      }
      if (res.status === 401) {
        return {
          localVersion,
          status: 'error',
          statusMessage: 'Token de GitHub invalido o expirado',
          source: 'github',
          versions: [],
          githubRepo: GITHUB_REPO,
          releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
        };
      }
      throw new Error(`GitHub API: HTTP ${res.status}`);
    }

    const releases: Array<{
      tag_name: string;
      name: string;
      body: string;
      published_at: string;
      draft: boolean;
      prerelease: boolean;
      assets: Array<{ name: string; size: number; browser_download_url: string }>;
    }> = await res.json();

    // Filtrar releases publicadas con formato v2.9.XX
    const validReleases = releases.filter(r =>
      !r.draft &&
      /^v\d+\.\d+\.\d+$/.test(r.tag_name)
    );

    if (validReleases.length === 0) {
      return {
        localVersion,
        status: 'no_releases',
        statusMessage: 'No hay releases publicados en GitHub',
        source: 'github',
        versions: [],
        githubRepo: GITHUB_REPO,
        releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
      };
    }

    // Mapear a VersionEntry
    const versions: VersionEntry[] = validReleases.map(r => {
      const ver = r.tag_name.replace('v', '');
      const cmp = compareVersions(ver, localVersion);
      const asset = r.assets.find(a => a.name.includes('.zip'));
      return {
        version: ver,
        nombre: r.name || r.tag_name,
        notas: r.body || 'Sin notas de esta version.',
        fecha: r.published_at,
        fechaRelativa: relativeDate(r.published_at),
        tipo: r.prerelease ? 'beta' : 'estable',
        isNewer: cmp > 0,
        isOlder: cmp < 0,
        isCurrent: cmp === 0,
        downloadUrl: asset?.browser_download_url || `https://github.com/${GITHUB_REPO}/archive/refs/tags/${r.tag_name}.zip`,
        size: asset ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : undefined,
      };
    });

    const hasNewer = versions.some(v => v.isNewer);

    return {
      localVersion,
      status: hasNewer ? 'update_available' : 'up_to_date',
      statusMessage: hasNewer
        ? `Hay ${versions.filter(v => v.isNewer).length} version(es) nueva(s) disponible(s)`
        : 'Su sistema esta actualizado',
      source: 'github',
      versions,
      githubRepo: GITHUB_REPO,
      releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
    };
  } catch (err: any) {
    console.error('[check-version] GitHub error:', err?.message);
    // Retornar null para que el fallback local lo maneje
    return {
      localVersion,
      status: 'error',
      statusMessage: `Error de conexion con GitHub: ${err?.message || 'Sin internet'}`,
      source: 'github',
      versions: [],
      githubRepo: GITHUB_REPO,
      releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
    };
  }
}

// === LOCAL VERSIONS.JSON FALLBACK ===
async function fetchFromLocal(localVersion: string): Promise<VersionCheckResult> {
  try {
    const versionsPath = join(process.cwd(), 'public', 'versions.json');
    if (!existsSync(versionsPath)) {
      return {
        localVersion,
        status: 'error',
        statusMessage: 'No se encontro versions.json y GitHub no esta disponible',
        source: 'local',
        versions: [],
        githubRepo: GITHUB_REPO,
        releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
      };
    }

    const raw = readFileSync(versionsPath, 'utf-8');
    const entries: Array<{ version: string; nombre: string; notas: string; fecha: string; tipo: string }> = JSON.parse(raw);

    const versions: VersionEntry[] = entries.map(e => {
      const cmp = compareVersions(e.version, localVersion);
      return {
        version: e.version,
        nombre: e.nombre || `v${e.version}`,
        notas: e.notas || 'Sin notas.',
        fecha: e.fecha || '',
        fechaRelativa: relativeDate(e.fecha),
        tipo: e.tipo || 'estable',
        isNewer: cmp > 0,
        isOlder: cmp < 0,
        isCurrent: cmp === 0,
        downloadUrl: `/api/download-version?version=${e.version}`,
      };
    });

    const hasNewer = versions.some(v => v.isNewer);

    return {
      localVersion,
      status: hasNewer ? 'update_available' : 'up_to_date',
      statusMessage: hasNewer
        ? `Hay ${versions.filter(v => v.isNewer).length} version(es) nueva(s) disponible(s) (archivo local)`
        : 'Su sistema esta actualizado (archivo local)',
      source: 'local',
      versions,
      githubRepo: GITHUB_REPO,
      releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
    };
  } catch (err: any) {
    return {
      localVersion,
      status: 'error',
      statusMessage: 'No se pudo leer versions.json',
      source: 'local',
      versions: [],
      githubRepo: GITHUB_REPO,
      releasesUrl: `https://github.com/${GITHUB_REPO}/releases`,
    };
  }
}
