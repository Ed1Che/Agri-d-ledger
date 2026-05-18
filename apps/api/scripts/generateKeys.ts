// scripts/generateKeys.ts
// Run with: npm run keys:generate --workspace=apps/api
// Generates an RSA 2048-bit key pair and prints base64-encoded PEM strings
// ready to paste into apps/api/.env

import { generateKeyPairSync } from 'crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const b64Private = Buffer.from(privateKey).toString('base64');
const b64Public = Buffer.from(publicKey).toString('base64');

console.log('\n✅ RSA key pair generated. Copy these into apps/api/.env:\n');
console.log(`JWT_PRIVATE_KEY=${b64Private}`);
console.log(`JWT_PUBLIC_KEY=${b64Public}`);
console.log('\n⚠️  Never commit these values to version control.\n');
