import { invoke } from "@tauri-apps/api/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { StatusCard } from "../components/StatusCard";
import type { DependencyStatus, SystemStatus } from "../types";

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

const baseDependencies: DependencyStatus = {
  os: "linux",
  distroFamily: "arch_like",
  distroName: "Arch Linux",
  supported: true,
  missing: [],
  packages: [],
  installable: false,
  sudoRequired: false,
  installCommand: "",
  manualInstructions: "",
};

function mockDoctor(status: SystemStatus = baseStatus) {
  invokeMock.mockImplementation(async (command: string) => {
    if (command === "doctor") return JSON.stringify(status);
    if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
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

  it("Instalar/Atualizar valida dependências antes de instalar", async () => {
    const missingDependencies: DependencyStatus = {
      ...baseDependencies,
      missing: ["git", "curl", "docker compose"],
      packages: ["git", "curl", "docker-compose"],
      installable: true,
      sudoRequired: true,
      installCommand: "sudo pacman -S --needed git curl docker docker-compose bash coreutils",
    };

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "doctor") return JSON.stringify(baseStatus);
      if (command === "checkSystemDependencies") return JSON.stringify(missingDependencies);
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i }));

    expect(await screen.findByText(/Algumas dependências precisam ser instaladas/i)).toBeInTheDocument();
    expect(screen.getByText("git")).toBeInTheDocument();
    expect(screen.getByText("curl")).toBeInTheDocument();
    expect(screen.getByText("docker compose")).toBeInTheDocument();
    expect(screen.getByText(/senha de administrador/i)).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("installProject");
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

  it("Linux não suportado não tenta instalar Docker automaticamente", async () => {
    mockDoctor({
      ...baseStatus,
      distroFamily: "unsupported",
      distroName: "Fedora Linux",
      supported: false,
      dockerInstalled: false,
      dockerRunning: false,
      dockerComposeInstalled: false,
    });
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Fedora Linux");
    await user.click(screen.getByRole("button", { name: /Preparar ambiente/i }));

    expect(await screen.findByText(/Esta distribuição ainda não é suportada/i)).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("installDockerLinux");
  });

  it("restore exige confirmação forte antes de chamar backend", async () => {
    mockDoctor();
    vi.spyOn(window, "prompt").mockReturnValue("/tmp/mg-pocket-backup.tar.gz");
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Restaurar Backup/i }));

    const confirm = screen.getByRole("button", { name: "Restaurar" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/Digite RESTAURAR/i), "RESTAURAR");
    await user.click(confirm);

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("restoreBackup", {
        backupPath: "/tmp/mg-pocket-backup.tar.gz",
        confirmed: true,
      }),
    );
  });

  it("Ver Logs exibe o snapshot retornado pelo backend", async () => {
    mockDoctor();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Ver Logs/i }));

    expect(await screen.findByText("app log")).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith("readLogs");
  });

  it("Abrir Site e Abrir Adminer chamam apenas comandos permitidos", async () => {
    mockDoctor();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Abrir Site/i }));
    await user.click(screen.getByRole("button", { name: /Abrir Adminer/i }));

    expect(invokeMock).toHaveBeenCalledWith("openSite");
    expect(invokeMock).toHaveBeenCalledWith("openAdminer");
  });
});
