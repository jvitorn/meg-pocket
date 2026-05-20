import { invoke } from "@tauri-apps/api/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { StatusCard } from "../components/StatusCard";
import type { CommandOutput, DependencyStatus, SystemStatus } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const eventHandlers = vi.hoisted(() => new Map<string, (event: { payload: unknown }) => void>());

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (eventName: string, handler: (event: { payload: unknown }) => void) => {
    eventHandlers.set(eventName, handler);
    return vi.fn(() => eventHandlers.delete(eventName));
  }),
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
  gitInstalled: true,
  podmanInstalled: false,
  containerRuntime: "docker",
  port3000Available: true,
  port80Available: true,
  port443Available: true,
  port5432Available: true,
  databaseConnected: true,
  containersActive: true,
  nginxOnline: true,
  uploadsDirectoryOk: true,
  uploadsServed: true,
  nextAssetsOnline: true,
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
    if (command === "quickDiagnose") return JSON.stringify(status);
    if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
    if (command === "readLogs") return "app log";
    return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
  });
}

async function renderReady(status: SystemStatus = baseStatus) {
  mockDoctor(status);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "Launcher" });
  await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("quickDiagnose"));
  invokeMock.mockClear();
  return user;
}

function emitLauncherEvent(eventName: string, payload: unknown) {
  act(() => {
    eventHandlers.get(eventName)?.({ payload });
  });
}

describe("M&G Pocket Launcher", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    eventHandlers.clear();
  });

  it("renderiza a tela principal", async () => {
    mockDoctor();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Launcher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preparar ambiente/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Ambiente")).toBeInTheDocument();
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("quickDiagnose"));
    expect(invokeMock).not.toHaveBeenCalledWith("doctor");
  });

  it("abre sem bloquear a UI mesmo se o diagnóstico rápido demorar", async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return new Promise(() => undefined);
      if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Launcher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Diagnosticar$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i })).toBeEnabled();
    expect(invokeMock).not.toHaveBeenCalledWith("doctor");
  });

  it("abre mesmo se o diagnóstico rápido falhar", async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") throw new Error("timeout");
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Launcher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Diagnosticar$/i })).toBeEnabled();
    expect(invokeMock).not.toHaveBeenCalledWith("doctor");
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

  it("mostra diagnóstico completo de infraestrutura local", async () => {
    mockDoctor();
    render(<App />);

    const diagnostics = within(await screen.findByLabelText("Diagnóstico"));

    expect(await diagnostics.findByText("Git instalado")).toBeInTheDocument();
    expect(diagnostics.getByText("Banco conectado")).toBeInTheDocument();
    expect(diagnostics.getByText("Containers ativos")).toBeInTheDocument();
    expect(diagnostics.getByText("Nginx")).toBeInTheDocument();
    expect(diagnostics.getByText("Uploads")).toBeInTheDocument();
    expect(diagnostics.getByText("Assets Next")).toBeInTheDocument();
    expect(diagnostics.getByText("Porta 3000")).toBeInTheDocument();
    expect(diagnostics.getByText("Portas 80/443/5432")).toBeInTheDocument();
    expect(diagnostics.getAllByText("ok").length).toBeGreaterThanOrEqual(3);
    expect(diagnostics.getAllByText("livres").length).toBeGreaterThanOrEqual(1);
  });

  it("botão Preparar ambiente chama os comandos esperados", async () => {
    mockDoctor({ ...baseStatus, projectInstalled: false, appOnline: false });
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Preparar ambiente/i }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("installProject", {
        useSudoDocker: false,
        lightBuild: false,
      }),
    );
    expect(invokeMock).toHaveBeenCalledWith("ensureDockerRunning");
    expect(invokeMock).toHaveBeenCalledWith("ensureDockerPermission");
  });

  it.each([
    [/^Diagnosticar$/i, "doctor", false],
    [/^Instalar\/Atualizar M&G Pocket$/i, "installProject", true],
    [/^Iniciar M&G Pocket$/i, "startApp", true],
    [/^Parar$/i, "stopApp", true],
    [/^Reiniciar$/i, "restartApp", true],
    [/^Abrir Site$/i, "openSite", false],
    [/^Abrir Adminer$/i, "openAdminer", false],
    [/^Ver Logs$/i, "readLogs", true],
    [/^Backup$/i, "backup", true],
  ])("botão %s chama %s", async (buttonName, command, withDockerOptions) => {
    const user = await renderReady();

    await user.click(screen.getByRole("button", { name: buttonName }));

    await waitFor(() =>
      withDockerOptions
        ? expect(invokeMock).toHaveBeenCalledWith(
            command,
            command === "installProject"
              ? { useSudoDocker: false, lightBuild: false }
              : { useSudoDocker: false },
          )
        : expect(invokeMock).toHaveBeenCalledWith(command),
    );
  });

  it("modo de build leve acompanha instalação e reparo", async () => {
    const user = await renderReady();

    await user.click(screen.getByLabelText(/Modo de build leve/i));
    await user.click(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("installProject", {
        useSudoDocker: false,
        lightBuild: true,
      }),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /Reparar instalação/i })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: /Reparar instalação/i }));
    await user.click(await screen.findByRole("button", { name: /Reconstruir do zero/i }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("repairInstallation", {
        useSudoDocker: false,
        lightBuild: true,
      }),
    );
  });

  it("botão Atualizar do painel de logs chama readLogs", async () => {
    const user = await renderReady();

    await user.click(screen.getByRole("button", { name: "Atualizar" }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("readLogs", { useSudoDocker: false }));
  });

  it("botão Instalar Docker no Linux chama installDockerLinux", async () => {
    const user = await renderReady({
      ...baseStatus,
      dockerInstalled: false,
      dockerRunning: false,
      dockerComposeInstalled: false,
    });

    await user.click(screen.getByRole("button", { name: /Instalar Docker no Linux/i }));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("installDockerLinux"));
  });

  it("mostra progresso enquanto uma ação está em execução", async () => {
    let resolveStart!: (output: CommandOutput) => void;
    const startPromise = new Promise<CommandOutput>((resolve) => {
      resolveStart = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "doctor") return JSON.stringify(baseStatus);
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
      if (command === "startApp") return startPromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /^Iniciar M&G Pocket$/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Processando Iniciar/i);

    resolveStart({ success: true, code: 0, stdout: "start ok", stderr: "" });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("botão Diagnosticar entra em loading e sai do loading", async () => {
    let resolveDoctor!: (status: string) => void;
    const doctorPromise = new Promise<string>((resolve) => {
      resolveDoctor = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "doctor") return doctorPromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    const button = screen.getByRole("button", { name: /^Diagnosticar$/i });

    await user.click(button);
    expect(button).toBeDisabled();

    resolveDoctor(JSON.stringify(baseStatus));
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("Instalar/Atualizar entra em loading e sai do loading", async () => {
    let resolveInstall!: (output: CommandOutput) => void;
    const installPromise = new Promise<CommandOutput>((resolve) => {
      resolveInstall = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
      if (command === "installProject") return installPromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    const button = screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i });

    await user.click(button);
    expect(button).toBeDisabled();

    resolveInstall({ success: true, code: 0, stdout: "ok", stderr: "" });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it.each([
    [/^Reiniciar$/i, "restartApp"],
    [/^Backup$/i, "backup"],
  ])("%s entra em loading e sai do loading", async (buttonName, commandName) => {
    let resolveAction!: (output: CommandOutput) => void;
    const actionPromise = new Promise<CommandOutput>((resolve) => {
      resolveAction = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === commandName) return actionPromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    const button = screen.getByRole("button", { name: buttonName });

    await user.click(button);
    expect(button).toBeDisabled();

    resolveAction({ success: true, code: 0, stdout: "ok", stderr: "" });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("restore entra em loading e sai do loading", async () => {
    let resolveRestore!: (output: CommandOutput) => void;
    const restorePromise = new Promise<CommandOutput>((resolve) => {
      resolveRestore = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "restoreBackup") return restorePromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    vi.spyOn(window, "prompt").mockReturnValue("/tmp/mg-pocket-backup.tar.gz");
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Restaurar Backup/i }));
    await user.type(screen.getByLabelText(/Digite RESTAURAR/i), "RESTAURAR");
    const confirm = screen.getByRole("button", { name: "Restaurar" });

    await user.click(confirm);
    expect(screen.getByRole("button", { name: /Restaurar Backup/i })).toBeDisabled();

    resolveRestore({ success: true, code: 0, stdout: "ok", stderr: "" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Restaurar Backup/i })).toBeEnabled());
  });

  it("reset entra em loading e sai do loading", async () => {
    let resolveReset!: (output: CommandOutput) => void;
    const resetPromise = new Promise<CommandOutput>((resolve) => {
      resolveReset = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "resetLocalData") return resetPromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Resetar Dados Locais/i }));
    await user.type(screen.getByLabelText(/Digite RESETAR/i), "RESETAR");
    await user.click(screen.getByRole("button", { name: "Resetar" }));
    expect(screen.getByRole("button", { name: /Resetar Dados Locais/i })).toBeDisabled();

    resolveReset({ success: true, code: 0, stdout: "ok", stderr: "" });
    await waitFor(() => expect(screen.getByRole("button", { name: /Resetar Dados Locais/i })).toBeEnabled());
  });

  it("remover projeto entra em loading e sai do loading", async () => {
    let resolveRemove!: (output: CommandOutput) => void;
    const removePromise = new Promise<CommandOutput>((resolve) => {
      resolveRemove = resolve;
    });

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "removeLocalProject") return removePromise;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /^Remover Projeto Local$/i }));
    await user.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("button", { name: /^Remover Projeto Local$/i })).toBeDisabled();

    resolveRemove({ success: true, code: 0, stdout: "ok", stderr: "" });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Remover Projeto Local$/i })).toBeEnabled());
  });

  it("erro de job finaliza barra, libera botões e não fica running", async () => {
    mockDoctor();
    render(<App />);
    await screen.findByText("Arch Linux");

    emitLauncherEvent("launcher://job-started", {
      job_id: "job-1",
      action: "Instalar/Atualizar M&G Pocket",
      step: "Verificando Docker",
      message: "Verificando Docker.",
      progress: 20,
      level: "info",
    });

    expect(screen.getByRole("button", { name: /^Diagnosticar$/i })).toBeDisabled();

    emitLauncherEvent("launcher://job-finished", {
      job_id: "job-1",
      action: "Instalar/Atualizar M&G Pocket",
      step: "Verificar Docker",
      message: "Falhou na etapa: Verificar Docker",
      progress: 100,
      level: "error",
    });

    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100"));
    expect(screen.getByRole("status")).toHaveTextContent(/Falhou na etapa/i);
    expect(screen.getByRole("button", { name: /^Diagnosticar$/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^Cancelar$/i })).not.toBeInTheDocument();
  });

  it("botões ficam desabilitados durante job e voltam após cancelamento", async () => {
    mockDoctor();
    render(<App />);
    await screen.findByText("Arch Linux");

    emitLauncherEvent("launcher://job-started", {
      job_id: "job-2",
      action: "Diagnosticar",
      step: "Docker",
      message: "Verificando Docker.",
      progress: 40,
      level: "info",
    });
    expect(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i })).toBeDisabled();

    emitLauncherEvent("launcher://job-finished", {
      job_id: "job-2",
      action: "Diagnosticar",
      step: "Cancelado",
      message: "Operação cancelada.",
      progress: 100,
      level: "cancelled",
    });

    await waitFor(() => expect(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i })).toBeEnabled());
    expect(screen.getByRole("status")).toHaveTextContent(/Operação cancelada/i);
  });

  it("Ver Logs mostra apenas as últimas 50 linhas", async () => {
    const largeLog = Array.from({ length: 80 }, (_, index) => `linha ${index}`).join("\n");
    invokeMock.mockImplementation(async (command: string) => {
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "readLogs") return largeLog;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Ver Logs/i }));

    expect(await screen.findByText(/linha 30/)).toBeInTheDocument();
    expect(screen.queryByText(/linha 29/)).not.toBeInTheDocument();
    expect(screen.getByText(/linha 79/)).toBeInTheDocument();
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
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
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
    expect(screen.getByText(/mecanismo do sistema/i)).toBeInTheDocument();
    expect(screen.queryByText(/rust|cargo/i)).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("installProject");
  });

  it("botão Instalar dependências pede consentimento e retoma instalação", async () => {
    const missingDependencies: DependencyStatus = {
      ...baseDependencies,
      missing: ["git", "docker compose"],
      packages: ["git", "docker-compose"],
      installable: true,
      sudoRequired: true,
      installCommand: "sudo pacman -S --needed git docker docker-compose bash coreutils",
    };
    let dependencyChecks = 0;

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "doctor") return JSON.stringify(baseStatus);
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "checkSystemDependencies") {
        dependencyChecks += 1;
        return JSON.stringify(dependencyChecks === 1 ? missingDependencies : baseDependencies);
      }
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    invokeMock.mockClear();
    await user.click(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i }));
    await user.click(await screen.findByRole("button", { name: /Instalar dependências/i }));
    await user.click(await screen.findByRole("button", { name: /^Continuar$/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("installSystemDependencies"));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("installProject", {
        useSudoDocker: false,
        lightBuild: false,
      }),
    );
  });

  it("erro técnico de instalação fica fora do alerta principal", async () => {
    const rawError =
      "git: /tmp/.mount_mg-pocket/usr/lib/libpcre2-8.so.0: no version information available\nsymbol lookup error";

    invokeMock.mockImplementation(async (command: string) => {
      if (command === "doctor") return JSON.stringify(baseStatus);
      if (command === "quickDiagnose") return JSON.stringify(baseStatus);
      if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
      if (command === "installProject") throw rawError;
      return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
    });

    const user = userEvent.setup();
    const { container } = render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Instalar\/Atualizar M&G Pocket/i }));

    const alert = await waitFor(() => {
      const element = container.querySelector(".message--error");
      expect(element).toBeInTheDocument();
      return element as HTMLElement;
    });
    expect(alert).toHaveTextContent(/Não consegui concluir/i);
    expect(alert).not.toHaveTextContent("/tmp/.mount_mg-pocket");
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
    await user.click(confirm);

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("resetLocalData", { confirmed: true, useSudoDocker: false }));
  });

  it("desinstalação local completa exige confirmação forte", async () => {
    mockDoctor();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Arch Linux");
    await user.click(screen.getByRole("button", { name: /Desinstalar M&G Pocket Local/i }));

    const confirm = screen.getByRole("button", { name: "Desinstalar" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText(/Digite REMOVER/i), "REMOVER");
    await user.click(confirm);

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("removeLocalProject", {
        mode: "complete",
        confirmed: true,
        useSudoDocker: false,
      }),
    );
  });

  it("requiresRelogin mostra aviso", async () => {
    mockDoctor({ ...baseStatus, dockerPermissionOk: false, sudoDockerWorks: true, requiresRelogin: true });
    render(<App />);

    expect(await screen.findByText("Permissão do Docker ainda não está ativa")).toBeInTheDocument();
    expect(screen.getByText(/Salve seus arquivos, saia da sessão do Linux/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/pode instalar Docker Desktop via winget/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Abrir página de download/i })).toBeInTheDocument();
  });

  it("botão do guia Docker no Windows chama openDockerGuide", async () => {
    const user = await renderReady({
      ...baseStatus,
      os: "windows",
      distroFamily: undefined,
      distroName: "Windows",
      dockerInstalled: false,
      dockerRunning: false,
      dockerComposeInstalled: false,
    });

    await user.click(screen.getByRole("button", { name: /Abrir página de download/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("openDockerGuide"));
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

    await waitFor(() => expect(document.querySelector(".message--error")).toHaveTextContent(/Esta distribuição ainda não é suportada/i));
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
        useSudoDocker: false,
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
    expect(invokeMock).toHaveBeenCalledWith("readLogs", { useSudoDocker: false });
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
