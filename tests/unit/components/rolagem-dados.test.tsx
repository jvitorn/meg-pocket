import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rolagemMocks = vi.hoisted(() => ({
  rolarNotacao: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@/lib/regras/rolagemDados", () => ({
  rolarNotacao: rolagemMocks.rolarNotacao,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");

  const DialogContext = React.createContext<{
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }>({ open: false });

  return {
    Dialog: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange?: (open: boolean) => void;
      children: React.ReactNode;
    }) => (
      <DialogContext.Provider value={{ open, onOpenChange }}>
        <div>{children}</div>
      </DialogContext.Provider>
    ),
    DialogContent: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => {
      const { open } = React.useContext(DialogContext);
      return open ? <div className={className}>{children}</div> : null;
    },
    DialogHeader: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <div>{children}</div>,
    DialogTitle: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <h2>{children}</h2>,
    DialogDescription: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <p>{children}</p>,
  };
});

import { RolagemAcao } from "@/components/RolagemDados";

describe("RolagemAcao", () => {
  beforeEach(() => {
    rolagemMocks.rolarNotacao.mockReset();
    toastMocks.error.mockReset();
  });

  it("rola a notacao informada e exibe o resultado no dialog", async () => {
    const user = userEvent.setup();
    rolagemMocks.rolarNotacao.mockReturnValue({
      notacao: "2d20",
      total: 17,
      output: "2d20: [12, 5] = 17",
    });

    render(
      <RolagemAcao
        notacao="2d20"
        titulo="Resultado customizado"
        descricao="Teste da rolagem."
        buttonLabel="Rolar agora"
      />
    );

    await user.click(screen.getByRole("button", { name: "Rolar agora" }));

    expect(rolagemMocks.rolarNotacao).toHaveBeenCalledWith("2d20");
    expect(screen.getByText("Resultado customizado")).toBeInTheDocument();
    expect(screen.getByText("Teste da rolagem.")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("2d20: [12, 5] = 17")).toBeInTheDocument();
  });

  it("mostra toast de erro quando a notacao e invalida", async () => {
    const user = userEvent.setup();
    rolagemMocks.rolarNotacao.mockImplementation(() => {
      throw new Error("inválida");
    });

    render(<RolagemAcao notacao="erro" buttonLabel="Tentar rolar" />);

    await user.click(screen.getByRole("button", { name: "Tentar rolar" }));

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Notação de rolagem inválida."
    );
    expect(screen.queryByText("Resultado da rolagem")).not.toBeInTheDocument();
  });
});
