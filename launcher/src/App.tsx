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
  Wrench,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  backup,
  cancelCurrentJob,
  checkSystemDependencies,
  deleteLocalInstallation,
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
  repairInstallation,
  restartApp,
  restoreBackup,
  startApp,
  stopApp,
} from "./api";
import { ActionButton } from "./components/ActionButton";
import { AppShell } from "./components/AppShell";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { LauncherDeleteDialog } from "./components/LauncherDeleteDialog";
import { LauncherHelpDialog, type HelpTopic } from "./components/LauncherHelpDialog";
import { LauncherInstallView } from "./components/LauncherInstallView";
import { LauncherLogsView } from "./components/LauncherLogsView";
import { LauncherMainView } from "./components/LauncherMainView";
import {
  acceptNginxNotice,
  hasAcceptedNginxNotice,
  LauncherNginxNotice,
} from "./components/LauncherNginxNotice";
import { LauncherProgressView } from "./components/LauncherProgressView";
import { LogPanel } from "./components/LogPanel";
import { StatusCard, type StatusItem } from "./components/StatusCard";
import type {
  CommandOutput,
  DependencyStatus,
  JobStatus,
  LauncherJobEvent,
  LauncherViewState,
  ProgressStep,
  SystemStatus,
} from "./types";
import { resolveLauncherViewState } from "./types";

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

  // Modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restorePath, setRestorePath] = useState("");
  const [repairOpen, setRepairOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [localBuild, setLocalBuild] = useState(false);
  const [localBuildNoCache, setLocalBuildNoCache] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null);
  const [hideFirstSteps, setHideFirstSteps] = useState(false);
  const [nginxNoticeOpen, setNginxNoticeOpen] = useState(false);

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

  // Derived view state
  const viewState: LauncherViewState = useMemo(
    () => resolveLauncherViewState(status, jobStatus, logsOpen),
    [status, jobStatus, logsOpen],
  );

  const setStep = (id: string, stepStatus: ProgressStep["status"], message?: string, progress?: number) => {
    setSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              status: stepStatus,
              progress: progress ?? (stepStatus === "success" ? 100 : step.progress),
              message: message ?? (stepStatus === "success" ? "Concluído." : step.message),
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

  // Show nginx notice on Windows portable before first start
  useEffect(() => {
    if (
      status?.os === "windows" &&
      status?.runtimeMode === "portable" &&
      status?.projectInstalled &&
      !hasAcceptedNginxNotice()
    ) {
      setNginxNoticeOpen(true);
    }
  }, [status]);

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
      const message = friendlyActionError("Instalar M&G Pocket", err);
      if (isEventCancelled(lastTerminalEventKindRef.current)) {
        setJobEvent(localJobEvent("Instalar M&G Pocket", "cancelled", "Operação cancelada.", jobEvent?.progress ?? 0));
        setJobStatus("cancelled");
        setNotice("Operação cancelada. Nenhuma instalação existente foi alterada.");
      } else {
        setJobEvent(localJobEvent("Instalar M&G Pocket", "error", message));
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
        setJobEvent(localJobEvent("Instalar M&G Pocket", "success", readyMessage));
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
      setJobEvent(localJobEvent("Instalar M&G Pocket", "success", readyMessage));
      setJobStatus("success");
      setNotice(readyMessage);
    } catch (err) {
      updateLogBuffer((current) => appendOutput(current, "Erro ao preparar ambiente", errorMessage(err)), true);
      const message = friendlyActionError("Instalar M&G Pocket", err);
      if (isEventCancelled(lastTerminalEventKindRef.current)) {
        setSteps((current) =>
          current.map((step) =>
            step.status === "running"
              ? { ...step, status: "cancelled", message: "Operação cancelada." }
              : step,
          ),
        );
        setJobEvent(localJobEvent("Instalar M&G Pocket", "cancelled", "Operação cancelada.", jobEvent?.progress ?? 0));
        setJobStatus("cancelled");
        setNotice("Operação cancelada. Nenhuma instalação existente foi alterada.");
      } else {
        setSteps((current) =>
          current.map((step) =>
            step.status === "running" ? { ...step, status: "error", message, error: message } : step,
          ),
        );
        setJobEvent(localJobEvent("Instalar M&G Pocket", "error", message));
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

  const repairProject = async () => {
    setRepairOpen(false);
    await runAction("Reparar instalação", () => repairInstallation(buildOptions));
  };

  const startAndOpenPocket = async () => {
    if (isBusy) return;
    setBusy("Iniciar servidor");
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
      const message = friendlyActionError("Iniciar servidor", err);
      setJobEvent(localJobEvent("Iniciar servidor", "error", message));
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
      setError(friendlyActionError("Abrir no navegador", err));
    }
  };

  const runPrimaryAction = async () => {
    if (viewState === "online") {
      await openPocket();
      return;
    }
    if (viewState === "installed_stopped") {
      await startAndOpenPocket();
      return;
    }
    if (viewState === "error" && status?.projectInstalled) {
      await startAndOpenPocket();
      return;
    }
    await prepareEnvironment();
  };

  const confirmDelete = async () => {
    setDeleteOpen(false);
    await runAction("Excluir instalação", () => deleteLocalInstallation(dockerOptions));
    // After deletion, reset to not-installed state
    setJobStatus("idle");
    setError("");
    setNotice("A instalação local do M&G Pocket foi excluída.");
    await refreshQuickStatus();
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
      "Status: aguardando nova sessão. Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Instalar M&G Pocket.",
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

  const closeHelp = () => {
    if (helpTopic === "firstSteps" && hideFirstSteps) {
      window.localStorage.setItem(FIRST_STEPS_STORAGE_KEY, "true");
    }
    setHelpTopic(null);
  };

  const handleNginxAccept = () => {
    acceptNginxNotice();
    setNginxNoticeOpen(false);
  };

  const transferDetail = jobStatus === "running" && jobEvent ? formatTransferDetail(jobEvent) : null;

  const showLinuxInstallDocker = status?.os === "linux" && status.supported && !status.dockerInstalled;
  const showWindowsDockerGuide = status?.os === "windows" && !status.dockerInstalled && status.runtimeMode !== "portable";

  const statusItems = useMemo(() => {
    const empty: StatusItem[] = [{ label: "Status", value: "aguardando", tone: "idle" }];
    if (!status) return { environment: empty, docker: empty, project: empty, diagnostics: empty, technical: empty };

    const okOrAttention = (value: boolean, waiting = false) =>
      value ? "Tudo pronto" : waiting ? "Aguardando" : "Precisa de atenção";
    const okTone = (value: boolean, waiting = false): StatusItem["tone"] => (value ? "ok" : waiting ? "warn" : "bad");

    const environment: StatusItem[] = [
      { label: "Status", value: viewState === "online" ? "Online" : viewState === "installed_stopped" ? "Parado" : "Aguardando", tone: error || jobStatus === "error" ? "bad" : status.appOnline ? "ok" : status.projectInstalled ? "warn" : "idle" },
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
  }, [status, sudoDockerThisSession, jobStatus, error, viewState]);

  const renderMainContent = () => {
    if (viewState === "not_installed") {
      return (
        <LauncherInstallView
          runtimeLabel={status?.runtimeLabel || (status?.runtimeMode === "portable" ? "Portátil" : undefined)}
          onInstall={() => void prepareEnvironment()}
          onHelp={() => setHelpTopic("firstSteps")}
          busy={isBusy}
          loading={busy === "prepare"}
        />
      );
    }

    if (viewState === "preparing") {
      return (
        <LauncherProgressView
          jobStatus={jobStatus}
          jobEvent={jobEvent}
          steps={steps}
          recentJobLogs={recentJobLogs}
          transferDetail={transferDetail}
          onCancel={() => void cancelRunningJob()}
          onOpenLogs={() => setLogsOpen(true)}
        />
      );
    }

    if (viewState === "logs") {
      return (
        <LauncherLogsView
          logs={logs}
          busy={isBusy}
          loadingLogs={busy === "Logs"}
          onRefresh={() => void loadLogs()}
          onRepair={() => setRepairOpen(true)}
          onClose={() => setLogsOpen(false)}
        />
      );
    }

    // online, installed_stopped, error
    return (
      <LauncherMainView
        viewState={viewState}
        status={status}
        error={error}
        notice={notice}
        busy={isBusy}
        loadingStart={busy === "Iniciar servidor"}
        loadingStop={busy === "Parar"}
        loadingUpdate={busy === "Atualizar"}
        loadingBackup={busy === "Backup"}
        onPrimaryAction={() => void runPrimaryAction()}
        onStartServer={() => void startAndOpenPocket()}
        onStopServer={() => void runAction("Parar", () => stopApp(dockerOptions))}
        onOpenSite={() => void openPocket()}
        onUpdate={() => void installOrUpdateProject()}
        onBackup={() => void runAction("Backup", () => backup(dockerOptions))}
        onRestoreBackup={() => void restoreData()}
        onOpenLogs={() => setLogsOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onRetry={() => void runPrimaryAction()}
      />
    );
  };

  return (
    <AppShell>
      {/* Warnings visible in all states */}
      {showWindowsDockerGuide ? (
        <div className="message message--warn">
          No Windows, o launcher pode instalar Docker Desktop via winget quando disponível, ou você pode abrir a página oficial.
          <button type="button" onClick={() => void openDockerGuide()}>
            Abrir página de download do Docker Desktop
          </button>
        </div>
      ) : null}
      {status?.requiresRelogin && !sudoDockerThisSession ? (
        <div className="message message--warn">
          Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Instalar M&G Pocket.
        </div>
      ) : null}
      {status?.appOnline && status.databaseConnected === false ? (
        <div className="message message--warn">
          O M&G Pocket iniciou, mas os dados ainda podem estar carregando. Aguarde alguns segundos e tente abrir novamente.
        </div>
      ) : null}
      {status?.projectInstalled && status.nginxOnline === false && viewState !== "preparing" ? (
        <div className="message message--warn">
          Não conseguimos abrir o M&G Pocket agora. Algum serviço ainda pode estar iniciando ou outro programa pode estar usando o endereço local.
        </div>
      ) : null}

      {renderMainContent()}

      {/* Advanced panels — hidden while a job is actively running, and in logs view */}
      {(viewState !== "preparing" || jobStatus !== "running") && viewState !== "logs" ? (
        <>
          {viewState !== "not_installed" && viewState !== "preparing" ? (
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
                <StatusCard title="Diagnóstico" icon={<Activity size={20} />} items={statusItems.diagnostics} aria-label="Diagnóstico" />
                <StatusCard title="Detalhes técnicos" icon={<Settings size={20} />} items={statusItems.technical} />
              </div>
              <LogPanel logs={logs} onRefresh={loadLogs} loading={busy === "Logs"} />
            </details>
          ) : null}

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
              <ActionButton icon={<Play size={18} />} disabled={isBusy} loading={busy === "Iniciar servidor"} onClick={startAndOpenPocket}>
                Iniciar M&G Pocket
              </ActionButton>
              <ActionButton icon={<Square size={18} />} disabled={isBusy} onClick={() => void runAction("Parar", () => stopApp(dockerOptions))}>
                Parar
              </ActionButton>
              <ActionButton icon={<RotateCcw size={18} />} disabled={isBusy} onClick={() => void runAction("Reiniciar", () => restartApp(dockerOptions))}>
                Reiniciar
              </ActionButton>
              <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy} onClick={openPocket} variant={status?.appOnline ? "primary" : "secondary"}>
                Abrir M&G Pocket
              </ActionButton>
              <ActionButton icon={<ExternalLink size={18} />} disabled={isBusy || !status?.adminerOnline} onClick={() => void openAdminer()}>
                Abrir Adminer
              </ActionButton>
              <ActionButton icon={<ScrollText size={18} />} disabled={busy === "Logs"} loading={busy === "Logs"} onClick={() => void loadLogs()}>
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
              <ActionButton icon={<Archive size={18} />} disabled={isBusy} onClick={() => void runAction("Backup", () => backup(dockerOptions))}>
                Backup
              </ActionButton>
              <ActionButton icon={<Archive size={18} />} disabled={isBusy} onClick={() => void restoreData()}>
                Restaurar Backup
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
              <button type="button" onClick={() => setHelpTopic("installAndUpdate")}>
                Instalação e atualização
              </button>
              <button type="button" onClick={() => setHelpTopic("localServer")}>
                Servidor local
              </button>
              <button type="button" onClick={() => setHelpTopic("images")}>
                Imagens e Nginx
              </button>
              <button type="button" onClick={() => setHelpTopic("backup")}>
                Backup e restauração
              </button>
              <button type="button" onClick={() => setHelpTopic("commonProblems")}>
                Problemas comuns
              </button>
              <button type="button" onClick={() => setHelpTopic("logs")}>
                Logs e diagnóstico
              </button>
              <button type="button" onClick={() => setHelpTopic("delete")}>
                Exclusão dos dados
              </button>
              <button type="button" onClick={() => setHelpTopic("about")}>
                Sobre o M&G Pocket
              </button>
            </div>
          </details>
        </>
      ) : null}

      {/* Modals */}
      <LauncherDeleteDialog
        open={deleteOpen}
        installPath={status?.projectPath || status?.localDataPath || ""}
        runtimeMode={status?.runtimeMode}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        onCreateBackupFirst={() => {
          setDeleteOpen(false);
          void runAction("Backup", () => backup(dockerOptions));
        }}
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
                  oficial.
                </p>
              ) : null}
              {hasDependency(dependencyPrompt, "docker") ? (
                <p>
                  O Docker cria uma caixa separada para o projeto, com site, banco de dados e serviços locais.
                </p>
              ) : null}
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

      <LauncherHelpDialog
        topic={helpTopic}
        onClose={closeHelp}
        hideFirstSteps={hideFirstSteps}
        onToggleHideFirstSteps={setHideFirstSteps}
      />

      <LauncherNginxNotice open={nginxNoticeOpen} onAccept={handleNginxAccept} />
    </AppShell>
  );
}
