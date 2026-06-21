import { FolderOpen, HardDrive } from "lucide-react";
import type { LocalStorageStatus, SystemStatus } from "../types";
import { ActionButton } from "./ActionButton";
import { StatusCard } from "./StatusCard";

type LauncherStoragePanelProps = {
  status: SystemStatus | null;
  storage: LocalStorageStatus | null;
  loading: boolean;
  onOpenFolder: () => void;
};

function formatBytes(value?: number) {
  if (!value || value <= 0) return "0 B";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value >= 1_073_741_824 ? 1 : 0,
    minimumFractionDigits: value >= 1_073_741_824 ? 1 : 0,
  }).format(value / unit(value).divisor) + ` ${unit(value).label}`;
}

function unit(value: number) {
  if (value >= 1_073_741_824) return { divisor: 1_073_741_824, label: "GB" };
  if (value >= 1_048_576) return { divisor: 1_048_576, label: "MB" };
  if (value >= 1024) return { divisor: 1024, label: "KB" };
  return { divisor: 1, label: "B" };
}

export function LauncherStoragePanel({
  status,
  storage,
  loading,
  onOpenFolder,
}: LauncherStoragePanelProps) {
  const rootPath = storage?.installationRootPath || status?.installationRootPath || status?.localDataPath || "";
  if (!status?.projectInstalled && !rootPath) return null;

  return (
    <section className="storage-panel" aria-label="Armazenamento local">
      <StatusCard
        title="Armazenamento local"
        icon={<HardDrive size={18} />}
        items={[
          {
            label: "Instalação completa",
            value: loading && !storage ? "Calculando..." : formatBytes(storage?.installationSizeBytes),
            tone: "idle",
          },
          { label: "Dados e campanhas", value: formatBytes(storage?.dataSizeBytes), tone: "idle" },
          { label: "Backups", value: formatBytes(storage?.backupsSizeBytes), tone: "idle" },
          { label: "Logs", value: formatBytes(storage?.logsSizeBytes), tone: "idle" },
        ]}
      />
      <div className="storage-panel__footer">
        <div>
          <span>Caminho:</span>
          <code>{rootPath || "caminho não disponível"}</code>
        </div>
        <ActionButton icon={<FolderOpen size={18} />} variant="ghost" onClick={onOpenFolder}>
          Abrir pasta
        </ActionButton>
      </div>
    </section>
  );
}
