/**
 * Password verification helper
 * ─────────────────────────────
 * Usage (from the backend/ directory):
 *   node scripts/find-aes-key.js <plainPassword> <storedBase64Hash>
 *
 * Example:
 *   node scripts/find-aes-key.js "Admin@123" "lZhKB6I1QsJbDZdKlkYN2A=="
 *
 * Tests the known key + salt from .env using PBKDF2 + AES-256-CBC (matching ASP.NET).
 * Tries both UTF-16 LE (Encoding.Unicode) and UTF-8 (Encoding.UTF8) text encodings.
 */

import crypto   from 'crypto';
import dotenv   from 'dotenv';
import { fileURLToPath } from 'url';
import path     from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const [, , plainPassword, storedBase64] = process.argv;
if (!plainPassword || !storedBase64) {
  console.error('Usage: node scripts/find-aes-key.js <plainPassword> <storedBase64Hash>');
  process.exit(1);
}

const AES_KEY  = process.env.AES_KEY;
const AES_SALT = process.env.AES_SALT || '49,76,61,6e,20,4d,65,64,76,65,64,65,76';

if (!AES_KEY) {
  console.error('AES_KEY is not set in .env');
  process.exit(1);
}

const salt    = Buffer.from(AES_SALT.split(',').map((h) => parseInt(h.trim(), 16)));
const derived = crypto.pbkdf2Sync(AES_KEY, salt, 1000, 48, 'sha1');
const key     = derived.slice(0, 32);
const iv      = derived.slice(32, 48);

console.log(`\nKey passphrase : ${AES_KEY}`);
console.log(`Salt (hex)     : ${AES_SALT}`);
console.log(`Salt (ascii)   : ${salt.toString('ascii')}`);
console.log(`Derived key    : ${key.toString('hex')}`);
console.log(`Derived IV     : ${iv.toString('hex')}`);
console.log(`Plain text     : ${plainPassword}`);
console.log(`Stored hash    : ${storedBase64}\n`);

function tryEncrypt(encoding) {
  try {
    const plainBytes = Buffer.from(plainPassword, encoding);
    const cipher     = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted  = Buffer.concat([cipher.update(plainBytes), cipher.final()]);
    return encrypted.toString('base64');
  } catch {
    return null;
  }
}

function tryDecrypt(encoding) {
  try {
    const decipher  = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(storedBase64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString(encoding);
  } catch {
    return null;
  }
}

let found = false;

for (const enc of ['utf16le', 'utf8']) {
  const encrypted = tryEncrypt(enc);
  const decrypted = tryDecrypt(enc);
  const label     = enc === 'utf16le' ? 'UTF-16 LE (.NET Encoding.Unicode)' : 'UTF-8   (.NET Encoding.UTF8)';

  console.log(`[${label}]`);
  console.log(`  Encrypted input : ${encrypted}`);
  console.log(`  Decrypted hash  : ${decrypted}`);

  if (encrypted === storedBase64) {
    console.log(`  ✅  ENCRYPT MATCH — this encoding is correct!`);
    found = true;
  } else if (decrypted?.trim() === plainPassword) {
    console.log(`  ✅  DECRYPT MATCH — this encoding is correct!`);
    found = true;
  } else {
    console.log(`  ❌  No match`);
  }
  console.log();
}

if (!found) {
  console.log('No match found. Possible reasons:');
  console.log('  1. The plain-text password you supplied is wrong (try another user)');
  console.log('  2. The AES_KEY in .env is incorrect');
  console.log('  3. The .NET code uses PasswordDeriveBytes (PBKDF1) instead of Rfc2898DeriveBytes (PBKDF2)');
  console.log('  4. The .NET code uses a different iteration count (not 1000)');
}
