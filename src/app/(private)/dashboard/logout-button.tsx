"use client";

import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type LogoutButtonProps = ComponentProps<typeof Button>;

export default function LogoutButton({
  className,
  variant = "destructive",
  size = "default",
  onClick,
  ...props
}: LogoutButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("w-full", className)}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        authService.logout();
      }}
    >
      Sair
    </Button>
  );
}
