import { NavbarInterface } from "@/types";

export const NAV_LINKS = [
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
    label: "Login",
    href: "/login",
  },
] as const satisfies NavbarInterface[];

