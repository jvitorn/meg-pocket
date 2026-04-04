import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  usarItemInventario: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/services/personagemService", () => ({
  usarItemInventario: serviceMocks.usarItemInventario,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

import { PersonagemInventario } from "@/components/personagens/ficha/PersonagemInventario";
import type { PersonagemInterface } from "@/types";

function Wrapper({ canEdit = true }: { canEdit?: boolean }) {
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
    inventario: [
      {
        id: 10,
        itemId: 3,
        nome: "Poção de Vida",
        tipo: "CONSUMIVEL",
        descricao: "Recupera vida.",
        slots: 0.25,
        slotsTotal: 0.5,
        quantidade: 2,
        durabilidadeAtual: 1,
        durabilidadeMax: 1,
        efeitoAtivo: false,
        esgotado: false,
        efeito: {
          modulo: "VIDA",
          operacao: "ADICIONAR",
          valor: 3,
        },
        observacoes: "Emergência",
      },
    ],
    inventarioResumo: {
      slotsMaximos: 5,
      slotsOcupados: 0.5,
      slotsDisponiveis: 4.5,
      itensTotais: 2,
    },
  });

  return (
    <>
      <span data-testid="inventario-state">
        {JSON.stringify(personagem?.inventario ?? [])}
      </span>
      <span data-testid="inventario-resumo">
        {JSON.stringify(personagem?.inventarioResumo ?? null)}
      </span>
      <PersonagemInventario
        personagem={personagem!}
        setPersonagem={setPersonagem}
        canEdit={canEdit}
      />
    </>
  );
}

describe("PersonagemInventario", () => {
  beforeEach(() => {
    serviceMocks.usarItemInventario.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
  });

  it("usa um item e atualiza o inventario local", async () => {
    const user = userEvent.setup();

    serviceMocks.usarItemInventario.mockResolvedValue({
      success: true,
      message: "Poção de Vida usado com sucesso.",
      personagem: {
        hp_atual: 13,
        mana_atual: 8,
        defesa_atual: 0,
        defesa_max: 0,
      },
      inventario: [
        {
          id: 10,
          itemId: 3,
          nome: "Poção de Vida",
          tipo: "CONSUMIVEL",
          descricao: "Recupera vida.",
          slots: 0.25,
          slotsTotal: 0.25,
          quantidade: 1,
          durabilidadeAtual: 1,
          durabilidadeMax: 1,
          efeitoAtivo: false,
          esgotado: false,
          efeito: {
            modulo: "VIDA",
            operacao: "ADICIONAR",
            valor: 3,
          },
          observacoes: "Emergência",
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0.25,
        slotsDisponiveis: 4.75,
        itensTotais: 1,
      },
    });

    render(<Wrapper />);

    await user.click(screen.getByRole("button", { name: "Detalhes" }));
    await user.click(await screen.findByRole("button", { name: "Usar" }));

    await waitFor(() => {
      expect(serviceMocks.usarItemInventario).toHaveBeenCalledWith(7, 10);
    });

    expect(screen.getByTestId("inventario-state")).toHaveTextContent(
      '"quantidade":1'
    );
    expect(screen.getByTestId("inventario-resumo")).toHaveTextContent(
      '"slotsOcupados":0.25'
    );
    expect(toastMocks.success).toHaveBeenCalledWith(
      "Poção de Vida usado com sucesso."
    );
  });

  it("desabilita o uso em modo somente leitura", () => {
    render(<Wrapper canEdit={false} />);

    expect(screen.getByRole("button", { name: "Detalhes" })).toBeInTheDocument();
    expect(screen.getByText(/restritos ao administrador/i)).toBeInTheDocument();
  });
});
