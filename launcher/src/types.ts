export type SystemStatus = {
  os: "linux" | "windows" | "macos" | "unknown";
  distroFamily?: "ubuntu_like" | "debian_like" | "arch_like" | "fedora_like" | "opensuse_like" | "unsupported";
  distroName?: string;
  supported: boolean;
  runtimeMode?: "docker" | "portable" | string;
  runtimeLabel?: string;
  portableInstalled?: boolean;
  wingetInstalled?: boolean;
  gitInstalled?: boolean;
  powerShellInstalled?: boolean;
  wsl2Installed?: boolean;
  dockerDesktopInstalled?: boolean;
  dockerInstalled: boolean;
  dockerVersion?: string;
  dockerRunning: boolean;
  dockerComposeInstalled: boolean;
  dockerComposeVersion?: string;
  dockerPermissionOk: boolean;
  sudoDockerWorks: boolean;
  requiresRelogin: boolean;
  projectInstalled: boolean;
  projectPath?: string;
  projectVersion?: string;
  appUrl?: string;
  adminerUrl?: string;
  installationRootPath?: string;
  installationSizeBytes?: number;
  dataSizeBytes?: number;
  backupsSizeBytes?: number;
  logsSizeBytes?: number;
  downloadsSizeBytes?: number;
  runtimeSizeBytes?: number;
  appOnline: boolean;
  adminerOnline: boolean;
  podmanInstalled?: boolean;
  containerRuntime?: "docker" | "podman-ready" | string;
  port3000Available?: boolean;
  port80Available?: boolean;
  port443Available?: boolean;
  port5432Available?: boolean;
  databaseConnected?: boolean;
  containersActive?: boolean;
  nginxOnline?: boolean;
  uploadsDirectoryOk?: boolean;
  uploadsServed?: boolean;
  nextAssetsOnline?: boolean;
  localDataPath?: string;
  localBackupsPath?: string;
  localLogsPath?: string;
  checkedAt?: string;
};

export type ShareStatus = "inactive" | "preparing" | "active" | "stopping" | "error";

export type ShareState = {
  status: ShareStatus | string;
  publicUrl?: string | null;
  localUrl?: string | null;
  pid?: number | null;
  executablePath?: string | null;
  executableSha256?: string | null;
  version?: string | null;
  message?: string | null;
  startedAt?: string | null;
  updatedAt?: string;
};

export type LocalStorageStatus = {
  installationRootPath: string;
  installationSizeBytes: number;
  dataSizeBytes: number;
  backupsSizeBytes: number;
  logsSizeBytes: number;
  downloadsSizeBytes: number;
  runtimeSizeBytes: number;
  updatedAt: string;
};

export type DependencyStatus = {
  os: "linux" | "windows" | "macos" | "unknown";
  distroFamily?: SystemStatus["distroFamily"] | null;
  distroName?: string | null;
  supported: boolean;
  missing: string[];
  packages: string[];
  installable: boolean;
  sudoRequired: boolean;
  installCommand?: string;
  commands?: string[];
  manualInstructions?: string;
};

export type CommandOutput = {
  success: boolean;
  code?: number | null;
  stdout: string;
  stderr: string;
};

export type JobStatus = "idle" | "running" | "success" | "error" | "cancelled";

export type LauncherStepStatus = "pending" | "running" | "success" | "error" | "cancelled";

export type LauncherStep = {
  id: "diagnostico" | "runtime" | "bancoLocal" | "sistema" | "acesso" | string;
  title: string;
  status: LauncherStepStatus;
  progress: number;
  message: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
};

export type LauncherJobEvent = {
  job_id: string;
  action: string;
  step: string;
  message: string;
  progress: number;
  level: "info" | "stdout" | "stderr" | "error" | "success" | string;
  status?: JobStatus;
  currentStepId?: LauncherStep["id"];
  steps?: LauncherStep[];
  /** Typed error kind emitted by the backend. Never "cancelled_by_user" for timeouts. */
  errorKind?: "cancelled_by_user" | "timeout" | "download" | "integrity" | "extraction" | "validation" | "installation" | "database" | "prisma" | "next" | "nginx" | "health_check" | "file_locked" | "port_unavailable" | "unknown" | string;
  /** Bytes transferred so far (download progress). */
  transferredBytes?: number;
  /** Total expected bytes (download progress). */
  totalBytes?: number;
  /** Files processed so far (extraction progress). */
  filesProcessed?: number;
  /** Total file count (extraction progress). */
  totalFiles?: number;
  /** Transfer speed in bytes/s. */
  bytesPerSecond?: number;
  /** Seconds elapsed since the operation started. */
  elapsedSeconds?: number;
};

export type StepState = LauncherStepStatus;

export type ProgressStep = LauncherStep;

export type LauncherViewState =
  | "not_installed"
  | "preparing"
  | "installed_stopped"
  | "online"
  | "logs"
  | "error";

export function resolveLauncherViewState(
  status: SystemStatus | null,
  jobStatus: JobStatus,
  logsOpen: boolean,
): LauncherViewState {
  if (logsOpen) return "logs";
  if (jobStatus === "running" || jobStatus === "cancelled") return "preparing";
  if (jobStatus === "error") return "error";
  if (!status?.projectInstalled) return "not_installed";
  if (status?.appOnline) return "online";
  return "installed_stopped";
}
