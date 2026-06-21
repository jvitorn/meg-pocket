import {
  Activity,
  Archive,
  BookOpen,
  ExternalLink,
  FolderOpen,
  HardDrive,
  HelpCircle,
  Play,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldCheck,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  backup,
  cancelCurrentJob,
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
  openBackupsFolder,
  openDataFolder,
  openDockerGuide,
  openLogsFolder,
  openSite,
  quickDiagnose,
  readLogs,
  removeLocalProject,
  repairInstallation,
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

const preparationStepTemplates: ProgressStep[] = [
  { id: "diagnostico", title: "Diagnóstico", status: "pending", progress: 0, message: "Aguardando diagnóstico." },
  { id: "runtime", title: "Runtime", status: "pending", progress: 0, message: "Aguardando runtime." },
  { id: "bancoLocal", title: "Banco local", status: "pending", progress: 0, message: "Aguardando banco local." },
  { id: "sistema", title: "Sistema", status: "pending", progress: 0, message: "Aguardando sistema." },
  { id: "acesso", title: "Acesso", status: "pending", progress: 0, message: "Aguardando sistema." },
];

const initialSteps: ProgressStep[] = createInitialSteps();

const FIRST_STEPS_STORAGE_KEY = "mg-pocket-launcher-hide-first-steps";

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

function createInitialSteps() {
  return preparationStepTemplates.map((step) => ({ ...step }));
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
        detail: "Baixando a versão pronta, configurando os dados iniciais e validando o acesso.",
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
        detail: "Verificando se o computador está pronto para abrir o M&G Pocket.",
        step: "Diagnóstico",
        progress: 10,
      };
    case "Logs":
      return {
        title: "Carregando detalhes técnicos",
        detail: "Buscando as últimas mensagens técnicas.",
        step: "Detalhes",
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

const LOG_UI_LINE_LIMIT = 50;
const LOG_BUFFER_LINE_LIMIT = 1600;

function limitLogText(text: string, maxLines = LOG_UI_LINE_LIMIT) {
  const lines = text.split(/\r?\n/);
  if (lines.length <= maxLines) return text;
  return lines.slice(-maxLines).join("\n");
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatTransferDetail(event: LauncherJobEvent): string | null {
  if (event.transferredBytes !== undefined && event.transferredBytes > 0) {
    const transferred = (event.transferredBytes / 1_048_576).toFixed(1);
    const total = event.totalBytes !== undefined ? ` de ${(event.totalBytes / 1_048_576).toFixed(1)} MB` : "";
    const speed =
      event.bytesPerSecond && event.bytesPerSecond > 0
        ? ` — ${(event.bytesPerSecond / 1_048_576).toFixed(1)} MB/s`
        : "";
    return `${transferred} MB${total}${speed}`;
  }
  if (event.filesProcessed !== undefined && event.totalFiles !== undefined && event.totalFiles > 0) {
    return `${event.filesProcessed.toLocaleString("pt-BR")} de ${event.totalFiles.toLocaleString("pt-BR")} arquivos`;
  }
  return null;
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

function hasDependency(dependencies: DependencyStatus, name: string) {
  const needle = name.toLocaleLowerCase();
  return dependencies.missing.some((dependency) => dependency.toLocaleLowerCase().includes(needle));
}

function localJobEvent(
  action: string,
  status: Exclude<JobStatus, "idle" | "running">,
  message: string,
  progress = status === "success" || status === "error" ? 100 : 0,
): LauncherJobEvent {
  return {
    job_id: `local-${Date.now()}`,
    action,
    step: status === "success" ? "Finalizado" : status === "cancelled" ? "Cancelado" : "Erro",
    message,
    progress,
    level: status,
    status,
  };
}

function isEventCancelled(errorKind?: string) {
  return errorKind === "cancelled_by_user";
}

function launcherStatusLabel(status: SystemStatus | null, jobStatus: JobStatus, isBusy: boolean, error: string) {
  if (error || jobStatus === "error") return "Erro";
  if (isBusy || jobStatus === "running") return "Iniciando";
  if (status?.appOnline) return "Pronto";
  if (status?.projectInstalled) return "Parado";
  return "Parado";
}

function primaryActionLabel(status: SystemStatus | null) {
  if (status?.appOnline) return "Abrir M&G Pocket";
  if (status?.projectInstalled) return "Iniciar M&G Pocket";
  return "Preparar M&G Pocket";
}

const preparationStepOrder = ["diagnostico", "runtime", "bancoLocal", "sistema", "acesso"];

function stepIndex(id: string) {
  const index = preparationStepOrder.indexOf(id);
  return index >= 0 ? index : 0;
}

function stepTemplate(id: string) {
  return preparationStepTemplates.find((step) => step.id === id) || preparationStepTemplates[0];
}

function normalizeIncomingSteps(steps: LauncherJobEvent["steps"]): ProgressStep[] {
  if (!steps?.length) return [];
  return steps.map((step) => {
    const template = stepTemplate(step.id);
    return {
      ...template,
      ...step,
      title: step.title || template.title,
      status: step.status || "pending",
      progress: Math.max(0, Math.min(100, step.progress || 0)),
      message: step.message || template.message,
    };
  });
}

function mergePreparationSteps(current: ProgressStep[], incoming: ProgressStep[]) {
  if (!incoming.length) return current;
  return preparationStepTemplates.map((template) => {
    const currentStep = current.find((step) => step.id === template.id) || template;
    const incomingStep = incoming.find((step) => step.id === template.id);
    if (!incomingStep) return currentStep;
    if (currentStep.status === "success" && incomingStep.status === "pending") return currentStep;
    if (
      currentStep.status === "success" &&
      incomingStep.status === "running" &&
      incomingStep.id === "diagnostico" &&
      incomingStep.progress <= 10
    ) {
      return currentStep;
    }
    return { ...currentStep, ...incomingStep };
  });
}

function stepStatusFromEvent(eventName: LauncherJobEventName, payload: LauncherJobEvent): ProgressStep["status"] {
  if (eventName === "launcher://job-finished") {
    if (payload.level === "error" || payload.status === "error") return "error";
    if (payload.level === "cancelled" || payload.status === "cancelled") return "cancelled";
    return "success";
  }
  if (eventName === "launcher://job-error") return "error";
  return "running";
}

function stepIdFromLegacyEvent(payload: LauncherJobEvent): ProgressStep["id"] {
  const text = `${payload.step} ${payload.message}`.toLocaleLowerCase();
  if (text.includes("diagn")) return "diagnostico";
  if (
    text.includes("banco") ||
    text.includes("postgres") ||
    text.includes("initdb") ||
    text.includes("psql") ||
    text.includes("migration") ||
    text.includes("seed") ||
    text.includes("meg_pocket")
  ) {
    return "bancoLocal";
  }
  if (text.includes("acesso") || text.includes("health") || text.includes("upload")) return "acesso";
  if (text.includes("sistema") || text.includes("next") || text.includes("nginx") || text.includes("servi")) {
    return "sistema";
  }
  if (text.includes("runtime") || text.includes("baix") || text.includes("download") || text.includes("extra")) {
    return "runtime";
  }
  if (payload.progress <= 10) return "diagnostico";
  if (payload.progress <= 35) return "runtime";
  if (payload.progress <= 60) return "bancoLocal";
  if (payload.progress <= 85) return "sistema";
  return "acesso";
}

function legacyStepProgress(id: string, globalProgress: number) {
  const ranges: Record<string, [number, number]> = {
    diagnostico: [0, 10],
    runtime: [10, 35],
    bancoLocal: [35, 60],
    sistema: [60, 85],
    acesso: [85, 100],
  };
  const [start, end] = ranges[id] || [0, 100];
  if (globalProgress <= start) return 0;
  if (globalProgress >= end) return 100;
  return Math.round(((globalProgress - start) * 100) / Math.max(1, end - start));
}

function applyLegacyStepEvent(
  current: ProgressStep[],
  payload: LauncherJobEvent,
  eventName: LauncherJobEventName,
): ProgressStep[] {
  const status = stepStatusFromEvent(eventName, payload);
  const currentStepId = stepIdFromLegacyEvent(payload);
  const currentIndex = stepIndex(currentStepId);
  const allSuccess = status === "success" && payload.progress >= 95;

  return preparationStepTemplates.map((template, index) => {
    const previous = current.find((step) => step.id === template.id) || template;
    if (allSuccess || index < currentIndex) {
      return { ...previous, status: "success", progress: 100, message: previous.message || "Concluído." };
    }
    if (template.id === currentStepId) {
      const progress = status === "success" ? 100 : Math.max(previous.progress, legacyStepProgress(template.id, payload.progress));
      return {
        ...previous,
        status,
        progress,
        message: status === "cancelled" ? "Cancelado pelo usuário." : payload.message || previous.message,
        error: status === "error" ? payload.message : undefined,
      };
    }
    if (status === "running" && index > currentIndex) return { ...template };
    return previous;
  });
}

function applyJobEventToSteps(
  current: ProgressStep[],
  payload: LauncherJobEvent,
  eventName: LauncherJobEventName,
): ProgressStep[] {
  const incoming = normalizeIncomingSteps(payload.steps);
  if (incoming.length > 0) return mergePreparationSteps(current, incoming);
  return applyLegacyStepEvent(current, payload, eventName);
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState("");
  const technicalLogBufferRef = useRef("");
  const logBufferRef = useRef("");
  const logFlushTimerRef = useRef<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [jobEvent, setJobEvent] = useState<LauncherJobEvent | null>(null);
  const [recentJobLogs, setRecentJobLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [steps, setSteps] = useState<ProgressStep[]>(initialSteps);
  const lastTerminalEventKindRef = useRef<string | undefined>(undefined);
  const [resetOpen, setResetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState<"safe" | "complete" | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restorePath, setRestorePath] = useState("");
  const [repairOpen, setRepairOpen] = useState(false);
  const [localBuild, setLocalBuild] = useState(false);
  const [localBuildNoCache, setLocalBuildNoCache] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<"firstSteps" | "commonProblems" | "backup" | "technical" | "about" | null>(
    null,
  );
  const [hideFirstSteps, setHideFirstSteps] = useState(false);
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
  const buildOptions = useMemo(
    () => ({
      useSudoDocker: sudoDockerThisSession,
      lightBuild: true,
      localBuild,
      noCache: localBuild ? localBuildNoCache : false,
    }),
    [localBuild, localBuildNoCache, sudoDockerThisSession],
  );

  const setStep = (id: string, status: ProgressStep["status"], message?: string, progress?: number) => {
    setSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              status,
              progress: progress ?? (status === "success" ? 100 : step.progress),
              message: message ?? (status === "success" ? "Concluído." : step.message),
            }
          : step,
      ),
    );
  };

  const flushLogBuffer = useCallback(() => {
    logFlushTimerRef.current = null;
    setLogs(limitLogText(logBufferRef.current));
  }, []);

  const scheduleLogFlush = useCallback(() => {
    if (logFlushTimerRef.current !== null) return;
    logFlushTimerRef.current = window.setTimeout(flushLogBuffer, 250);
  }, [flushLogBuffer]);

  const updateLogBuffer = useCallback((updater: (current: string) => string, immediate = false) => {
    technicalLogBufferRef.current = updater(technicalLogBufferRef.current);
    logBufferRef.current = limitLogText(technicalLogBufferRef.current, LOG_BUFFER_LINE_LIMIT);
    if (immediate) {
      if (logFlushTimerRef.current !== null) {
        window.clearTimeout(logFlushTimerRef.current);
        logFlushTimerRef.current = null;
      }
      flushLogBuffer();
    } else {
      scheduleLogFlush();
    }
  }, [flushLogBuffer, scheduleLogFlush]);

  const replaceLogs = (text: string) => {
    technicalLogBufferRef.current = text;
    logBufferRef.current = limitLogText(technicalLogBufferRef.current, LOG_BUFFER_LINE_LIMIT);
    setLogs(limitLogText(logBufferRef.current));
  };

  useEffect(() => {
    let disposed = false;
    let unlisten: Array<() => void> = [];

    const handleJobEvent = (payload: LauncherJobEvent, eventName: LauncherJobEventName) => {
      if (eventName === "launcher://job-started") {
        lastTerminalEventKindRef.current = undefined;
        setJobEvent(payload);
        setJobStatus("running");
        setRecentJobLogs([]);
        setSteps((current) => applyJobEventToSteps(current, payload, eventName));
        return;
      }

      if (eventName === "launcher://job-progress") {
        setJobEvent(payload);
        setJobStatus("running");
        setSteps((current) => applyJobEventToSteps(current, payload, eventName));
        return;
      }

      if (eventName === "launcher://job-log") {
        updateLogBuffer((current) => appendLogLine(current, payload));
        if (payload.action !== "Ler logs" && payload.message.trim()) {
          const lines = payload.message
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          setRecentJobLogs((current) => [...current, ...lines].slice(-4));
        }
        return;
      }

      if (eventName === "launcher://job-error") {
        setJobEvent(payload);
        setJobStatus("error");
        setSteps((current) => applyJobEventToSteps(current, payload, eventName));
        setError("Não foi possível concluir. Use Ver detalhes técnicos para investigar o que aconteceu.");
        updateLogBuffer((current) => appendLogLine(current, payload), true);
        return;
      }

      if (eventName === "launcher://job-finished") {
        setJobEvent(payload);
        const nextStatus = payload.level === "error" ? "error" : payload.level === "cancelled" ? "cancelled" : "success";
        lastTerminalEventKindRef.current = payload.errorKind ?? (nextStatus === "cancelled" ? "cancelled_by_user" : nextStatus);
        setJobStatus(nextStatus);
        setSteps((current) => applyJobEventToSteps(current, payload, eventName));
        if (nextStatus === "error") {
          setError((current) => current || "Não foi possível concluir. Use Ver detalhes técnicos para investigar o que aconteceu.");
        } else if (nextStatus === "cancelled") {
          setError("");
          setNotice("Operação cancelada. Nenhuma instalação existente foi alterada.");
        }
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
  }, [updateLogBuffer]);

  const refreshQuickStatus = async () => {
    try {
      const nextStatus = await quickDiagnose();
      setStatus(nextStatus);
      return nextStatus;
    } catch {
      return null;
    }
  };

  const diagnose = async () => {
    setBusy("diagnose");
    setJobStatus("idle");
    setError("");
    try {
      const nextStatus = await doctor();
      setStatus(nextStatus);
      return nextStatus;
    } catch (err) {
      const message = friendlyActionError("Diagnosticar", err);
      setJobEvent(localJobEvent("Diagnosticar", "error", message));
      setJobStatus("error");
      setError(message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    void refreshQuickStatus();
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(FIRST_STEPS_STORAGE_KEY) !== "true") {
      setHelpTopic("firstSteps");
    }
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
      await refreshQuickStatus();
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, `Erro em ${label}`, errorMessage(err)), true);
      const message = friendlyActionError(label, err);
      if (isEventCancelled(lastTerminalEventKindRef.current)) {
        setSteps((current) =>
          current.map((step) =>
            step.status === "running"
              ? { ...step, status: "cancelled", message: "Operação cancelada." }
              : step,
          ),
        );
        setJobEvent(localJobEvent(label, "cancelled", "Operação cancelada.", jobEvent?.progress ?? 0));
        setJobStatus("cancelled");
      } else {
        setJobEvent(localJobEvent(label, "error", message));
        setJobStatus("error");
        setError(message);
      }
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
    await installProject(buildOptions);
  };

  const installOrUpdateProject = async () => {
    if (isBusy) return;
    setBusy("prepare");
    setJobStatus("idle");
    setError("");
    setNotice("");
    try {
      if (!(await checkDependenciesBefore("install"))) return;
      const currentStatus = status ?? (await quickDiagnose());
      setStatus(currentStatus);
      if (requestDockerPermissionDecision("install", currentStatus)) return;
      await runProjectInstall();
      await refreshQuickStatus();
    } catch (err) {
      updateLogBuffer(
        (current) => appendOutput(current, "Erro ao preparar ambiente", errorMessage(err)),
        true,
      );
      const message = friendlyActionError("Preparar Ambiente", err);
      if (isEventCancelled(lastTerminalEventKindRef.current)) {
        setJobEvent(localJobEvent("Preparar Ambiente", "cancelled", "Operação cancelada.", jobEvent?.progress ?? 0));
        setJobStatus("cancelled");
        setNotice("Operação cancelada. Nenhuma instalação existente foi alterada.");
      } else {
        setJobEvent(localJobEvent("Preparar Ambiente", "error", message));
        setJobStatus("error");
        setError(message);
      }
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
    setSteps(createInitialSteps());

    try {
      setStep("diagnostico", "running", "Verificando este computador.", 5);
      let currentStatus = await doctor();
      setStatus(currentStatus);
      setStep("diagnostico", "success", "Diagnóstico concluído.", 100);

      if (!(await checkDependenciesBefore("prepare"))) return;

      if (currentStatus.runtimeMode === "portable") {
        await runProjectInstall();
        currentStatus = await doctor();
        setStatus(currentStatus);
        if (!currentStatus.appOnline) {
          throw new Error(
            "O M&G Pocket foi preparado, mas ainda não conseguimos abrir a página. Tente novamente em alguns segundos ou use Reparar instalação.",
          );
        }
        setSteps((current) => current.map((step) => ({ ...step, status: "success", progress: 100, message: "Concluído." })));
        const readyMessage = "Ambiente pronto. Você já pode abrir o M&G Pocket.";
        setJobEvent(localJobEvent("Preparar Ambiente", "success", readyMessage));
        setJobStatus("success");
        setNotice(readyMessage);
        return;
      }

      setStep("runtime", "running", "Validando Docker.", 20);
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
      setStep("runtime", "running", "Validando permissões do Docker.", 60);

      await ensureDockerPermission();
      currentStatus = await doctor();
      setStatus(currentStatus);
      if (requestDockerPermissionDecision("prepare", currentStatus)) {
        setStep("runtime", "error", "Permissão Docker precisa de atenção.");
        return;
      }
      setStep("runtime", "success", "Runtime Docker pronto.");

      setStep("bancoLocal", "running", "Preparando banco local.");
      await runProjectInstall();
      setStep("bancoLocal", "success", "Banco local pronto.");
      setStep("sistema", "success", "Sistema iniciado.");

      setStep("acesso", "running", "Validando acesso local.");
      currentStatus = await doctor();
      setStatus(currentStatus);
      if (!currentStatus.appOnline) {
        throw new Error(
          "O M&G Pocket foi preparado, mas ainda não conseguimos abrir a página. Tente novamente em alguns segundos ou use Reparar instalação.",
        );
      }
      setStep("acesso", "success", "Acesso validado.");
      const readyMessage = "Ambiente pronto. Você já pode abrir o M&G Pocket.";
      setJobEvent(localJobEvent("Preparar Ambiente", "success", readyMessage));
      setJobStatus("success");
      setNotice(readyMessage);
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, "Erro ao preparar ambiente", errorMessage(err)), true);
      const message = friendlyActionError("Preparar Ambiente", err);
      if (isEventCancelled(lastTerminalEventKindRef.current)) {
        setSteps((current) =>
          current.map((step) =>
            step.status === "running"
              ? { ...step, status: "cancelled", message: "Operação cancelada." }
              : step,
          ),
        );
        setJobEvent(localJobEvent("Preparar Ambiente", "cancelled", "Operação cancelada.", jobEvent?.progress ?? 0));
        setJobStatus("cancelled");
        setNotice("Operação cancelada. Nenhuma instalação existente foi alterada.");
      } else {
        setSteps((current) =>
          current.map((step) =>
            step.status === "running" ? { ...step, status: "error", message, error: message } : step,
          ),
        );
        setJobEvent(localJobEvent("Preparar Ambiente", "error", message));
        setJobStatus("error");
        setError(message);
      }
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

  const repairProject = async () => {
    setRepairOpen(false);
    await runAction("Reparar instalação", () => repairInstallation(buildOptions));
  };

  const startAndOpenPocket = async () => {
    if (isBusy) return;
    setBusy("Iniciar M&G Pocket");
    setJobStatus("idle");
    setError("");
    setNotice("");
    try {
      await startApp(dockerOptions);
      const nextStatus = await refreshQuickStatus();
      if (nextStatus?.appOnline === false) {
        throw new Error(
          "O M&G Pocket ainda não está pronto para abrir. Tente iniciar novamente ou use Reparar instalação.",
        );
      }
      setNotice("M&G Pocket iniciado. Abrindo no navegador...");
      await openSite();
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, "Erro ao iniciar M&G Pocket", errorMessage(err)), true);
      const message = friendlyActionError("Iniciar M&G Pocket", err);
      setJobEvent(localJobEvent("Iniciar M&G Pocket", "error", message));
      setJobStatus("error");
      setError(message);
    } finally {
      setBusy(null);
    }
  };

  const openPocket = async () => {
    if (isBusy) return;
    setError("");
    const nextStatus = status?.appOnline ? status : await refreshQuickStatus();
    if (!nextStatus?.appOnline) {
      setError("O M&G Pocket ainda não está pronto para abrir. Tente iniciar novamente ou use Reparar instalação.");
      return;
    }

    try {
      await openSite();
    } catch (err) {
      setError(friendlyActionError("Abrir M&G Pocket", err));
    }
  };

  const runPrimaryAction = async () => {
    if (status?.appOnline) {
      await openPocket();
      return;
    }
    if (status?.projectInstalled) {
      await startAndOpenPocket();
      return;
    }
    await prepareEnvironment();
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
    const backupPath = window.prompt("Caminho do backup do banco (.sql ou .dump)");
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
        await refreshQuickStatus();
      }
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, "Erro ao instalar dependências do sistema", String(err)), true);
      setError("Não consegui instalar as dependências automaticamente. Veja os detalhes técnicos e tente a instalação manual.");
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
      "Status: aguardando nova sessão. Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Preparar Ambiente.",
    );
  };

  const cancelDockerPermissionFlow = () => {
    setDockerPermissionPromptDismissed(true);
    setDockerPermissionPrompt(null);
    setJobStatus("idle");
    setBusy(null);
    setNotice("Fluxo cancelado. Nada foi executado com sudo.");
  };

  const cancelRunningJob = async () => {
    try {
      const cancelled = await cancelCurrentJob();
      if (cancelled) {
        const currentProgress = Math.max(0, Math.min(95, jobEvent?.progress ?? 0));
        setSteps((current) =>
          current.map((step) =>
            step.status === "running"
              ? { ...step, status: "cancelled", message: "Operação cancelada." }
              : step,
          ),
        );
        setJobEvent(localJobEvent(jobEvent?.action || "Operação", "cancelled", "Operação cancelada.", currentProgress));
        setJobStatus("cancelled");
        setNotice("Operação cancelada. Nenhuma instalação existente foi alterada.");
        setBusy(null);
      }
    } catch (err) {
      setError(friendlyActionError("Cancelar operação", err));
    }
  };

  const statusItems = useMemo(() => {
    const empty: StatusItem[] = [{ label: "Status", value: "aguardando", tone: "idle" }];
    if (!status) return { environment: empty, docker: empty, project: empty, diagnostics: empty, technical: empty };

    const okOrAttention = (value: boolean, waiting = false) =>
      value ? "Tudo pronto" : waiting ? "Aguardando" : "Precisa de atenção";
    const okTone = (value: boolean, waiting = false): StatusItem["tone"] => (value ? "ok" : waiting ? "warn" : "bad");

    const environment: StatusItem[] = [
      { label: "Status", value: launcherStatusLabel(status, jobStatus, isBusy, error), tone: error || jobStatus === "error" ? "bad" : status.appOnline ? "ok" : status.projectInstalled ? "warn" : "idle" },
      { label: "Modo de execução", value: status.runtimeLabel || (status.runtimeMode === "portable" ? "Portátil" : "Docker"), tone: status.runtimeMode === "portable" ? "ok" : "idle" },
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
      { label: "Docker", value: status.dockerRunning ? "OK" : status.dockerInstalled ? "precisa abrir" : "não encontrado", tone: status.dockerRunning ? "ok" : "warn" },
      {
        label: "Permissão",
        value: status.dockerPermissionOk ? "OK" : sudoDockerThisSession ? "OK nesta sessão" : status.sudoDockerWorks ? "aguardando" : "precisa atenção",
        tone: status.dockerPermissionOk ? "ok" : status.sudoDockerWorks ? "warn" : "bad",
      },
      { label: "Preparação", value: status.projectInstalled ? "preparado" : "não preparado", tone: status.projectInstalled ? "ok" : "warn" },
    ];

    const project: StatusItem[] = [
      { label: "Projeto", value: status.projectInstalled ? "preparado" : "não preparado", tone: status.projectInstalled ? "ok" : "warn" },
      { label: "Banco de dados", value: okOrAttention(Boolean(status.databaseConnected), status.projectInstalled && !status.databaseConnected), tone: okTone(Boolean(status.databaseConnected), status.projectInstalled && !status.databaseConnected) },
      { label: "Aplicativo", value: okOrAttention(status.appOnline, status.projectInstalled && !status.appOnline), tone: okTone(status.appOnline, status.projectInstalled && !status.appOnline) },
      { label: "Acesso local", value: okOrAttention(Boolean(status.nginxOnline && status.appOnline), status.projectInstalled && !status.appOnline), tone: okTone(Boolean(status.nginxOnline && status.appOnline), status.projectInstalled && !status.appOnline) },
    ];

    const diagnostics: StatusItem[] = [
      { label: "Docker", value: status.dockerRunning ? "OK" : status.dockerInstalled ? "precisa abrir" : "não encontrado", tone: status.dockerRunning ? "ok" : "warn" },
      { label: "Projeto", value: status.projectInstalled ? "preparado" : "não preparado", tone: status.projectInstalled ? "ok" : "warn" },
      { label: "Banco de dados", value: okOrAttention(Boolean(status.databaseConnected), status.projectInstalled), tone: okTone(Boolean(status.databaseConnected), status.projectInstalled) },
      { label: "Aplicativo", value: okOrAttention(status.appOnline, status.projectInstalled), tone: okTone(status.appOnline, status.projectInstalled) },
      { label: "Acesso local", value: okOrAttention(Boolean(status.nginxOnline && status.appOnline), status.projectInstalled), tone: okTone(Boolean(status.nginxOnline && status.appOnline), status.projectInstalled) },
      { label: "Backup", value: status.projectInstalled ? "disponível" : "não disponível", tone: status.projectInstalled ? "ok" : "warn" },
    ];

    const technical: StatusItem[] = [
      { label: "Git instalado", value: boolLabel(Boolean(status.gitInstalled)), tone: status.gitInstalled ? "ok" : "warn" },
      { label: "Docker instalado", value: boolLabel(status.dockerInstalled), tone: tone(status.dockerInstalled) },
      { label: "Docker Compose", value: boolLabel(status.dockerComposeInstalled), tone: tone(status.dockerComposeInstalled) },
      { label: "Containers ativos", value: boolLabel(Boolean(status.containersActive)), tone: status.containersActive ? "ok" : "warn" },
      { label: "Nginx", value: status.nginxOnline ? "ok" : "offline", tone: status.nginxOnline ? "ok" : "warn" },
      { label: "Uploads", value: status.uploadsServed ? "ok" : status.uploadsDirectoryOk ? "pasta ok" : "verificar", tone: status.uploadsServed ? "ok" : "warn" },
      { label: "Assets Next", value: status.nextAssetsOnline ? "ok" : "verificar", tone: status.nextAssetsOnline ? "ok" : "warn" },
      { label: "Porta local", value: status.port3000Available ? "livre" : "em uso", tone: status.port3000Available || status.appOnline ? "ok" : "warn" },
      { label: "Portas 80/443/5432", value: [status.port80Available, status.port443Available, status.port5432Available].every(Boolean) ? "livres" : "em uso", tone: [status.port80Available, status.port443Available, status.port5432Available].every(Boolean) ? "ok" : "warn" },
      { label: "Versão local", value: status.projectVersion || "desconhecida", tone: "idle" },
      { label: "Caminho", value: status.projectPath || "desconhecido", tone: "idle" },
    ];

    return { environment, docker, project, diagnostics, technical };
  }, [status, sudoDockerThisSession, jobStatus, isBusy, error]);

  const showLinuxInstallDocker = status?.os === "linux" && status.supported && !status.dockerInstalled;
  const showWindowsDockerGuide = status?.os === "windows" && !status.dockerInstalled && status.runtimeMode !== "portable";
  const activeProgress =
    jobStatus !== "idle" && jobEvent
      ? {
          title:
            jobStatus === "success"
              ? "Concluído"
              : jobStatus === "error"
                ? "Não foi possível concluir"
                : jobStatus === "cancelled"
                  ? "Cancelado"
                  : jobEvent.action,
          detail:
            jobStatus === "error"
              ? error || jobEvent.message || "Não foi possível concluir esta ação."
              : jobEvent.message || "Operação em andamento.",
          step:
            jobStatus === "success"
              ? "Concluído"
              : jobStatus === "error"
                ? "Erro"
                : jobStatus === "cancelled"
                  ? "Cancelado"
                  : jobEvent.step,
          progress: Math.max(0, Math.min(100, jobEvent.progress)),
        }
      : progressCopy(busy);

  const transferDetail = jobStatus === "running" && jobEvent ? formatTransferDetail(jobEvent) : null;

  const closeHelp = () => {
    if (helpTopic === "firstSteps" && hideFirstSteps) {
      window.localStorage.setItem(FIRST_STEPS_STORAGE_KEY, "true");
    }
    setHelpTopic(null);
  };

  const helpContent = () => {
    if (helpTopic === "commonProblems") {
      return (
        <>
          <p>Se algo não abrir, tente primeiro Iniciar M&G Pocket novamente.</p>
          <p>Se continuar com problema, use Reparar instalação para baixar novamente a versão pronta e reiniciar os serviços locais.</p>
        </>
      );
    }
    if (helpTopic === "backup") {
      return (
        <>
          <p>Backup salva apenas uma cópia do banco de dados do M&G Pocket.</p>
          <p>Restaurar um backup substitui os dados atuais pelos dados salvos naquela cópia. Faça isso apenas se tiver certeza.</p>
        </>
      );
    }
    if (helpTopic === "technical") {
      return (
        <>
          <p>Os detalhes técnicos ficam nos painéis expansíveis e nos logs.</p>
          <p>Use esta área quando precisar investigar Docker Compose, containers, Nginx, portas, healthcheck, caminho local e versão da imagem.</p>
        </>
      );
    }
    if (helpTopic === "about") {
      return (
        <>
          <p>O M&G Pocket Launcher prepara e abre o M&G Pocket neste computador.</p>
          <p>O modo recomendado baixa uma versão pronta para evitar compilação local.</p>
        </>
      );
    }

    return (
      <>
        <p>Bem-vindo ao M&G Pocket</p>
        <p>Este aplicativo ajuda você a preparar e abrir o M&G Pocket no seu computador.</p>
        <ol>
          <li>Clique em Preparar Ambiente.</li>
          <li>Aguarde enquanto o launcher baixa a versão pronta do M&G Pocket e configura tudo.</li>
          <li>Quando terminar, clique em Abrir M&G Pocket.</li>
          <li>Ao final da sessão, clique em Parar.</li>
        </ol>
        <p>
          Preparar Ambiente baixa a versão pronta, configura o banco de dados e deixa tudo pronto para uso. Iniciar M&G
          Pocket liga os serviços locais e abre o sistema no navegador quando estiver pronto.
        </p>
        <p>Backup salva uma cópia dos dados do banco. Restaurar backup recupera os dados a partir de uma cópia anterior.</p>
        <label className="help-checkbox">
          <input
            type="checkbox"
            checked={hideFirstSteps}
            onChange={(event) => setHideFirstSteps(event.target.checked)}
          />
          <span>Não mostrar novamente</span>
        </label>
      </>
    );
  };

  const helpTitle = {
    firstSteps: "Primeiros passos",
    commonProblems: "Problemas comuns",
    backup: "Backup e restauração",
    technical: "Detalhes técnicos",
    about: "Sobre o M&G Pocket",
  }[helpTopic || "firstSteps"];

  return (
    <AppShell>
      <section className="hero-band">
        <div className="hero-band__content">
          <p className="eyebrow">M&G Pocket Launcher</p>
          <h2>Sistema local para mestres de RPG</h2>
          <div className="launcher-summary" aria-label="Status do launcher">
            <span>{launcherStatusLabel(status, jobStatus, isBusy, error)}</span>
            <span>Modo de execução: {status?.runtimeLabel || (status?.runtimeMode === "portable" ? "Portátil" : "Docker")}</span>
            <span>Endereço local: {status?.appUrl || "http://localhost:3000"}</span>
          </div>
        </div>
        <ActionButton
          icon={status?.appOnline ? <ExternalLink size={22} /> : status?.projectInstalled ? <Play size={22} /> : <Wrench size={22} />}
          loading={busy === "prepare"}
          disabled={isBusy}
          onClick={() => void runPrimaryAction()}
          variant="primary"
          ariaLabel={!status?.projectInstalled && !status?.appOnline ? "Preparar Ambiente" : undefined}
        >
          {primaryActionLabel(status)}
        </ActionButton>
      </section>

      {error ? (
        <div className="message message--error">
          <span>{error}</span>
          {jobStatus === "error" && !isBusy ? (
            <span className="message__actions">
              <button type="button" onClick={() => void prepareEnvironment()}>
                Tentar novamente
              </button>
              <button type="button" onClick={() => setRepairOpen(true)}>
                Reparar instalação
              </button>
              <button type="button" onClick={() => void loadLogs()}>
                Ver detalhes técnicos
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
      {notice ? <div className="message message--warn">{notice}</div> : null}
      {status?.requiresRelogin && !sudoDockerThisSession ? (
        <div className="message message--warn">
          Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Preparar Ambiente.
        </div>
      ) : null}
      {status?.appOnline && status.databaseConnected === false ? (
        <div className="message message--warn">
          O M&G Pocket iniciou, mas os dados ainda podem estar carregando. Aguarde alguns segundos e tente abrir novamente.
        </div>
      ) : null}
      {status?.projectInstalled && status.nginxOnline === false ? (
        <div className="message message--warn">
          Não conseguimos abrir o M&G Pocket agora. Algum serviço ainda pode estar iniciando ou outro programa pode estar usando o endereço local.
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
        <section className={`operation-progress operation-progress--${jobStatus}`} role="status" aria-live="polite">
          <div>
            <strong>{activeProgress.title}</strong>
            <span>{activeProgress.step ? `${activeProgress.step}: ${activeProgress.detail}` : activeProgress.detail}</span>
          </div>
          {transferDetail ? (
            <p className="operation-progress__transfer">{transferDetail}</p>
          ) : null}
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
          {jobStatus === "running" ? (
            <button className="operation-progress__cancel" type="button" onClick={() => void cancelRunningJob()}>
              Cancelar
            </button>
          ) : null}
        </section>
      ) : null}

      <StepProgress steps={steps} />

      <details className="technical-details">
        <summary>
          <Settings size={18} aria-hidden="true" />
          Detalhes técnicos
        </summary>
        <div className="status-grid status-grid--technical">
          <StatusCard title="Ambiente" icon={<ShieldCheck size={20} />} items={statusItems.environment} />
          {status?.runtimeMode === "portable" ? null : (
            <StatusCard title="Docker" icon={<HardDrive size={20} />} items={statusItems.docker} />
          )}
          <StatusCard title="Projeto" icon={<BookOpen size={20} />} items={statusItems.project} />
          <StatusCard title="Diagnóstico" icon={<Activity size={20} />} items={statusItems.diagnostics} />
          <StatusCard title="Detalhes técnicos" icon={<Settings size={20} />} items={statusItems.technical} />
        </div>
        <LogPanel logs={logs} onRefresh={loadLogs} loading={busy === "Logs"} />
      </details>

      <details
        className="advanced-panel"
        aria-label="Opções avançadas"
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary>
          <Settings size={18} aria-hidden="true" />
          Opções avançadas
        </summary>
        <div className="advanced-options">
          <label className="advanced-toggle">
            <input
              type="radio"
              name="install-mode"
              checked={!localBuild}
              disabled={isBusy}
              onChange={() => setLocalBuild(false)}
            />
            <span>
              <strong>Baixar versão pronta</strong>
              <small>Recomendado. Baixa uma versão já preparada do M&G Pocket e evita compilar o sistema no seu computador.</small>
            </span>
          </label>
          <label className="advanced-toggle">
            <input
              type="radio"
              name="install-mode"
              checked={localBuild}
              disabled={isBusy}
              onChange={() => setLocalBuild(true)}
            />
            <span>
              <strong>Construir localmente</strong>
              <small>Avançado. Use apenas para desenvolvimento ou reparo. Pode demorar bastante em computadores mais fracos.</small>
            </span>
          </label>
          {localBuild ? (
            <label className="advanced-toggle advanced-toggle--compact">
              <input
                type="checkbox"
                checked={localBuildNoCache}
                disabled={isBusy}
                onChange={(event) => setLocalBuildNoCache(event.target.checked)}
              />
              <span>
                <strong>Reconstruir sem cache</strong>
                <small>Força uma recompilação completa no computador.</small>
              </span>
            </label>
          ) : null}
        </div>
      </details>

      <details className="advanced-panel maintenance-panel" aria-label="Ações de manutenção">
        <summary>
          <Wrench size={18} aria-hidden="true" />
          Ações de manutenção
        </summary>
        <section className="actions-panel" aria-label="Ações de manutenção">
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
          <ActionButton icon={<Wrench size={18} />} disabled={isBusy} onClick={() => setRepairOpen(true)} variant="ghost">
            Reparar instalação
          </ActionButton>
          <ActionButton icon={<Play size={18} />} disabled={isBusy} onClick={startAndOpenPocket}>
            Iniciar M&G Pocket
          </ActionButton>
          <ActionButton icon={<Square size={18} />} disabled={isBusy} onClick={() => runAction("Parar", () => stopApp(dockerOptions))}>
            Parar
          </ActionButton>
          <ActionButton icon={<RotateCcw size={18} />} disabled={isBusy} onClick={() => runAction("Reiniciar", () => restartApp(dockerOptions))}>
            Reiniciar
          </ActionButton>
          <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy} onClick={openPocket} variant={status?.appOnline ? "primary" : "secondary"}>
            Abrir M&G Pocket
          </ActionButton>
          <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy || !status?.adminerOnline} onClick={() => void openAdminer()}>
            Abrir Adminer
          </ActionButton>
          <ActionButton icon={<ScrollText size={18} />} disabled={busy === "Logs"} loading={busy === "Logs"} onClick={loadLogs}>
            Ver detalhes técnicos
          </ActionButton>
          <ActionButton icon={<FolderOpen size={18} />} disabled={isBusy} onClick={() => void openDataFolder()}>
            Abrir pasta de dados
          </ActionButton>
          <ActionButton icon={<FolderOpen size={18} />} disabled={isBusy} onClick={() => void openBackupsFolder()}>
            Abrir pasta de backups
          </ActionButton>
          <ActionButton icon={<FolderOpen size={18} />} disabled={isBusy} onClick={() => void openLogsFolder()}>
            Abrir logs técnicos
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
      </details>

      <details className="help-panel" aria-label="Ajuda">
        <summary className="help-panel__header">
          <HelpCircle size={20} aria-hidden="true" />
          Ajuda
        </summary>
        <div className="help-panel__actions">
          <button type="button" onClick={() => setHelpTopic("firstSteps")}>
            Primeiros passos
          </button>
          <button type="button" onClick={() => setHelpTopic("commonProblems")}>
            Problemas comuns
          </button>
          <button type="button" onClick={() => setHelpTopic("backup")}>
            Backup e restauração
          </button>
          <button type="button" onClick={() => setHelpTopic("technical")}>
            Detalhes técnicos
          </button>
          <button type="button" onClick={() => setHelpTopic("about")}>
            Sobre o M&G Pocket
          </button>
        </div>
      </details>

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
        description={
          <>
            <p>Restaurar um backup vai substituir os dados atuais do M&G Pocket pelos dados salvos naquela cópia.</p>
            <p>Faça isso apenas se tiver certeza.</p>
            <p>{restorePath}</p>
          </>
        }
        confirmationText="RESTAURAR"
        confirmLabel="Restaurar"
        onCancel={() => setRestoreOpen(false)}
        onConfirm={confirmRestore}
      />
      <ConfirmDialog
        open={repairOpen}
        title="Reparar instalação"
        description={
          <>
            {localBuild ? (
              <>
                <p>Esta opção recompila o M&G Pocket neste computador.</p>
                <p>Use apenas se você estiver desenvolvendo o projeto ou se a versão pronta não funcionar.</p>
              </>
            ) : (
              <p>
                Vamos tentar corrigir a instalação baixando novamente a versão pronta do M&G Pocket e reiniciando os
                serviços locais.
              </p>
            )}
          </>
        }
        confirmLabel={localBuild ? "Reconstruir localmente" : "Reparar instalação"}
        cancelLabel="Cancelar"
        confirmVariant="primary"
        onCancel={() => setRepairOpen(false)}
        onConfirm={repairProject}
      />
      <ConfirmDialog
        open={removeOpen !== null}
        title={removeOpen === "complete" ? "Desinstalar M&G Pocket Local" : "Remover Projeto Local"}
        description={
          removeOpen === "complete" ? (
            <>
              <p>Esta ação para os serviços locais do projeto e apaga a pasta local.</p>
              <p>Docker, Git, winget e dependências globais não serão removidos.</p>
            </>
          ) : (
            <>
              <p>Esta ação para os serviços locais e apaga a pasta local do projeto.</p>
              <p>Dados externos e backups serão preservados quando possível.</p>
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
              {hasDependency(dependencyPrompt, "git") ? (
                <p>
                  O Git é a ferramenta usada para baixar e atualizar os arquivos do M&G Pocket a partir do repositório
                  oficial. Ele não roda o jogo sozinho e não altera seus arquivos pessoais.
                </p>
              ) : null}
              {hasDependency(dependencyPrompt, "docker") ? (
                <p>
                  O Docker cria uma caixa separada para o projeto, com site, banco de dados e serviços locais, sem
                  instalar tudo manualmente no seu computador.
                </p>
              ) : null}
              <p>Antes de instalar qualquer dependência, o launcher mostrará o que será feito e pedirá sua confirmação.</p>
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
          { label: "Ver detalhes técnicos", onClick: () => void loadLogs() },
          { label: "Cancelar", onClick: cancelDockerPermissionFlow },
        ]}
      />
      <ConfirmDialog
        open={helpTopic !== null}
        title={helpTitle}
        description={helpContent()}
        confirmLabel="Fechar"
        confirmVariant="primary"
        onCancel={closeHelp}
        onConfirm={closeHelp}
      />
    </AppShell>
  );
}
