import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

const navMocks = vi.hoisted(() => ({
  params: { id: "404" },
}));

const serviceMocks = vi.hoisted(() => ({
  getPersonagensNaCampanha: vi.fn(),
}));

vi.stubGlobal("fetch", fetchMock);

vi.mock("next/navigation", () => ({
  useParams: () => navMocks.params,
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    fill,
    priority,
    unoptimized,
    ...props
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => {
    void fill;
    void priority;
    void unoptimized;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={src} {...props} />
    );
  },
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, layout, initial, animate, exit, transition, ...props }: React.ComponentProps<"div"> & {
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

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({
    children,
    opts,
    ...props
  }: React.ComponentProps<"div"> & { opts?: unknown }) => {
    void opts;
    return <div {...props}>{children}</div>;
  },
  CarouselContent: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
  CarouselItem: ({ children, ...props }: React.ComponentProps<"div">) => (
    <div {...props}>{children}</div>
  ),
  CarouselNext: ({ ...props }: React.ComponentProps<"button">) => (
    <button type="button" aria-label="Próximo" {...props} />
  ),
  CarouselPrevious: ({ ...props }: React.ComponentProps<"button">) => (
    <button type="button" aria-label="Anterior" {...props} />
  ),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/personagens/personagem-view", () => ({
  PersonagemView: () => <div>Ficha carregada</div>,
}));

vi.mock("@/services/personagemService", () => ({
  getPersonagensNaCampanha: serviceMocks.getPersonagensNaCampanha,
}));

import PersonagemClient from "@/components/personagens/personagemClient";
import PersonagemCampanhaClient from "@/components/personagens/personagemCampanhaClient";

describe("estados vazios de personagem e campanha", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    serviceMocks.getPersonagensNaCampanha.mockReset();
    navMocks.params = { id: "404" };
  });

  it("mostra estado amigavel quando a ficha nao existe", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Personagem não encontrado" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    );

    render(<PersonagemClient />);

    expect(await screen.findByText("Ficha não encontrada")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Não encontramos esse personagem na base. Ele pode ter sido removido ou o link pode estar incompleto."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /voltar para campanhas/i })
    ).toHaveAttribute("href", "/campanhas");
  });

  it("mostra estado amigavel quando a campanha nao existe", async () => {
    const error = new Error("Campanha não encontrada") as Error & {
      status?: number;
    };
    error.status = 404;
    serviceMocks.getPersonagensNaCampanha.mockRejectedValue(error);

    render(<PersonagemCampanhaClient />);

    expect(await screen.findByText("Campanha não encontrada")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Não encontramos essa campanha na base. Ela pode ter sido removida ou o link pode estar incompleto."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /voltar para campanhas/i })
    ).toHaveAttribute("href", "/campanhas");
  });

  it("mostra estado vazio quando a campanha existe sem personagens", async () => {
    serviceMocks.getPersonagensNaCampanha.mockResolvedValue([]);

    render(<PersonagemCampanhaClient />);

    expect(
      await screen.findByText("Nenhum personagem nesta campanha")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A campanha existe, mas ainda não tem fichas cadastradas. Você pode voltar para a lista de campanhas e escolher outra mesa."
      )
    ).toBeInTheDocument();
  });

  it("aplica o tema da raca selecionada no fundo da tela de campanha", async () => {
    serviceMocks.getPersonagensNaCampanha.mockResolvedValue([
      {
        id: 7,
        nome: "Orion",
        descricao: "Guardião dos ventos.",
        sobre: "Guardião dos ventos.",
        hp: 10,
        mana: 8,
        hp_atual: 10,
        mana_atual: 8,
        campanhaId: 1,
        classeId: 1,
        classe_nome: "Guerreiro",
        racaId: 2,
        raca_nome: "Lumis",
        elemento: "vento",
        corTema: "amber",
        icone: "Sun",
      },
    ]);

    const { container } = render(<PersonagemCampanhaClient />);

    expect(await screen.findAllByText("Orion")).toHaveLength(2);

    await waitFor(() => {
      const pageBackground = container.firstElementChild as HTMLElement | null;
      expect(pageBackground?.style.getPropertyValue("--theme-ring")).toBeTruthy();
      expect(pageBackground?.style.getPropertyValue("--theme-glow")).toBeTruthy();
    });
  });
});
