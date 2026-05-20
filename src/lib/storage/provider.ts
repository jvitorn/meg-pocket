import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import {
  assertStorageS3Config,
  getStorageConfig,
  StorageConfigurationError,
  STORAGE_MAX_FILE_SIZE_BYTES,
} from "@/lib/storage/config";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type UploadInput = {
  buffer: Buffer;
  contentType: string;
  extension: string;
  folder?: string;
};

export type StorageUploadResult = {
  key: string;
  url: string;
};

function joinUrl(...parts: string[]) {
  return parts
    .map((part, index) =>
      index === 0 ? part.replace(/\/+$/, "") : part.replace(/^\/+|\/+$/g, "")
    )
    .filter(Boolean)
    .join("/");
}

function buildPublicObjectUrl(baseUrl: string, bucket: string, key: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedBucket = bucket.replace(/^\/+|\/+$/g, "");

  if (
    normalizedBaseUrl === normalizedBucket ||
    normalizedBaseUrl.endsWith(`/${normalizedBucket}`)
  ) {
    return joinUrl(normalizedBaseUrl, key);
  }

  return joinUrl(normalizedBaseUrl, normalizedBucket, key);
}

function ensureImageContentType(contentType: string) {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("Formato de imagem inválido. Use JPG, PNG ou WEBP.");
  }
}

export function assertUploadImageFile(file: File) {
  ensureImageContentType(file.type);

  if (file.size <= 0) {
    throw new Error("O arquivo enviado está vazio.");
  }

  if (file.size > STORAGE_MAX_FILE_SIZE_BYTES) {
    throw new Error("A imagem excede o limite de 40 MB.");
  }
}

function extensionFromContentType(contentType: string) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function buildObjectKey(folder: string, extension: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const fileName = `${crypto.randomUUID()}.${extension}`;

  return path.posix.join(folder, year, month, fileName);
}

async function uploadToLocalStorage({
  buffer,
  extension,
  folder = "personagens",
}: UploadInput): Promise<StorageUploadResult> {
  const config = getStorageConfig();
  const key = buildObjectKey(folder, extension);
  const localDir = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    config.localDir
  );
  const destination = path.join(/* turbopackIgnore: true */ localDir, key);

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);

  return {
    key,
    url: joinUrl(config.localPublicUrl, key),
  };
}

async function uploadToRemoteStorage({
  buffer,
  contentType,
  extension,
  folder = "personagens",
}: UploadInput): Promise<StorageUploadResult> {
  const config = assertStorageS3Config();

  const key = buildObjectKey(folder, extension);
  const client = new S3Client({
    region: config.s3Region,
    endpoint: config.s3Endpoint,
    forcePathStyle: config.s3ForcePathStyle,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
  });

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  } catch (error) {
    if (error instanceof StorageConfigurationError) {
      throw error;
    }

    throw new Error(
      error instanceof Error && error.message.trim()
        ? error.message
        : "Não foi possível enviar a imagem para o storage S3."
    );
  }

  return {
    key,
    url: buildPublicObjectUrl(config.s3PublicUrl, config.bucket, key),
  };
}

export async function uploadImageFile(file: File, folder = "personagens") {
  assertUploadImageFile(file);

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";
  ensureImageContentType(contentType);
  const extension = extensionFromContentType(contentType);
  const config = getStorageConfig();

  if (config.driver === "s3") {
    return uploadToRemoteStorage({
      buffer,
      contentType,
      extension,
      folder,
    });
  }

  return uploadToLocalStorage({
    buffer,
    contentType,
    extension,
    folder,
  });
}
