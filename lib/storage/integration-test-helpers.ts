interface CloudinaryStubControl {
  nextCallFailsOnce?: boolean;
  forcedUrl?: string;
}

interface CloudinaryStubUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
}

export class CloudinaryStub {
  private callCount = 0;
  private control: CloudinaryStubControl;
  public uploadedUrls: string[] = [];

  constructor(control: CloudinaryStubControl = {}) {
    this.control = control;
  }

  async upload(
    _file: string | Buffer,
    options: { public_id?: string; format?: string } = {},
  ): Promise<CloudinaryStubUploadResult> {
    this.callCount++;

    if (this.control.nextCallFailsOnce && this.callCount === 1) {
      const err = new Error("Collision") as Error & { http_code: number };
      err.http_code = 409;
      throw err;
    }

    const publicId = options.public_id ?? `test-${this.callCount}`;
    const url =
      this.control.forcedUrl ??
      `https://res.cloudinary.com/test-cloud/image/upload/${publicId}.${options.format ?? "jpg"}`;

    this.uploadedUrls.push(url);

    return {
      secure_url: url,
      public_id: publicId,
      bytes: 1024,
      format: options.format ?? "jpg",
    };
  }

  getCallCount(): number {
    return this.callCount;
  }
}

export function getCloudinaryClient(options?: {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
  control?: CloudinaryStubControl;
}): { client: CloudinaryStub | null; isStub: boolean } {
  const cloudName = options?.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = options?.apiKey ?? process.env.CLOUDINARY_API_KEY;
  const apiSecret = options?.apiSecret ?? process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      client: new CloudinaryStub(options?.control),
      isStub: true,
    };
  }

  return { client: null, isStub: false };
}

export async function createTestImageBuffer(
  format: "jpeg" | "png" | "webp" = "jpeg",
  width = 100,
  height = 100,
): Promise<Buffer> {
  const sharp = require("sharp");
  if (format === "jpeg") {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 128, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
  }
  if (format === "png") {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 128, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  }
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 128, b: 0 },
    },
  })
    .webp()
    .toBuffer();
}
