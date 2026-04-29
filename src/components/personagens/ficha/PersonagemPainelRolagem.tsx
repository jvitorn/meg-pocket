"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Dice6, Dices, Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RolagemAcao } from "@/components/RolagemDados";
import { useMediaQuery } from "@/hooks/use-media-query";

const DADOS_DISPONIVEIS = [3, 4, 6, 8, 10, 12, 20] as const;

type TipoDado = (typeof DADOS_DISPONIVEIS)[number];

type Props = {
  dadosDisponiveis?: readonly TipoDado[];
  quantidadeInicial?: number;
  quantidadeMaxima?: number;
  canEdit?:boolean;
};

type PainelInternoProps = {
  lados: TipoDado;
  quantidade: number;
  quantidadeMaxima: number;
  dadosDisponiveis: readonly TipoDado[];
  setLados: (value: TipoDado) => void;
  setQuantidade: Dispatch<SetStateAction<number>>;
  canEdit:boolean;
};

function PainelInterno({
  lados,
  quantidade,
  quantidadeMaxima,
  dadosDisponiveis,
  setLados,
  setQuantidade,
  canEdit,
}: PainelInternoProps) {
  const notacao = useMemo(() => `${quantidade}d${lados}`, [quantidade, lados]);

  function diminuirQuantidade() {
    setQuantidade((current) => Math.max(1, current - 1));
  }

  function aumentarQuantidade() {
    setQuantidade((current) => Math.min(quantidadeMaxima, current + 1));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Tipo de dado
        </p>

        <div className="grid grid-cols-3 gap-2">
          {dadosDisponiveis.map((dado) => {
            const ativo = lados === dado;

            return (
              <motion.div
                key={dado}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLados(dado)}
                  className={[
                    "relative h-11 w-full overflow-hidden rounded-xl border transition-all",
                    ativo
                      ? "border-fuchsia-400/60 bg-fuchsia-500 text-white hover:bg-fuchsia-500/90"
                      : "border-border/80 bg-background/60 hover:border-fuchsia-400/30 hover:bg-fuchsia-500/5",
                  ].join(" ")}
                >
                  {ativo ? (
                    <motion.span
                      layoutId="rolagem-dado-ativo"
                      className="absolute inset-0 rounded-xl bg-fuchsia-500"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  ) : null}

                  <span className="relative z-10 text-sm font-semibold">d{dado}</span>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Quantidade
        </p>

        <div className="flex items-center gap-2">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={diminuirQuantidade}
              disabled={quantidade <= 1}
              aria-label="Diminuir quantidade"
              className="h-11 w-11 rounded-xl"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </motion.div>

          <motion.div
            key={quantidade}
            initial={{ scale: 0.96, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.16 }}
            className="flex h-11 min-w-19 items-center justify-center rounded-xl border border-fuchsia-500/20 bg-background/80 px-3 text-base font-bold text-foreground"
          >
            {quantidade}
          </motion.div>

          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={aumentarQuantidade}
              disabled={quantidade >= quantidadeMaxima}
              aria-label="Aumentar quantidade"
              className="h-11 w-11 rounded-xl"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>

      <motion.div
        layout
        className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
      >
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Rolando
        </p>
        <p className="mt-1 text-base font-semibold text-foreground">
          {quantidade} dado{quantidade > 1 ? "s" : ""} de {lados} lados
        </p>
        <p className="mt-1 text-sm font-medium text-fuchsia-700 dark:text-fuchsia-200/90">
          {notacao}
        </p>
      </motion.div>

      <RolagemAcao
        notacao={notacao}
        titulo="Resultado da rolagem"
        descricao="Confira abaixo o resultado da rolagem manual da ficha."
        buttonLabel={`Rolar ${notacao}`}
        disabled={!canEdit}
        buttonVariant="default"
      />
    </div>
  );
}

export function PersonagemPainelRolagem({
  dadosDisponiveis = DADOS_DISPONIVEIS,
  quantidadeInicial = 1,
  quantidadeMaxima = 6,
  canEdit,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [open, setOpen] = useState(false);
  const [lados, setLados] = useState<TipoDado>(20);
  const [quantidade, setQuantidade] = useState<number>(quantidadeInicial);
  const notacao = `${quantidade}d${lados}`;

  const trigger = (
    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
      <Button
        type="button"
        variant="outline"
        disabled={!canEdit}
        className="h-10 w-full rounded-full border-fuchsia-300 bg-fuchsia-500 px-4 text-white hover:border-fuchsia-400 hover:bg-fuchsia-500/90 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/90"
      >
        <Dices className="mr-2 h-4 w-4" />
        Abrir painel ({notacao})
      </Button>
    </motion.div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <section
          id="rolagem"
          className="rounded-2xl border border-fuchsia-200 bg-linear-to-br from-fuchsia-100 via-card to-card p-4 shadow-sm dark:border-fuchsia-500/20 dark:from-fuchsia-500/10 dark:via-card/92 dark:to-card/82"
        >
          <div className="mb-4 space-y-1">
            <div className="flex items-center gap-2">
              <Dice6 className=" text-fuchsia-500 dark:text-fuchsia-400/90" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-700 dark:text-fuchsia-100">
                Rolagem
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/80 p-4 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/[0.07]">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-fuchsia-700/80 dark:text-fuchsia-100/75">
                Próxima rolagem
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {notacao}
              </p>
              <p className="mt-1 text-sm text-fuchsia-700/80 dark:text-fuchsia-100/80">
                {quantidade} dado{quantidade > 1 ? "s" : ""} de {lados} lados.
              </p>
            </div>

            <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          </div>
        </section>

        <DrawerContent>
          <div className="mx-auto w-full max-w-xl">
            <DrawerHeader>
              <DrawerTitle>Rolagem rápida</DrawerTitle>
              <DrawerDescription>
                Monte sua rolagem sem poluir a ficha.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-2">
              <PainelInterno
                lados={lados}
                quantidade={quantidade}
                quantidadeMaxima={quantidadeMaxima}
                dadosDisponiveis={dadosDisponiveis}
                setLados={setLados}
                setQuantidade={setQuantidade}
                canEdit
              />
            </div>

            <DrawerFooter />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <section
        id="rolagem"
        className="rounded-2xl border border-fuchsia-200 bg-linear-to-br from-fuchsia-100 via-card to-card p-4 shadow-sm dark:border-fuchsia-500/20 dark:from-fuchsia-500/10 dark:via-card/92 dark:to-card/82"
      >
        <div className="mb-4 space-y-1">
          <div className="flex items-center gap-2">
            <Dice6 className=" text-fuchsia-500 dark:text-fuchsia-400/90" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-700 dark:text-fuchsia-100">
              Rolagem
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/80 p-4 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/[0.07]">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-fuchsia-700/80 dark:text-fuchsia-100/75">
              Próxima rolagem
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {notacao}
            </p>
            <p className="mt-1 text-sm text-fuchsia-700/80 dark:text-fuchsia-100/80">
              {quantidade} dado{quantidade > 1 ? "s" : ""} de {lados} lados.
            </p>
          </div>

          <SheetTrigger asChild>{trigger}</SheetTrigger>
        </div>
      </section>

      <SheetContent side="right" className="w-full border-l-fuchsia-500/10 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Rolagem rápida</SheetTitle>
          <SheetDescription>
            Monte sua rolagem manual em um painel dedicado.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <PainelInterno
            lados={lados}
            quantidade={quantidade}
            quantidadeMaxima={quantidadeMaxima}
            dadosDisponiveis={dadosDisponiveis}
            setLados={setLados}
            setQuantidade={setQuantidade}
            canEdit
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
