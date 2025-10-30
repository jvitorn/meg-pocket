import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const colorThemes = {
  red: {
    text: "text-red-500",
    bg: "bg-red-950",
    border: "border-red-700",
  },
  blue: {
    text: "text-blue-500",
    bg: "bg-blue-950",
    border: "border-blue-700",
  },
  cyan: {
    text: "text-cyan-500",
    bg: "bg-cyan-950",
    border: "border-cyan-700",
  },
  emerald: {
    text: "text-emerald-500",
    bg: "bg-emerald-950",
    border: "border-emerald-700",
  },
  violet: {
    text: "text-violet-500",
    bg: "bg-violet-950",
    border: "border-violet-700",
  },
  amber: {
    text: "text-amber-500",
    bg: "bg-amber-950",
    border: "border-amber-700",
  },
  yellow: {
    text: "text-yellow-500",
    bg: "bg-yellow-950",
    border: "border-yellow-700",
  },
  green: {
    text: "text-green-500",
    bg: "bg-green-950",
    border: "border-green-700",
  },
  pink: {
    text: "text-pink-500",
    bg: "bg-pink-950",
    border: "border-pink-700",
  },
  rose: {
    text: "text-rose-500",
    bg: "bg-rose-950",
    border: "border-rose-700",
  },
  zinc: {
    text: "text-zinc-500",
    bg: "bg-zinc-950",
    border: "border-zinc-700",
  },
} as const;

export type ColorThemeName = keyof typeof colorThemes;

export function getColorClasses(color: ColorThemeName) {
  return colorThemes[color];
}