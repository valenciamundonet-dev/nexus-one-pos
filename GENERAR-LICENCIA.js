/**
 * Nexus One POS — Generador de Licencias Offline
 * 
 * Uso: node GENERAR-LICENCIA.js
 * 
 * Genera licencias para los planes BASICA y PROFESIONAL.
 * El LICENSE_SECRET se lee del archivo .env o se usa el default.
 */

const fs = require('fs');
const path = require('path');

const LICENSE_SEED = 0x5A1F3E7B;

// Leer LICENSE_SECRET del .env
function getLicenseSecret() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf-8');
    const m = env.match(/LICENSE_SECRET\s*=\s*"?([^"]+)"?/);
    if (m && m[1]) return m[1].trim();
  }
  return 'NX1-L1C3NC3-S3CR3T-K3Y-2024-PROD';
}

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

function generateLicense(licenseType, ownerName, machineId, days, secret) {
  const typeCode = licenseType === 'profesional' ? 'PR0' : 'B4S';
  const now = new Date();
  const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const timeCode = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${expiry.getFullYear()}${pad(expiry.getMonth()+1)}${pad(expiry.getDate())}`;
  
  const nameHash = simpleHash(ownerName.toLowerCase().trim());
  const machineHash = machineId ? simpleHash(machineId) : simpleHash(licenseType + timeCode);
  
  const payload = `${typeCode}${timeCode}${nameHash}${machineHash}`;
  const checkDigit = computeCheckDigit(payload, secret);
  
  return formatKey(`${typeCode}${timeCode}${nameHash}${machineHash}${checkDigit}`);
}

// ===== INTERACTIVO =====
const secret = getLicenseSecret();
console.log('');
console.log('  ======================================================');
console.log('  Nexus One POS — Generador de Licencias');
console.log('  ======================================================');
console.log('  LICENSE_SECRET: ' + secret.substring(0, 8) + '...' + secret.substring(secret.length - 4));
console.log('');

// Modo automatico con argumentos o interactivo
const args = process.argv.slice(2);
let mode = args[0] || '';
let owner = args[1] || '';
let days = parseInt(args[2]) || 365;
let machineId = args[3] || '';

if (mode !== 'basica' && mode !== 'profesional' && mode !== 'test' && mode !== 'batch') {
  console.log('  Uso:');
  console.log('    node GENERAR-LICENCIA.js <tipo> <nombre> [dias] [machineId]');
  console.log('    node GENERAR-LICENCIA.js batch <tipo> <nombre> <count> [dias]');
  console.log('');
  console.log('  Tipos:');
  console.log('    basica       — Plan Basico ($160/mes) - 1 usuario, 300 productos');
  console.log('    profesional  — Plan Profesional ($220/mes) - 5 usuarios, ilimitado');
  console.log('    test         — Genera 3 licencias de prueba');
  console.log('    batch        — Genera N licencias en lote');
  console.log('');
  console.log('  Ejemplos:');
  console.log('    node GENERAR-LICENCIA.js basica "Mi Negocio" 365');
  console.log('    node GENERAR-LICENCIA.js profesional "Mi Negocio" 365 MACHINE-ID-123');
  console.log('    node GENERAR-LICENCIA.js batch profesional "Mi Negocio" 5 365');
  console.log('    node GENERAR-LICENCIA.js test');
  console.log('');
  
  // Generar una licencia de ejemplo
  console.log('  --- Licencia de ejemplo (basica, 365 dias) ---');
  const key = generateLicense('basica', 'Nexus POS Demo', '', 365, secret);
  console.log('  Licencia: ' + key);
  console.log('');
  process.exit(0);
}

if (mode === 'test') {
  console.log('  Generando licencias de prueba...');
  console.log('');
  
  const plans = [
    { type: 'basica', name: 'Negocio Demo Basico', days: 365 },
    { type: 'profesional', name: 'Negocio Demo Profesional', days: 365 },
    { type: 'basica', name: 'Otro Cliente', days: 180 },
  ];
  
  plans.forEach(p => {
    const key = generateLicense(p.type, p.name, '', p.days, secret);
    console.log('  Plan: ' + p.type.toUpperCase());
    console.log('  Cliente: ' + p.name);
    console.log('  Dias: ' + p.days);
    console.log('  Licencia: ' + key);
    console.log('');
  });
  
  process.exit(0);
}

if (mode === 'batch') {
  const batchType = args[1] || '';
  const batchName = args[2] || '';
  const batchCount = parseInt(args[3]) || 1;
  const batchDays = parseInt(args[4]) || 365;
  
  if (batchType !== 'basica' && batchType !== 'profesional') {
    console.error('  ERROR: Tipo debe ser basica o profesional');
    process.exit(1);
  }
  if (!batchName) {
    console.error('  ERROR: Debe especificar el nombre del cliente');
    process.exit(1);
  }
  
  console.log('  ======================================================');
  console.log('  BATCH: Generando ' + batchCount + ' licencias');
  console.log('  ======================================================');
  console.log('  Plan: ' + batchType.toUpperCase());
  console.log('  Cliente: ' + batchName);
  console.log('  Validez: ' + batchDays + ' dias');
  console.log('');
  
  for (let i = 0; i < batchCount; i++) {
    const mid = 'BATCH-' + (i + 1) + '-' + Date.now().toString(36).toUpperCase();
    const key = generateLicense(batchType, batchName, mid, batchDays, secret);
    console.log('  [' + (i + 1) + '] Machine: ' + mid);
    console.log('      Licencia: ' + key);
    console.log('');
  }
  
  process.exit(0);
}

// Generar licencia con los parametros dados
if (!owner) {
  console.error('  ERROR: Debe especificar el nombre del cliente');
  console.error('  Uso: node GENERAR-LICENCIA.js ' + mode + ' "Nombre del Cliente" 365');
  process.exit(1);
}

const key = generateLicense(mode, owner, machineId, days, secret);
const maxActivations = mode === 'basica' ? 2 : 3;
console.log('  ======================================================');
console.log('  LICENCIA GENERADA');
console.log('  ======================================================');
console.log('  Plan:      ' + mode.toUpperCase());
console.log('  Cliente:   ' + owner);
console.log('  Valida por: ' + days + ' dias');
if (machineId) console.log('  Machine ID: ' + machineId);
console.log('  Max Activ: ' + maxActivations);
console.log('  Licencia:  ' + key);
console.log('');
console.log('  Copie esta licencia y peguela en la pantalla de');
console.log('  activacion del Nexus One POS.');
console.log('  ======================================================');
