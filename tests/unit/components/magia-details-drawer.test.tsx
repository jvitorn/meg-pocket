import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="drawer-root">{children}</div> : null),
  DrawerContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DrawerDescription: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <p>{children}</p>,
  DrawerFooter: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DrawerHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  DrawerTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
}));

import { MagiaDetailsDrawer } from "@/components/magia-details-drawer";

describe("MagiaDetailsDrawer", () => {
  it("renderiza textos de fallback quando a magia nao foi informada", () => {
    render(<MagiaDetailsDrawer open onOpenChange={vi.fn()} magia={null} />);

    expect(screen.getByText("Magia")).toBeInTheDocument();
    expect(screen.getByText("Sem descrição disponível.")).toBeInTheDocument();
    expect(screen.getByText("Alcance: -")).toBeInTheDocument();
    expect(screen.getByText("Custo: -")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(screen.getByText("Role para ler tudo")).toHaveClass("opacity-0");
  });

  it("exibe contexto, acao customizada e sugestao de scroll em descricoes longas", () => {
    const descricaoLonga = `${"Um texto extenso sobre a magia. ".repeat(
      10
    )}\nLinha extra.\nMais uma linha.\nMais uma linha.`;

    const { container } = render(
      <MagiaDetailsDrawer
        open
        onOpenChange={vi.fn()}
        contextBadge="Arcana"
        closeLabel="Voltar"
        description="Detalhes especiais"
        footerAction={<button type="button">Aprender</button>}
        magia={{
          nome: "Chama Astral",
          descricao: descricaoLonga,
          alcance: "Toque",
          custo_nivel: 4,
        }}
      />
    );

    expect(screen.getByText("Arcana")).toBeInTheDocument();
    expect(screen.getByText("Detalhes especiais")).toBeInTheDocument();
    expect(screen.getByText("Alcance: Toque")).toBeInTheDocument();
    expect(screen.getByText("Custo: 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprender" })).toBeInTheDocument();
    expect(screen.getByText("Role para ler tudo")).toHaveClass("opacity-100");
    expect(container.querySelector(".bg-linear-to-t")).not.toBeNull();
  });

  it("fecha o drawer ao clicar no botao de fechar", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <MagiaDetailsDrawer
        open
        onOpenChange={onOpenChange}
        magia={{ nome: "Barreira", descricao: "Protege o alvo." }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
