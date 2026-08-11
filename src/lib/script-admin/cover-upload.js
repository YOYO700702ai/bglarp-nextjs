import { randomUUID } from 'node:crypto';
import { DEFAULT_COVER_BUCKET, DEFAULT_COVER_MAX_BYTES } from './constants';
import { databaseError, invalidRequest } from './errors';

const ACCEPTED_IMAGE_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

export async function createCoverUpload(adminClient, actor, input) {
  const contentType = typeof input.contentType === 'string' ? input.contentType.toLowerCase() : '';
  const extension = ACCEPTED_IMAGE_TYPES[contentType];
  if (!extension) {
    throw invalidRequest('封面只支援 JPG、PNG 或 WebP 圖片。', {
      contentType: '不支援的圖片類型',
    });
  }

  const configuredMax = Number(process.env.SCRIPT_COVER_MAX_BYTES || DEFAULT_COVER_MAX_BYTES);
  const maxBytes = Number.isInteger(configuredMax) && configuredMax > 0
    ? configuredMax
    : DEFAULT_COVER_MAX_BYTES;
  if (!Number.isInteger(input.size) || input.size <= 0 || input.size > maxBytes) {
    throw invalidRequest(`封面檔案必須小於 ${Math.floor(maxBytes / 1024 / 1024)} MB。`, {
      size: '檔案大小不符合限制',
    });
  }

  const bucket = process.env.SCRIPT_COVERS_BUCKET || DEFAULT_COVER_BUCKET;
  const now = new Date();
  const ownerSegment = actor.id || 'ai';
  const path = [
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    ownerSegment,
    `${randomUUID()}.${extension}`,
  ].join('/');

  const storage = adminClient.storage.from(bucket);
  const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
  if (error) throw databaseError('create cover upload url', error);
  const { data: publicData } = storage.getPublicUrl(path);

  return {
    bucket,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
    contentType,
    maxBytes,
  };
}
