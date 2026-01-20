import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 32;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Encrypt sensitive data
   */
  async encrypt(plaintext: string, context?: string): Promise<Buffer> {
    const masterKey = this.getMasterKey();

    // Generate salt and IV
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);

    // Derive key using scrypt
    const key = (await scryptAsync(
      masterKey,
      context ? Buffer.concat([salt, Buffer.from(context)]) : salt,
      this.keyLength,
    )) as Buffer;

    // Encrypt
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + encrypted
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(ciphertext: Buffer, context?: string): Promise<string> {
    try {
      const masterKey = this.getMasterKey();

      // Extract components
      const salt = ciphertext.subarray(0, this.saltLength);
      const iv = ciphertext.subarray(
        this.saltLength,
        this.saltLength + this.ivLength,
      );
      const tag = ciphertext.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength,
      );
      const encrypted = ciphertext.subarray(
        this.saltLength + this.ivLength + this.tagLength,
      );

      // Derive key
      const key = (await scryptAsync(
        masterKey,
        context ? Buffer.concat([salt, Buffer.from(context)]) : salt,
        this.keyLength,
      )) as Buffer;

      // Decrypt
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      return decipher.update(encrypted) + decipher.final('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a value (one-way)
   */
  async hash(value: string): Promise<string> {
    const salt = randomBytes(16);
    const key = (await scryptAsync(value, salt, 64)) as Buffer;
    return `${salt.toString('hex')}:${key.toString('hex')}`;
  }

  /**
   * Verify a hashed value
   */
  async verifyHash(value: string, hash: string): Promise<boolean> {
    try {
      const [saltHex, keyHex] = hash.split(':');
      if (!saltHex || !keyHex) return false;

      const salt = Buffer.from(saltHex, 'hex');
      const key = (await scryptAsync(value, salt, 64)) as Buffer;

      return key.toString('hex') === keyHex;
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random token
   */
  generateToken(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Get master encryption key
   */
  private getMasterKey(): string {
    const key = this.configService.get<string>('encryption.key');
    if (!key || key.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be at least 32 characters. Set it in environment variables.',
      );
    }
    return key;
  }
}
