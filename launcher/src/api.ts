import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { CommandOutput, DependencyStatus, LauncherJobEvent, SystemStatus } from "./types";

export const launcherJobEvents = [
  "launcher://job-started",
  "launcher://job-progress",
  "launcher://job-log",
  "launcher://job-error",
  "launcher://job-finished",
] as const;

export type LauncherJobEventName = (typeof launcherJobEvents)[number];

export function listenLauncherJobEvent(
  eventName: LauncherJobEventName,
  handler: (payload: LauncherJobEvent, eventName: LauncherJobEventName) => void,
): Promise<UnlistenFn> {
  return listen<LauncherJobEvent>(eventName, (event) => handler(event.payload, eventName));
}

export async function doctor(): Promise<SystemStatus> {
  const raw = await invoke<string>("doctor");
  return JSON.parse(raw) as SystemStatus;
}

export async function quickDiagnose(): Promise<SystemStatus> {
  const raw = await invoke<string>("quickDiagnose");
  return JSON.parse(raw) as SystemStatus;
}

export function installDockerLinux(): Promise<CommandOutput> {
  return invoke<CommandOutput>("installDockerLinux");
}

export async function checkSystemDependencies(): Promise<DependencyStatus> {
  const raw = await invoke<string>("checkSystemDependencies");
  return JSON.parse(raw) as DependencyStatus;
}

export function installSystemDependencies(): Promise<CommandOutput> {
  return invoke<CommandOutput>("installSystemDependencies");
}

export function ensureDockerRunning(): Promise<CommandOutput> {
  return invoke<CommandOutput>("ensureDockerRunning");
}

export function ensureDockerPermission(): Promise<CommandOutput> {
  return invoke<CommandOutput>("ensureDockerPermission");
}

type DockerCommandOptions = {
  useSudoDocker?: boolean;
  lightBuild?: boolean;
};

export function installProject(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("installProject", options);
}

export function repairInstallation(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("repairInstallation", options);
}

export function startApp(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("startApp", options);
}

export function stopApp(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("stopApp", options);
}

export function restartApp(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("restartApp", options);
}

export function openSite(): Promise<void> {
  return invoke<void>("openSite");
}

export function openAdminer(): Promise<void> {
  return invoke<void>("openAdminer");
}

export function openDockerGuide(): Promise<void> {
  return invoke<void>("openDockerGuide");
}

export function readLogs(options: DockerCommandOptions = {}): Promise<string> {
  return invoke<string>("readLogs", options);
}

export function backup(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("backup", options);
}

export function restoreBackup(backupPath: string, options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("restoreBackup", { backupPath, confirmed: true, ...options });
}

export function resetLocalData(options: DockerCommandOptions = {}): Promise<CommandOutput> {
  return invoke<CommandOutput>("resetLocalData", { confirmed: true, ...options });
}

export function removeLocalProject(
  mode: "safe" | "complete",
  options: DockerCommandOptions = {},
): Promise<CommandOutput> {
  return invoke<CommandOutput>("removeLocalProject", { mode, confirmed: true, ...options });
}

export function cancelCurrentJob(): Promise<boolean> {
  return invoke<boolean>("cancelCurrentJob");
}
