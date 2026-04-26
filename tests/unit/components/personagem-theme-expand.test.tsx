import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

const navMocks = vi.hoisted(() => ({
  params: { id: "7" },
}));

const personagemViewMock = vi.hoisted(() => ({
  render: vi.fn(({ expanded }: { expanded?: boolean }) => (
    <div data-testid="personagem-view" data-expanded={String(Boolean(expanded))}>
      ficha
    </div>
  )),
}));

vi.stubGlobal("fetch", fetchMock);

vi.mock("next/navigation", () => ({
  useParams: () => navMocks.params,
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      layout,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.ComponentProps<"div"> & {
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

vi.mock("@/components/personagens/personagem-view", () => ({
  PersonagemView: personagemViewMock.render,
}));

import PersonagemClient from "@/components/personagens/personagemClient";
import { getThemeByColor } from "@/lib/fantasyThemes";
import { getElementoThemeColor } from "@/lib/personagemElementoTheme";

describe("PersonagemClient tema e expansão", () => {
  it("usa a cor do elemento no fundo externo e alterna o modo expandido", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 7,
          nome: "Arkan",
          campanhaId: 1,
          classeId: 2,
          racaId: 3,
          elemento: "fogo",
          corTema: "amber",
          sobre: "Cronista",
          canEdit: true,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const { container } = render(<PersonagemClient />);
    const expected = getThemeByColor(getElementoThemeColor("fogo"));

    await screen.findByText("Ficha");

    await waitFor(() => {
      const pageShell = container.querySelector(
        ".relative.isolate.min-h-screen"
      ) as HTMLElement | null;
      expect(pageShell?.style.getPropertyValue("--theme-ring")).toBe(
        String(expected.style["--theme-ring" as keyof typeof expected.style])
      );
      expect(pageShell?.querySelector(".animate-soft-pulse")).toBeInTheDocument();
    });

    expect(screen.getByTestId("personagem-view")).toHaveAttribute(
      "data-expanded",
      "false"
    );

    await user.click(screen.getByRole("button", { name: /expandir ficha/i }));

    expect(screen.getByTestId("personagem-view")).toHaveAttribute(
      "data-expanded",
      "true"
    );
  });
});
