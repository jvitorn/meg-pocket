import * as React from "react";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  setPersonagemValores: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const mediaQueryMocks = vi.hoisted(() => ({
  useMediaQuery: vi.fn(),
}));

type TriggerChild = React.ReactElement<{
  onClick?: (event: React.MouseEvent) => void;
}>;

vi.mock("@/services/personagemService", () => ({
  setPersonagemValores: serviceMocks.setPersonagemValores,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: mediaQueryMocks.useMediaQuery,
}));

vi.mock("@/components/ui/drawer", async () => {
  const React = await import("react");

  const DrawerContext = React.createContext<{
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }>({ open: false });

  return {
    Drawer: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange?: (open: boolean) => void;
      children: React.ReactNode;
    }) => (
      <DrawerContext.Provider value={{ open, onOpenChange }}>
        <div>{children}</div>
      </DrawerContext.Provider>
    ),
    DrawerTrigger: ({
      asChild,
      children,
    }: {
      asChild?: boolean;
      children: TriggerChild;
    }) => {
      const { onOpenChange } = React.useContext(DrawerContext);

      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event);
            onOpenChange?.(true);
          },
        });
      }

      return children;
    },
    DrawerContent: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => {
      const { open } = React.useContext(DrawerContext);
      return open ? <div className={className}>{children}</div> : null;
    },
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
    DrawerDescription: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <p className={className}>{children}</p>,
    DrawerFooter: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    DrawerClose: ({
      asChild,
      children,
    }: {
      asChild?: boolean;
      children: TriggerChild;
    }) => {
      const { onOpenChange } = React.useContext(DrawerContext);

      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event);
            onOpenChange?.(false);
          },
        });
      }

      return children;
    },
  };
});

vi.mock("@/components/ui/sheet", async () => {
  const React = await import("react");

  const SheetContext = React.createContext<{
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  }>({ open: false });

  return {
    Sheet: ({
      open,
      onOpenChange,
      children,
    }: {
      open: boolean;
      onOpenChange?: (open: boolean) => void;
      children: React.ReactNode;
    }) => (
      <SheetContext.Provider value={{ open, onOpenChange }}>
        <div>{children}</div>
      </SheetContext.Provider>
    ),
    SheetTrigger: ({
      asChild,
      children,
    }: {
      asChild?: boolean;
      children: TriggerChild;
    }) => {
      const { onOpenChange } = React.useContext(SheetContext);

      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event);
            onOpenChange?.(true);
          },
        });
      }

      return children;
    },
    SheetContent: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => {
      const { open } = React.useContext(SheetContext);
      return open ? <div className={className}>{children}</div> : null;
    },
    SheetHeader: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    SheetTitle: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h2 className={className}>{children}</h2>,
    SheetDescription: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <p className={className}>{children}</p>,
    SheetFooter: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    SheetClose: ({
      asChild,
      children,
    }: {
      asChild?: boolean;
      children: TriggerChild;
    }) => {
      const { onOpenChange } = React.useContext(SheetContext);

      if (asChild) {
        return React.cloneElement(children, {
          onClick: (event: React.MouseEvent) => {
            children.props.onClick?.(event);
            onOpenChange?.(false);
          },
        });
      }

      return children;
    },
  };
});

import { PersonagemAnotacoes } from "@/components/personagens/ficha/PersonagemAnotacoes";
import type { PersonagemInterface } from "@/types";

function Wrapper({
  anotacoes = null,
  canEdit = true,
}: {
  anotacoes?: string | null;
  canEdit?: boolean;
}) {
  const [personagem, setPersonagem] = useState<PersonagemInterface | null>({
    id: 7,
    nome: "Selene",
    hp: 10,
    mana: 8,
    campanhaId: 1,
    racaId: 2,
    classeId: 3,
    elemento: "fogo",
    sobre: "Cronista",
    anotacoes,
  });

  return (
    <>
      <span data-testid="anotacoes-state">{personagem?.anotacoes ?? ""}</span>
      <PersonagemAnotacoes
        personagem={personagem!}
        setPersonagem={setPersonagem}
        canEdit={canEdit}
      />
    </>
  );
}

describe("PersonagemAnotacoes", () => {
  beforeEach(() => {
    serviceMocks.setPersonagemValores.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    mediaQueryMocks.useMediaQuery.mockReset();
    mediaQueryMocks.useMediaQuery.mockReturnValue(false);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("salva as anotacoes pelo painel lateral", async () => {
    const user = userEvent.setup();
    serviceMocks.setPersonagemValores.mockResolvedValue({ success: true });

    render(<Wrapper anotacoes={null} />);

    await user.click(screen.getAllByRole("button", { name: "Abrir" })[0]);
    await user.type(
      screen.getByPlaceholderText(/Escreva aqui pistas/i),
      "Pista sobre a biblioteca oculta."
    );
    await user.click(screen.getByRole("button", { name: "Salvar anotações" }));

    await waitFor(() => {
      expect(serviceMocks.setPersonagemValores).toHaveBeenCalledWith(
        7,
        "anotacoes",
        "Pista sobre a biblioteca oculta."
      );
    });

    expect(screen.getByTestId("anotacoes-state")).toHaveTextContent(
      "Pista sobre a biblioteca oculta."
    );
    expect(toastMocks.success).toHaveBeenCalledWith("Anotações salvas.");
  });

  it("limpa as anotacoes salvas", async () => {
    const user = userEvent.setup();
    serviceMocks.setPersonagemValores.mockResolvedValue({ success: true });

    render(<Wrapper anotacoes="Texto antigo" />);

    await user.click(screen.getAllByRole("button", { name: "Abrir" })[0]);
    await user.click(screen.getByRole("button", { name: "Limpar anotações" }));

    await waitFor(() => {
      expect(serviceMocks.setPersonagemValores).toHaveBeenCalledWith(
        7,
        "anotacoes",
        ""
      );
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByTestId("anotacoes-state")).toHaveTextContent("");
    expect(toastMocks.success).toHaveBeenCalledWith("Anotações limpas.");
  });
});
