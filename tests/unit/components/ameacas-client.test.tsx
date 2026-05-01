import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { dataBestiario } from "@/data/dataBestiario";

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

import { AmeacasClient } from "@/components/ameacas/AmeacasClient";

describe("AmeacasClient", () => {
  it("filtra a busca por texto ignorando acentos", async () => {
    render(<AmeacasClient ameacas={dataBestiario} />);

    fireEvent.change(screen.getByLabelText("Buscar ameaças"), {
      target: { value: "dragao glacial" },
    });

    expect(await screen.findByText("Dragão Glacial")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Goblin")).not.toBeInTheDocument();
    });
  });

  it("filtra por tipo e limpa os filtros", async () => {
    const user = userEvent.setup();

    render(<AmeacasClient ameacas={dataBestiario} />);

    await user.click(screen.getAllByRole("button", { name: /elemental/i })[0]);

    expect(await screen.findByText("Elemental de Fogo")).toBeInTheDocument();
    expect(screen.queryByText("Goblin")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));

    expect(await screen.findByText("Goblin")).toBeInTheDocument();
  });

  it("troca para lista mantendo o item inteiro como link", async () => {
    const user = userEvent.setup();

    render(<AmeacasClient ameacas={dataBestiario} />);

    await user.click(screen.getByRole("button", { name: "Lista" }));

    expect(screen.getByRole("link", { name: "Ver detalhes de Goblin" })).toHaveAttribute(
      "href",
      "/ameacas/goblin"
    );
  });

  it("aplica atalhos de pesquisa", async () => {
    const user = userEvent.setup();

    render(<AmeacasClient ameacas={dataBestiario} />);

    await user.click(screen.getByRole("button", { name: "Boss" }));

    expect(screen.getByLabelText("Buscar ameaças")).toHaveValue("boss");
    expect(await screen.findByText("Fênix Celeste")).toBeInTheDocument();
  });
});
