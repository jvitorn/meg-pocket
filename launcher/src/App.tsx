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
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  backup,
  checkSystemDependencies,
  doctor,
  ensureDockerPermission,
  ensureDockerRunning,
  installDockerLinux,
  installProject,
  installSystemDependencies,
  launcherJobEvents,
  listenLauncherJobEvent,
  type LauncherJobEventName,
  openAdminer,
  openDockerGuide,
  openSite,
  readLogs,
  removeLocalProject,
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
import type {
  CommandOutput,
  DependencyStatus,
  JobStatus,
  LauncherJobEvent,
  ProgressStep,
  SystemStatus,
} from "./types";

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

function appendLogLine(current: string, event: LauncherJobEvent) {
  const text = event.message.trim();
  if (!text || event.action === "Ler logs") return current;
  const prefix = event.level === "stderr" || event.level === "error" ? "erro" : "log";
  return `${current}${current ? "\n" : ""}[${event.action}][${prefix}] ${text}`;
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
  if (message.includes("O Windows informou que um arquivo ainda está em uso")) return message;
  if (isFriendlyError(message)) return message;
  return `Não consegui concluir "${label}". Os detalhes técnicos foram enviados para Logs.`;
}

function progressCopy(busy: string | null) {
  switch (busy) {
    case "prepare":
      return {
        title: "Preparando ambiente",
        detail: "Validando Docker, permissões, banco de dados e aplicação.",
        step: "Iniciando",
        progress: 5,
      };
    case "Instalar/Atualizar":
      return {
        title: "Instalando ou atualizando",
        detail: "Baixando arquivos, preparando containers e aplicando banco de dados.",
        step: "Iniciando",
        progress: 5,
      };
    case "dependências":
      return {
        title: "Instalando dependências",
        detail: "Aguardando o gerenciador de pacotes concluir a instalação.",
        step: "Instalando",
        progress: 20,
      };
    case "diagnose":
      return {
        title: "Diagnosticando",
        detail: "Lendo o estado do sistema e dos containers locais.",
        step: "Diagnóstico",
        progress: 10,
      };
    case "Logs":
      return {
        title: "Carregando logs",
        detail: "Buscando as últimas mensagens dos containers.",
        step: "Logs",
        progress: 10,
      };
    case null:
      return null;
    default:
      return {
        title: `Processando ${busy}`,
        detail: "Aguarde enquanto o launcher conclui esta ação.",
        step: "Executando",
        progress: 10,
      };
  }
}

type PendingDependencyAction = "install" | "prepare";
type AdminAction = "prepare" | "install-docker" | "dependency-install";
type DockerPermissionResumeAction = PendingDependencyAction | null;

const LOG_UI_LINE_LIMIT = 300;
const LOG_BUFFER_LINE_LIMIT = 1600;

function limitLogText(text: string, maxLines = LOG_UI_LINE_LIMIT) {
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return text;
  return lines.slice(-maxLines).join("\n");
}

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

function needsDockerPermissionDecision(status: SystemStatus | null, sudoDockerThisSession: boolean) {
  return Boolean(
    status?.os === "linux" &&
      !status.dockerPermissionOk &&
      status.sudoDockerWorks &&
      status.requiresRelogin &&
      !sudoDockerThisSession,
  );
}

function adminCommandsForPrepare(status: SystemStatus | null) {
  const commands: string[] = [];
  if (!status) return commands;

  if (status.os === "linux" && status.supported) {
    if (!status.dockerInstalled) commands.push("Instalar Docker e Docker Compose pela distribuição detectada");
    if (!status.dockerRunning) commands.push("Iniciar e habilitar o serviço docker");
    if (!status.dockerPermissionOk) commands.push("Adicionar seu usuário ao grupo docker, quando necessário");
  }

  return commands;
}

function dependencyCommandList(dependencies: DependencyStatus | null) {
  if (!dependencies) return [];
  if (dependencies.commands?.length) return dependencies.commands;
  if (dependencies.installCommand) return dependencies.installCommand.split(/\r?\n/).filter(Boolean);
  return dependencies.packages.map((name) => `Instalar ${name}`);
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState("");
  const logBufferRef = useRef("");
  const logFlushTimerRef = useRef<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobEvent, setJobEvent] = useState<LauncherJobEvent | null>(null);
  const [recentJobLogs, setRecentJobLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const [resetOpen, setResetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<"safe" | "complete" | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restorePath, setRestorePath] = useState("");
  const [dependencyPrompt, setDependencyPrompt] = useState<DependencyStatus | null>(null);
  const [pendingDependencyAction, setPendingDependencyAction] = useState<PendingDependencyAction | null>(null);
  const [dependencyShowCommands, setDependencyShowCommands] = useState(false);
  const [sudoDockerThisSession, setSudoDockerThisSession] = useState(false);
  const [dockerPermissionPrompt, setDockerPermissionPrompt] = useState<{
    resumeAction: DockerPermissionResumeAction;
  } | null>(null);
  const [dockerPermissionPromptDismissed, setDockerPermissionPromptDismissed] = useState(false);
  const [adminPrompt, setAdminPrompt] = useState<{
    action: AdminAction;
    title: string;
    description: ReactNode;
    commands: string[];
  } | null>(null);
  const [adminShowDetails, setAdminShowDetails] = useState(false);

  const isBusy = busy !== null || jobStatus === "running";
  const dockerOptions = useMemo(() => ({ useSudoDocker: sudoDockerThisSession }), [sudoDockerThisSession]);

  const setStep = (id: string, state: ProgressStep["state"]) => {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, state } : step)));
  };

  const flushLogBuffer = () => {
    logFlushTimerRef.current = null;
    setLogs(limitLogText(logBufferRef.current));
  };

  const scheduleLogFlush = () => {
    if (logFlushTimerRef.current !== null) return;
    logFlushTimerRef.current = window.setTimeout(flushLogBuffer, 250);
  };

  const updateLogBuffer = (updater: (current: string) => string, immediate = false) => {
    logBufferRef.current = limitLogText(updater(logBufferRef.current), LOG_BUFFER_LINE_LIMIT);
    if (immediate) {
      if (logFlushTimerRef.current !== null) {
        window.clearTimeout(logFlushTimerRef.current);
        logFlushTimerRef.current = null;
      }
      flushLogBuffer();
    } else {
      scheduleLogFlush();
    }
  };

  const replaceLogs = (text: string) => {
    logBufferRef.current = limitLogText(text, LOG_BUFFER_LINE_LIMIT);
    setLogs(limitLogText(logBufferRef.current));
  };

  useEffect(() => {
    let disposed = false;
    let unlisten: Array<() => void> = [];

    const handleJobEvent = (payload: LauncherJobEvent, eventName: LauncherJobEventName) => {
      if (eventName === "launcher://job-started") {
        setJobEvent(payload);
        setJobStatus("running");
        setRecentJobLogs([]);
        return;
      }

      if (eventName === "launcher://job-progress") {
        setJobEvent(payload);
        setJobStatus("running");
        return;
      }

      if (eventName === "launcher://job-log") {
        updateLogBuffer((current) => appendLogLine(current, payload));
        if (payload.action !== "Ler logs" && payload.message.trim()) {
          setRecentJobLogs((current) => [...current, payload.message.trim()].slice(-4));
        }
        return;
      }

      if (eventName === "launcher://job-error") {
        setJobEvent(payload);
        setJobStatus("error");
        updateLogBuffer((current) => appendLogLine(current, payload), true);
        return;
      }

      if (eventName === "launcher://job-finished") {
        setJobEvent(payload);
        setJobStatus(payload.level === "error" ? "error" : "success");
      }
    };

    void Promise.all(launcherJobEvents.map((eventName) => listenLauncherJobEvent(eventName, handleJobEvent))).then(
      (subscriptions) => {
        if (disposed) {
          subscriptions.forEach((unsubscribe) => unsubscribe());
        } else {
          unlisten = subscriptions;
        }
      },
    );

    return () => {
      disposed = true;
      if (logFlushTimerRef.current !== null) {
        window.clearTimeout(logFlushTimerRef.current);
      }
      unlisten.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const diagnose = async () => {
    setBusy("diagnose");
    setJobStatus("idle");
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

  useEffect(() => {
    if (isBusy || dockerPermissionPromptDismissed || dockerPermissionPrompt) return;
    if (needsDockerPermissionDecision(status, sudoDockerThisSession)) {
      setDockerPermissionPrompt({ resumeAction: null });
    }
  }, [dockerPermissionPrompt, dockerPermissionPromptDismissed, isBusy, status, sudoDockerThisSession]);

  const runAction = async (label: string, action: () => Promise<CommandOutput | string | void>) => {
    if (isBusy) return;
    setBusy(label);
    setJobStatus("idle");
    setError("");
    setNotice("");
    try {
      const output = await action();
      if (typeof output === "string") updateLogBuffer((current) => appendOutput(current, label, output), true);
      await diagnose();
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, `Erro em ${label}`, errorMessage(err)), true);
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
    setDependencyShowCommands(false);
    return false;
  };

  const requestDockerPermissionDecision = (
    resumeAction: DockerPermissionResumeAction,
    nextStatus: SystemStatus | null = status,
  ) => {
    if (!needsDockerPermissionDecision(nextStatus, sudoDockerThisSession)) return false;
    setDockerPermissionPrompt({ resumeAction });
    return true;
  };

  const requestAdminPermission = (action: AdminAction, commands: string[], description?: ReactNode) => {
    setAdminShowDetails(false);
    setAdminPrompt({
      action,
      title: "Permissão administrativa necessária",
      description:
        description || (
          <>
            <p>O M&G Pocket Launcher precisa de permissão administrativa para preparar este computador.</p>
            <p>Ações que podem ser executadas:</p>
            <ul>
              <li>instalar dependências ausentes;</li>
              <li>configurar Docker;</li>
              <li>iniciar serviços necessários;</li>
              <li>ajustar permissões do usuário.</li>
            </ul>
            <p>Nada será feito sem sua confirmação.</p>
          </>
        ),
      commands,
    });
  };

  const runProjectInstall = async () => {
    await installProject(dockerOptions);
  };

  const installOrUpdateProject = async () => {
    if (isBusy) return;
    setBusy("Instalar/Atualizar");
    setJobStatus("idle");
    setError("");
    setNotice("");
    try {
      if (!(await checkDependenciesBefore("install"))) return;
      const currentStatus = status ?? (await doctor());
      setStatus(currentStatus);
      if (requestDockerPermissionDecision("install", currentStatus)) return;
      await runProjectInstall();
      await diagnose();
    } catch (err) {
      updateLogBuffer(
        (current) => appendOutput(current, "Erro ao instalar/atualizar M&G Pocket", errorMessage(err)),
        true,
      );
      setError(friendlyActionError("Instalar/Atualizar M&G Pocket", err));
    } finally {
      setBusy(null);
    }
  };

  const prepareEnvironment = async (adminApproved = false) => {
    if (isBusy) return;
    if (requestDockerPermissionDecision("prepare", status)) return;

    const adminCommands = adminCommandsForPrepare(status);
    if (!adminApproved && adminCommands.length > 0) {
      requestAdminPermission("prepare", adminCommands);
      return;
    }

    setBusy("prepare");
    setJobStatus("idle");
    setError("");
    setNotice("");
    replaceLogs("");
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
          await installDockerLinux();
        } else if (currentStatus.os === "windows") {
          throw new Error("No Windows, instale o Docker Desktop antes de continuar.");
        } else {
          throw new Error("Esta distribuição ainda não é suportada pelo instalador automático. Instale o Docker manualmente e depois volte para o launcher.");
        }
      }
      await ensureDockerRunning();
      setStep("docker", "done");

      setStep("permission", "running");
      await ensureDockerPermission();
      currentStatus = await doctor();
      setStatus(currentStatus);
      if (requestDockerPermissionDecision("prepare", currentStatus)) {
        setStep("permission", "error");
        return;
      }
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
      updateLogBuffer((current) => appendOutput(current, "Erro ao preparar ambiente", errorMessage(err)), true);
      setError(friendlyActionError("Preparar ambiente", err));
    } finally {
      setBusy(null);
    }
  };

  const loadLogs = async () => {
    if (isBusy && busy !== "Logs") return;
    await runAction("Logs", async () => {
      const output = await readLogs(dockerOptions);
      replaceLogs(output);
      return undefined;
    });
  };

  const resetData = async () => {
    setResetOpen(false);
    await runAction("Resetar dados locais", () => resetLocalData(dockerOptions));
  };

  const removeProject = async () => {
    const mode = removeOpen;
    if (!mode) return;
    setRemoveOpen(null);
    await runAction(mode === "complete" ? "Desinstalar M&G Pocket Local" : "Remover Projeto Local", () =>
      removeLocalProject(mode, dockerOptions),
    );
  };

  const restoreData = async () => {
    const backupPath = window.prompt("Caminho do backup .tar.gz");
    if (!backupPath) return;
    setRestorePath(backupPath);
    setRestoreOpen(true);
  };

  const confirmRestore = async () => {
    setRestoreOpen(false);
    await runAction("Restaurar backup", () => restoreBackup(restorePath, dockerOptions));
  };

  const closeDependencyPrompt = () => {
    setDependencyPrompt(null);
    setPendingDependencyAction(null);
    setDependencyShowCommands(false);
  };

  const runDependencyInstall = async () => {
    const nextAction = pendingDependencyAction;
    setBusy("dependências");
    setJobStatus("idle");
    setError("");
    setNotice("");

    try {
      await installSystemDependencies();
      if (status?.os === "windows") {
        try {
          await ensureDockerRunning();
        } catch (err) {
          updateLogBuffer((current) => appendOutput(current, "Aviso ao aguardar Docker Desktop", errorMessage(err)), true);
        }
      }

      const dependencies = await checkSystemDependencies();
      if (dependencies.missing.length > 0) {
        setDependencyPrompt(dependencies);
        setDependencyShowCommands(false);
        setPendingDependencyAction(nextAction);
        setError("Ainda há dependências ausentes. Confira a lista exibida pelo launcher antes de tentar instalar novamente.");
        return;
      }

      setPendingDependencyAction(null);
      setBusy(null);
      setJobStatus("idle");
      if (nextAction === "prepare") {
        await prepareEnvironment();
      } else if (nextAction === "install") {
        await installOrUpdateProject();
      } else {
        await diagnose();
      }
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, "Erro ao instalar dependências do sistema", String(err)), true);
      setError("Não consegui instalar as dependências automaticamente. Veja os detalhes em Ver Logs e tente a instalação manual.");
    } finally {
      setBusy(null);
    }
  };

  const confirmDependencyInstall = async () => {
    if (!dependencyPrompt?.installable) {
      closeDependencyPrompt();
      return;
    }

    const commands = dependencyCommandList(dependencyPrompt);
    const needsAdmin = dependencyPrompt.sudoRequired || dependencyPrompt.os === "windows";
    setDependencyPrompt(null);

    if (needsAdmin) {
      requestAdminPermission("dependency-install", commands);
      return;
    }

    await runDependencyInstall();
  };

  const confirmAdminPrompt = () => {
    const action = adminPrompt?.action;
    setAdminPrompt(null);
    setAdminShowDetails(false);
    if (!action) return;

    if (action === "prepare") {
      void prepareEnvironment(true);
    } else if (action === "install-docker") {
      void runAction("Instalar Docker", installDockerLinux);
    } else if (action === "dependency-install") {
      void runDependencyInstall();
    }
  };

  const cancelAdminPrompt = () => {
    if (adminPrompt?.action === "dependency-install") {
      setPendingDependencyAction(null);
    }
    setAdminPrompt(null);
    setAdminShowDetails(false);
    setNotice("Operação administrativa cancelada. Nada foi alterado.");
  };

  const continueWithSudoDocker = () => {
    const resumeAction = dockerPermissionPrompt?.resumeAction;
    setSudoDockerThisSession(true);
    setDockerPermissionPromptDismissed(true);
    setDockerPermissionPrompt(null);
    setNotice("Nesta execução, o launcher usará sudo apenas para os comandos Docker necessários.");

    if (resumeAction === "prepare") {
      window.setTimeout(() => void prepareEnvironment(true), 0);
    } else if (resumeAction === "install") {
      window.setTimeout(() => void installOrUpdateProject(), 0);
    }
  };

  const deferRelogin = () => {
    setDockerPermissionPromptDismissed(true);
    setDockerPermissionPrompt(null);
    setJobStatus("idle");
    setBusy(null);
    setNotice(
      "Status: aguardando nova sessão. Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Instalar/Atualizar M&G Pocket.",
    );
  };

  const cancelDockerPermissionFlow = () => {
    setDockerPermissionPromptDismissed(true);
    setDockerPermissionPrompt(null);
    setJobStatus("idle");
    setBusy(null);
    setNotice("Fluxo cancelado. Nada foi executado com sudo.");
  };

  const statusItems = useMemo(() => {
    const empty: StatusItem[] = [{ label: "Status", value: "carregando", tone: "idle" }];
    if (!status) return { environment: empty, docker: empty, project: empty };

    const environment: StatusItem[] = [
      { label: "Sistema", value: friendlyOs(status.os), tone: status.os === "unknown" ? "warn" : "ok" },
      { label: "Distro", value: status.distroName || "não aplicável", tone: status.os === "linux" ? "ok" : "idle" },
      { label: "Suporte automático", value: boolLabel(status.supported), tone: status.supported ? "ok" : "warn" },
    ];

    if (status.os === "windows") {
      environment.push(
        { label: "winget", value: boolLabel(Boolean(status.wingetInstalled)), tone: status.wingetInstalled ? "ok" : "warn" },
        { label: "Git", value: boolLabel(Boolean(status.gitInstalled)), tone: status.gitInstalled ? "ok" : "warn" },
      );
    }

    const docker: StatusItem[] = [
      { label: "Docker instalado", value: boolLabel(status.dockerInstalled), tone: tone(status.dockerInstalled) },
      { label: "Docker rodando", value: boolLabel(status.dockerRunning), tone: tone(status.dockerRunning) },
      { label: "Docker Compose", value: boolLabel(status.dockerComposeInstalled), tone: tone(status.dockerComposeInstalled) },
      {
        label: "Permissão",
        value: status.dockerPermissionOk ? "ok" : sudoDockerThisSession ? "sudo nesta sessão" : status.sudoDockerWorks ? "aguardando sessão" : "bloqueada",
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
  }, [status, sudoDockerThisSession]);

  const showLinuxInstallDocker = status?.os === "linux" && status.supported && !status.dockerInstalled;
  const showWindowsDockerGuide = status?.os === "windows" && !status.dockerInstalled;
  const activeProgress =
    jobStatus === "running" && jobEvent
      ? {
          title: jobEvent.action,
          detail: jobEvent.message || "Operação em andamento.",
          step: jobEvent.step,
          progress: Math.max(0, Math.min(100, jobEvent.progress)),
        }
      : progressCopy(busy);

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
          onClick={() => void prepareEnvironment()}
          variant="primary"
        >
          Preparar ambiente
        </ActionButton>
      </section>

      {error ? <div className="message message--error">{error}</div> : null}
      {notice ? <div className="message message--warn">{notice}</div> : null}
      {status?.requiresRelogin && !sudoDockerThisSession ? (
        <div className="message message--warn">
          Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Instalar/Atualizar M&G Pocket.
        </div>
      ) : null}
      {showWindowsDockerGuide ? (
        <div className="message message--warn">
          No Windows, o launcher pode instalar Docker Desktop via winget quando disponível, ou você pode abrir a página oficial.
          <button type="button" onClick={() => void openDockerGuide()}>
            Abrir página de download do Docker Desktop
          </button>
        </div>
      ) : null}
      {activeProgress ? (
        <section className="operation-progress" role="status" aria-live="polite">
          <div>
            <strong>{activeProgress.title}</strong>
            <span>{activeProgress.step ? `${activeProgress.step}: ${activeProgress.detail}` : activeProgress.detail}</span>
          </div>
          <div
            className="operation-progress__track"
            role="progressbar"
            aria-label={`Progresso ${activeProgress.progress}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={activeProgress.progress}
          >
            <span style={{ width: `${activeProgress.progress}%` }} />
          </div>
          {recentJobLogs.length > 0 ? (
            <ul className="operation-progress__logs">
              {recentJobLogs.map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
            </ul>
          ) : null}
        </section>
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
            onClick={() =>
              requestAdminPermission("install-docker", [
                "Instalar Docker e Docker Compose",
                "Iniciar o serviço docker",
                "Adicionar seu usuário ao grupo docker, quando necessário",
              ])
            }
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
        <ActionButton icon={<Play size={18} />} disabled={isBusy} onClick={() => runAction("Iniciar", () => startApp(dockerOptions))}>
          Iniciar M&G Pocket
        </ActionButton>
        <ActionButton icon={<Square size={18} />} disabled={isBusy} onClick={() => runAction("Parar", () => stopApp(dockerOptions))}>
          Parar
        </ActionButton>
        <ActionButton icon={<RotateCcw size={18} />} disabled={isBusy} onClick={() => runAction("Reiniciar", () => restartApp(dockerOptions))}>
          Reiniciar
        </ActionButton>
        <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy || !status?.appOnline} onClick={() => void openSite()}>
          Abrir Site
        </ActionButton>
        <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy || !status?.adminerOnline} onClick={() => void openAdminer()}>
          Abrir Adminer
        </ActionButton>
        <ActionButton icon={<ScrollText size={18} />} disabled={busy === "Logs"} loading={busy === "Logs"} onClick={loadLogs}>
          Ver Logs
        </ActionButton>
        <ActionButton icon={<Archive size={18} />} disabled={isBusy} onClick={() => runAction("Backup", () => backup(dockerOptions))}>
          Backup
        </ActionButton>
        <ActionButton icon={<Archive size={18} />} disabled={isBusy} onClick={restoreData}>
          Restaurar Backup
        </ActionButton>
        <ActionButton icon={<Trash2 size={18} />} disabled={isBusy} variant="danger" onClick={() => setResetOpen(true)}>
          Resetar Dados Locais
        </ActionButton>
        <ActionButton icon={<Trash2 size={18} />} disabled={isBusy} variant="ghost" onClick={() => setRemoveOpen("safe")}>
          Remover Projeto Local
        </ActionButton>
        <ActionButton icon={<Trash2 size={18} />} disabled={isBusy} variant="danger" onClick={() => setRemoveOpen("complete")}>
          Desinstalar M&G Pocket Local
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
        open={removeOpen !== null}
        title={removeOpen === "complete" ? "Desinstalar M&G Pocket Local" : "Remover Projeto Local"}
        description={
          removeOpen === "complete" ? (
            <>
              <p>Esta ação para os containers, remove containers, volumes e redes do projeto e apaga a pasta local.</p>
              <p>Docker, Git, winget e dependências globais não serão removidos.</p>
            </>
          ) : (
            <>
              <p>Esta ação para os containers e apaga a pasta local do projeto.</p>
              <p>Volumes Docker, dados externos e backups serão preservados quando possível.</p>
            </>
          )
        }
        confirmationText={removeOpen === "complete" ? "REMOVER" : undefined}
        confirmLabel={removeOpen === "complete" ? "Desinstalar" : "Remover"}
        cancelLabel="Cancelar"
        onCancel={() => setRemoveOpen(null)}
        onConfirm={removeProject}
      />
      <ConfirmDialog
        open={dependencyPrompt !== null}
        title={dependencyPrompt?.os === "windows" ? "Dependências ausentes encontradas" : "Dependências necessárias"}
        description={
          dependencyPrompt ? (
            <>
              {dependencyPrompt.os === "windows" ? (
                <p>O launcher pode instalar automaticamente as dependências ausentes encontradas.</p>
              ) : (
                <p>Algumas dependências precisam ser instaladas para continuar.</p>
              )}
              <p>Dependências detectadas:</p>
              <ul>
                {unique(dependencyPrompt.missing).map((dependency) => (
                  <li key={dependency}>{dependency}</li>
                ))}
              </ul>
              {dependencyPrompt.installable ? (
                <>
                  {dependencyPrompt.os === "windows" ? (
                    <p>Isso pode abrir uma permissão do Windows e pode exigir reiniciar o computador.</p>
                  ) : (
                    <p>Deseja instalar automaticamente agora?</p>
                  )}
                  {dependencyPrompt.sudoRequired ? <p>Essa instalação pode pedir sua senha pelo mecanismo do sistema.</p> : null}
                  {dependencyShowCommands && dependencyCommandList(dependencyPrompt).length > 0 ? (
                    <>
                      <p>Comandos planejados:</p>
                      <ul>
                        {dependencyCommandList(dependencyPrompt).map((command) => (
                          <li key={command}>
                            <code>{command}</code>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
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
        confirmVariant="primary"
        extraActions={
          dependencyPrompt?.installable && dependencyCommandList(dependencyPrompt).length > 0
            ? [
                {
                  label: dependencyShowCommands ? "Ocultar comandos" : "Ver comandos",
                  onClick: () => setDependencyShowCommands((current) => !current),
                },
              ]
            : []
        }
        onCancel={closeDependencyPrompt}
        onConfirm={confirmDependencyInstall}
      />
      <ConfirmDialog
        open={adminPrompt !== null}
        title={adminPrompt?.title || "Permissão administrativa necessária"}
        description={
          adminPrompt ? (
            <>
              {adminPrompt.description}
              {adminShowDetails && adminPrompt.commands.length > 0 ? (
                <>
                  <p>Comandos planejados:</p>
                  <ul>
                    {adminPrompt.commands.map((command) => (
                      <li key={command}>{command}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Continuar"
        cancelLabel="Cancelar"
        confirmVariant="primary"
        extraActions={[
          {
            label: adminShowDetails ? "Ocultar detalhes" : "Ver detalhes",
            onClick: () => setAdminShowDetails((current) => !current),
          },
        ]}
        onCancel={cancelAdminPrompt}
        onConfirm={confirmAdminPrompt}
      />
      <ConfirmDialog
        open={dockerPermissionPrompt !== null}
        title="Permissão do Docker ainda não está ativa"
        description={
          <>
            <p>O Docker foi configurado e seu usuário foi adicionado ao grupo docker.</p>
            <p>No Linux, essa permissão só é aplicada depois que você sai e entra novamente na sessão do sistema.</p>
            <p>Você pode:</p>
            <ol>
              <li>Sair da sessão agora, entrar novamente e abrir o launcher outra vez.</li>
              <li>Continuar temporariamente usando sudo nesta sessão.</li>
            </ol>
          </>
        }
        confirmLabel="Continuar"
        onCancel={cancelDockerPermissionFlow}
        onConfirm={continueWithSudoDocker}
        actions={[
          { label: "Sair e entrar depois", onClick: deferRelogin, variant: "primary" },
          { label: "Continuar com sudo nesta sessão", onClick: continueWithSudoDocker },
          { label: "Ver Logs", onClick: () => void loadLogs() },
          { label: "Cancelar", onClick: cancelDockerPermissionFlow },
        ]}
      />
    </AppShell>
  );
}
