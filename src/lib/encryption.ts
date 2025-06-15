import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
}

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipherGCM(ALGORITHM, Buffer.from(ENCRYPTION_KEY));
  cipher.setAAD(Buffer.from('equisplit-legal-data'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipherGCM(ALGORITHM, Buffer.from(ENCRYPTION_KEY));
  decipher.setIV(Buffer.from(encryptedData.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  decipher.setAAD(Buffer.from('equisplit-legal-data'));
  
  let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Helper functions for common field encryption
export function encryptString(value: string | null | undefined): string | null {
  if (!value) return null;
  const encrypted = encrypt(value);
  return JSON.stringify(encrypted);
}

export function decryptString(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const encrypted = JSON.parse(value) as EncryptedData;
    return decrypt(encrypted);
  } catch (error) {
    console.error('Failed to decrypt string:', error);
    return null;
  }
}

export function encryptNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return encryptString(value.toString());
}

export function decryptNumber(value: string | null | undefined): number | null {
  const decrypted = decryptString(value);
  if (!decrypted) return null;
  const parsed = parseFloat(decrypted);
  return isNaN(parsed) ? null : parsed;
}