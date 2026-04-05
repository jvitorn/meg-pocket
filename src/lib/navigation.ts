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
  return [
    ...BASE_NAV_LINKS,
    isAuthenticated
      ? { label: "Personagens", href: "/dashboard" }
      : { label: "Login", href: "/login" },
  ];
}
