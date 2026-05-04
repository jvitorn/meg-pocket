"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  BookOpenText,
  Boxes,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Skull,
  Sun,
  Swords,
  UserRoundPlus,
  Users,
} from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  campanha?: {
    id: number
    nome: string
    mestre: string
  }
  activeSection?: EscudoSidebarSection
  personagensCount?: number
  inventarioCount?: number
  npcsCount?: number
  combatesCount?: number
  bestiarioCount?: number
  onAddItem?: () => void
  onEditInfo?: () => void
}

export type EscudoSidebarSection =
  | "escudo"
  | "jogadores"
  | "inventario"
  | "npcs"
  | "combates"
  | "bestiario"
  | "ferramentas"

export function AppSidebar({
  campanha,
  activeSection = "escudo",
  personagensCount = 0,
  inventarioCount = 0,
  npcsCount = 0,
  combatesCount = 0,
  bestiarioCount = 0,
  onAddItem,
  onEditInfo,
  ...props
}: AppSidebarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const campanhaId = campanha?.id
  const escudoHref = campanhaId ? `/campanhas/escudo/${campanhaId}` : "/dashboard"
  const jogadoresHref = campanhaId ? `${escudoHref}#jogadores` : "#jogadores"
  const inventarioHref = campanhaId ? `${escudoHref}/inventario` : "#inventario"
  const npcsHref = campanhaId ? `${escudoHref}/npcs` : "#npcs"
  const combatesHref = campanhaId ? `${escudoHref}/combates` : "#combates"
  const bestiarioHref = campanhaId ? `${escudoHref}#bestiario` : "#bestiario"
  const ferramentasHref = campanhaId ? `${escudoHref}#ferramentas` : "#ferramentas"

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={escudoHref}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <BookOpenText className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {campanha?.nome ?? "Escudo do mestre"}
                  </span>
                  <span className="truncate text-xs">
                    {campanha?.mestre || "M&G Pocket"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home />
                    <span>Início</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "escudo"}>
                  <Link href={escudoHref}>
                    <Shield />
                    <span>Escudo do mestre</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Campanha</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "jogadores"}>
                  <Link href={jogadoresHref}>
                    <Users />
                    <span>Jogadores</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>{personagensCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "inventario"}>
                  <Link href={inventarioHref}>
                    <Boxes />
                    <span>Inventário</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>{inventarioCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "npcs"}>
                  <Link href={npcsHref}>
                    <UserRoundPlus />
                    <span>NPCs</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>{npcsCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "combates"}>
                  <Link href={combatesHref}>
                    <Swords />
                    <span>Combates</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>{combatesCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "bestiario"}>
                  <Link href={bestiarioHref}>
                    <Skull />
                    <span>Bestiário</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>{bestiarioCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={activeSection === "ferramentas"}>
                  <Link href={ferramentasHref}>
                    <ClipboardList />
                    <span>Ferramentas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Ações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {onAddItem ? (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onAddItem}>
                    <Plus />
                    <span>Vincular item</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              {onEditInfo ? (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onEditInfo}>
                    <Settings />
                    <span>Editar informações</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  aria-label={`Alternar para tema ${isDark ? "claro" : "escuro"}`}
                >
                  {isDark ? <Sun /> : <Moon />}
                  <span>{isDark ? "Tema claro" : "Tema escuro"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <LogOut />
                    <span>Sair do painel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/campanhas">
                    <ScrollText />
                    <span>Ver campanhas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
