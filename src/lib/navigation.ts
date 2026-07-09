import { NavbarInterface } from "@/types";

export const BASE_NAV_LINKS = [
  {
    label: "Campanhas",
    href: "/campanhas",
  },
  {
    label: "Classes",
    href: "/classe",
  },
  {
    label: "Manual",
    href: "/manual",
  },
  {
    label: "Raças",
    href: "/raca",
  },
  {
    label: "Ameaças",
    href: "/ameacas",
  },
] as const satisfies NavbarInterface[];

export function getNavLinks(isAuthenticated: boolean): NavbarInterface[] {
  void isAuthenticated;

  return [...BASE_NAV_LINKS];
}
