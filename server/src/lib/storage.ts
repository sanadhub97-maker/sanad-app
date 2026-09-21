import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/config/env";

// Storage abstraction so the driver can switch to an S3-compatible backend
// (e.g. Neon Object Storage) via STORAGE_* env vars without touching call
// sites (§36 / §44).
export interface StorageDriver {
  save(buffer: Buffer, originalName: string): Promise<{ storedName: string; size: number }>;
  read(storedName: string): Promise<Buffer>;
  delete(storedName: string): Promise<void>;
}

function safeStoredName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const random = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${random}${ext}`;
}

class LocalStorageDriver implements StorageDriver {
  private uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async save(buffer: Buffer, originalName: string) {
    const storedName = safeStoredName(originalName);
    await fs.promises.writeFile(path.join(this.uploadDir, storedName), buffer);
    return { storedName, size: buffer.length };
  }

  async read(storedName: string): Promise<Buffer> {
    return fs.promises.readFile(path.join(this.uploadDir, storedName));
  }

  async delete(storedName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, storedName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// S3-compatible driver — works with Neon Object Storage (or any S3-compatible
// endpoint) via path-style addressing + SigV4, as required by STORAGE_ENDPOINT.
class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.STORAGE_BUCKET;
    this.client = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION || "us-east-2",
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      },
    });
  }

  async save(buffer: Buffer, originalName: string) {
    const storedName = safeStoredName(originalName);
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: storedName, Body: buffer })
    );
    return { storedName, size: buffer.length };
  }

  async read(storedName: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storedName }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async delete(storedName: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storedName }));
  }
}

export const storage: StorageDriver =
  env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
