export type SystemStatus = {
  os: "linux" | "windows" | "macos" | "unknown";
  distroFamily?: "ubuntu_like" | "debian_like" | "arch_like" | "fedora_like" | "opensuse_like" | "unsupported";
  distroName?: string;
  supported: boolean;
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

export type LauncherJobEvent = {
  job_id: string;
  action: string;
  step: string;
  message: string;
  progress: number;
  level: "info" | "stdout" | "stderr" | "error" | "success" | string;
};

export type StepState = "pending" | "running" | "done" | "error";

export type ProgressStep = {
  id: string;
  label: string;
  state: StepState;
};
