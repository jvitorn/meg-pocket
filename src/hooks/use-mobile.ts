"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

/**
 * Mantido como fachada para pontos do app que só precisam saber se estão em mobile.
 */
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}
