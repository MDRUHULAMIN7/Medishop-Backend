import sharp from 'sharp';

const MAX_REMOTE_IMAGE_BYTES = 12 * 1024 * 1024;

export interface ClipImageBuffer {
  data: Buffer;
  width: number;
  height: number;
}

/** Decode, orient, shrink, and convert a scan/reference image to RGB pixels. */
export async function preprocessForClip(buffer: Buffer): Promise<ClipImageBuffer> {
  let result;
  try {
    result = await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw Object.assign(new Error('Invalid or unreadable image'), { recognitionCode: 'INVALID_IMAGE' });
  }

  if (result.info.channels !== 3) {
    throw new Error(`Image normalization produced ${result.info.channels} channels; RGB is required`);
  }

  return { data: result.data, width: result.info.width, height: result.info.height };
}

export async function fetchReferenceImage(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:image/')) {
    const [, encoded] = imageUrl.split(',', 2);
    if (!encoded) throw new Error('Invalid data image URL');
    return Buffer.from(encoded, 'base64');
  }

  const parsed = new URL(imageUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Reference image URL must use HTTP or HTTPS');
  }

  const response = await fetch(parsed);
  if (!response.ok) throw new Error(`Reference image returned HTTP ${response.status}`);

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error('Reference image is too large');
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error('Reference image is too large');
  }
  return Buffer.from(arrayBuffer);
}
