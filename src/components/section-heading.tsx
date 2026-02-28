import { cn } from "@/lib/utils";

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
  const textAlign = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <div className={cn("mb-10", textAlign, className)}>
      <h2 className={cn("text-3xl md:text-4xl font-bold mb-2", classNameTitle)}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn("text-muted-foreground text-lg", classNameSubtitle)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
