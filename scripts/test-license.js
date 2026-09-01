const SECRET = 'NX1-L1C3NC3-S3CR3T-K3Y-2024-PROD';
const SEED = 0x5A1F3E7B;

function simpleHash(str) {
  let hash = SEED;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
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

// Validate the key from the user's report
const userKey = 'PR020-26060-32027-0603P-Q0FZ5-1G6HO-S';
const clean = userKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
console.log('Cleaned key:', clean);
console.log('Length:', clean.length);

const lastFour = clean.substring(clean.length - 4);
const payload = clean.substring(0, clean.length - 4);
const expectedCheck = computeCheckDigit(payload, SECRET);
console.log('Last 4 chars (check digit):', lastFour);
console.log('Expected check digit:', expectedCheck);
console.log('Match:', lastFour === expectedCheck ? 'YES' : 'NO - MISMATCH!');

// Now generate a fresh key and validate it
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const result = execSync('node GENERAR-LICENCIA.js profesional "Test Validation" 365', {
  env: { ...process.env, LICENSE_SECRET: SECRET },
  cwd: '/home/z/my-project',
  encoding: 'utf-8'
});

const match = result.match(/Licencia:\s*(.+)/);
if (match) {
  const freshKey = match[1].trim();
  const freshClean = freshKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const freshLast4 = freshClean.substring(freshClean.length - 4);
  const freshPayload = freshClean.substring(0, freshClean.length - 4);
  const freshExpected = computeCheckDigit(freshPayload, SECRET);
  console.log('\nFresh generated key:', freshKey);
  console.log('Fresh validation:', freshLast4 === freshExpected ? 'VALID' : 'INVALID');
}
