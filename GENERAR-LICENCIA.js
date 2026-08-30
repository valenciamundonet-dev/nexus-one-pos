#!/usr/bin/env node
/**
 * Nexus One POS — Generador de Licencias v4.0
 * 
 * Genera y valida claves de licencia válidas para NexusOne POS.
 * Usa el MISMO algoritmo criptográfico que src/lib/license.ts
 * 
 * Uso:
 *   node GENERAR-LICENCIA.js --tipo profesional --nombre "Mi Negocio" --dias 365
 *   node GENERAR-LICENCIA.js --tipo basica --nombre "Tienda ABC" --maquina MCH-XXXXXXXX-XXXXXXXX
 *   node GENERAR-LICENCIA.js --tipo trial --nombre "Demo" --dias 30
 *   node GENERAR-LICENCIA.js --validate "PR020-26060-32027-..."
 *   node GENERAR-LICENCIA.js --batch --output licencias.txt
 */

const fs = require('fs');
const path = require('path');

// ─── Configuración ───────────────────────────────────────────────
const DEFAULT_SECRET = 'NX1-L1C3NC3-S3CR3T-K3Y-2024-PROD';
const LICENSE_SEED = 0x5A1F3E7B;

// ─── Argumentos CLI ──────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    tipo: 'profesional',
    nombre: '',
    maquina: '',
    dias: 365,
    secret: DEFAULT_SECRET,
    batch: false,
    output: '',
    help: false,
    validate: '',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--tipo': case '-t':
        opts.tipo = (args[++i] || '').toLowerCase(); break;
      case '--nombre': case '-n':
        opts.nombre = args[++i] || ''; break;
      case '--maquina': case '-m':
        opts.maquina = args[++i] || ''; break;
      case '--dias': case '-d':
        opts.dias = parseInt(args[++i]) || 365; break;
      case '--secret': case '-s':
        opts.secret = args[++i] || ''; break;
      case '--batch': case '-b':
        opts.batch = true; break;
      case '--output': case '-o':
        opts.output = args[++i] || ''; break;
      case '--validate': case '-v':
        opts.validate = args[++i] || ''; break;
      case '--verbose': case '-V':
        opts.verbose = true; break;
      case '--help': case '-h':
        opts.help = true; break;
    }
  }
  return opts;
}

// ─── Algoritmo de Hash (IDÉNTICO a license.ts) ────────────────────
function simpleHash(str) {
  let hash = LICENSE_SEED;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

function computeCheckDigit(payload, secret) {
  let hash = 0;
  const combined = payload + secret;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 7) - hash + char) | 0;
    hash = hash ^ (hash >>> 16);
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

function formatKey(raw) {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const groups = [];
  for (let i = 0; i < clean.length; i += 5) {
    groups.push(clean.substring(i, i + 5));
  }
  return groups.join('-');
}

// ─── Generador de Clave ──────────────────────────────────────────
function generateLicenseKey(licenseType, ownerName, machineId, days, secret) {
  const typeCode = licenseType === 'profesional' ? 'PR0'
    : licenseType === 'trial' ? 'TR0'
    : 'B4S';

  const now = new Date();
  const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const actDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const expDate = `${expiry.getFullYear()}${String(expiry.getMonth() + 1).padStart(2, '0')}${String(expiry.getDate()).padStart(2, '0')}`;
  const timeCode = actDate + expDate;

  const nameHash = simpleHash(ownerName.toLowerCase().trim());
  const machineHash = machineId ? simpleHash(machineId) : simpleHash(licenseType + timeCode);

  const payload = `${typeCode}${timeCode}${nameHash}${machineHash}`;
  const checkDigit = computeCheckDigit(payload, secret);

  const raw = `${typeCode}${timeCode}${nameHash}${machineHash}${checkDigit}`;
  return {
    key: formatKey(raw),
    type: licenseType,
    typeCode,
    activationDate: actDate,
    expiryDate: expDate,
    ownerName,
    machineId: machineId || '(cualquier máquina)',
    days,
    secret: secret ? '***CONFIGURADO***' : 'VACIO (sin protección)',
  };
}

// ─── Validador de Clave ──────────────────────────────────────────
function validateLicenseKey(licenseKey, secret, verbose) {
  const clean = licenseKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  if (verbose) {
    console.log(`  Clean: ${clean}`);
    console.log(`  Length: ${clean.length}`);
    console.log(`  Secret: ${secret ? '***' : '(vacío)'}`);
  }

  if (clean.length < 20) {
    return { valid: false, error: `Clave muy corta: ${clean.length} chars (mínimo 20)` };
  }

  let licenseType = 'basica';
  if (clean.startsWith('PR0')) {
    licenseType = 'profesional';
  } else if (clean.startsWith('B4S')) {
    licenseType = 'basica';
  } else if (clean.startsWith('TR0')) {
    licenseType = 'trial';
  } else {
    return { valid: false, error: `Tipo no reconocido: ${clean.substring(0, 3)} (debe ser PR0, B4S o TR0)` };
  }

  if (clean.length < 22) {
    return { valid: false, error: 'Formato incompleto (menos de 22 caracteres)' };
  }

  const actStr = clean.substring(3, 11);
  const expStr = clean.substring(11, 19);

  const eYear = parseInt(expStr.substring(0, 4));
  const eMonth = parseInt(expStr.substring(4, 6));
  const eDay = parseInt(expStr.substring(6, 8));

  if (verbose) console.log(`  Activation: ${actStr} | Expiry: ${expStr}`);

  if (eMonth < 1 || eMonth > 12 || eDay < 1 || eDay > 31) {
    return { valid: false, error: `Fecha de expiración inválida: ${expStr}` };
  }

  const aYear = parseInt(actStr.substring(0, 4));
  const aMonth = parseInt(actStr.substring(4, 6));
  const aDay = parseInt(actStr.substring(6, 8));

  // Verificar dígito de control
  const payload = clean.substring(0, clean.length - 4);
  const lastFour = clean.substring(clean.length - 4);
  const expectedCheck = computeCheckDigit(payload, secret);

  if (verbose) {
    console.log(`  Payload: ${payload}`);
    console.log(`  Expected check: ${expectedCheck}`);
    console.log(`  Received check: ${lastFour}`);
  }

  if (lastFour !== expectedCheck) {
    return {
      valid: false,
      error: `Dígito de verificación incorrecto`,
      expected: expectedCheck,
      received: lastFour,
      tip: 'La clave NO fue generada con este LICENSE_SECRET. Use este mismo generador con el mismo secret para crear claves válidas.',
    };
  }

  const isExpired = new Date(eYear, eMonth - 1, eDay, 23, 59, 59) < new Date();

  return {
    valid: true,
    licenseType,
    activationDate: `${aYear}-${String(aMonth).padStart(2, '0')}-${String(aDay).padStart(2, '0')}`,
    expiryDate: `${eYear}-${String(eMonth).padStart(2, '0')}-${String(eDay).padStart(2, '0')}`,
    isExpired,
  };
}

// ─── Generación por Lotes ────────────────────────────────────────
function generateBatch(secret, count, tipo, days) {
  const names = [
    'Tienda Principal', 'Negocio Demo', 'Bodega Central',
    'Punto de Venta 1', 'Sucursal Norte', 'Mini Market',
    'Farmacia Central', 'Panaderia Dulce', 'Ferreteria Industrial',
    'Super Mercado', 'Abastos El Buen Precio', 'Tech Store',
    'Carniceria Don Pedro', 'Licoreria La Buena', 'Optica Vision',
    'Zapateria Elegante', 'Deposito El Vigia', 'Fruver Don Lulo',
    'Papeleria Creativa', 'Boutique Moda',
  ];

  const licenses = [];
  for (let i = 0; i < count; i++) {
    const name = names[i % names.length];
    const result = generateLicenseKey(tipo, name, '', days, secret);
    licenses.push(result);
  }
  return licenses;
}

// ─── Display Helpers ─────────────────────────────────────────────
function displayLicense(info) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        NEXUS ONE POS — LICENCIA GENERADA            ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Tipo:           ${info.type.toUpperCase().padEnd(37)}║`);
  console.log(`║  Propietario:    ${info.ownerName.substring(0, 37).padEnd(37)}║`);
  console.log(`║  Máquina:        ${info.machineId.substring(0, 37).padEnd(37)}║`);
  console.log(`║  Activación:     ${info.activationDate.padEnd(37)}║`);
  console.log(`║  Expiración:     ${info.expiryDate.padEnd(37)}║`);
  console.log(`║  Duración:       ${(info.days + ' días').padEnd(37)}║`);
  console.log(`║  Secret:         ${info.secret.padEnd(37)}║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  CLAVE DE LICENCIA:                                   ║');
  console.log(`║  ${info.key.padEnd(52)}║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

function showHelp() {
  console.log(`
Nexus One POS — Generador de Licencias v4.0

Uso:
  node GENERAR-LICENCIA.js [opciones]

Opciones:
  --tipo, -t      Tipo: profesional | basica | trial (default: profesional)
  --nombre, -n    Nombre del propietario/negocio
  --maquina, -m   Machine ID (MCH-XXXXXXXX-XXXXXXXX). Omitir = cualquier PC.
  --dias, -d      Duración en días (default: 365)
  --secret, -s    LICENSE_SECRET (debe coincidir con el .env del servidor)
  --batch, -b     Generar lote de licencias
  --output, -o    Archivo de salida para lote
  --validate, -v  Validar una clave existente
  --verbose, -V   Mostrar detalles de validación
  --help, -h      Mostrar esta ayuda

Ejemplos:
  # Licencia profesional por 1 año
  node GENERAR-LICENCIA.js -t profesional -n "Mi Negocio" -d 365

  # Licencia básica vinculada a máquina
  node GENERAR-LICENCIA.js -t basica -n "Tienda ABC" -m MCH-95AB860A-B7E30A59

  # Trial de 30 días
  node GENERAR-LICENCIA.js -t trial -n "Demo" -d 30

  # Validar clave
  node GENERAR-LICENCIA.js -v "PR020-26060-32027-..."

  # Generar lote
  node GENERAR-LICENCIA.js -b -o licencias.txt
`);
}

// ─── Main ────────────────────────────────────────────────────────
const opts = parseArgs();

if (opts.help) {
  showHelp();
  process.exit(0);
}

if (opts.validate) {
  console.log(`\nValidando clave: ${opts.validate}\n`);
  const result = validateLicenseKey(opts.validate, opts.secret, opts.verbose);
  if (result.valid) {
    console.log(`  ✅ Licencia ${result.licenseType.toUpperCase()} VÁLIDA`);
    console.log(`  Activación: ${result.activationDate}`);
    console.log(`  Expiración: ${result.expiryDate}`);
    if (result.isExpired) console.log('  ⚠️  ESTÁ EXPIRADA (pero la clave es auténtica)');
  } else {
    console.log(`  ❌ ${result.error}`);
    if (result.expected) {
      console.log(`  Esperado:  ${result.expected}`);
      console.log(`  Recibido:  ${result.received}`);
    }
    if (result.tip) console.log(`\n  💡 ${result.tip}`);
  }
  process.exit(result.valid ? 0 : 1);
}

if (opts.batch) {
  const tipo = opts.tipo === 'trial' ? 'trial' : opts.tipo;
  const licenses = generateBatch(opts.secret, 20, tipo, opts.dias);
  let output = `# Nexus One POS — Licencias Generadas por Lote
# Fecha: ${new Date().toISOString()}
# Tipo: ${tipo.toUpperCase()} | Días: ${opts.dias}
# Secret: ${opts.secret ? '***CONFIGURADO***' : 'VACIO'}
# Total: ${licenses.length}
#
# Formato: # | CLAVE | NOMBRE | ACTIVACIÓN → EXPIRACIÓN
${'='.repeat(110)}\n\n`;

  for (let i = 0; i < licenses.length; i++) {
    const lic = licenses[i];
    output += `${String(i+1).padStart(3,'0')}. ${lic.key}  |  ${lic.ownerName.padEnd(25)}  |  ${lic.activationDate} → ${lic.expiryDate}\n`;
  }

  if (opts.output) {
    fs.writeFileSync(opts.output, output, 'utf-8');
    console.log(`\n✅ ${licenses.length} licencias generadas en: ${opts.output}`);
  } else {
    console.log(output);
  }
  process.exit(0);
}

// Generación individual
const tipo = opts.tipo === 'trial' ? 'trial' : opts.tipo;
const result = generateLicenseKey(tipo, opts.nombre || 'Cliente', opts.maquina, opts.dias, opts.secret);
displayLicense(result);

// Auto-verificar
const check = validateLicenseKey(result.key, opts.secret, false);
if (!check.valid) {
  console.log('❌ ERROR: La clave generada NO pasa la auto-verificación.');
  process.exit(1);
} else {
  console.log('✅ Verificación interna exitosa — la clave es válida según el algoritmo.');
  console.log('');
  console.log('⚠️  IMPORTANTE: El LICENSE_SECRET en el .env del servidor debe ser:');
  console.log(`    LICENSE_SECRET=${opts.secret || '(vacío)'}`);
  console.log('');
}
