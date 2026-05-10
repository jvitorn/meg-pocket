import { invoke } from "@tauri-apps/api/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { StatusCard } from "../components/StatusCard";
import type { SystemStatus } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

const baseStatus: SystemStatus = {
  os: "linux",
  distroFamily: "arch_like",
  distroName: "Arch Linux",
  supported: true,
  dockerInstalled: true,
  dockerRunning: true,
  dockerComposeInstalled: true,
  dockerPermissionOk: true,
  sudoDockerWorks: false,
  requiresRelogin: false,
  projectInstalled: true,
  projectVersion: "v1.1.0",
  appOnline: true,
  adminerOnline: true,
};

function mockDoctor(status: SystemStatus = baseStatus) {
  invokeMock.mockImplementation(async (command: string) => {
    if (command === "doctor") return JSON.stringify(status);
    if (command === "readLogs") return "app log";
    return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
  });
}

describe("M&G Pocket Launcher", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("renderiza a tela principal", async () => {
    mockDoctor();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Launcher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preparar ambiente/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Ambiente")).toBeInTheDocument();
  });

  it("StatusCard exibe estados", () => {
    render(
      <StatusCard
        title="Docker"
        items={[
          { label: "Docker instalado", value: "sim", tone: "ok" },
          { label: "Permissão", value: "usando sudo", tone: "warn" },
        ]}
      />,
    );

    expect(screen.getByText("Docker instalado")).toBeInTheDocument();
    expect(screen.getByText("usando sudo")).toBeInTheDocument();
  });

  it("botão Preparar ambiente chama os comandos esperados", async () => {
    mockDoctor({ ...baseStatus, projectInstalled: false, appOnline: false });
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Preparar ambiente/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("installProject"));
    expect(invokeMock).toHaveBeenCalledWith("ensureDockerRunning");
    expect(invokeMock).toHaveBeenCalledWith("ensureDockerPermission");
  });

  it("reset local exige confirmação", async () => {
    mockDoctor();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Resetar Dados Locais/i }));

    const confirm = screen.getByRole("button", { name: "Resetar" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/Digite RESETAR/i), "RESETAR");
    expect(confirm).toBeEnabled();
  });

  it("requiresRelogin mostra aviso", async () => {
    mockDoctor({ ...baseStatus, dockerPermissionOk: false, sudoDockerWorks: true, requiresRelogin: true });
    render(<App />);

    expect(await screen.findByText(/Talvez seja necessário sair e entrar novamente/i)).toBeInTheDocument();
  });

  it("Docker ausente em Linux suportado mostra ação de instalação", async () => {
    mockDoctor({ ...baseStatus, dockerInstalled: false, dockerRunning: false, dockerComposeInstalled: false });
    render(<App />);

    expect(await screen.findByRole("button", { name: /Instalar Docker no Linux/i })).toBeInTheDocument();
  });

  it("Docker ausente em Windows orienta Docker Desktop", async () => {
    mockDoctor({
      ...baseStatus,
      os: "windows",
      distroFamily: undefined,
      distroName: "Windows",
      dockerInstalled: false,
      dockerRunning: false,
      dockerComposeInstalled: false,
    });
    render(<App />);

    expect(await screen.findByText(/instale o Docker Desktop antes de continuar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abrir página de download/i })).toBeInTheDocument();
  });
});
