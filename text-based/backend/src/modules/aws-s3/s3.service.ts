import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client?: S3Client;
  private readonly bucketName: string;
  private readonly isConfigured: boolean;
  private readonly localUploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || 'regshield-compliance-docs';
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    this.localUploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }

    if (accessKeyId && secretAccessKey && accessKeyId !== 'mock_or_real_key') {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isConfigured = true;
      this.logger.log(`Initialized S3 Client with bucket: ${this.bucketName} in ${region}`);
    } else {
      this.isConfigured = false;
      this.logger.warn('AWS S3 credentials not fully configured. Using local storage fallback for documents.');
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'documents'): Promise<{ key: string; url?: string }> {
    const key = `${folder}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (this.isConfigured && this.s3Client) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        });
        await this.s3Client.send(command);
        const url = await this.getPresignedUrl(key);
        return { key, url };
      } catch (err) {
        this.logger.error(`S3 upload error: ${err.message}. Falling back to local storage.`);
      }
    }

    // Fallback: save to local disk
    const localFilePath = path.join(this.localUploadDir, path.basename(key));
    await fs.promises.writeFile(localFilePath, file.buffer);
    return {
      key,
      url: `/api/compliance/documents/${encodeURIComponent(path.basename(key))}`,
    };
  }

  async getPresignedUrl(key: string): Promise<string> {
    if (this.isConfigured && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }
    return `/api/compliance/documents/${encodeURIComponent(path.basename(key))}`;
  }
}
