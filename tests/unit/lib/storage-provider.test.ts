import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const s3ClientMock = vi.fn(function S3ClientMock() {
  return {
    send: sendMock,
  };
});
const putObjectCommandMock = vi.fn(function PutObjectCommandMock(input: unknown) {
  return { input };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3ClientMock,
  PutObjectCommand: putObjectCommandMock,
}));

describe("uploadImageFile", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.STORAGE_DRIVER = "local";
    process.env.STORAGE_BUCKET = "personagens";
    process.env.STORAGE_LOCAL_DIR = "./storage/test-public";
    process.env.STORAGE_LOCAL_PUBLIC_URL = "http://localhost:9323";
    process.env.STORAGE_ENDPOINT = "";
    process.env.STORAGE_PUBLIC_URL = "";
    process.env.STORAGE_ACCESS_ID = "";
    process.env.STIRAGE_ACCESS_ID = "";
    process.env.STORAGE_ACCESS_KEY = "";
  });

  it("envia imagem para o s3 quando o driver remoto estiver ativo", async () => {
    process.env.STORAGE_DRIVER = "s3";
    process.env.STORAGE_BUCKET = "personagens";
    process.env.STORAGE_ENDPOINT = "https://storage.example.com";
    process.env.STORAGE_REGION = "us-east-1";
    process.env.STORAGE_PUBLIC_URL = "https://cdn.example.com";
    process.env.STORAGE_ACCESS_ID = "access-id";
    process.env.STORAGE_ACCESS_KEY = "secret-key";
    sendMock.mockResolvedValue({});

    const { uploadImageFile } = await import("@/lib/storage/provider");
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    const result = await uploadImageFile(file, "personagens");

    expect(s3ClientMock).toHaveBeenCalledWith({
      region: "us-east-1",
      endpoint: "https://storage.example.com",
      forcePathStyle: true,
      credentials: {
        accessKeyId: "access-id",
        secretAccessKey: "secret-key",
      },
    });
    expect(putObjectCommandMock).toHaveBeenCalledTimes(1);
    expect(putObjectCommandMock.mock.calls[0]?.[0]).toMatchObject({
      Bucket: "personagens",
      ContentType: "image/png",
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(result.key).toMatch(/^personagens\/\d{4}\/\d{2}\/.+\.png$/);
    expect(result.url).toMatch(
      /^https:\/\/cdn\.example\.com\/personagens\/personagens\/\d{4}\/\d{2}\/.+\.png$/
    );
  });

  it("nao duplica o bucket na url publica quando a base ja aponta para ele", async () => {
    process.env.STORAGE_DRIVER = "s3";
    process.env.STORAGE_BUCKET = "assets";
    process.env.STORAGE_ENDPOINT = "https://storage.example.com";
    process.env.STORAGE_PUBLIC_URL =
      "https://storage.example.com/storage/v1/object/public/assets";
    process.env.STORAGE_ACCESS_ID = "access-id";
    process.env.STORAGE_ACCESS_KEY = "secret-key";
    sendMock.mockResolvedValue({});

    const { uploadImageFile } = await import("@/lib/storage/provider");
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    const result = await uploadImageFile(file, "personagens");

    expect(result.url).toMatch(
      /^https:\/\/storage\.example\.com\/storage\/v1\/object\/public\/assets\/personagens\/\d{4}\/\d{2}\/.+\.png$/
    );
  });

  it("aceita o alias legado STIRAGE_ACCESS_ID no config do s3", async () => {
    process.env.STORAGE_DRIVER = "s3";
    process.env.STORAGE_ENDPOINT = "https://storage.example.com";
    process.env.STORAGE_PUBLIC_URL = "https://cdn.example.com";
    process.env.STORAGE_ACCESS_ID = "";
    process.env.STIRAGE_ACCESS_ID = "legacy-access-id";
    process.env.STORAGE_ACCESS_KEY = "secret-key";
    sendMock.mockResolvedValue({});

    const { uploadImageFile } = await import("@/lib/storage/provider");
    const file = new File(["avatar"], "avatar.webp", { type: "image/webp" });

    await uploadImageFile(file, "personagens");

    expect(s3ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: {
          accessKeyId: "legacy-access-id",
          secretAccessKey: "secret-key",
        },
      })
    );
  });
});
