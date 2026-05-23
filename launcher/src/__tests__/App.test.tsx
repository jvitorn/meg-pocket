import { invoke } from "@tauri-apps/api/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import type { DependencyStatus, SystemStatus } from "../types";

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
const firstStepsStorageKey = "mg-pocket-launcher-hide-first-steps";
const storage = new Map<string, string>();

function installLocalStorageMock() {
  storage.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
}

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
  projectPath: "/home/user/.local/share/mg-pocket/app",
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

function mockBackend(status: SystemStatus = baseStatus) {
  invokeMock.mockImplementation(async (command: string) => {
    if (command === "doctor") return JSON.stringify(status);
    if (command === "quickDiagnose") return JSON.stringify(status);
    if (command === "checkSystemDependencies") return JSON.stringify(baseDependencies);
    if (command === "readLogs") return "detalhe tecnico";
    return { success: true, code: 0, stdout: `${command} ok`, stderr: "" };
  });
}

async function renderReady(status: SystemStatus = baseStatus) {
  window.localStorage.setItem(firstStepsStorageKey, "true");
  mockBackend(status);
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
    installLocalStorageMock();
    vi.restoreAllMocks();
  });

  it("mostra Primeiros passos na primeira abertura e permite ocultar", async () => {
    mockBackend();
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("dialog", { name: "Primeiros passos" })).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Não mostrar novamente/i));
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(window.localStorage.getItem(firstStepsStorageKey)).toBe("true");
  });

  it("Ajuda abre Primeiros passos novamente", async () => {
    const user = await renderReady();

    await user.click(screen.getByRole("button", { name: "Primeiros passos" }));

    expect(await screen.findByRole("dialog", { name: "Primeiros passos" })).toBeInTheDocument();
  });

  it("usa Preparar Ambiente como ação principal e imagem pronta como modo padrão", async () => {
    const user = await renderReady({ ...baseStatus, projectInstalled: false, appOnline: false, nginxOnline: false });

    expect(screen.getByRole("button", { name: "Preparar Ambiente" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Instalar\/Atualizar/i })).not.toBeInTheDocument();

    await user.click(screen.getByText("Opções avançadas"));
    expect(screen.getByLabelText(/Baixar versão pronta/i)).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Preparar Ambiente" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("installProject", {
        useSudoDocker: false,
        lightBuild: true,
        localBuild: false,
        noCache: false,
      }),
    );
  });

  it("modo avançado usa build local e permite rebuild sem cache", async () => {
    const user = await renderReady({ ...baseStatus, projectInstalled: false, appOnline: false, nginxOnline: false });

    await user.click(screen.getByText("Opções avançadas"));
    await user.click(screen.getByLabelText(/Construir localmente/i));
    await user.click(screen.getByLabelText(/Reconstruir sem cache/i));
    await user.click(screen.getByRole("button", { name: "Preparar Ambiente" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("installProject", {
        useSudoDocker: false,
        lightBuild: true,
        localBuild: true,
        noCache: true,
      }),
    );
  });

  it("Iniciar M&G Pocket abre o navegador quando o app fica online", async () => {
    const user = await renderReady();

    await user.click(screen.getByRole("button", { name: /^Iniciar M&G Pocket$/i }));

    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("startApp", { useSudoDocker: false }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("openSite"));
    expect(screen.getByText(/Abrindo no navegador/i)).toBeInTheDocument();
  });

  it("Abrir M&G Pocket abre quando online e mostra mensagem amigável quando offline", async () => {
    const user = await renderReady({ ...baseStatus, appOnline: false, nginxOnline: false });

    await user.click(screen.getByRole("button", { name: /^Abrir M&G Pocket$/i }));

    expect(await screen.findByText(/ainda não está pronto para abrir/i)).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith("openSite");
  });

  it("barra não fica travada em 100% e botões liberam após erro", async () => {
    await renderReady();

    emitLauncherEvent("launcher://job-started", {
      job_id: "job-1",
      action: "Preparar Ambiente",
      step: "Baixando versão pronta",
      message: "Baixando versão pronta.",
      progress: 70,
      level: "info",
    });

    expect(screen.getByRole("button", { name: /^Diagnosticar$/i })).toBeDisabled();

    emitLauncherEvent("launcher://job-finished", {
      job_id: "job-1",
      action: "Preparar Ambiente",
      step: "Erro",
      message: "Não foi possível concluir",
      progress: 100,
      level: "error",
    });

    await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100"));
    expect(screen.getByRole("status")).toHaveTextContent(/Não foi possível concluir/i);
    expect(screen.getByRole("button", { name: /^Diagnosticar$/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^Cancelar$/i })).not.toBeInTheDocument();
  });

  it("mensagem de proxy não aparece para usuário final", async () => {
    await renderReady({ ...baseStatus, nginxOnline: false });

    expect(screen.getByText(/Não conseguimos abrir o M&G Pocket agora/i)).toBeInTheDocument();
    expect(screen.queryByText(/proxy local/i)).not.toBeInTheDocument();
  });

  it("diagnóstico simples aparece antes dos detalhes técnicos", async () => {
    await renderReady();

    const diagnostics = within(screen.getByLabelText("Diagnóstico"));
    expect(diagnostics.getByText("Banco de dados")).toBeInTheDocument();
    expect(diagnostics.getByText("Aplicativo")).toBeInTheDocument();
    expect(diagnostics.getByText("Acesso local")).toBeInTheDocument();
    expect(diagnostics.queryByText("Nginx")).not.toBeInTheDocument();
    expect(screen.getAllByText("Detalhes técnicos").length).toBeGreaterThan(0);
  });

  it("Reparar instalação usa imagem pronta por padrão e build local só no avançado", async () => {
    const user = await renderReady();

    await user.click(screen.getByRole("button", { name: /^Reparar instalação$/i }));
    await user.click(within(await screen.findByRole("dialog", { name: "Reparar instalação" })).getByRole("button", {
      name: /^Reparar instalação$/i,
    }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("repairInstallation", {
        useSudoDocker: false,
        lightBuild: true,
        localBuild: false,
        noCache: false,
      }),
    );

    invokeMock.mockClear();
    await user.click(screen.getByText("Opções avançadas"));
    await user.click(screen.getByLabelText(/Construir localmente/i));
    await user.click(screen.getByRole("button", { name: /^Reparar instalação$/i }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Reparar instalação" })).getByRole("button", {
        name: /^Reconstruir localmente$/i,
      }),
    );

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("repairInstallation", {
        useSudoDocker: false,
        lightBuild: true,
        localBuild: true,
        noCache: false,
      }),
    );
  });

  it("backup chama apenas ação de banco e restauração pede confirmação", async () => {
    const user = await renderReady();
    vi.spyOn(window, "prompt").mockReturnValue("/tmp/meg-pocket-db-2026-05-22-1200.sql");

    await user.click(screen.getByRole("button", { name: /^Backup$/i }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith("backup", { useSudoDocker: false }));

    await user.click(screen.getByRole("button", { name: /Restaurar Backup/i }));
    expect(await screen.findByText(/vai substituir os dados atuais/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Digite RESTAURAR/i), "RESTAURAR");
    await user.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("restoreBackup", {
        backupPath: "/tmp/meg-pocket-db-2026-05-22-1200.sql",
        confirmed: true,
        useSudoDocker: false,
      }),
    );
  });
});
