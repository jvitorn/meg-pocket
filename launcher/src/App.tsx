import {
  Archive,
  BookOpen,
  Database,
  ExternalLink,
  HardDrive,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  backup,
  checkSystemDependencies,
  doctor,
  ensureDockerPermission,
  ensureDockerRunning,
  installDockerLinux,
  installProject,
  installSystemDependencies,
  openAdminer,
  openDockerGuide,
  openSite,
  readLogs,
  resetLocalData,
  restoreBackup,
  restartApp,
  startApp,
  stopApp,
} from "./api";
import { ActionButton } from "./components/ActionButton";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { LogPanel } from "./components/LogPanel";
import { StatusCard, type StatusItem } from "./components/StatusCard";
import { StepProgress } from "./components/StepProgress";
import type { CommandOutput, DependencyStatus, ProgressStep, SystemStatus } from "./types";

const initialSteps: ProgressStep[] = [
  { id: "doctor", label: "Diagnóstico", state: "pending" },
  { id: "docker", label: "Docker", state: "pending" },
  { id: "permission", label: "Permissão", state: "pending" },
  { id: "project", label: "Projeto", state: "pending" },
  { id: "online", label: "Validação", state: "pending" },
];

function boolLabel(value: boolean, yes = "sim", no = "não") {
  return value ? yes : no;
}

function tone(value: boolean): StatusItem["tone"] {
  return value ? "ok" : "bad";
}

function friendlyOs(os?: string) {
  if (os === "linux") return "Linux";
  if (os === "windows") return "Windows";
  if (os === "macos") return "macOS";
  return "desconhecido";
}

function appendOutput(current: string, label: string, output?: CommandOutput | string) {
  const text = typeof output === "string" ? output : [output?.stdout, output?.stderr].filter(Boolean).join("\n");
  if (!text.trim()) return current;
  return `${current}${current ? "\n\n" : ""}# ${label}\n${text.trim()}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isFriendlyError(message: string) {
  return (
    message.length > 0 &&
    message.length <= 180 &&
    !message.includes("\n") &&
    !message.includes("/usr/") &&
    !message.includes("/tmp/") &&
    !message.includes("symbol lookup error")
  );
}

function friendlyActionError(label: string, error: unknown) {
  const message = errorMessage(error);
  if (isFriendlyError(message)) return message;
  return `Não consegui concluir "${label}". Os detalhes técnicos foram enviados para Logs.`;
}

type PendingDependencyAction = "install" | "prepare";

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function dependencyInstructions(dependencies: DependencyStatus) {
  if (dependencies.os === "windows") {
    return dependencies.manualInstructions || "Instale as ferramentas indicadas e tente novamente.";
  }

  return (
    dependencies.manualInstructions ||
    "Instale manualmente os pacotes listados. Depois, volte ao launcher e clique em Diagnosticar ou Instalar novamente."
  );
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const [resetOpen, setResetOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restorePath, setRestorePath] = useState("");
  const [dependencyPrompt, setDependencyPrompt] = useState<DependencyStatus | null>(null);
  const [pendingDependencyAction, setPendingDependencyAction] = useState<PendingDependencyAction | null>(null);

  const isBusy = busy !== null;

  const setStep = (id: string, state: ProgressStep["state"]) => {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, state } : step)));
  };

  const diagnose = async () => {
    setBusy("diagnose");
    setError("");
    try {
      const nextStatus = await doctor();
      setStatus(nextStatus);
      return nextStatus;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void diagnose();
  }, []);

  const runAction = async (label: string, action: () => Promise<CommandOutput | string | void>) => {
    setBusy(label);
    setError("");
    try {
      const output = await action();
      if (output) setLogs((current) => appendOutput(current, label, output));
      await diagnose();
    } catch (err) {
      setLogs((current) => appendOutput(current, `Erro em ${label}`, errorMessage(err)));
      setError(friendlyActionError(label, err));
    } finally {
      setBusy(null);
    }
  };

  const checkDependenciesBefore = async (nextAction: PendingDependencyAction) => {
    const dependencies = await checkSystemDependencies();
    if (dependencies.missing.length === 0) return true;

    setPendingDependencyAction(nextAction);
    setDependencyPrompt(dependencies);
    return false;
  };

  const runProjectInstall = async () => {
    const projectOutput = await installProject();
    setLogs((current) => appendOutput(current, "Instalar/atualizar M&G Pocket", projectOutput));
  };

  const installOrUpdateProject = async () => {
    setBusy("Instalar/Atualizar");
    setError("");
    try {
      if (!(await checkDependenciesBefore("install"))) return;
      await runProjectInstall();
      await diagnose();
    } catch (err) {
      setLogs((current) => appendOutput(current, "Erro ao instalar/atualizar M&G Pocket", errorMessage(err)));
      setError(friendlyActionError("Instalar/Atualizar M&G Pocket", err));
    } finally {
      setBusy(null);
    }
  };

  const prepareEnvironment = async () => {
    setBusy("prepare");
    setError("");
    setLogs("");
    setSteps(initialSteps.map((step) => ({ ...step, state: "pending" })));

    try {
      setStep("doctor", "running");
      let currentStatus = await doctor();
      setStatus(currentStatus);
      setStep("doctor", "done");

      if (!(await checkDependenciesBefore("prepare"))) return;

      setStep("docker", "running");
      if (!currentStatus.dockerInstalled) {
        if (currentStatus.os === "linux" && currentStatus.supported) {
          const output = await installDockerLinux();
          setLogs((current) => appendOutput(current, "Instalar Docker", output));
        } else if (currentStatus.os === "windows") {
          throw new Error("No Windows, instale o Docker Desktop antes de continuar.");
        } else {
          throw new Error("Esta distribuição ainda não é suportada pelo instalador automático. Instale o Docker manualmente e depois volte para o launcher.");
        }
      }
      const runningOutput = await ensureDockerRunning();
      setLogs((current) => appendOutput(current, "Iniciar Docker", runningOutput));
      setStep("docker", "done");

      setStep("permission", "running");
      const permissionOutput = await ensureDockerPermission();
      setLogs((current) => appendOutput(current, "Permissão Docker", permissionOutput));
      setStep("permission", "done");

      setStep("project", "running");
      await runProjectInstall();
      setStep("project", "done");

      setStep("online", "running");
      currentStatus = await doctor();
      setStatus(currentStatus);
      if (!currentStatus.appOnline) {
        throw new Error("O app ainda não respondeu em http://localhost:3000. Veja os logs para detalhes.");
      }
      setStep("online", "done");
    } catch (err) {
      setSteps((current) => current.map((step) => (step.state === "running" ? { ...step, state: "error" } : step)));
      setLogs((current) => appendOutput(current, "Erro ao preparar ambiente", errorMessage(err)));
      setError(friendlyActionError("Preparar ambiente", err));
    } finally {
      setBusy(null);
    }
  };

  const loadLogs = async () => {
    await runAction("Logs", async () => {
      const output = await readLogs();
      setLogs(output);
      return undefined;
    });
  };

  const resetData = async () => {
    setResetOpen(false);
    await runAction("Resetar dados locais", resetLocalData);
  };

  const restoreData = async () => {
    const backupPath = window.prompt("Caminho do backup .tar.gz");
    if (!backupPath) return;
    setRestorePath(backupPath);
    setRestoreOpen(true);
  };

  const confirmRestore = async () => {
    setRestoreOpen(false);
    await runAction("Restaurar backup", () => restoreBackup(restorePath));
  };

  const closeDependencyPrompt = () => {
    setDependencyPrompt(null);
    setPendingDependencyAction(null);
  };

  const confirmDependencyInstall = async () => {
    if (!dependencyPrompt?.installable) {
      closeDependencyPrompt();
      return;
    }

    const nextAction = pendingDependencyAction;
    setDependencyPrompt(null);
    setPendingDependencyAction(null);
    setBusy("dependências");
    setError("");

    try {
      const output = await installSystemDependencies();
      setLogs((current) => appendOutput(current, "Instalar dependências do sistema", output));

      const dependencies = await checkSystemDependencies();
      if (dependencies.missing.length > 0) {
        setDependencyPrompt(dependencies);
        setPendingDependencyAction(nextAction);
        setError("Ainda há dependências ausentes. Confira a lista exibida pelo launcher antes de tentar instalar novamente.");
        return;
      }

      if (nextAction === "prepare") {
        await prepareEnvironment();
      } else if (nextAction === "install") {
        await installOrUpdateProject();
      } else {
        await diagnose();
      }
    } catch (err) {
      setLogs((current) => appendOutput(current, "Erro ao instalar dependências do sistema", String(err)));
      setError("Não consegui instalar as dependências automaticamente. Veja os detalhes em Ver Logs e tente a instalação manual.");
    } finally {
      setBusy(null);
    }
  };

  const statusItems = useMemo(() => {
    const empty: StatusItem[] = [{ label: "Status", value: "carregando", tone: "idle" }];
    if (!status) return { environment: empty, docker: empty, project: empty };

    const environment: StatusItem[] = [
      { label: "Sistema", value: friendlyOs(status.os), tone: status.os === "unknown" ? "warn" : "ok" },
      { label: "Distro", value: status.distroName || "não aplicável", tone: status.os === "linux" ? "ok" : "idle" },
      { label: "Suporte automático", value: boolLabel(status.supported), tone: status.supported ? "ok" : "warn" },
    ];

    const docker: StatusItem[] = [
      { label: "Docker instalado", value: boolLabel(status.dockerInstalled), tone: tone(status.dockerInstalled) },
      { label: "Docker rodando", value: boolLabel(status.dockerRunning), tone: tone(status.dockerRunning) },
      { label: "Docker Compose", value: boolLabel(status.dockerComposeInstalled), tone: tone(status.dockerComposeInstalled) },
      {
        label: "Permissão",
        value: status.dockerPermissionOk ? "ok" : status.sudoDockerWorks ? "usando sudo" : "bloqueada",
        tone: status.dockerPermissionOk ? "ok" : status.sudoDockerWorks ? "warn" : "bad",
      },
    ];

    const project: StatusItem[] = [
      { label: "Projeto instalado", value: boolLabel(status.projectInstalled), tone: tone(status.projectInstalled) },
      { label: "Versão local", value: status.projectVersion || "desconhecida", tone: "idle" },
      { label: "Site", value: status.appOnline ? "online" : "offline", tone: tone(status.appOnline) },
      { label: "Adminer", value: status.adminerOnline ? "online" : "offline", tone: status.adminerOnline ? "ok" : "warn" },
    ];

    return { environment, docker, project };
  }, [status]);

  const showLinuxInstallDocker = status?.os === "linux" && status.supported && !status.dockerInstalled;
  const showWindowsDockerGuide = status?.os === "windows" && !status.dockerInstalled;

  return (
    <AppShell>
      <section className="hero-band">
        <div>
          <p className="eyebrow">grimório local</p>
          <h2>Prepare e controle o M&G Pocket neste computador</h2>
          <p>
            Diagnóstico, Docker, projeto local, logs e backups em uma única janela.
          </p>
        </div>
        <ActionButton
          icon={<Wrench size={18} />}
          loading={busy === "prepare"}
          disabled={isBusy}
          onClick={prepareEnvironment}
          variant="primary"
        >
          Preparar ambiente
        </ActionButton>
      </section>

      {error ? <div className="message message--error">{error}</div> : null}
      {status?.requiresRelogin ? (
        <div className="message message--warn">
          O usuário foi ajustado para o grupo docker. Talvez seja necessário sair e entrar novamente na sessão; esta primeira execução pode continuar usando sudo.
        </div>
      ) : null}
      {showWindowsDockerGuide ? (
        <div className="message message--warn">
          No Windows, instale o Docker Desktop antes de continuar.
          <button type="button" onClick={() => void openDockerGuide()}>
            Abrir página de download do Docker Desktop
          </button>
        </div>
      ) : null}

      <div className="status-grid">
        <StatusCard title="Ambiente" icon={<ShieldCheck size={20} />} items={statusItems.environment} />
        <StatusCard title="Docker" icon={<HardDrive size={20} />} items={statusItems.docker} />
        <StatusCard title="Projeto" icon={<BookOpen size={20} />} items={statusItems.project} />
      </div>

      <StepProgress steps={steps} />

      <section className="actions-panel" aria-label="Ações principais">
        {showLinuxInstallDocker ? (
          <ActionButton
            icon={<HardDrive size={18} />}
            disabled={isBusy}
            loading={busy === "Instalar Docker"}
            onClick={() => runAction("Instalar Docker", installDockerLinux)}
          >
            Instalar Docker no Linux
          </ActionButton>
        ) : null}
        <ActionButton icon={<RefreshCw size={18} />} disabled={isBusy} loading={busy === "diagnose"} onClick={diagnose}>
          Diagnosticar
        </ActionButton>
        <ActionButton
          icon={<Database size={18} />}
          disabled={isBusy}
          loading={busy === "Instalar/Atualizar"}
          onClick={installOrUpdateProject}
        >
          Instalar/Atualizar M&G Pocket
        </ActionButton>
        <ActionButton icon={<Play size={18} />} disabled={isBusy} onClick={() => runAction("Iniciar", startApp)}>
          Iniciar M&G Pocket
        </ActionButton>
        <ActionButton icon={<Square size={18} />} disabled={isBusy} onClick={() => runAction("Parar", stopApp)}>
          Parar
        </ActionButton>
        <ActionButton icon={<RotateCcw size={18} />} disabled={isBusy} onClick={() => runAction("Reiniciar", restartApp)}>
          Reiniciar
        </ActionButton>
        <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy || !status?.appOnline} onClick={() => void openSite()}>
          Abrir Site
        </ActionButton>
        <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy || !status?.adminerOnline} onClick={() => void openAdminer()}>
          Abrir Adminer
        </ActionButton>
        <ActionButton icon={<ScrollText size={18} />} disabled={isBusy} onClick={loadLogs}>
          Ver Logs
        </ActionButton>
        <ActionButton icon={<Archive size={18} />} disabled={isBusy} onClick={() => runAction("Backup", backup)}>
          Backup
        </ActionButton>
        <ActionButton icon={<Archive size={18} />} disabled={isBusy} onClick={restoreData}>
          Restaurar Backup
        </ActionButton>
        <ActionButton icon={<Trash2 size={18} />} disabled={isBusy} variant="danger" onClick={() => setResetOpen(true)}>
          Resetar Dados Locais
        </ActionButton>
      </section>

      <LogPanel logs={logs} onRefresh={loadLogs} loading={busy === "Logs"} />

      <ConfirmDialog
        open={resetOpen}
        title="Resetar dados locais"
        description="Esta ação apaga banco e storage locais do M&G Pocket neste computador. Um backup será tentado antes do reset."
        confirmationText="RESETAR"
        confirmLabel="Resetar"
        onCancel={() => setResetOpen(false)}
        onConfirm={resetData}
      />
      <ConfirmDialog
        open={restoreOpen}
        title="Restaurar backup"
        description={`Esta ação substituirá os dados locais atuais pelo backup: ${restorePath}`}
        confirmationText="RESTAURAR"
        confirmLabel="Restaurar"
        onCancel={() => setRestoreOpen(false)}
        onConfirm={confirmRestore}
      />
      <ConfirmDialog
        open={dependencyPrompt !== null}
        title="Dependências necessárias"
        description={
          dependencyPrompt ? (
            <>
              <p>Algumas dependências precisam ser instaladas para continuar.</p>
              <p>
                O launcher encontrou pacotes ausentes no seu sistema e precisa desses componentes antes de preparar o
                M&G Pocket.
              </p>
              <p>Dependências detectadas:</p>
              <ul>
                {unique(dependencyPrompt.missing).map((dependency) => (
                  <li key={dependency}>{dependency}</li>
                ))}
              </ul>
              {dependencyPrompt.installable ? (
                <>
                  <p>Deseja instalar automaticamente agora?</p>
                  {dependencyPrompt.sudoRequired ? <p>Essa instalação pode pedir sua senha de administrador.</p> : null}
                  {dependencyPrompt.installCommand ? <code>{dependencyPrompt.installCommand}</code> : null}
                </>
              ) : dependencyPrompt.os === "windows" ? (
                <p>{dependencyInstructions(dependencyPrompt)}</p>
              ) : (
                <>
                  <p>Não consegui identificar uma forma segura de instalar automaticamente nesta distribuição.</p>
                  <p>{dependencyInstructions(dependencyPrompt)}</p>
                  {dependencyPrompt.packages.length > 0 ? (
                    <>
                      <p>Pacotes sugeridos:</p>
                      <ul>
                        {unique(dependencyPrompt.packages).map((dependency) => (
                          <li key={dependency}>{dependency}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              )}
            </>
          ) : (
            ""
          )
        }
        confirmLabel={dependencyPrompt?.installable ? "Instalar dependências" : "Entendi"}
        cancelLabel={dependencyPrompt?.installable ? "Agora não" : "Fechar"}
        onCancel={closeDependencyPrompt}
        onConfirm={confirmDependencyInstall}
      />
    </AppShell>
  );
}
