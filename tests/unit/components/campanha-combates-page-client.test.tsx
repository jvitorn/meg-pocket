import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const serviceMocks = vi.hoisted(() => ({
  criarCombateCampanha: vi.fn(),
  executarAcaoCombateCampanha: vi.fn(),
  excluirCombateCampanha: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, animate, ...props }: { children: ReactNode; animate?: unknown }) => {
      void animate;
      return <div {...props}>{children}</div>;
    },
  },
}));

vi.mock("@/components/campanhas/escudo-layout-shell", () => ({
  EscudoLayoutShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <>{children}</> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DrawerHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/services/campanhaApiService", () => serviceMocks);

import { CampanhaCombatesPageClient } from "@/components/campanhas/campanha-combates-page-client";
import type { CombateDetail } from "@/types";

const campanha = {
  id: 4,
  nome: "Mesa de Teste",
  mestre: "Narradora",
  capa: "",
  sinopse: "",
};

const combate: CombateDetail = {
  id: 30,
  nome: "Emboscada",
  status: "EM_ANDAMENTO",
  rodadaAtual: 1,
  turnoAtual: 0,
  vaTotal: 1,
  participantesCount: 2,
  createdAt: "2026-05-02T12:00:00.000Z",
  startedAt: "2026-05-02T12:01:00.000Z",
  endedAt: null,
  participantes: [
    {
      id: 1,
      tipo: "PERSONAGEM",
      nome: "Ayla",
      iniciativa: 14,
      ordem: 0,
      hp: 12,
      mana: 8,
      defesa: 13,
      detalhe: {
        tipo: "PERSONAGEM",
        classeNome: "Guerreira",
        racaNome: "Humana",
        magias: [],
        slotsDefensivos: {
          esquivaUsada: 0,
          bloqueioUsado: 0,
          contraAtaqueUsado: 0,
        },
      },
    },
    {
      id: 2,
      tipo: "AMEACA",
      nome: "Goblin 1",
      iniciativa: 9,
      ordem: 1,
      hp: 6,
      mana: 2,
      defesa: 11,
      detalhe: {
        tipo: "AMEACA",
        funcao: "Lacaio",
        va: 0.5,
        hpMax: 6,
        manaMax: 2,
        reacoes: {
          bloqueio: 1,
          esquiva: 1,
          contraAtaque: 0,
        },
        reacoesUsadas: {
          bloqueio: 0,
          esquiva: 0,
          contraAtaque: 0,
        },
        golpes: [{ nome: "Corte baixo", descricao: "Ataque rápido." }],
      },
    },
  ],
};

function renderCombates() {
  return render(
    <CampanhaCombatesPageClient
      campanha={campanha}
      combates={[combate]}
      personagens={[]}
      ameacas={[]}
      personagensCount={1}
      inventarioCount={0}
      npcsCount={0}
      bestiarioCount={1}
    />
  );
}

describe("CampanhaCombatesPageClient", () => {
  beforeEach(() => {
    routerMocks.refresh.mockReset();
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    serviceMocks.executarAcaoCombateCampanha.mockReset();
    serviceMocks.executarAcaoCombateCampanha.mockResolvedValue({ ok: true });
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );
  });

  it("executa ações de turno e força refresh da campanha", async () => {
    const user = userEvent.setup();
    renderCombates();

    await user.click(screen.getAllByRole("button", { name: /próximo/i })[0]);

    await waitFor(() => {
      expect(serviceMocks.executarAcaoCombateCampanha).toHaveBeenCalledWith(4, 30, {
        action: "proximo",
      });
    });
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    expect(toastMocks.success).toHaveBeenCalledWith("Turno avançado.");
  });

  it("mantém navegação mobile de combate com abas de app", () => {
    renderCombates();

    expect(
      screen.getByRole("navigation", { name: "Navegação do combate" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turno" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ordem" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ações" })).toBeInTheDocument();
  });

  it("executa reação de ameaça pelo painel de detalhes", async () => {
    const user = userEvent.setup();
    renderCombates();

    await user.click(screen.getByRole("button", { name: /Goblin 1/i }));
    const esquivaRow = screen.getByText("Esquiva").closest("div");
    expect(esquivaRow).not.toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Usar" })[0]);

    await waitFor(() => {
      expect(serviceMocks.executarAcaoCombateCampanha).toHaveBeenCalledWith(4, 30, {
        action: "usar_reacao_ameaca",
        participanteId: 2,
        tipo: "esquiva",
      });
    });
  });
});
