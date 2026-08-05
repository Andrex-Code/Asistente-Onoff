const crypto = require('node:crypto');

const password = process.argv[2];
if (!password) {
  console.error('Uso: npm run hash-password -- "su-contraseña"');
  process.exit(1);
}

const iterations = 310000;
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
console.log(`pbkdf2_sha256$${iterations}$${salt}$${hash}`);
