import crypto from 'crypto';
import jwt    from 'jsonwebtoken';
import env    from '../config/env.config.js';
import { findUserByLogin, updateLastLogin } from '../repositories/auth.repository.js';

// Derive AES-256 key + IV once from the passphrase and salt (PBKDF2-HMAC-SHA1, 1000 iterations).
// Matches ASP.NET Rfc2898DeriveBytes: first 32 bytes = key, next 16 bytes = IV.
let _key = null;
let _iv  = null;

function getKeyIV() {
  if (_key) return { key: _key, iv: _iv };

  const salt    = Buffer.from(env.aes.salt.split(',').map((h) => parseInt(h.trim(), 16)));
  const derived = crypto.pbkdf2Sync(env.aes.key, salt, 1000, 48, 'sha1');

  _key = derived.slice(0, 32);
  _iv  = derived.slice(32, 48);

  return { key: _key, iv: _iv };
}

function encryptPassword(plainText) {
  const { key, iv } = getKeyIV();
  const cipher      = crypto.createCipheriv('aes-256-cbc', key, iv);

  // ASP.NET uses Encoding.Unicode (UTF-16 LE) before encrypting
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plainText, 'utf16le')),
    cipher.final(),
  ]);

  return encrypted.toString('base64');
}

function parsePermissions(value) {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export async function login(identifier, password) {
  const user = await findUserByLogin(identifier);

  if (!user || encryptPassword(password) !== user.APassword) {
    const err = new Error('Invalid credentials.');
    err.statusCode = 401;
    throw err;
  }

  updateLastLogin(user.ID).catch(() => {});

  const payload = {
    id:          user.ID,
    username:    user.AUserName,
    email:       user.EmailID,
    fullName:    user.FullName,
    userTypeId:  user.UserTypeID,
    onlyView:    parsePermissions(user.OnlyView),
    canDownload: parsePermissions(user.CanDownload),
    canEdit:     parsePermissions(user.CanEdit),
  };

  const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

  return { token, user: payload };
}
