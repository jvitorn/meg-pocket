import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  setPersonagemValores: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  loading: vi.fn(),
  dismiss: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/services/personagemService", () => ({
  setPersonagemValores: serviceMocks.setPersonagemValores,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@/components/magia-details-drawer", () => ({
  MagiaDetailsDrawer: ({
    open,
    magia,
    footerAction,
    closeLabel,
    onOpenChange,
  }: {
    open: boolean;
    magia: { nome?: string } | null;
    footerAction?: React.ReactNode;
    closeLabel?: string;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div>
        <p>{magia?.nome}</p>
        {footerAction}
        <button type="button" onClick={() => onOpenChange(false)}>
          {closeLabel}
        </button>
      </div>
    ) : null,
}));

import { PersonagemMagias } from "@/components/personagens/ficha/PersonagemMagias";
import type { PersonagemInterface } from "@/types";

function Wrapper({
  canEdit = true,
  mana = 5,
}: {
  canEdit?: boolean;
  mana?: number;
}) {
  const [personagem, setPersonagem] = useState<PersonagemInterface | null>({
    id: 7,
    nome: "Selene",
    campanhaId: 1,
    racaId: 2,
    classeId: 3,
    elemento: "fogo",
    sobre: "Cronista",
    mana_atual: mana,
    magias: [
      {
        nome: "Chama Astral",
        descricao: "Rajada de fogo ritual.",
        alcance: "Toque",
        custo_nivel: 3,
      },
    ],
  });

  return (
    <>
      <span data-testid="mana-atual">{personagem?.mana_atual ?? "null"}</span>
      <PersonagemMagias
        personagem={personagem!}
        setPersonagem={setPersonagem}
        canEdit={canEdit}
      />
    </>
  );
}

describe("PersonagemMagias", () => {
  beforeEach(() => {
    serviceMocks.setPersonagemValores.mockReset();
    toastMocks.loading.mockReset();
    toastMocks.dismiss.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
  });

  it("impede conjuracao quando a mana atual e insuficiente", async () => {
    const user = userEvent.setup();

    render(<Wrapper mana={2} />);

    await user.click(screen.getByRole("button", { name: /Chama Astral/i }));
    const activateButton = screen.getByRole("button", { name: "Ativar" });

    expect(activateButton).toBeDisabled();
    expect(serviceMocks.setPersonagemValores).not.toHaveBeenCalled();
    expect(screen.getByTestId("mana-atual")).toHaveTextContent("2");
  });

  it("conjura a magia, atualiza a mana e envia a alteracao ao backend", async () => {
    const user = userEvent.setup();
    serviceMocks.setPersonagemValores.mockResolvedValue({ success: true });

    render(<Wrapper mana={5} />);

    await user.click(screen.getByRole("button", { name: /Chama Astral/i }));
    await user.click(screen.getByRole("button", { name: "Ativar" }));

    await waitFor(() => {
      expect(serviceMocks.setPersonagemValores).toHaveBeenCalledWith(
        7,
        "mana_atual",
        2
      );
    });

    expect(screen.getByTestId("mana-atual")).toHaveTextContent("2");
    expect(toastMocks.loading).toHaveBeenCalledWith(
      "Conjurando Chama Astral..."
    );
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Chama Astral conjurada — mana -3"
    );
  });
});
