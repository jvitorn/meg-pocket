export type SystemStatus = {
  os: "linux" | "windows" | "macos" | "unknown";
  distroFamily?: "ubuntu_like" | "debian_like" | "arch_like" | "unsupported";
  distroName?: string;
  supported: boolean;
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
  appOnline: boolean;
  adminerOnline: boolean;
};

export type CommandOutput = {
  success: boolean;
  code?: number | null;
  stdout: string;
  stderr: string;
};

export type StepState = "pending" | "running" | "done" | "error";

export type ProgressStep = {
  id: string;
  label: string;
  state: StepState;
};
