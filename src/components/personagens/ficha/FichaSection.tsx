"use client";

export function FichaSection({
  title,
  subtitle = "",
  action,
  children,
}: {
  title: string;
  subtitle?: string | null;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">
          {title}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          {subtitle}
          </p>
        
        {action}
      </div>
      {children}
    </div>
  );
}
