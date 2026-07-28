import sharp from "sharp";
import { compress, validateMimeAndSize, MAX_RAW_BYTES } from "./cloudinary";
import { ApiError } from "@/lib/utils/errors";

async function makeJpeg(bytes: number, width = 2000, height = 1500): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3, 200);
  const image = sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 });
  const buf = await image.toBuffer();
  if (buf.byteLength >= bytes) return buf;
  return buf;
}

describe("validateMimeAndSize", () => {
  test("rejects non-image MIME types with invalid_photo", async () => {
    await expect(
      validateMimeAndSize({ buffer: Buffer.from("plain"), mime: "text/plain" }),
    ).rejects.toThrow(/JPG|PNG|WebP/);
  });

  test("rejects oversized raw payload with invalid_photo", async () => {
    const huge = Buffer.alloc(MAX_RAW_BYTES + 1, 0xff);
    await expect(validateMimeAndSize({ buffer: huge, mime: "image/jpeg" })).rejects.toThrow(/10 MB/);
  });

  test("accepts an in-range JPEG payload", async () => {
    const buf = await makeJpeg(2048);
    await expect(validateMimeAndSize({ buffer: buf, mime: "image/jpeg" })).resolves.toBeUndefined();
  });
});

describe("compress", () => {
  test("returns JPEG bytes inside the longest-side bound for JPEG input", async () => {
    const buf = await makeJpeg(2048);
    const out = await compress({ buffer: buf, mime: "image/jpeg" });
    expect(out.format).toBe("jpg");
    expect(out.mime).toBe("image/jpeg");
    expect(out.width).toBeLessThanOrEqual(1280);
    expect(out.height).toBeLessThanOrEqual(1280);
  });

  test("rejects with an error when buffer is not a valid image", async () => {
    await expect(compress({ buffer: Buffer.from("x"), mime: "image/jpeg" })).rejects.toThrow();
  });
});
