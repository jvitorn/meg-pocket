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
import { Github, Menu, X, Lightbulb } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Cormorant_Garamond } from "next/font/google";
import { getNavLinks } from "@/lib/navigation";
import { authService } from "@/services/authService";
import { cn } from "@/lib/utils";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["700"],
});

function isLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
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
          ? "border-b border-border/60 bg-background/85 shadow-md supports-[backdrop-filter]:bg-background/75"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className={`${cormorant.className} font-bold text-lg`}>
          M&G
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Abrir menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

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

          <Link
            href="https://github.com/jvitorn"
            target="_blank"
            aria-label="GitHub"
          >
            <Github className="w-5 h-5 hover:text-foreground transition" />
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="md:hidden px-6 pb-4"
          >
            <nav className="flex flex-col gap-4 text-base">
              {navLinks.map((link) => {
                const isActive = isLinkActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "transition-colors",
                      isActive
                        ? "font-semibold text-yellow-600"
                        : "text-foreground/90 hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {isAuthenticated && (
                <div className="pt-1 space-y-2">
                  <p className="text-xs text-muted-foreground">{userLabel}</p>
                  <button
                    onClick={() => authService.logout()}
                    className="text-sm px-3 py-2 rounded border border-border hover:bg-muted transition w-fit"
                  >
                    Sair
                  </button>
                </div>
              )}

              <div className="flex gap-4 pt-2 text-muted-foreground">
                <button
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                  className="transition hover:text-foreground cursor-pointer"
                  aria-label="Alternar tema"
                >
                  <Lightbulb className="w-5 h-5 text-primary transition-colors" />
                </button>

                <Link
                  href="https://github.com/jvitorn"
                  target="_blank"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5 hover:text-foreground transition" />
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
