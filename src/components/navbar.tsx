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

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["700"] });

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="sticky top-0 z-50 w-full backdrop-blur shadow-md transition-colors bg-transparent">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo / Título */}
        <div className={`${cormorant.className} font-bold text-lg`}>M&G</div>

        {/* Menu Toggle (mobile) */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Menu principal */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="flex gap-6 text-base">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="/">Home</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="/campanhas">Campanhas</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link href="/classe">Classes</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Ícones à direita */}
        <div className="hidden md:flex items-center gap-4 text-muted-foreground">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="transition hover:text-foreground cursor-pointer"
          >
            <Lightbulb className="w-5 h-5 transition-colors text-primary" />
          </button>
          <Link href="https://github.com/jvitorn" target="_blank">
            <Github className="w-5 h-5 hover:text-foreground transition" />
          </Link>
        </div>
      </div>

      {/* Menu Mobile com animação */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="md:hidden px-6 pb-4"
          >
            <nav className="flex flex-col gap-4 text-base">
              <Link
                href="/"
                onClick={() => setTimeout(() => setMenuOpen(false), 150)}
              >
                Home
              </Link>
              <Link
                href="/campanhas"
                onClick={() => setTimeout(() => setMenuOpen(false), 150)}
              >
                Campanhas
              </Link>
              <Link
                href="/classe"
                onClick={() => setTimeout(() => setMenuOpen(false), 150)}
              >
                Classes
              </Link>
              <div className="flex gap-4 pt-2 text-muted-foreground">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="transition hover:text-foreground cursor-pointer"
                >
                  <Lightbulb className="w-5 h-5 transition-colors text-primary" />
                </button>
                <Link href="https://github.com" target="_blank">
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