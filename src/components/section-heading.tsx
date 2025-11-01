"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center" | "right";
  classNameTitle?: string;
  classNameSubtitle?: string;
}
export function SectionHeading({
  title,
  subtitle,
  className,
  align = "center",
  classNameTitle,
  classNameSubtitle,
}: SectionHeadingProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Considera o componente "renderizado" no próximo tick do loop de eventos
    const timeout = setTimeout(() => setIsRendered(true), 0);
    return () => clearTimeout(timeout);
  }, []);

  const textAlign = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <div className={cn("mb-10", textAlign, className)}>
      {!isRendered ? (
        <>
          <Skeleton className={cn("h-8 w-1/2 mx-auto mb-2", classNameTitle)} />
          {subtitle && <Skeleton className={cn("h-5 w-2/3 mx-auto", classNameSubtitle)} />}
        </>
      ) : (
        <>
          <h2 className={cn("text-3xl md:text-4xl font-bold mb-2", classNameTitle)}>{title}</h2>
          {subtitle && (
            <p className={cn("text-muted-foreground text-lg", classNameSubtitle)}>{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}
