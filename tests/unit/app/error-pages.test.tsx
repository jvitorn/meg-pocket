import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

import ErrorPage from "@/app/error";
import NotFound from "@/app/not-found";

describe("paginas de erro", () => {
  it("renderiza a rota 404 personalizada", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByAltText("Bosque tranquilo ao amanhecer")).toHaveAttribute(
      "src",
      "/imgs/backgrounds/bosqueTranquilo.jpg"
    );
    expect(screen.getByRole("link", { name: /voltar ao início/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("renderiza a rota 500 personalizada e permite tentar novamente", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<ErrorPage error={new Error("falha")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Algo saiu do controle" })).toBeInTheDocument();
    expect(screen.getByAltText("Templo destruído por magia instável")).toHaveAttribute(
      "src",
      "/imgs/backgrounds/destruicaoTemplo.jpg"
    );

    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
