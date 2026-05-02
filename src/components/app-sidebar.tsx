"use client"

import * as React from "react"
import {
  BookOpenText,
  Boxes,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Skull,
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
  onAddItem?: () => void
  onEditInfo?: () => void
}

export type EscudoSidebarSection =
  | "escudo"
  | "jogadores"
  | "inventario"
  | "npcs"
  | "bestiario"
  | "ferramentas"

export function AppSidebar({
  campanha,
  activeSection = "escudo",
  personagensCount = 0,
  inventarioCount = 0,
  npcsCount = 0,
  onAddItem,
  onEditInfo,
  ...props
}: AppSidebarProps) {
  const campanhaId = campanha?.id
  const escudoHref = campanhaId ? `/campanhas/escudo/${campanhaId}` : "/dashboard"
  const jogadoresHref = campanhaId ? `${escudoHref}#jogadores` : "#jogadores"
  const inventarioHref = campanhaId ? `${escudoHref}/inventario` : "#inventario"
  const npcsHref = campanhaId ? `${escudoHref}/npcs` : "#npcs"
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
                <SidebarMenuButton asChild isActive={activeSection === "bestiario"}>
                  <Link href={bestiarioHref}>
                    <Skull />
                    <span>Bestiário</span>
                  </Link>
                </SidebarMenuButton>
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
