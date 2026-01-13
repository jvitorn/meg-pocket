"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Github, Menu, X, Lightbulb } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cormorant_Garamond } from "next/font/google";
import { NAV_LINKS } from "@/lib/navigation";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["700"],
});

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="sticky top-0 z-50 w-full backdrop-blur shadow-md bg-transparent">
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
            {NAV_LINKS.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink asChild>
                  <Link href={link.href}>{link.label}</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right icons */}
        <div className="hidden md:flex items-center gap-4 text-muted-foreground">
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
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() =>
                    setTimeout(() => setMenuOpen(false), 150)
                  }
                >
                  {link.label}
                </Link>
              ))}

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
