import Image from "next/image";

export default function Home() {
  return (
    <div className="flex items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-full gap-6 flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Vamos iniciar a aventura do rpg
          </h1>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Selecione a &nbsp;
            <span className="font-medium text-zinc-950 dark:text-zinc-50">
               campanha
            </span>
             &nbsp; na qual voce está no momento.
          </p>
        </div>
        <div className="flex mt-4 flex-col text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-6 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="/campanhas"
            target="_blank"
            rel="noopener noreferrer"
          >
            Campanhas
          </a>
        </div>
      </main>
    </div>
  );
}
