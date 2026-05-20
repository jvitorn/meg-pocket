export const STORAGE_MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024;
export const STORAGE_MAX_FILE_SIZE_MB = 40;

export type StorageDriver = "local" | "s3";

export type StorageConfig = {
  driver: StorageDriver;
  bucket: string;
  localDir: string;
  localPublicUrl: string;
  s3Endpoint: string | null;
  s3Region: string;
  s3PublicUrl: string | null;
  s3AccessKeyId: string | null;
  s3SecretAccessKey: string | null;
  s3ForcePathStyle: boolean;
};

export type ConfiguredS3StorageConfig = StorageConfig & {
  driver: "s3";
  s3Endpoint: string;
  s3PublicUrl: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
};

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getSupabasePublicBucketFromUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const suffix = url.pathname.slice(markerIndex + marker.length);
    const bucket = suffix.split("/").find(Boolean);

    return bucket ?? null;
  } catch {
    return null;
  }
}

function normalizeStorageDriver(value?: string | null): StorageDriver {
  return value === "s3" || value === "remote" ? "s3" : "local";
}

function parseBooleanEnv(value?: string | null, fallback = false) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function getStorageConfig(): StorageConfig {
  const driver = normalizeStorageDriver(process.env.STORAGE_DRIVER);

  return {
    driver,
    bucket: process.env.STORAGE_BUCKET?.trim() || "personagens",
    localDir: process.env.STORAGE_LOCAL_DIR?.trim() || "./storage/local/public",
    localPublicUrl: trimTrailingSlash(
      process.env.STORAGE_LOCAL_PUBLIC_URL?.trim() || "/uploads"
    ),
    s3Endpoint: process.env.STORAGE_ENDPOINT?.trim()
      ? trimTrailingSlash(process.env.STORAGE_ENDPOINT.trim())
      : null,
    s3Region: process.env.STORAGE_REGION?.trim() || "auto",
    s3PublicUrl: process.env.STORAGE_PUBLIC_URL?.trim()
      ? trimTrailingSlash(process.env.STORAGE_PUBLIC_URL.trim())
      : null,
    s3AccessKeyId:
      process.env.STORAGE_ACCESS_ID?.trim() ||
      process.env.STIRAGE_ACCESS_ID?.trim() ||
      null,
    s3SecretAccessKey: process.env.STORAGE_ACCESS_KEY?.trim() || null,
    s3ForcePathStyle: parseBooleanEnv(
      process.env.STORAGE_FORCE_PATH_STYLE,
      true
    ),
  };
}

export function getMissingStorageS3Env(config = getStorageConfig()) {
  if (config.driver !== "s3") {
    return [];
  }

  return [
    !config.s3Endpoint ? "STORAGE_ENDPOINT" : null,
    !config.s3PublicUrl ? "STORAGE_PUBLIC_URL" : null,
    !config.s3AccessKeyId ? "STORAGE_ACCESS_ID" : null,
    !config.s3SecretAccessKey ? "STORAGE_ACCESS_KEY" : null,
  ].filter((item): item is string => Boolean(item));
}

export function assertStorageServerConfig() {
  const config = getStorageConfig();
  if (config.driver !== "s3") {
    return config;
  }

  return assertStorageS3Config(config);
}

export function assertStorageS3Config(
  config = getStorageConfig()
): ConfiguredS3StorageConfig {
  if (config.driver !== "s3") {
    throw new StorageConfigurationError(
      "Storage S3 solicitado, mas o driver configurado não é s3."
    );
  }

  const missing = getMissingStorageS3Env(config);

  if (missing.length > 0) {
    throw new StorageConfigurationError(
      `Storage S3 não configurado no servidor. Variáveis ausentes: ${missing.join(", ")}.`
    );
  }

  const publicBucket = getSupabasePublicBucketFromUrl(
    config.s3PublicUrl as string
  );

  if (publicBucket && publicBucket !== config.bucket) {
    throw new StorageConfigurationError(
      `Storage S3 inconsistente no servidor. STORAGE_PUBLIC_URL aponta para o bucket "${publicBucket}", mas STORAGE_BUCKET está configurado como "${config.bucket}".`
    );
  }

  return config as ConfiguredS3StorageConfig;
}
