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

export function installProject(): Promise<CommandOutput> {
  return invoke<CommandOutput>("installProject");
}

export function startApp(): Promise<CommandOutput> {
  return invoke<CommandOutput>("startApp");
}

export function stopApp(): Promise<CommandOutput> {
  return invoke<CommandOutput>("stopApp");
}

export function restartApp(): Promise<CommandOutput> {
  return invoke<CommandOutput>("restartApp");
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

export function readLogs(): Promise<string> {
  return invoke<string>("readLogs");
}

export function backup(): Promise<CommandOutput> {
  return invoke<CommandOutput>("backup");
}

export function restoreBackup(backupPath: string): Promise<CommandOutput> {
  return invoke<CommandOutput>("restoreBackup", { backupPath, confirmed: true });
}

export function resetLocalData(): Promise<CommandOutput> {
  return invoke<CommandOutput>("resetLocalData", { confirmed: true });
}
