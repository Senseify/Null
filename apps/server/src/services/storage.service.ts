import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';

export interface StorageFileResponse {
  stream: Readable;
  mimeType: string;
  size?: number;
}

class StorageService {
  private s3Client: S3Client | null = null;
  private isS3Configured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (ENV.S3_BUCKET && ENV.S3_ACCESS_KEY_ID && ENV.S3_SECRET_ACCESS_KEY) {
      try {
        this.s3Client = new S3Client({
          region: ENV.S3_REGION || 'auto',
          endpoint: ENV.S3_ENDPOINT || undefined,
          credentials: {
            accessKeyId: ENV.S3_ACCESS_KEY_ID,
            secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
          },
          forcePathStyle: true,
        });
        this.isS3Configured = true;
        console.log(`[Storage] Initialized S3-compatible persistent storage (Bucket: ${ENV.S3_BUCKET}, Endpoint: ${ENV.S3_ENDPOINT || 'AWS Standard'})`);
      } catch (err) {
        console.error('[Storage Error] Failed to initialize S3 client:', err);
        this.isS3Configured = false;
      }
    } else {
      console.log('[Storage] S3 credentials not provided. Using local disk fallback.');
      if (!fs.existsSync(ENV.UPLOAD_DIR)) {
        fs.mkdirSync(ENV.UPLOAD_DIR, { recursive: true });
      }
    }
  }

  public isUsingCloudStorage(): boolean {
    return this.isS3Configured;
  }

  public async upload(filename: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (this.isS3Configured && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: ENV.S3_BUCKET,
          Key: filename,
          Body: buffer,
          ContentType: mimeType,
        })
      );
      return `/api/attachments/${filename}`;
    }

    // Local disk fallback
    const filePath = path.join(ENV.UPLOAD_DIR, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `/api/attachments/${filename}`;
  }

  public async get(filename: string): Promise<StorageFileResponse | null> {
    const safeFilename = path.basename(filename);

    if (this.isS3Configured && this.s3Client) {
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: ENV.S3_BUCKET,
            Key: safeFilename,
          })
        );

        if (!response.Body) {
          return null;
        }

        return {
          stream: response.Body as Readable,
          mimeType: response.ContentType || 'application/octet-stream',
          size: response.ContentLength,
        };
      } catch (err: any) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          return null;
        }
        console.error(`[Storage Error] Failed to fetch object ${safeFilename} from S3:`, err);
        throw err;
      }
    }

    // Local disk fallback
    const filePath = path.join(ENV.UPLOAD_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stat = await fs.promises.stat(filePath);
    const stream = fs.createReadStream(filePath);
    return {
      stream,
      mimeType: 'application/octet-stream',
      size: stat.size,
    };
  }
}

export const storageService = new StorageService();
