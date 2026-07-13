import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3クライアントを初期化
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
  },
  region: process.env.AWS_REGION!,
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export async function deleteS3Object(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// S3からファイルをダウンロードするための署名付きURLを生成する（有効期限15分）
export async function getPresignedGetUrl(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      // ダウンロード時のファイル名を指定（日本語ファイル名にも対応）
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: 15 * 60 }
  );
}

// S3にファイルをアップロードするための署名付きURLを生成する（有効期限5分）
export async function getPresignedPutUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, ContentType: contentType, Key: key }),
    { expiresIn: 5 * 60 }
  );
}
