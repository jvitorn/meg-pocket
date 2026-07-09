"use client";

import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import {
  BookOpenText,
  BookMarked,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Skull,
  ScrollText,
  Shield,
  Sparkles,
  Sun,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavLinks } from "@/lib/navigation";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navIconMap = {
  "/campanhas": ScrollText,
  "/classe": Shield,
  "/raca": Sparkles,
  "/ameacas": Skull,
  "/manual": BookMarked,
  "/login": LogIn,
  "/dashboard": LayoutDashboard,
  "/fichas": Users,
} as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-md border border-amber-600/20 bg-amber-600/10 text-amber-600 shadow-sm dark:text-amber-700">
        <BookOpenText className="size-5" />
      </span>
      <span className={cn("leading-none", compact && "sm:hidden")}>
        <span className="block font-display text-xl font-bold text-amber-600 dark:text-amber-700">
          M&G
        </span>
        <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-700">
          Pocket
        </span>
      </span>
    </span>
  );
}

export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAuthenticated = Boolean(session?.user);
  const navLinks = getNavLinks(isAuthenticated);
  const userLabel =
    session?.user?.name ?? session?.user?.email ?? "Usuário logado";
  const splitIndex = Math.ceil(navLinks.length / 2);
  const leftLinks = navLinks.slice(0, splitIndex);
  const rightLinks = navLinks.slice(splitIndex);
  const isDark = resolvedTheme === "dark";

  const renderDesktopLink = (link: (typeof navLinks)[number]) => {
    const isActive = isLinkActive(pathname, link.href);

    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative inline-flex h-10 items-center px-1 text-sm font-medium transition-colors",
          isActive
            ? "text-amber-700 dark:text-amber-600"
            : "text-foreground/80 hover:text-amber-700 dark:hover:text-amber-600"
        )}
      >
        {link.label}
        <span
          className={cn(
            "absolute inset-x-1 -bottom-1 h-px origin-center scale-x-0 bg-amber-600 transition-transform dark:bg-amber-700",
            isActive && "scale-x-100"
          )}
        />
      </Link>
    );
  };

  return (
    <header
      className="z-40 w-full border-b border-border/70 bg-background/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:py-6">
        <Link
          href="/"
          className="inline-flex items-center transition-opacity hover:opacity-85 lg:hidden"
          aria-label="M&G Pocket"
        >
          <BrandMark compact />
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden flex-1 items-center justify-center gap-8 text-muted-foreground lg:flex"
        >
          <div className="flex flex-1 items-center justify-end gap-8 xl:gap-12">
            {leftLinks.map(renderDesktopLink)}
          </div>

          <Link
            href="/"
            className="mx-2 inline-flex shrink-0 items-center transition-opacity hover:opacity-85"
            aria-label="M&G Pocket"
          >
            <BrandMark />
          </Link>

          <div className="flex flex-1 items-center justify-start gap-8 xl:gap-12">
            {rightLinks.map(renderDesktopLink)}
          </div>
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden rounded-md text-foreground/80 hover:text-amber-700 dark:hover:text-amber-600 md:inline-flex"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {isAuthenticated ? (
            <DropdownMenuPrimitive.Root>
              <DropdownMenuPrimitive.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden max-w-44 rounded-md border-border/80 bg-background/80 text-foreground/80 hover:border-amber-600/30 hover:bg-amber-600/5 hover:text-amber-700 dark:hover:text-amber-600 md:inline-flex"
                >
                  <UserCircle className="size-4 text-amber-600 dark:text-amber-700" />
                  <span className="truncate">{userLabel}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                  align="end"
                  sideOffset={10}
                  className="z-50 min-w-56 overflow-hidden rounded-md border border-border/80 bg-popover p-1 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                >
                  <DropdownMenuPrimitive.Label className="px-3 py-2 text-xs text-muted-foreground">
                    <span className="block">Conta</span>
                    <span className="block truncate font-medium text-foreground">
                      {userLabel}
                    </span>
                  </DropdownMenuPrimitive.Label>
                  <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                  <DropdownMenuPrimitive.Item asChild>
                    <Link
                      href="/fichas"
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition hover:bg-muted hover:text-amber-700 focus:bg-muted focus:text-amber-700 dark:hover:text-amber-600 dark:focus:text-amber-600"
                    >
                      <Users className="size-4 text-amber-600 dark:text-amber-700" />
                      Fichas
                    </Link>
                  </DropdownMenuPrimitive.Item>
                  <DropdownMenuPrimitive.Item asChild>
                    <Link
                      href="/dashboard"
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition hover:bg-muted hover:text-amber-700 focus:bg-muted focus:text-amber-700 dark:hover:text-amber-600 dark:focus:text-amber-600"
                    >
                      <LayoutDashboard className="size-4 text-amber-600 dark:text-amber-700" />
                      Dashboard
                    </Link>
                  </DropdownMenuPrimitive.Item>
                  <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                  <DropdownMenuPrimitive.Item
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground outline-none transition hover:bg-muted hover:text-amber-700 focus:bg-muted focus:text-amber-700 dark:hover:text-amber-600 dark:focus:text-amber-600"
                    onSelect={() => authService.logout()}
                  >
                    <LogOut className="size-4 text-amber-600 dark:text-amber-700" />
                    Sair
                  </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
          ) : (
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="hidden rounded-md border-border/80 bg-background/80 text-foreground/80 hover:border-amber-600/30 hover:bg-amber-600/5 hover:text-amber-700 dark:hover:text-amber-600 md:inline-flex"
            >
              <Link href="/login">
                <LogIn className="size-4 text-amber-600 dark:text-amber-700" />
                Entrar
              </Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-md md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-84 max-w-[calc(100vw-1.25rem)] gap-0 overflow-hidden border-l border-border/80 bg-background p-0 shadow-2xl sm:w-96"
            >
              <SheetHeader className="border-b border-border/80 bg-muted/20 p-5 text-left">
                <SheetTitle asChild>
                  <Link href="/" className="w-fit">
                    <BrandMark />
                  </Link>
                </SheetTitle>
                <SheetDescription className="max-w-[16rem] text-xs leading-5">
                  Organize campanhas, fichas e referências em poucos toques.
                </SheetDescription>
              </SheetHeader>

              <nav className="grid gap-2 p-3" aria-label="Menu mobile">
                {navLinks.map((link) => {
                  const isActive = isLinkActive(pathname, link.href);
                  const Icon =
                    navIconMap[link.href as keyof typeof navIconMap] ??
                    Sparkles;

                  return (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "group flex min-h-14 items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-semibold transition",
                          isActive
                            ? "border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-600"
                            : "border-transparent text-foreground/80 hover:border-border hover:bg-muted/60 hover:text-amber-700 dark:hover:text-amber-600"
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-md border transition",
                            isActive
                              ? "border-amber-600/20 bg-background text-amber-600 dark:text-amber-700"
                              : "border-border/70 bg-background text-amber-600 dark:text-amber-700"
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="flex-1">{link.label}</span>
                        <ChevronRight
                          className={cn(
                            "size-4 transition",
                            isActive
                              ? "text-amber-600 dark:text-amber-700"
                              : "text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-amber-700 dark:group-hover:text-amber-600"
                          )}
                        />
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>

              <SheetFooter className="mt-auto gap-3 border-t border-border/80 bg-muted/25 p-4">
                {isAuthenticated ? (
                  <div className="rounded-md border border-border/80 bg-background p-2 shadow-sm">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <UserCircle className="size-4 text-amber-600 dark:text-amber-700" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {userLabel}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="justify-start rounded-md text-foreground/80 hover:text-amber-700 dark:hover:text-amber-600"
                        >
                          <Link href="/fichas">
                            <Users className="size-4" />
                            Fichas
                          </Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="justify-start rounded-md text-foreground/80 hover:text-amber-700 dark:hover:text-amber-600"
                        >
                          <Link href="/dashboard">
                            <LayoutDashboard className="size-4" />
                            Painel
                          </Link>
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start rounded-md hover:border-amber-600/30 hover:text-amber-700 dark:hover:text-amber-600"
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                  >
                    {isDark ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                    Tema
                  </Button>

                  {isAuthenticated ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start rounded-md hover:border-amber-600/30 hover:text-amber-700 dark:hover:text-amber-600"
                      onClick={() => authService.logout()}
                    >
                      <LogOut className="size-4" />
                      Sair
                    </Button>
                  ) : (
                    <SheetClose asChild>
                      <Button
                        asChild
                        variant="outline"
                        className="justify-start rounded-md hover:border-amber-600/30 hover:text-amber-700 dark:hover:text-amber-600"
                      >
                        <Link href="/login">
                          <LogIn className="size-4" />
                          Entrar
                        </Link>
                      </Button>
                    </SheetClose>
                  )}
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
