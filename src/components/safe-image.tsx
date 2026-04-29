"use client";

import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type SafeImageProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  alt: string;
  fallbackLabel?: string;
  fallbackClassName?: string;
};

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return words.map((word) => word[0]).join("").toUpperCase() || "?";
}

export function SafeImage({
  src,
  alt,
  className,
  fallbackLabel,
  fallbackClassName,
  onError,
  ...props
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const normalizedSrc = src?.trim() || "";
  const failed = Boolean(normalizedSrc && failedSrc === normalizedSrc);
  const initials = useMemo(
    () => getInitials(fallbackLabel || alt),
    [alt, fallbackLabel]
  );

  if (!normalizedSrc || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-muted/40 text-sm font-semibold text-muted-foreground",
          fallbackClassName
        )}
      >
        {initials !== "?" ? (
          <span>{initials}</span>
        ) : (
          <ImageOff className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <Image
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={(event) => {
        setFailedSrc(normalizedSrc);
        onError?.(event);
      }}
      {...props}
    />
  );
}
