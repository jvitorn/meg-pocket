"use client"

import Link from "next/link"
import {  House } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function Navbar() {
  const isMobile = useIsMobile()

  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/" className="flex-row items-center gap-2">
                    <House />
                    Home
                  </Link>
          </NavigationMenuLink>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/campanhas" className="flex-row items-center gap-2">
                    <House />
                    Campanhas
                  </Link>
          </NavigationMenuLink>
        </NavigationMenuItem> 
      </NavigationMenuList>
    </NavigationMenu>
  )
}
