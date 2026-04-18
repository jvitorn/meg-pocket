"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  Icon?: LucideIcon;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  Icon = ArrowLeft,
}: EmptyStateProps) {
  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-2xl border border-border/70 bg-background/80 px-6 py-8 shadow-sm backdrop-blur-sm sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
            <Icon className="h-6 w-6 text-foreground" />
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href={actionHref}>
                  <ArrowLeft className="h-4 w-4" />
                  {actionLabel}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
