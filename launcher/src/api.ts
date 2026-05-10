import { invoke } from "@tauri-apps/api/core";
import type { CommandOutput, SystemStatus } from "./types";

export async function doctor(): Promise<SystemStatus> {
  const raw = await invoke<string>("doctor");
  return JSON.parse(raw) as SystemStatus;
}

export function installDockerLinux(): Promise<CommandOutput> {
  return invoke<CommandOutput>("installDockerLinux");
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
