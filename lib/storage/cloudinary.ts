import { Readable } from "node:stream";
import sharp from "sharp";
import { v2 as cloudinaryV2 } from "cloudinary";
import { nanoid } from "nanoid";
import { ApiError } from "@/lib/utils/errors";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MIME_TO_FORMAT = new Map<string, "jpg" | "png" | "webp">([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const MAX_RAW_BYTES = 10 * 1024 * 1024;
const MAX_LONGEST_SIDE = 1280;
const JPEG_QUALITY = 80;

interface CompressedPhoto {
  buffer: Buffer;
  format: "jpg" | "png" | "webp";
  mime: string;
  width: number;
  height: number;
}

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: "jpg" | "png" | "webp";
}

interface PhotoInput {
  buffer: Buffer;
  mime: string;
  originalName?: string;
}

function readCloudinaryConfig(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      "cloudinary_unconfigured",
      "Cloudinary credentials are not configured on the server",
      503,
    );
  }
  return { cloudName, apiKey, apiSecret };
}

function assertHttps(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new ApiError(
        "cloudinary_url_insecure",
        "Cloudinary returned a non HTTPS URL",
        502,
      );
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "cloudinary_url_insecure",
      "Cloudinary returned an invalid URL",
      502,
    );
  }
}

function generatePublicId(originalName: string | undefined): string {
  const baseName = (originalName ?? "complaint")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  return `complaints/${Date.now()}-${baseName}`;
}

async function validateMimeAndSize(input: PhotoInput): Promise<void> {
  if (!ALLOWED_MIME.has(input.mime)) {
    throw new ApiError(
      "invalid_photo",
      "Photo must be a JPG, PNG, or WebP image",
      422,
    );
  }
  if (input.buffer.byteLength > MAX_RAW_BYTES) {
    throw new ApiError(
      "invalid_photo",
      "Photo exceeds the 10 MB size limit",
      422,
    );
  }
}

async function compress(input: PhotoInput): Promise<CompressedPhoto> {
  const image = sharp(input.buffer, { failOn: "error" }).rotate().withMetadata({});
  const metadata = await image.metadata();
  const longest = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  let pipeline = image;
  if (longest > MAX_LONGEST_SIDE) {
    pipeline = pipeline.resize({
      width: longest === metadata.width ? MAX_LONGEST_SIDE : undefined,
      height: longest === metadata.height ? MAX_LONGEST_SIDE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const sourceFormat = MIME_TO_FORMAT.get(input.mime);
  let buffer: Buffer;
  let format: "jpg" | "png" | "webp";
  if (sourceFormat === "jpg") {
    buffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    format = "jpg";
  } else if (sourceFormat === "png") {
    buffer = await pipeline
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    format = "png";
  } else {
    buffer = await pipeline
      .webp({ quality: JPEG_QUALITY, effort: 4 })
      .toBuffer();
    format = "webp";
  }

  const out = sharp(buffer);
  const outMeta = await out.metadata();
  const mime = format === "jpg" ? "image/jpeg" : `image/${format}`;
  return {
    buffer,
    format,
    mime,
    width: outMeta.width ?? 0,
    height: outMeta.height ?? 0,
  };
}

async function uploadToCloudinary(
  compressed: CompressedPhoto,
  originalName: string | undefined,
  config: { cloudName: string; apiKey: string; apiSecret: string },
): Promise<CloudinaryUploadResult> {
  cloudinaryV2.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const publicId = generatePublicId(originalName);

  const readStream = new Readable({
    read() {
      this.push(compressed.buffer);
      this.push(null);
    },
  });

  const upload = await new Promise<{
    secure_url: string;
    public_id: string;
    bytes: number;
    format: string;
  }>((resolve, reject) => {
    const stream = cloudinaryV2.uploader.upload_stream(
      {
        folder: "complaints",
        public_id: publicId,
        format: compressed.format,
        overwrite: false,
        resource_type: "image",
      },
      (err, result) => {
        if (err || !result) {
          reject(err ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(result);
      },
    );
    readStream.pipe(stream);
  }).catch(async (err: Error & { http_code?: number }) => {
    if (err.http_code === 409) {
      const retryPublicId = `${publicId}-${nanoid(8)}`;
      return new Promise<{
        secure_url: string;
        public_id: string;
        bytes: number;
        format: string;
      }>((resolve, reject) => {
        const retryStream = new Readable({
          read() {
            this.push(compressed.buffer);
            this.push(null);
          },
        });
        const stream = cloudinaryV2.uploader.upload_stream(
          {
            folder: "complaints",
            public_id: retryPublicId,
            format: compressed.format,
            overwrite: false,
            resource_type: "image",
          },
          (retryErr, retryResult) => {
            if (retryErr || !retryResult) {
              reject(
                new ApiError(
                  "cloudinary_collision_persistent",
                  "Cloudinary collision persisted after retry",
                  502,
                ),
              );
              return;
            }
            resolve(retryResult);
          },
        );
        retryStream.pipe(stream);
      });
    }
    throw err;
  });

  if (!upload.secure_url || !upload.public_id) {
    throw new ApiError(
      "cloudinary_partial_upload",
      "Cloudinary upload did not return a secure URL or public ID",
      502,
    );
  }

  assertHttps(upload.secure_url);

  return {
    url: upload.secure_url,
    publicId: upload.public_id,
    bytes: upload.bytes ?? compressed.buffer.byteLength,
    format: compressed.format,
  };
}

async function compressAndUpload(input: PhotoInput): Promise<CloudinaryUploadResult> {
  await validateMimeAndSize(input);
  if (input.buffer.byteLength === 0) {
    throw new ApiError("invalid_photo", "Photo is empty", 422);
  }
  const compressed = await compress(input);
  const config = readCloudinaryConfig();
  return uploadToCloudinary(compressed, input.originalName, config);
}

export {
  compressAndUpload,
  compress,
  validateMimeAndSize,
  assertHttps,
  MAX_RAW_BYTES,
  MAX_LONGEST_SIDE,
  ALLOWED_MIME,
};
export type {
  CompressedPhoto,
  CloudinaryUploadResult,
  PhotoInput,
};
