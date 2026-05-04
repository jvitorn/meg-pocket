import Link from "next/link";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type AppBreadcrumbItem = {
  label: string;
  href?: string;
};

type AppBreadcrumbProps = {
  items: AppBreadcrumbItem[];
  className?: string;
};

export function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
  if (!items.length) return null;
  const compactFromIndex = Math.max(items.length - 2, 0);

  return (
    <Breadcrumb className={cn("mb-5 min-w-0", className)}>
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const compactHidden = items.length > 2 && index < compactFromIndex;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem
                className={cn(
                  "min-w-0 shrink-0",
                  compactHidden && "hidden sm:inline-flex",
                  isLast && "shrink min-w-0"
                )}
              >
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link className="truncate" href={item.href}>
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="block truncate">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast ? (
                <BreadcrumbSeparator
                  className={cn(
                    "shrink-0",
                    (compactHidden || index + 1 < compactFromIndex) &&
                      "hidden sm:inline-flex"
                  )}
                />
              ) : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
