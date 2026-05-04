"use client";

import type { ReactNode } from "react";
import { LogOut } from "lucide-react";

import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar, type EscudoSidebarSection } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type EscudoLayoutShellProps = {
  campanha: {
    id: number;
    nome: string;
    mestre: string;
  };
  activeSection: EscudoSidebarSection;
  currentLabel: string;
  personagensCount?: number;
  inventarioCount?: number;
  npcsCount?: number;
  combatesCount?: number;
  bestiarioCount?: number;
  children: ReactNode;
};

export function EscudoLayoutShell({
  campanha,
  activeSection,
  currentLabel,
  personagensCount = 0,
  inventarioCount = 0,
  npcsCount = 0,
  combatesCount = 0,
  bestiarioCount = 0,
  children,
}: EscudoLayoutShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        campanha={campanha}
        activeSection={activeSection}
        personagensCount={personagensCount}
        inventarioCount={inventarioCount}
        npcsCount={npcsCount}
        combatesCount={combatesCount}
        bestiarioCount={bestiarioCount}
      />
      <SidebarInset className="bg-background text-foreground">
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/92 px-3 shadow-sm shadow-black/5 backdrop-blur supports-backdrop-filter:bg-background/78 sm:px-4 dark:shadow-black/25">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <AppBreadcrumb
              className="mb-0 min-w-0"
              items={[
                { label: "Início", href: "/" },
                { label: "Dashboard", href: "/dashboard" },
                {
                  label: "Escudo do mestre",
                  href: `/campanhas/escudo/${campanha.id}`,
                },
                { label: currentLabel },
              ]}
            />
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-2">
            <a href="/dashboard">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair do painel</span>
            </a>
          </Button>
        </header>

        <div className="min-h-screen bg-background text-foreground">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
