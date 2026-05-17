import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const authServiceMocks = vi.hoisted(() => ({
  loginComGoogle: vi.fn(),
  loginComSenha: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock("@/services/authService", () => ({
  authService: {
    loginComGoogle: authServiceMocks.loginComGoogle,
    loginComSenha: authServiceMocks.loginComSenha,
  },
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

import { LoginForm } from "@/components/login/login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    authServiceMocks.loginComGoogle.mockReset();
    authServiceMocks.loginComSenha.mockReset();
    routerMocks.replace.mockReset();
    routerMocks.refresh.mockReset();
  });

  it("esconde o login com Google quando as credenciais nao estao habilitadas", () => {
    render(<LoginForm />);

    expect(
      screen.queryByRole("button", { name: "Login com Google" })
    ).not.toBeInTheDocument();
  });

  it("aciona o login com Google ao clicar no botao dedicado", async () => {
    const user = userEvent.setup();

    render(<LoginForm googleLoginEnabled />);

    await user.click(screen.getByRole("button", { name: "Login com Google" }));

    expect(authServiceMocks.loginComGoogle).toHaveBeenCalledTimes(1);
  });

  it("mostra a mensagem amigavel para falha de credenciais", async () => {
    const user = userEvent.setup();
    authServiceMocks.loginComSenha.mockResolvedValue({
      error: "CredentialsSignin",
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "aventureiro@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-incorreta");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(authServiceMocks.loginComSenha).toHaveBeenCalledWith(
      "aventureiro@example.com",
      "senha-incorreta"
    );
    expect(
      await screen.findByText(
        "Email ou senha incorretos. Confira os dados e tente novamente."
      )
    ).toBeInTheDocument();
  });

  it("redireciona para o dashboard quando o login e bem-sucedido", async () => {
    const user = userEvent.setup();
    authServiceMocks.loginComSenha.mockResolvedValue({
      ok: true,
      url: "http://localhost:3000/fichas/novo?origem=login",
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "aventureiro@example.com");
    await user.type(screen.getByLabelText("Senha"), "senha-correta");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(routerMocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });
});
