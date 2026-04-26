import { NavbarInterface } from "@/types";

export const BASE_NAV_LINKS = [
  {
    label: "Início",
    href: "/",
  },
  {
    label: "Campanhas",
    href: "/campanhas",
  },
  {
    label: "Classes",
    href: "/classe",
  },
  {
    label: "Raças",
    href: "/raca",
  },
] as const satisfies NavbarInterface[];

export function getNavLinks(isAuthenticated: boolean): NavbarInterface[] {
  if (!isAuthenticated) {
    return [...BASE_NAV_LINKS, { label: "Login", href: "/login" }];
  }

  return [
    ...BASE_NAV_LINKS,
    { label: "Dashboard", href: "/dashboard" },
    { label: "Fichas", href: "/fichas" },
  ];
}
