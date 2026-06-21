import { X } from "lucide-react";
import { useState } from "react";

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
      <p className="help-intro">
        O M&amp;G Pocket funciona como um servidor local no seu computador. O launcher instala,
        inicia e gerencia tudo — banco de dados, site e serviços — sem precisar de internet.
      </p>

      <div className="help-steps">
        <div className="help-step">
          <div className="help-step__number">1</div>
          <div className="help-step__body">
            <h3>Instalar o M&amp;G Pocket</h3>
            <p>
              Clique em <strong>Instalar M&amp;G Pocket</strong>. O launcher baixará os arquivos
              do sistema e preparará o banco de dados local.
            </p>
            <p className="help-step__tip">
              A primeira instalação pode levar alguns minutos. Não feche o launcher durante
              o processo.
            </p>
          </div>
        </div>

        <div className="help-step">
          <div className="help-step__number">2</div>
          <div className="help-step__body">
            <h3>Iniciar o servidor</h3>
            <p>
              Após instalar, clique em <strong>Iniciar servidor</strong>. O launcher vai ligar
              o banco de dados, o site e todos os serviços necessários.
            </p>
            <p className="help-step__tip">
              Você só precisa fazer isso uma vez por sessão. O servidor fica ativo enquanto o
              launcher estiver aberto.
            </p>
          </div>
        </div>

        <div className="help-step">
          <div className="help-step__number">3</div>
          <div className="help-step__body">
            <h3>Abrir no navegador</h3>
            <p>
              Quando o status exibir <strong>Servidor online</strong>, clique em{" "}
              <strong>Abrir no navegador</strong>. O M&amp;G Pocket abrirá no endereço local
              — normalmente <code>http://localhost:3000</code>.
            </p>
          </div>
        </div>

        <div className="help-step">
          <div className="help-step__number">4</div>
          <div className="help-step__body">
            <h3>Parar ao terminar</h3>
            <p>
              Quando não estiver usando, clique em <strong>Parar servidor</strong>. Seus
              personagens, campanhas e imagens continuarão salvos.
            </p>
            <p className="help-step__tip">
              Nas próximas vezes, basta abrir o launcher e iniciar o servidor — não é
              necessário reinstalar.
            </p>
          </div>
        </div>
      </div>

      <div className="help-divider" />

      <div className="help-note">
        <strong>Dados locais:</strong> tudo fica salvo no seu computador. Nenhum dado é enviado
        para servidores externos. Crie backups regularmente para não perder seu progresso.
      </div>

      <label className="help-checkbox">
        <input
          type="checkbox"
          checked={hideFirstSteps}
          onChange={(e) => onToggleHideFirstSteps(e.target.checked)}
        />
        <span>Não mostrar novamente ao abrir o launcher</span>
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
            O processo inclui download dos arquivos, configuração do banco de dados e
            inicialização dos serviços.
          </p>
          <p>
            <strong>Atualizar</strong> (botão no painel lateral) busca uma versão mais
            recente e substitui apenas os arquivos do sistema. Seus dados locais são
            preservados.
          </p>
          <p>
            <strong>Reparar instalação</strong> baixa novamente os arquivos necessários e
            reinicia os serviços. Use quando algo não estiver funcionando corretamente.
            Seus dados não são apagados.
          </p>
          <div className="help-note">
            Recomendamos criar um backup antes de atualizar ou reparar.
          </div>
        </>
      );

    case "localServer":
      return (
        <>
          <p>
            O servidor local executa somente no seu computador e não fica acessível pela
            internet. Ele é composto por três serviços:
          </p>
          <ul>
            <li><strong>Banco de dados</strong> — armazena campanhas, personagens e sessões.</li>
            <li><strong>Aplicativo Next.js</strong> — a interface web do M&amp;G Pocket.</li>
            <li><strong>Nginx</strong> — serve as imagens enviadas localmente.</li>
          </ul>
          <p>
            <strong>Iniciar servidor</strong> liga todos os serviços. O launcher aguarda
            automaticamente até que tudo esteja pronto.
          </p>
          <p>
            <strong>Parar servidor</strong> encerra os serviços com segurança. Nenhum dado
            é perdido.
          </p>
        </>
      );

    case "images":
      return (
        <>
          <p>
            O Nginx é um componente interno do M&amp;G Pocket. Ele é responsável por servir
            as imagens que você envia — avatares de personagens, mapas e ilustrações.
          </p>
          <h3>Windows: permissão de rede</h3>
          <p>
            Na primeira execução no Windows, o sistema pode exibir um aviso de firewall.
            Permita o acesso somente em <strong>redes privadas</strong>. Não é necessário
            permitir em redes públicas.
          </p>
          <p>
            O Nginx opera apenas no endereço local <code>127.0.0.1</code> e não expõe
            nenhum serviço para a internet ou para outros dispositivos da rede.
          </p>
        </>
      );

    case "backup":
      return (
        <>
          <p>
            O backup salva uma cópia do banco de dados com todos os seus personagens,
            campanhas, sessões e configurações.
          </p>
          <h3>Criar backup</h3>
          <p>
            Clique em <strong>Criar backup</strong> no painel lateral. O arquivo será salvo
            na pasta de backups do M&amp;G Pocket no seu computador.
          </p>
          <h3>Restaurar backup</h3>
          <p>
            Clique em <strong>Restaurar backup</strong> e forneça o caminho do arquivo
            <code>.sql</code> ou <code>.dump</code> gerado anteriormente. Isso substituirá
            os dados atuais pelos dados do backup.
          </p>
          <div className="help-note">
            Recomendamos copiar o arquivo de backup para um local seguro fora da pasta do
            M&amp;G Pocket antes de qualquer operação destrutiva.
          </div>
        </>
      );

    case "commonProblems":
      return (
        <>
          <h3>O M&amp;G Pocket não abre</h3>
          <ol>
            <li>Verifique se o servidor está iniciado (status: <em>Servidor online</em>).</li>
            <li>Tente clicar em <strong>Iniciar servidor</strong> novamente.</li>
            <li>Abra os <strong>Logs</strong> para identificar o erro.</li>
            <li>Use <strong>Reparar instalação</strong> nos Logs.</li>
          </ol>

          <h3>A instalação ficou parada</h3>
          <p>
            Download, verificação antivírus (Windows) e extração podem levar vários minutos.
            Aguarde pelo menos 10 minutos antes de cancelar.
          </p>

          <h3>Porta local em uso</h3>
          <p>
            Outro programa pode estar usando a mesma porta. Encerre outros aplicativos locais
            ou reinicie o computador e tente novamente.
          </p>

          <h3>Banco de dados não iniciou</h3>
          <p>
            Abra os <strong>Logs</strong> para mais detalhes. Use <strong>Reparar
            instalação</strong> caso o problema persista.
          </p>
        </>
      );

    case "logs":
      return (
        <>
          <p>
            Os logs técnicos registram todas as operações do launcher em detalhes. Use-os
            para investigar erros e compartilhar com suporte.
          </p>
          <h3>Filtros disponíveis</h3>
          <ul>
            <li><strong>Todos</strong> — exibe todos os registros.</li>
            <li><strong>Informações</strong> — apenas mensagens informativas.</li>
            <li><strong>Avisos</strong> — alertas que merecem atenção.</li>
            <li><strong>Erros</strong> — falhas e problemas encontrados.</li>
          </ul>
          <h3>Ações</h3>
          <ul>
            <li><strong>Copiar logs</strong> — copia o conteúdo visível.</li>
            <li><strong>Exportar logs</strong> — salva em arquivo de texto.</li>
            <li><strong>Limpar visualização</strong> — limpa o que é exibido (não apaga arquivos).</li>
          </ul>
        </>
      );

    case "delete":
      return (
        <>
          <p>
            <strong>Excluir instalação</strong> remove permanentemente a pasta local do
            M&amp;G Pocket, incluindo banco de dados, imagens, personagens, campanhas e
            configurações.
          </p>
          <p>
            O launcher em si não é removido. Você pode instalar o M&amp;G Pocket novamente
            quando quiser.
          </p>
          <div className="help-note help-note--danger">
            Esta ação é irreversível. Crie um backup e copie-o para outro local antes de
            excluir.
          </div>
        </>
      );

    case "about":
      return (
        <>
          <p>
            O <strong>M&amp;G Pocket</strong> é um sistema para gerenciar campanhas de RPG
            de mesa. O launcher gerencia a instalação e os serviços locais necessários.
          </p>
          <h3>Como funciona</h3>
          <p>
            Tudo é executado localmente no seu computador — banco de dados, site e serviços.
            Nenhum dado é enviado para servidores externos.
          </p>
          <h3>Privacidade</h3>
          <p>
            Seus personagens, campanhas e imagens ficam salvos apenas no seu computador.
            O M&amp;G Pocket não requer conta online e não coleta dados de uso.
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
          <div className="help-dialog__content-header">
            <h2 id="help-dialog-title">{TITLES[currentTopic]}</h2>
            <button
              type="button"
              className="help-dialog__close-btn"
              onClick={onClose}
              aria-label="Fechar ajuda"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

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
