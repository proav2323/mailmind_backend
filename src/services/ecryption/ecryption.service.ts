import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class EcryptionService {
  private readonly algorithm = 'aes-256-ctr';
  private readonly password =
    process.env.ENCRYPTION_PASSWORD || 'v3ry_s3cr3t_p@ssw0rd';

  private readonly key = scryptSync(this.password, 'salt', 32);

  encrypt(text: string): string {
    const iv = randomBytes(16); // Initialization vector
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    // Combine IV and Ciphertext into a single string for simple storage
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(encryptedText: string): string {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted.toString();
  }
}
