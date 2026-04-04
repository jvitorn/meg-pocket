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

vi.mock("@/components/stat-drawer", () => ({
  StatDrawer: ({
    title,
    open,
    onUpdate,
  }: {
    title: string;
    open: boolean;
    onUpdate: (novoValor: number) => Promise<void>;
  }) =>
    open ? (
      <div>
        <p>{title}</p>
        <button type="button" onClick={() => void onUpdate(0)}>
          Confirmar mock
        </button>
      </div>
    ) : null,
}));

import { PersonagemBarras } from "@/components/personagens/ficha/PersonagemBarras";
import type { PersonagemInterface } from "@/types";

function Wrapper() {
  const [personagem, setPersonagem] = useState<PersonagemInterface | null>({
    id: 8,
    nome: "Robin",
    hp: 10,
    hp_atual: 10,
    mana: 6,
    mana_atual: 6,
    defesa_atual: 3,
    defesa_max: 3,
    campanhaId: 2,
    racaId: 2,
    classeId: 2,
    elemento: "vento",
    sobre: "Guardiã",
    inventario: [
      {
        id: 6,
        itemId: 6,
        nome: "Capa Arcana",
        tipo: "EQUIPAMENTO",
        descricao: "Manto ritual.",
        slots: 1,
        slotsTotal: 1,
        quantidade: 1,
        durabilidadeAtual: 0,
        durabilidadeMax: 1,
        efeitoAtivo: true,
        esgotado: false,
        efeito: {
          modulo: "DEFESA",
          operacao: "ADICIONAR",
          valor: 3,
        },
        observacoes: null,
      },
    ],
    inventarioResumo: {
      slotsMaximos: 5,
      slotsOcupados: 1,
      slotsDisponiveis: 4,
      itensTotais: 1,
    },
  });

  return (
    <>
      <span data-testid="defesa-state">
        {JSON.stringify({
          defesa_atual: personagem?.defesa_atual,
          defesa_max: personagem?.defesa_max,
        })}
      </span>
      <span data-testid="inventario-state">
        {JSON.stringify(personagem?.inventario ?? [])}
      </span>
      <PersonagemBarras
        personagem={personagem!}
        setPersonagem={setPersonagem}
        canEdit
      />
    </>
  );
}

describe("PersonagemBarras", () => {
  beforeEach(() => {
    serviceMocks.setPersonagemValores.mockReset();
    toastMocks.loading.mockReset();
    toastMocks.dismiss.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
  });

  it("sincroniza o inventario ao zerar a defesa e desabilita item defensivo esgotado", async () => {
    const user = userEvent.setup();
    serviceMocks.setPersonagemValores.mockResolvedValue({
      success: true,
      personagem: {
        defesa_atual: 0,
        defesa_max: 0,
      },
      inventario: [
        {
          id: 6,
          itemId: 6,
          nome: "Capa Arcana",
          tipo: "EQUIPAMENTO",
          descricao: "Manto ritual.",
          slots: 1,
          slotsTotal: 0,
          quantidade: 1,
          durabilidadeAtual: 0,
          durabilidadeMax: 1,
          efeitoAtivo: false,
          esgotado: true,
          efeito: {
            modulo: "DEFESA",
            operacao: "ADICIONAR",
            valor: 3,
          },
          observacoes: null,
        },
      ],
      inventarioResumo: {
        slotsMaximos: 5,
        slotsOcupados: 0,
        slotsDisponiveis: 5,
        itensTotais: 0,
      },
    });

    render(<Wrapper />);

    await user.click(screen.getByRole("button", { name: "Atualizar Defesa" }));
    await user.click(screen.getByRole("button", { name: "Confirmar mock" }));

    await waitFor(() => {
      expect(serviceMocks.setPersonagemValores).toHaveBeenCalledWith(
        8,
        "defesa_atual",
        0
      );
    });

    expect(screen.getByTestId("defesa-state")).toHaveTextContent(
      '"defesa_max":0'
    );
    expect(screen.getByTestId("inventario-state")).toHaveTextContent(
      '"esgotado":true'
    );
    expect(screen.getByTestId("inventario-state")).toHaveTextContent(
      '"efeitoAtivo":false'
    );
  });
});
