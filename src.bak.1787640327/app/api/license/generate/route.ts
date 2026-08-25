import { NextRequest, NextResponse } from 'next/server';
import { generateLicenseKey, getLicenseFeatures, getLicenseLimits, FEATURE_LABELS } from '@/lib/license';

/**
 * API para GENERAR claves de licencia (solo admin).
 * El administrador ingresa los datos del cliente y recibe una clave valida.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseType, ownerName, machineId, days } = body;

    // Validar tipo de licencia
    if (!licenseType || !['basica', 'profesional'].includes(licenseType)) {
      return NextResponse.json({ error: 'Tipo de licencia invalido. Use "basica" o "profesional".' }, { status: 400 });
    }

    // Validar nombre del propietario
    if (!ownerName || !ownerName.trim()) {
      return NextResponse.json({ error: 'El nombre del propietario es requerido.' }, { status: 400 });
    }

    // Generar la clave
    const licenseKey = generateLicenseKey(
      licenseType,
      ownerName.trim(),
      machineId || '',
      days ? parseInt(days) : undefined,
    );

    // Obtener info del plan para mostrar limites
    const limits = getLicenseLimits(licenseType);
    const features = getLicenseFeatures(licenseType);

    // Contar features habilitadas
    const enabledFeatures = Object.entries(features)
      .filter(([, v]) => v === true)
      .map(([k]) => FEATURE_LABELS[k] || k);

    return NextResponse.json({
      success: true,
      licenseKey,
      licenseType,
      ownerName: ownerName.trim(),
      machineId: machineId || 'CUALQUIERA',
      limits,
      enabledFeatures,
      totalFeatures: enabledFeatures.length,
      days: days || 365,
    });
  } catch (error) {
    console.error('License generation error:', error);
    return NextResponse.json({ error: 'Error al generar la licencia' }, { status: 500 });
  }
}
