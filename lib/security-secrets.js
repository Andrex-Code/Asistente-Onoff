function getAuthSecret() {
  const secret = String(process.env.AUTH_SECRET || '');
  if (secret.length < 32) {
    throw new Error('AUTH_SECRET no está configurado o es demasiado corto. Debe tener al menos 32 caracteres.');
  }
  return secret;
}

module.exports = { getAuthSecret };
