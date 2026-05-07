/* eslint-disable @next/next/no-img-element */
"use client";

import { type ChangeEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Move, Trash2, Upload, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

const MAX_FILE_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB ?? 40
);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type CropDraft = {
  sourceUrl: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type ImageUploadDraft = {
  previewUrl: string;
  file: File | null;
};

type Props = {
  value: ImageUploadDraft | null;
  onChange: (nextValue: ImageUploadDraft | null) => void;
  disabled?: boolean;
};

function isAllowedImageType(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

function getViewportBaseScale(draft: CropDraft, viewportSize: number) {
  return Math.max(
    viewportSize / draft.naturalWidth,
    viewportSize / draft.naturalHeight
  );
}

function clampCropOffsets(
  draft: CropDraft,
  viewportSize: number,
  offsetX: number,
  offsetY: number
) {
  const baseScale = getViewportBaseScale(draft, viewportSize);
  const renderedWidth = draft.naturalWidth * baseScale * draft.zoom;
  const renderedHeight = draft.naturalHeight * baseScale * draft.zoom;
  const maxOffsetX = Math.max(0, (renderedWidth - viewportSize) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - viewportSize) / 2);

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  };
}

function loadImageDimensions(sourceUrl: string) {
  return new Promise<{ naturalWidth: number; naturalHeight: number }>(
    (resolve, reject) => {
      const image = new window.Image();
      image.onload = () =>
        resolve({
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        });
      image.onerror = () =>
        reject(new Error("Não foi possível ler a imagem selecionada."));
      image.src = sourceUrl;
    }
  );
}

function loadImageElement(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Não foi possível preparar a imagem para recorte."));
    image.src = sourceUrl;
  });
}

function createCenteredCropDraft(
  sourceUrl: string,
  fileName: string,
  naturalWidth: number,
  naturalHeight: number
): CropDraft {
  return {
    sourceUrl,
    fileName,
    naturalWidth,
    naturalHeight,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  };
}

export function PersonagemImageUpload({ value, onChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cropSourceUrlRef = useRef<string | null>(null);
  const cropViewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [cropViewportSize, setCropViewportSize] = useState(320);

  useEffect(() => {
    cropSourceUrlRef.current = cropDraft?.sourceUrl ?? null;
  }, [cropDraft?.sourceUrl]);

  useEffect(() => {
    return () => {
      if (cropSourceUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(cropSourceUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!cropDraft || !cropViewportRef.current) {
      return;
    }

    const element = cropViewportRef.current;
    const syncViewportSize = () => {
      const nextSize = Math.max(260, Math.round(element.getBoundingClientRect().width));
      setCropViewportSize(nextSize);
    };

    syncViewportSize();

    const observer = new ResizeObserver(syncViewportSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [cropDraft]);

  function clearCropDraft() {
    setCropDraft((current) => {
      if (current?.sourceUrl.startsWith("blob:")) {
        URL.revokeObjectURL(current.sourceUrl);
      }

      return null;
    });
  }

  const renderedStyle = useMemo(() => {
    if (!cropDraft) {
      return null;
    }

    const baseScale = getViewportBaseScale(cropDraft, cropViewportSize);
    const scale = baseScale * cropDraft.zoom;

    return {
      width: cropDraft.naturalWidth * scale,
      height: cropDraft.naturalHeight * scale,
      transform: `translate(calc(-50% + ${cropDraft.offsetX}px), calc(-50% + ${cropDraft.offsetY}px))`,
    };
  }, [cropDraft, cropViewportSize]);

  async function handlePickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!isAllowedImageType(file)) {
      setError("Use uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`A imagem excede o limite de ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
      const dimensions = await loadImageDimensions(objectUrl);
      setCropDraft((current) => {
        if (current?.sourceUrl.startsWith("blob:")) {
          URL.revokeObjectURL(current.sourceUrl);
        }

        return createCenteredCropDraft(
          objectUrl,
          file.name,
          dimensions.naturalWidth,
          dimensions.naturalHeight
        );
      });
      setError(null);
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível ler a imagem selecionada."
      );
    }
  }

  function openFilePicker() {
    if (disabled) {
      return;
    }

    inputRef.current?.click();
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!cropDraft) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: cropDraft.offsetX,
      offsetY: cropDraft.offsetY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!cropDraft || !dragRef.current) {
      return;
    }

    const nextOffsetX =
      dragRef.current.offsetX + (event.clientX - dragRef.current.startX);
    const nextOffsetY =
      dragRef.current.offsetY + (event.clientY - dragRef.current.startY);
    const clamped = clampCropOffsets(
      cropDraft,
      cropViewportSize,
      nextOffsetX,
      nextOffsetY
    );

    setCropDraft((current) =>
      current
        ? {
            ...current,
            ...clamped,
          }
        : current
    );
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (
      dragRef.current &&
      event.currentTarget.hasPointerCapture(dragRef.current.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }

    dragRef.current = null;
  }

  async function handleConfirmCrop() {
    if (!cropDraft || cropLoading) {
      return;
    }

    setCropLoading(true);

    try {
      const image = await loadImageElement(cropDraft.sourceUrl);
      const baseScale = getViewportBaseScale(cropDraft, cropViewportSize);
      const scale = baseScale * cropDraft.zoom;
      const cropSize = cropViewportSize / scale;
      const srcX =
        cropDraft.naturalWidth / 2 +
        (-cropViewportSize / 2 - cropDraft.offsetX) / scale;
      const srcY =
        cropDraft.naturalHeight / 2 +
        (-cropViewportSize / 2 - cropDraft.offsetY) / scale;
      const outputSize = Math.max(512, Math.min(1200, Math.round(cropSize)));

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Não foi possível preparar o recorte da imagem.");
      }

      context.drawImage(
        image,
        srcX,
        srcY,
        cropSize,
        cropSize,
        0,
        0,
        outputSize,
        outputSize
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(new Error("Não foi possível gerar a imagem recortada."));
              return;
            }

            resolve(result);
          },
          "image/webp",
          0.92
        );
      });

      if (blob.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`A imagem final excede o limite de ${MAX_FILE_SIZE_MB} MB.`);
      }

      const safeName = cropDraft.fileName.replace(/\.[^.]+$/, "") || "personagem";
      const file = new File([blob], `${safeName}.webp`, {
        type: "image/webp",
      });

      onChange({
        previewUrl: URL.createObjectURL(file),
        file,
      });

      clearCropDraft();
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível recortar a imagem."
      );
    } finally {
      setCropLoading(false);
    }
  }

  return (
    <>
      <Field>
        <FieldLabel>Imagem da ficha</FieldLabel>

        <div className="grid gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 lg:grid-cols-[220px_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40">
            <div className="aspect-square w-full">
              {value?.previewUrl ? (
                <img
                  src={value.previewUrl}
                  alt="Preview da imagem da ficha"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span>Nenhuma imagem selecionada</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Selecione uma imagem e ajuste o enquadramento antes do upload.
              </p>
              <FieldDescription>
                O recorte é feito localmente, e a imagem só é enviada ao salvar
                a ficha. Limite máximo de {MAX_FILE_SIZE_MB} MB.
              </FieldDescription>
              {value?.file ? (
                <p className="text-xs text-muted-foreground">
                  Pronta para envio: {value.file.name}
                </p>
              ) : value?.previewUrl ? (
                <p className="text-xs text-muted-foreground">
                  Imagem atual mantida até você trocar ou remover.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={value?.previewUrl ? "outline" : "default"}
                onClick={openFilePicker}
                disabled={disabled}
              >
                <Upload className="h-4 w-4" />
                {value?.previewUrl ? "Trocar imagem" : "Escolher imagem"}
              </Button>

              {value?.previewUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onChange(null)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              ) : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
      </Field>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePickFile}
        disabled={disabled}
      />

      <Dialog
        open={Boolean(cropDraft)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            clearCropDraft();
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-2xl overflow-y-auto p-4 sm:max-h-[calc(100vh-2rem)] sm:p-6">
          <DialogHeader>
            <DialogTitle>Recortar imagem</DialogTitle>
            <DialogDescription>
              Arraste a imagem para reposicionar e use o zoom para ajustar o
              enquadramento final da ficha.
            </DialogDescription>
          </DialogHeader>

          {cropDraft && renderedStyle ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="mx-auto w-full max-w-[min(20rem,calc(100dvw-3rem))]">
                  <div
                    ref={cropViewportRef}
                    className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/60 bg-black/80 touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishPointer}
                    onPointerCancel={finishPointer}
                  >
                    <img
                      src={cropDraft.sourceUrl}
                      alt="Imagem em recorte"
                      className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                      style={renderedStyle}
                      draggable={false}
                    />
                    <div className="pointer-events-none absolute inset-0 border-10 border-white/15" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/20" />
                    <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/20" />
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  O recorte final será exportado em formato WEBP.
                </p>
              </div>

              <div className="mx-auto w-full max-w-[min(20rem,calc(100dvw-3rem))] space-y-5">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-3 sm:p-4">
                  <p className="text-sm font-medium">Controles</p>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ZoomIn className="h-4 w-4" />
                        Zoom
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={cropDraft.zoom}
                        onChange={(event) => {
                          const zoom = Number(event.target.value);
                          setCropDraft((current) => {
                            if (!current) {
                              return current;
                            }

                            const nextDraft = {
                              ...current,
                              zoom,
                            };
                            const clamped = clampCropOffsets(
                              nextDraft,
                              cropViewportSize,
                              current.offsetX,
                              current.offsetY
                            );

                            return {
                              ...nextDraft,
                              ...clamped,
                            };
                          });
                        }}
                        className="w-full"
                      />
                    </div>

                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Move className="h-4 w-4" />
                        Arraste para mover
                      </div>
                      <p className="mt-2">
                        O quadro central mostra exatamente a área que será salva.
                      </p>
                    </div>

                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                      Área visível: {cropViewportSize}px x {cropViewportSize}px
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCropDraft((current) =>
                      current
                        ? {
                            ...current,
                            zoom: 1,
                            offsetX: 0,
                            offsetY: 0,
                          }
                        : current
                    )
                  }
                >
                  Centralizar novamente
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={clearCropDraft}
              disabled={cropLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCrop}
              disabled={!cropDraft || cropLoading}
            >
              {cropLoading ? "Aplicando..." : "Usar recorte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
