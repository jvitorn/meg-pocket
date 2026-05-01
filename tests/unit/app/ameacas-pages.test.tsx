import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    fill,
    priority,
    ...props
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    priority?: boolean;
  } & React.ImgHTMLAttributes<HTMLImageElement>) => {
    void fill;
    void priority;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} src={src} {...props} />
    );
  },
}));

vi.mock("@/components/navbar", () => ({
  Navbar: () => <nav>Navbar</nav>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer>Footer</footer>,
}));

import AmeacasPage from "@/app/ameacas/page";
import AmeacaDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/ameacas/[id]/page";

describe("rotas de ameacas", () => {
  it("renderiza a pagina publica de ameacas", () => {
    render(<AmeacasPage />);

    expect(screen.getByRole("heading", { name: "Ameaças" })).toBeInTheDocument();
    expect(screen.getByText("Bestiário público")).toBeInTheDocument();
    expect(screen.getAllByText("44").length).toBeGreaterThan(0);
  });

  it("renderiza a pagina de detalhe da ameaca", async () => {
    const page = await AmeacaDetailPage({
      params: Promise.resolve({ id: "dragao-glacial" }),
    });

    render(page);

    expect(screen.getByRole("heading", { name: "Dragão Glacial" })).toBeInTheDocument();
    expect(screen.getByText("Sopro Congelante")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voltar para ameaças/i })).toHaveAttribute(
      "href",
      "/ameacas"
    );
  });

  it("gera metadata e params estaticos para as ameacas", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ id: "dragao-glacial" }) })
    ).resolves.toEqual(
      expect.objectContaining({
        title: "Dragão Glacial — Ameaças | M&G Pocket",
      })
    );

    expect(generateStaticParams()).toContainEqual({ id: "dragao-glacial" });
  });

  it("aciona notFound quando o id nao existe", async () => {
    await expect(
      AmeacaDetailPage({ params: Promise.resolve({ id: "nao-existe" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(navigationMocks.notFound).toHaveBeenCalled();
  });
});
