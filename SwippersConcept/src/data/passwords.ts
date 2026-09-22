// Password handling for the local concept accounts. Passwords are never
// stored in plain text (NF.05.06): we keep a random salt and a SHA-256 digest.
//
// NOTE: this only stands in for a real backend. Production must hash on the
// server with a slow algorithm such as bcrypt or argon2.

import * as Crypto from 'expo-crypto';

export async function createSalt(): Promise<string> {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}
