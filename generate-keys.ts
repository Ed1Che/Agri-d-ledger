// scripts/generate-keys.ts — generate RS256 key pair for JWT signing

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';

const keysDir = './keys';

if (!existsSync(keysDir)) mkdirSync(keysDir, { recursive: true });

console.log('Generating RSA 2048 key pair...');
execSync(`openssl genrsa -out ${keysDir}/private.pem 2048`);
execSync(`openssl rsa -in ${keysDir}/private.pem -pubout -out ${keysDir}/public.pem`);
console.log(`Keys written to ${keysDir}/ ✓`);
console.log('Add these paths to your .env:');
console.log(`  JWT_PRIVATE_KEY_PATH=${keysDir}/private.pem`);
console.log(`  JWT_PUBLIC_KEY_PATH=${keysDir}/public.pem`);
