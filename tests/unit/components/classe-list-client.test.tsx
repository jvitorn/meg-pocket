import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
    article: ({ children, ...props }: React.ComponentProps<"article">) => (
      <article {...props}>{children}</article>
    ),
  },
}));

import ClassesListClient from "@/components/classe/classeListClient";

const items = [
  {
    id: 1,
    slug: "guerreiro",
    nome: "Guerreiro",
    subtitulo: "Combatente",
    tags: ["Tanque", "Corpo a Corpo"],
    hp: 12,
    mana: 6,
  },
  {
    id: 2,
    slug: "purificador",
    nome: "Purificador",
    subtitulo: "Suporte",
    tags: ["Suporte", "Estratégico"],
    hp: 10,
    mana: 8,
  },
];

describe("ClassesListClient", () => {
  it("renderiza hp e mana da listagem", () => {
    render(<ClassesListClient initialItems={items} />);

    expect(screen.getByText("Guerreiro")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("filtra a busca ignorando acentos e caixa", async () => {
    const user = userEvent.setup();

    render(<ClassesListClient initialItems={items} />);

    await user.type(screen.getByLabelText("Buscar classes"), "estrategico");

    expect(screen.getByText("Purificador")).toBeInTheDocument();
    expect(screen.queryByText("Guerreiro")).not.toBeInTheDocument();
  });
});

