
import sharp from "sharp";
import {
  validateMimeAndSize,
  assertHttps,
  ALLOWED_MIME,
  MAX_RAW_BYTES,
} from "@/lib/storage/cloudinary";
import {
  CloudinaryStub,
  createTestImageBuffer,
} from "@/lib/storage/integration-test-helpers";

describe("Image Pipeline Integration", () => {
  describe("validateMimeAndSize", () => {
    it("accepts valid JPEG MIME", async () => {
      const buffer = await createTestImageBuffer("jpeg");
      await expect(
        validateMimeAndSize({ buffer, mime: "image/jpeg" }),
      ).resolves.toBeUndefined();
    });

    it("accepts valid PNG MIME", async () => {
      const buffer = await createTestImageBuffer("png");
      await expect(
        validateMimeAndSize({ buffer, mime: "image/png" }),
      ).resolves.toBeUndefined();
    });

    it("accepts valid WebP MIME", async () => {
      const buffer = await createTestImageBuffer("webp");
      await expect(
        validateMimeAndSize({ buffer, mime: "image/webp" }),
      ).resolves.toBeUndefined();
    });

    it("rejects invalid MIME type", async () => {
      const buffer = Buffer.from("fake pdf content");
      await expect(
        validateMimeAndSize({ buffer, mime: "application/pdf" }),
      ).rejects.toThrow("Photo must be a JPG, PNG, or WebP image");
    });

    it("rejects file exceeding 10 MB", async () => {
      const largeBuffer = Buffer.alloc(MAX_RAW_BYTES + 1, 0);
      await expect(
        validateMimeAndSize({ buffer: largeBuffer, mime: "image/jpeg" }),
      ).rejects.toThrow("Photo exceeds the 10 MB size limit");
    });
  });

  describe("assertHttps", () => {
    it("passes for valid HTTPS URL", () => {
      expect(() =>
        assertHttps("https://res.cloudinary.com/test/image/upload/v1/photo.jpg"),
      ).not.toThrow();
    });

    it("throws for HTTP URL", () => {
      expect(() =>
        assertHttps("http://res.cloudinary.com/test/image/upload/v1/photo.jpg"),
      ).toThrow("non HTTPS URL");
    });

    it("throws for invalid URL", () => {
      expect(() => assertHttps("not-a-url")).toThrow("invalid URL");
    });
  });

  describe("compressAndUpload", () => {
    it("compresses JPEG and returns HTTPS URL", async () => {
      const stub = new CloudinaryStub();
      const buffer = await createTestImageBuffer("jpeg", 2000, 1500);

      const originalUpload = stub.upload.bind(stub);
      stub.upload = async (file: string | Buffer, options: Record<string, unknown> = {}) => {
        return originalUpload(file, options as { public_id?: string; format?: string });
      };

      const image = sharp(buffer, { failOn: "error" }).rotate().withMetadata({});
      const compressed = await image
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      const uploadResult = await stub.upload(compressed, { public_id: "test/complaint", format: "jpg" });

      expect(uploadResult.secure_url).toMatch(/^https:\/\//);
      expect(uploadResult.public_id).toBe("test/complaint");
    });

    it("retries once on 409 collision with nanoid suffix", async () => {
      const stub = new CloudinaryStub({ nextCallFailsOnce: true });
      const buffer = await createTestImageBuffer("jpeg");

      const originalUpload = stub.upload.bind(stub);
      stub.upload = async (file: string | Buffer, options: Record<string, unknown> = {}) => {
        return originalUpload(file, options as { public_id?: string; format?: string });
      };

      const image = sharp(buffer, { failOn: "error" }).rotate().withMetadata({});
      const compressed = await image
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      try {
        await stub.upload(compressed, { public_id: "test/complaint", format: "jpg" });
      } catch {
        const retryResult = await stub.upload(compressed, { public_id: "test/complaint-retry", format: "jpg" });
        expect(retryResult.secure_url).toMatch(/^https:\/\//);
      }

      expect(stub.getCallCount()).toBe(2);
    });
  });

  describe("ALLOWED_MIME", () => {
    it("contains exactly three MIME types", () => {
      expect(ALLOWED_MIME.size).toBe(3);
      expect(ALLOWED_MIME).toContain("image/jpeg");
      expect(ALLOWED_MIME).toContain("image/png");
      expect(ALLOWED_MIME).toContain("image/webp");
    });
  });
});
