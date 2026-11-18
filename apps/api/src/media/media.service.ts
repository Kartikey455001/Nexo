import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { PresignedUrlResponse } from '@nexo/types';

@Injectable()
export class MediaService {
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.MINIO_BUCKET || 'nexo-media';
  private readonly logger = new Logger(MediaService.name);

  constructor() {
    this.s3Client = new S3Client({
      region: 'us-east-1', // MinIO requires a region, even if fake
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'admin',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'admin123',
      },
      forcePathStyle: true, // Required for MinIO
    });
    
    this.initializeBucket();
  }

  private async initializeBucket() {
    // In production, terraform or similar handles this.
    // For local dev with MinIO, we'll try to create it if it doesn't exist, but typically done separately.
    // Assuming the bucket exists or we create it via MinIO CLI/console.
  }

  async generatePresignedUrl(originalFilename: string, contentType: string): Promise<PresignedUrlResponse> {
    const ext = originalFilename.split('.').pop() || 'bin';
    const uniqueFilename = `${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    
    // The public URL to view the file (if bucket policy is public read)
    // Or we'll proxy it if needed. Let's assume bucket is public-read for this phase.
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const fileUrl = `${endpoint}/${this.bucketName}/${uniqueFilename}`;

    return { uploadUrl, fileUrl };
  }
}
