"use client";

import { useEffect, useState } from "react";

/**
 * Observa uma media query do navegador e devolve o estado atual dela.
 * Centraliza a regra de viewport para evitar listeners duplicados em componentes.
 */
export function useMediaQuery(query: string) {
  const getMatches = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    const syncMatches = () => setMatches(mediaQuery.matches);

    syncMatches();
    mediaQuery.addEventListener("change", syncMatches);

    return () => {
      mediaQuery.removeEventListener("change", syncMatches);
    };
  }, [query]);

  return matches;
}
