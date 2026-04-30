import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

vi.stubGlobal("fetch", fetchMock);

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => {
    const imageProps = { ...props };
    delete imageProps.fill;
    delete imageProps.priority;
    delete imageProps.unoptimized;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={src} {...imageProps} />
    );
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/magia-details-drawer", () => ({
  MagiaDetailsDrawer: () => null,
}));

vi.mock("@/components/ui/carousel", () => ({
  Carousel: ({
    children,
    ...props
  }: React.ComponentProps<"div"> & { setApi?: (api: unknown) => void; opts?: unknown }) => {
    const carouselProps = { ...props };
    delete carouselProps.setApi;
    delete carouselProps.opts;

    return <div {...carouselProps}>{children}</div>;
  },
  CarouselContent: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  CarouselItem: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
}));

import ClasseClient from "@/components/classe/classeClient";

describe("ClasseClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renderiza personagens relacionados e expande a lista", async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            id: 1,
            slug: "guerreiro",
            nome: "Guerreiro",
            subtitulo: "Combatente",
            descricao: "Classe da linha de frente.",
            gameplay: "Jogo seguro.",
            img_corpo: null,
            exemploPersonagem: "Ragnar",
            background: "/imgs/backgrounds/classe_guerreiro.jpg",
            tags: ["Tanque"],
            hp: 12,
            mana: 6,
            Personagens: Array.from({ length: 10 }, (_, index) => ({
              id: index + 1,
              nome: `Personagem ${index + 1}`,
              apelido: null,
              imagemPrincipal: null,
              imagemPerfil: null,
            })),
            Magias: [
              {
                id: 50,
                nome: "Golpe Runico",
                descricao: "Canaliza energia marcial.",
                alcance: "Corpo a corpo",
                custo_nivel: 2,
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    render(<ClasseClient />);

    expect(await screen.findByRole("heading", { name: "Guerreiro" })).toBeInTheDocument();
    expect(screen.getByText("Fichas vinculadas")).toBeInTheDocument();
    expect(screen.getByText("Personagem 1")).toBeInTheDocument();
    expect(screen.queryByText("Personagem 10")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver mais" }));

    expect(screen.getByText("Personagem 10")).toBeInTheDocument();
    expect(screen.getByText("Golpe Runico")).toBeInTheDocument();
  });
});
