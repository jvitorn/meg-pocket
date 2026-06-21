import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export type HelpTopic =
  | "firstSteps"
  | "installAndUpdate"
  | "localServer"
  | "images"
  | "backup"
  | "commonProblems"
  | "logs"
  | "delete"
  | "about";

type LauncherHelpDialogProps = {
  topic: HelpTopic | null;
  onClose: () => void;
  hideFirstSteps: boolean;
  onToggleHideFirstSteps: (hide: boolean) => void;
};

const TOPICS: { id: HelpTopic; label: string }[] = [
  { id: "firstSteps", label: "Primeiros passos" },
  { id: "installAndUpdate", label: "Instalação e atualização" },
  { id: "localServer", label: "Servidor local" },
  { id: "images", label: "Imagens e Nginx" },
  { id: "backup", label: "Backup e restauração" },
  { id: "commonProblems", label: "Problemas comuns" },
  { id: "logs", label: "Logs e diagnóstico" },
  { id: "delete", label: "Exclusão dos dados" },
  { id: "about", label: "Sobre o M&G Pocket" },
];

const TITLES: Record<HelpTopic, string> = {
  firstSteps: "Primeiros passos",
  installAndUpdate: "Instalação e atualização",
  localServer: "Servidor local",
  images: "Imagens e Nginx",
  backup: "Backup e restauração",
  commonProblems: "Problemas comuns",
  logs: "Logs e diagnóstico",
  delete: "Exclusão dos dados",
  about: "Sobre o M&G Pocket",
};

function FirstStepsContent({
  hideFirstSteps,
  onToggleHideFirstSteps,
}: {
  hideFirstSteps: boolean;
  onToggleHideFirstSteps: (v: boolean) => void;
}) {
  return (
    <>
      <p>
        O M&amp;G Pocket funciona diretamente neste computador. O launcher prepara o sistema, inicia
        os serviços locais e abre o site no navegador.
      </p>

      <h3>1. Instale o M&amp;G Pocket</h3>
      <p>
        Clique em <strong>Instalar M&amp;G Pocket</strong>. O launcher baixará os arquivos
        necessários e preparará o banco de dados local.
      </p>
      <p>
        Na primeira instalação, esse processo pode levar alguns minutos. Não feche o launcher
        enquanto a preparação estiver em andamento.
      </p>

      <h3>2. Inicie o servidor local</h3>
      <p>
        Depois da instalação, clique em <strong>Iniciar servidor</strong>.
      </p>
      <p>
        Isso liga apenas os serviços necessários para o M&amp;G Pocket funcionar neste computador.
      </p>

      <h3>3. Abra no navegador</h3>
      <p>
        Quando o status mostrar <strong>Servidor online</strong>, clique em{" "}
        <strong>Abrir no navegador</strong>.
      </p>
      <p>O endereço será local, normalmente http://localhost:3000.</p>

      <h3>4. Pare o servidor ao terminar</h3>
      <p>
        Quando não estiver mais usando o M&amp;G Pocket, clique em <strong>Parar servidor</strong>.
      </p>
      <p>
        Seus personagens, campanhas, imagens e demais dados continuarão salvos no computador.
      </p>

      <p>
        <em>
          Você não precisa reinstalar o sistema toda vez. Nas próximas vezes, basta abrir o launcher
          e iniciar o servidor.
        </em>
      </p>

      <label className="help-checkbox">
        <input
          type="checkbox"
          checked={hideFirstSteps}
          onChange={(e) => onToggleHideFirstSteps(e.target.checked)}
        />
        <span>Não mostrar novamente</span>
      </label>
    </>
  );
}

function topicContent(
  topic: HelpTopic,
  hideFirstSteps: boolean,
  onToggleHideFirstSteps: (v: boolean) => void,
) {
  switch (topic) {
    case "firstSteps":
      return (
        <FirstStepsContent
          hideFirstSteps={hideFirstSteps}
          onToggleHideFirstSteps={onToggleHideFirstSteps}
        />
      );

    case "installAndUpdate":
      return (
        <>
          <p>
            <strong>Instalar</strong> baixa e prepara o M&amp;G Pocket pela primeira vez.
          </p>
          <p>
            <strong>Atualizar</strong> busca uma versão mais recente e substitui apenas os arquivos
            do sistema. Os dados locais devem ser preservados.
          </p>
          <p>
            <strong>Reparar instalação</strong> baixa novamente os arquivos necessários quando algo
            não estiver funcionando corretamente.
          </p>
        </>
      );

    case "localServer":
      return (
        <>
          <p>O servidor local é executado somente no seu computador.</p>
          <p>
            <strong>Iniciar</strong> liga o banco de dados, o site e os serviços necessários.
          </p>
          <p>
            <strong>Parar</strong> encerra esses serviços, mas não apaga seus dados.
          </p>
        </>
      );

    case "images":
      return (
        <>
          <p>
            O Nginx é um componente interno que o M&amp;G Pocket usa para exibir imagens enviadas
            localmente. Ele funciona somente neste computador.
          </p>
          <p>
            No Windows, o sistema pode pedir permissão na primeira execução. Permita somente em{" "}
            <strong>redes privadas</strong>. Não é necessário permitir em redes públicas.
          </p>
          <p>
            Ele não publica suas campanhas ou personagens na internet.
          </p>
        </>
      );

    case "backup":
      return (
        <>
          <p>
            <strong>Criar backup</strong> salva uma cópia do banco de dados.
          </p>
          <p>
            <strong>Restaurar backup</strong> substitui os dados atuais pelos dados presentes na
            cópia escolhida.
          </p>
          <p>
            Recomendamos criar um backup e copiá-lo para outro local antes de qualquer operação
            destrutiva.
          </p>
        </>
      );

    case "commonProblems":
      return (
        <>
          <h3>O sistema não abriu</h3>
          <ol>
            <li>Tente iniciar o servidor novamente.</li>
            <li>Verifique os logs para mais detalhes.</li>
            <li>Use Reparar instalação.</li>
          </ol>

          <h3>A instalação parece parada</h3>
          <p>
            Download, verificação pelo Windows e extração podem levar alguns minutos. Aguarde antes
            de cancelar.
          </p>

          <h3>A porta local está em uso</h3>
          <p>
            Outro programa pode estar usando a mesma porta. Encerre outros aplicativos ou reinicie o
            computador.
          </p>

          <h3>O banco de dados não iniciou</h3>
          <p>Verifique os logs e use Reparar instalação.</p>
        </>
      );

    case "logs":
      return (
        <>
          <p>
            Os logs técnicos registram o que o launcher fez em cada operação. Use-os para
            investigar erros.
          </p>
          <p>
            <strong>Copiar logs</strong> copia o conteúdo visível para a área de transferência.
          </p>
          <p>
            <strong>Exportar logs</strong> salva os logs em um arquivo de texto.
          </p>
          <p>
            <strong>Limpar visualização</strong> limpa apenas o que está sendo exibido. Não apaga
            arquivos de log.
          </p>
        </>
      );

    case "delete":
      return (
        <>
          <p>
            <strong>Excluir instalação</strong> para os serviços e remove permanentemente a pasta
            local do M&amp;G Pocket, incluindo o banco de dados, imagens, personagens, campanhas,
            configurações e backups armazenados nessa pasta.
          </p>
          <p>
            O launcher em si não é removido. Você pode instalar novamente depois.
          </p>
          <p>
            Recomendamos criar um backup e copiá-lo para outro local antes de excluir.
          </p>
        </>
      );

    case "about":
      return (
        <>
          <p>O M&amp;G Pocket Launcher prepara e gerencia o M&amp;G Pocket neste computador.</p>
          <p>
            Tudo funciona localmente: banco de dados, site e imagens ficam salvos no seu
            computador e não são enviados para nenhum servidor externo.
          </p>
        </>
      );
  }
}

export function LauncherHelpDialog({
  topic,
  onClose,
  hideFirstSteps,
  onToggleHideFirstSteps,
}: LauncherHelpDialogProps) {
  const [activeTopic, setActiveTopic] = useState<HelpTopic>(topic ?? "firstSteps");

  const currentTopic = topic !== null ? (activeTopic ?? topic) : activeTopic;

  if (topic === null) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >
        <div className="help-dialog__nav">
          <p className="help-dialog__nav-label">Ajuda</p>
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`help-dialog__nav-item${currentTopic === t.id ? " help-dialog__nav-item--active" : ""}`}
              onClick={() => setActiveTopic(t.id)}
              aria-current={currentTopic === t.id ? "page" : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="help-dialog__content">
          <h2 id="help-dialog-title">{TITLES[currentTopic]}</h2>
          <div className="help-dialog__body">
            {topicContent(currentTopic, hideFirstSteps, onToggleHideFirstSteps)}
          </div>
          <div className="help-dialog__footer">
            <button
              type="button"
              className="dialog-button--primary"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
