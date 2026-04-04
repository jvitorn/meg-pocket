import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  usarSlotDefensivo: vi.fn(),
  resetarSlotsDefensivos: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/services/personagemService", () => ({
  usarSlotDefensivo: serviceMocks.usarSlotDefensivo,
  resetarSlotsDefensivos: serviceMocks.resetarSlotsDefensivos,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

import { PersonagemSlotsDefensivos } from "@/components/personagens/ficha/PersonagemSlotsDefensivos";
import type { PersonagemInterface } from "@/types";

function Wrapper({
  canEdit = true,
  slots = {
    esquivaUsada: 0,
    bloqueioUsado: 1,
    contraAtaqueUsado: 0,
  },
}: {
  canEdit?: boolean;
  slots?: NonNullable<PersonagemInterface["slotsDefensivos"]>;
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
    pericias: [{ nome: "Combate", tipo: "fisica", pontuacao: 2 }],
    slotsDefensivos: slots,
  });

  return (
    <>
      <span data-testid="slots-state">
        {JSON.stringify(personagem?.slotsDefensivos)}
      </span>
      <PersonagemSlotsDefensivos
        personagemId={7}
        slots={personagem?.slotsDefensivos}
        pericias={personagem?.pericias}
        setPersonagem={setPersonagem}
        canEdit={canEdit}
      />
    </>
  );
}

describe("PersonagemSlotsDefensivos", () => {
  beforeEach(() => {
    serviceMocks.usarSlotDefensivo.mockReset();
    serviceMocks.resetarSlotsDefensivos.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
  });

  it("usa um slot defensivo e atualiza o estado local", async () => {
    const user = userEvent.setup();
    serviceMocks.usarSlotDefensivo.mockResolvedValue({ success: true });

    render(<Wrapper />);

    const useButtons = screen.getAllByRole("button", { name: "Usar" });
    await user.click(useButtons[0]);

    await waitFor(() => {
      expect(serviceMocks.usarSlotDefensivo).toHaveBeenCalledWith(7, "esquiva");
    });

    expect(screen.getByTestId("slots-state")).toHaveTextContent(
      '"esquivaUsada":1'
    );
  });

  it("reseta os slots reativos e informa sucesso", async () => {
    const user = userEvent.setup();
    serviceMocks.resetarSlotsDefensivos.mockResolvedValue({ success: true });

    render(
      <Wrapper
        slots={{
          esquivaUsada: 1,
          bloqueioUsado: 1,
          contraAtaqueUsado: 1,
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Resetar" }));

    await waitFor(() => {
      expect(serviceMocks.resetarSlotsDefensivos).toHaveBeenCalledWith(7);
    });

    expect(screen.getByTestId("slots-state")).toHaveTextContent(
      '"contraAtaqueUsado":0'
    );
    expect(toastMocks.success).toHaveBeenCalledWith("Slots reativos resetados");
  });

  it("desabilita o uso quando o limite daquele slot ja foi atingido", () => {
    render(
      <Wrapper
        slots={{
          esquivaUsada: 0,
          bloqueioUsado: 0,
          contraAtaqueUsado: 1,
        }}
      />
    );

    const contraLabel = screen.getByText("Contra");
    const contraRow = contraLabel.parentElement?.parentElement;
    expect(contraRow).not.toBeNull();

    const useButton = within(contraRow as HTMLElement).getByRole("button", {
      name: "Usar",
    });

    expect(useButton).toBeDisabled();
  });
});
