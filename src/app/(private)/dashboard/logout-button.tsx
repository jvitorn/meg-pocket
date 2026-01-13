"use client";

import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";

export default function LogoutButton() {
  return (
    <Button
      variant="destructive"
      className="w-full"
      onClick={() => authService.logout()}
    >
      Sair
    </Button>
  );
}
