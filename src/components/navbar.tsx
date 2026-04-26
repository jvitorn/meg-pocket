"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Home,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Shield,
  Sparkles,
  Sun,
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

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navIconMap = {
  "/": Home,
  "/campanhas": ScrollText,
  "/classe": Shield,
  "/raca": Sparkles,
  "/login": LogIn,
  "/dashboard": LayoutDashboard,
  "/fichas": Users,
} as const;

export function Navbar() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAuthenticated = Boolean(session?.user);
  const navLinks = getNavLinks(isAuthenticated);
  const userLabel =
    session?.user?.name ?? session?.user?.email ?? "Usuário logado";

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur transition-colors duration-200",
        hasScrolled
          ? "border-b border-border/60 bg-background/85 shadow-md supports-backdrop-filter:bg-background/75"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-lg font-bold text-amber-600 transition hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          M&G
        </Link>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[18rem] border-border/70 bg-background/96 px-0 pb-0 backdrop-blur-xl sm:w-80"
          >
            <SheetHeader className="border-b border-amber-500/20 bg-amber-500/5 px-4 pb-4 text-left">
              <SheetTitle className="font-display text-xl text-amber-600 dark:text-amber-400">
                M&G Pocket
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Navegação rápida
              </SheetDescription>
            </SheetHeader>

            <nav className="grid gap-1 px-3 py-3">
              {navLinks.map((link) => {
                const isActive = isLinkActive(pathname, link.href);
                const Icon = navIconMap[link.href as keyof typeof navIconMap] ?? Sparkles;

                return (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-lg border px-2.5 py-2 text-sm font-medium transition",
                        isActive
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-transparent text-foreground/80 hover:border-amber-500/20 hover:bg-amber-500/5 hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md border transition",
                          isActive
                            ? "border-amber-400/35 bg-amber-500/10"
                            : "border-border/70 bg-background group-hover:border-amber-500/25"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>{link.label}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            <SheetFooter className="gap-2 border-t border-border/70 bg-muted/20 px-3 py-3">
              {isAuthenticated ? (
                <div className="truncate rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                  <span className="text-foreground">
                    {userLabel}
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  Tema
                </Button>
                {!isAuthenticated ? (
                  <SheetClose asChild>
                    <Button asChild variant="outline" size="sm" className="justify-start">
                      <Link href="/login">
                        <LogIn className="h-4 w-4" />
                        Entrar
                      </Link>
                    </Button>
                  </SheetClose>
                ) : null}
              </div>

              {isAuthenticated ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  onClick={() => authService.logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              ) : null}
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Desktop menu */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="flex gap-6 text-base">
            {navLinks.map((link) => {
              const isActive = isLinkActive(pathname, link.href);

              return (
                <NavigationMenuItem key={link.href}>
                  <NavigationMenuLink asChild active={isActive}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "px-1 py-1 transition-colors",
                        isActive
                          ? "font-semibold text-yellow-600 hover:text-yellow-600 focus:text-yellow-600"
                          : "text-foreground/90 hover:text-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right icons */}
        <div className="hidden md:flex items-center gap-4 text-muted-foreground">
          {isAuthenticated && (
            <>
              <span className="text-xs text-foreground/80">{userLabel}</span>
              <button
                onClick={() => authService.logout()}
                className="text-sm px-3 py-1 rounded border border-border hover:bg-muted transition text-foreground"
              >
                Sair
              </button>
            </>
          )}

          <button
            onClick={() =>
              setTheme(theme === "dark" ? "light" : "dark")
            }
            className="transition hover:text-foreground cursor-pointer"
            aria-label="Alternar tema"
          >
            <Lightbulb className="w-5 h-5 text-primary transition-colors" />
          </button>
        </div>
      </div>

    </div>
  );
}
