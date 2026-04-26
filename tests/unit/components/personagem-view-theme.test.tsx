import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      layout,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.ComponentProps<"div"> & {
      layout?: unknown;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
    }) => {
      void layout;
      void initial;
      void animate;
      void exit;
      void transition;

      return <div {...props}>{children}</div>;
    },
  },
}));

vi.mock("@/components/personagens/ficha/PersonagemHeader", () => ({
  PersonagemHeader: () => <div>Header mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemBarras", () => ({
  PersonagemBarras: () => <div>Barras mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemSlotsDefensivos", () => ({
  PersonagemSlotsDefensivos: () => <div>Defesa mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemSobre", () => ({
  PersonagemSobre: () => <div>Sobre mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemPericias", () => ({
  PersonagemPericias: () => <div>Perícias mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemInventario", () => ({
  PersonagemInventario: () => <div>Inventário mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemMagias", () => ({
  PersonagemMagias: () => <div>Magias mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemSectionNav", () => ({
  PersonagemSectionNav: () => <div>Navegação mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemPainelRolagem", () => ({
  PersonagemPainelRolagem: () => <div>Rolagem mock</div>,
}));

vi.mock("@/components/personagens/ficha/PersonagemAnotacoes", () => ({
  PersonagemAnotacoes: () => <div>Anotações mock</div>,
}));

import { PersonagemView } from "@/components/personagens/personagem-view";
import { getThemeByColor } from "@/lib/fantasyThemes";
import type { PersonagemInterface } from "@/types";

describe("PersonagemView tema interno", () => {
  it("usa a cor da raça dentro da ficha e mantém pulse suave interno", () => {
    const personagem: PersonagemInterface = {
      id: 7,
      nome: "Arkan",
      campanhaId: 1,
      classeId: 2,
      racaId: 3,
      elemento: "fogo",
      corTema: "amber",
      hp: 8,
      mana: 9,
      sobre: "Cronista",
      canEdit: true,
    };
    const expected = getThemeByColor("amber");
    const setPersonagem = vi.fn();

    const { container } = render(
      <PersonagemView
        personagem={personagem}
        setPersonagem={setPersonagem}
        canEdit
      />
    );

    expect(screen.getByText("Header mock")).toBeInTheDocument();

    const card = container.querySelector("[data-slot='card']") as HTMLElement;
    expect(card.style.getPropertyValue("--theme-ring")).toBe(
      String(expected.style["--theme-ring" as keyof typeof expected.style])
    );
    expect(card.style.getPropertyValue("--theme-surface")).toBe(
      String(expected.style["--theme-surface" as keyof typeof expected.style])
    );
    expect(card.querySelector(".animate-soft-pulse")).toBeInTheDocument();
  });
});
