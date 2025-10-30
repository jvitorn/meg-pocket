"use client";
import { createElement } from "react";

import * as LucideIcons from "lucide-react";
import { type LucideProps } from "lucide-react";

export function renderIcon(iconName: string, className?: string) {
  const Icon = LucideIcons[
    iconName as keyof typeof LucideIcons
  ] as React.FC<LucideProps>;

  if (!Icon) {
    const FallbackIcon = LucideIcons.Sparkles as React.FC<LucideProps>;
    return createElement(FallbackIcon, { className });
  }

  return createElement(Icon, { className });
}


export interface IconProps {
  iconName: keyof typeof LucideIcons;
  className?: string;
}