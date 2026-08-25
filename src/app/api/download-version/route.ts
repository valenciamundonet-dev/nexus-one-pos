import { NextRequest, NextResponse } from 'next/server';
import { existsSync, statSync, createReadStream } from 'fs';
import { join } from 'path';

const GITHUB_REPO = 'valenciamundonet-dev/valenciamundonet';

export async function GET(req: NextRequest) {
  try {
    const version = req.nextUrl.searchParams.get('version');

    if (!version) {
      return NextResponse.json({ error: 'Version no especificada' }, { status: 400 });
    }

    // Sanitizar: solo permitir formato semver
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json({ error: 'Formato de version invalido' }, { status: 400 });
    }

    const tagName = `v${version}`;
    const BASE = process.cwd();

    // === Opcion 1: Buscar ZIP local en carpeta zip/ o releases/ ===
    const localPatterns = [
      join(BASE, 'zip', `NexusOne-v${version}.zip`),
      join(BASE, 'releases', `NexusOne-${tagName}.zip`),
      join(BASE, 'releases', `${tagName}.zip`),
    ];

    for (const filePath of localPatterns) {
      if (existsSync(filePath)) {
        const fileStat = statSync(filePath);
        const stream = createReadStream(filePath);
        return new Response(stream as any, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Length': String(fileStat.size),
            'Content-Disposition': `attachment; filename="NexusOne-${tagName}.zip"`,
          },
        });
      }
    }

    // === Opcion 2: Descargar desde GitHub con token ===
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({
        error: 'No hay token de GitHub configurado. Coloque el archivo ZIP manualmente en la carpeta zip/.',
      }, { status: 503 });
    }

    // Buscar release asset
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${token}`,
    };

    const relRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tagName}`,
      { headers }
    );

    if (!relRes.ok) {
      return NextResponse.json({
        error: `Release ${tagName} no encontrado en GitHub (HTTP ${relRes.status})`,
      }, { status: 404 });
    }

    const rel = await relRes.json();
    const asset = rel.assets?.find((a: any) => a.name.includes('.zip'));

    if (!asset) {
      // Fallback al archive ZIP
      const archiveUrl = `https://github.com/${GITHUB_REPO}/archive/refs/tags/${tagName}.zip`;
      const dlRes = await fetch(archiveUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        redirect: 'follow',
      });

      if (!dlRes.ok || !dlRes.body) {
        return NextResponse.json({
          error: `No se pudo descargar desde GitHub (HTTP ${dlRes.status})`,
        }, { status: 502 });
      }

      return new Response(dlRes.body, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="NexusOne-${tagName}.zip"`,
        },
      });
    }

    // Descargar asset
    const dlRes = await fetch(asset.browser_download_url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/octet-stream',
      },
      redirect: 'follow',
    });

    if (!dlRes.ok || !dlRes.body) {
      return NextResponse.json({
        error: `Error descargando asset: HTTP ${dlRes.status}`,
      }, { status: 502 });
    }

    return new Response(dlRes.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': dlRes.headers.get('Content-Length') || 'unknown',
        'Content-Disposition': `attachment; filename="${asset.name}"`,
      },
    });
  } catch (err: any) {
    console.error('[download-version] Error:', err);
    return NextResponse.json({
      error: `Error interno: ${err?.message || 'Desconocido'}`,
    }, { status: 500 });
  }
}
