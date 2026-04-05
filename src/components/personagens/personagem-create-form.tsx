"use client";

import { type ComponentType, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CircleHelp,
  Droplet,
  Flame,
  Leaf,
  Mountain,
  Skull,
  Sparkles,
  Sun,
  Sword,
  User,
  UserRound,
  Wind,
  type LucideIcon,
} from "lucide-react";

import LogoArtifice from "@/components/icons/artifice";
import LogoElementalista from "@/components/icons/elementalista";
import LogoGuerreiro from "@/components/icons/guerreiro";
import LogoPurificador from "@/components/icons/purificador";

import { cn } from "@/lib/utils";
import {
  calcularQuantidadeObrigatoriaPericias,
  formatPericiaTipo,
  isValidExternalUrl,
  normalizePericiaTipo,
} from "@/lib/regras/personagemCriacao";
import { Button } from "@/components/ui/button";
import { MagiaDetailsDrawer } from "@/components/magia-details-drawer";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CampanhaOption = {
  id: number;
  nome: string;
  sinopse?: string | null;
  mestre?: string | null;
  count_jogadores?: number | null;
};

type ClasseOption = {
  id: number;
  slug?: string | null;
  tags?: unknown;
  nome: string;
  subtitulo?: string | null;
  descricao?: string | null;
  hp?: number | null;
  mana?: number | null;
  Magias?: MagiaOption[] | null;
};

type RacaOption = {
  id: number;
  nome: string;
  descricao?: string | null;
  hp?: number | null;
  mana?: number | null;
};

type MagiaOption = {
  id: number;
  nome: string;
  descricao?: string | null;
  alcance?: string | null;
  custo_nivel?: number | null;
};

type PericiaOption = {
  id: number;
  nome: string;
  tipo?: string | null;
  descricao?: string | null;
};

export type PersonagemFormInitialData = {
  id: number;
  nome: string;
  apelido?: string | null;
  descricao?: string | null;
  url_imagem?: string | null;
  campanhaId: number;
  classeId: number;
  racaId: number;
  elemento: string;
  magiaIds: number[];
  periciaIds: number[];
};

type Props = {
  campanhas: CampanhaOption[];
  classes: ClasseOption[];
  racas: RacaOption[];
  pericias: PericiaOption[];
  initialData?: PersonagemFormInitialData | null;
};

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type DetailsModalState =
  | { kind: "classe"; item: ClasseOption }
  | { kind: "raca"; item: RacaOption }
  | { kind: "magia"; item: MagiaOption }
  | { kind: "pericia"; item: PericiaOption };

type ClasseTheme = {
  icon: ComponentType<{ className?: string }>;
  iconColorClass: string;
  selectedRingClass: string;
  chipClass: string;
  glowClass: string;
};

type RacaTheme = {
  icon: LucideIcon;
  iconColorClass: string;
  selectedRingClass: string;
  chipClass: string;
  surfaceClass: string;
  frameClass: string;
};

const steps = [
  { id: 1 as const, title: "Raça", helper: "Linhagem e herança" },
  { id: 2 as const, title: "Classe", helper: "Trilha de combate" },
  { id: 3 as const, title: "Magias", helper: "Grimório inicial" },
  { id: 4 as const, title: "Perícia", helper: "Treino por categoria" },
  { id: 5 as const, title: "Origem", helper: "Campanha e afinidade" },
  { id: 6 as const, title: "Finalizar", helper: "Identidade da ficha" },
];

const elementOptions = [
  { value: "natureza", label: "Natureza", icon: Leaf },
  { value: "agua", label: "Água", icon: Droplet },
  { value: "fogo", label: "Fogo", icon: Flame },
  { value: "vento", label: "Vento", icon: Wind },
] as const;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toSlugLabel(classe: ClasseOption) {
  if (classe.slug?.trim()) return classe.slug.trim().toLowerCase();
  return normalizeText(classe.nome).replace(/\s+/g, "-");
}

function getClasseTags(classe: ClasseOption) {
  const baseTags = Array.isArray(classe.tags)
    ? classe.tags
    : classe.tags &&
        typeof classe.tags === "object" &&
        "tags" in classe.tags &&
        Array.isArray((classe.tags as { tags?: unknown[] }).tags)
      ? (classe.tags as { tags?: unknown[] }).tags ?? []
      : [];

  const tagsNormalizadas = Array.from(
    new Set(
      baseTags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );

  if (tagsNormalizadas.length > 0) {
    return tagsNormalizadas.slice(0, 3);
  }

  if (classe.subtitulo?.trim()) {
    const fromSubtitulo = classe.subtitulo
      .split(/[|,/•]/g)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (fromSubtitulo.length > 0) {
      return Array.from(new Set(fromSubtitulo)).slice(0, 3);
    }
  }

  return [toSlugLabel(classe)];
}

function isClasseUnica(classe: ClasseOption) {
  const key = normalizeText(`${classe.slug ?? ""} ${classe.nome}`);
  return key.includes("unico");
}

function getClasseTheme(classe: ClasseOption): ClasseTheme {
  const key = normalizeText(`${classe.slug ?? ""} ${classe.nome}`);

  if (key.includes("guerrei")) {
    return {
      icon: LogoGuerreiro,
      iconColorClass: "text-rose-600 dark:text-rose-400",
      selectedRingClass: "ring-2 ring-rose-500/70 border-rose-500/70",
      chipClass:
        "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-100",
      glowClass: "from-rose-500/20 via-rose-500/5 to-transparent",
    };
  }

  if (key.includes("element")) {
    return {
      icon: LogoElementalista,
      iconColorClass: "text-sky-600 dark:text-sky-400",
      selectedRingClass: "ring-2 ring-sky-500/70 border-sky-500/70",
      chipClass: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-100",
      glowClass: "from-sky-500/20 via-sky-500/5 to-transparent",
    };
  }

  if (key.includes("purific")) {
    return {
      icon: LogoPurificador,
      iconColorClass: "text-emerald-600 dark:text-emerald-400",
      selectedRingClass: "ring-2 ring-emerald-500/70 border-emerald-500/70",
      chipClass:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100",
      glowClass: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    };
  }

  if (key.includes("artifice") || key.includes("artific")) {
    return {
      icon: LogoArtifice,
      iconColorClass: "text-amber-600 dark:text-amber-400",
      selectedRingClass: "ring-2 ring-amber-500/70 border-amber-500/70",
      chipClass:
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-100",
      glowClass: "from-amber-500/20 via-amber-500/5 to-transparent",
    };
  }

  return {
    icon: CircleHelp,
    iconColorClass: "text-zinc-700 dark:text-zinc-300",
    selectedRingClass: "ring-2 ring-zinc-500/70 border-zinc-500/70",
    chipClass: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-200",
    glowClass: "from-zinc-500/20 via-zinc-500/5 to-transparent",
  };
}

function getRacaTheme(raca: RacaOption): RacaTheme {
  const key = normalizeText(raca.nome);

  if (key.includes("lumis") || key.includes("lumi")) {
    return {
      icon: Sun,
      iconColorClass: "text-amber-600 dark:text-amber-300",
      selectedRingClass: "ring-2 ring-amber-500/70 border-amber-500/70",
      chipClass:
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-100",
      surfaceClass: "from-amber-500/15 via-background/90 to-background",
      frameClass: "border-amber-500/30",
    };
  }

  if (key.includes("umbra")) {
    return {
      icon: Skull,
      iconColorClass: "text-slate-700 dark:text-slate-300",
      selectedRingClass: "ring-2 ring-slate-500/70 border-slate-500/70",
      chipClass:
        "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-100",
      surfaceClass: "from-slate-500/15 via-background/90 to-background",
      frameClass: "border-slate-500/30",
    };
  }

  if (key.includes("humano") || key.includes("human")) {
    return {
      icon: User,
      iconColorClass: "text-sky-600 dark:text-sky-300",
      selectedRingClass: "ring-2 ring-sky-500/70 border-sky-500/70",
      chipClass: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-100",
      surfaceClass: "from-sky-500/15 via-background/90 to-background",
      frameClass: "border-sky-500/30",
    };
  }

  if (key.includes("elf")) {
    return {
      icon: Leaf,
      iconColorClass: "text-emerald-600 dark:text-emerald-300",
      selectedRingClass: "ring-2 ring-emerald-500/70 border-emerald-500/70",
      chipClass:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100",
      surfaceClass: "from-emerald-500/15 via-background/90 to-background",
      frameClass: "border-emerald-500/30",
    };
  }

  if (key.includes("anao")) {
    return {
      icon: Mountain,
      iconColorClass: "text-amber-600 dark:text-amber-300",
      selectedRingClass: "ring-2 ring-amber-500/70 border-amber-500/70",
      chipClass:
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-100",
      surfaceClass: "from-amber-500/15 via-background/90 to-background",
      frameClass: "border-amber-500/30",
    };
  }

  if (key.includes("orc") || key.includes("ogr") || key.includes("bruto")) {
    return {
      icon: Sword,
      iconColorClass: "text-red-600 dark:text-red-300",
      selectedRingClass: "ring-2 ring-red-500/70 border-red-500/70",
      chipClass: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-100",
      surfaceClass: "from-red-500/15 via-background/90 to-background",
      frameClass: "border-red-500/30",
    };
  }

  if (key.includes("sombr") || key.includes("vamp") || key.includes("nec")) {
    return {
      icon: Flame,
      iconColorClass: "text-violet-600 dark:text-violet-300",
      selectedRingClass: "ring-2 ring-violet-500/70 border-violet-500/70",
      chipClass:
        "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-100",
      surfaceClass: "from-violet-500/15 via-background/90 to-background",
      frameClass: "border-violet-500/30",
    };
  }

  if (key.includes("espir") || key.includes("fada")) {
    return {
      icon: Sparkles,
      iconColorClass: "text-cyan-600 dark:text-cyan-300",
      selectedRingClass: "ring-2 ring-cyan-500/70 border-cyan-500/70",
      chipClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-100",
      surfaceClass: "from-cyan-500/15 via-background/90 to-background",
      frameClass: "border-cyan-500/30",
    };
  }

  return {
    icon: UserRound,
    iconColorClass: "text-zinc-700 dark:text-zinc-200",
    selectedRingClass: "ring-2 ring-zinc-500/70 border-zinc-500/70",
    chipClass: "border-zinc-500/40 bg-zinc-500/10 text-zinc-700 dark:text-zinc-100",
    surfaceClass: "from-zinc-500/15 via-background/90 to-background",
    frameClass: "border-zinc-500/30",
  };
}

function classeResumoCurto(classe: ClasseOption) {
  return (
    classe.subtitulo?.trim() ||
    classe.descricao?.trim() ||
    "Sem descrição breve para esta classe."
  );
}

function racaResumoCurto(raca: RacaOption) {
  return raca.descricao?.trim() || "Sem descrição breve para esta raça.";
}

function magiaResumoCurto(magia: MagiaOption) {
  return magia.descricao?.trim() || "Sem descrição breve para esta magia.";
}

function periciaResumoCurto(pericia: PericiaOption) {
  return pericia.descricao?.trim() || "Sem descrição breve para esta perícia.";
}

function canOpenStep(currentStep: WizardStep, targetStep: WizardStep) {
  return targetStep <= currentStep;
}

export default function PersonagemCreateForm({
  campanhas,
  classes,
  racas,
  pericias,
  initialData = null,
}: Props) {
  const router = useRouter();
  const maxMagias = 3;
  const isEditMode = Boolean(initialData);

  const classesDisponiveis = useMemo(
    () =>
      classes.filter(
        (classe) => !isClasseUnica(classe) || classe.id === initialData?.classeId
      ),
    [classes, initialData?.classeId]
  );

  const [step, setStep] = useState<WizardStep>(initialData ? 6 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState(initialData?.nome ?? "");
  const [apelido, setApelido] = useState(initialData?.apelido ?? "");
  const [descricao, setDescricao] = useState(initialData?.descricao ?? "");
  const [urlImagem, setUrlImagem] = useState(initialData?.url_imagem ?? "");

  const [campanhaId, setCampanhaId] = useState(
    initialData?.campanhaId
      ? String(initialData.campanhaId)
      : campanhas.length === 1
        ? String(campanhas[0].id)
        : ""
  );
  const [classeId, setClasseId] = useState(
    initialData?.classeId
      ? String(initialData.classeId)
      : classesDisponiveis.length === 1
        ? String(classesDisponiveis[0].id)
        : ""
  );
  const [racaId, setRacaId] = useState(
    initialData?.racaId
      ? String(initialData.racaId)
      : racas.length === 1
        ? String(racas[0].id)
        : ""
  );
  const [selectedMagiaIds, setSelectedMagiaIds] = useState<string[]>(
    initialData?.magiaIds?.map(String) ?? []
  );
  const [selectedPericiaIds, setSelectedPericiaIds] = useState<string[]>(
    initialData?.periciaIds?.map(String) ??
      (pericias.length === 1 ? [String(pericias[0].id)] : [])
  );
  const [elemento, setElemento] = useState<string>(initialData?.elemento ?? "natureza");

  const [detailsModal, setDetailsModal] = useState<DetailsModalState | null>(null);

  const selectedCampanha = useMemo(() => {
    const id = Number(campanhaId);
    return campanhas.find((c) => c.id === id) ?? null;
  }, [campanhas, campanhaId]);

  const selectedClasse = useMemo(() => {
    const id = Number(classeId);
    return classesDisponiveis.find((c) => c.id === id) ?? null;
  }, [classesDisponiveis, classeId]);

  const selectedRaca = useMemo(() => {
    const id = Number(racaId);
    return racas.find((r) => r.id === id) ?? null;
  }, [racas, racaId]);
  const selectedPericias = useMemo(() => {
    if (selectedPericiaIds.length === 0) return [];
    const selectedSet = new Set(selectedPericiaIds);
    return pericias.filter((p) => selectedSet.has(String(p.id)));
  }, [pericias, selectedPericiaIds]);

  const selectedClasseMagias = useMemo(
    () => selectedClasse?.Magias ?? [],
    [selectedClasse]
  );
  const selectedClasseTheme = useMemo(
    () => (selectedClasse ? getClasseTheme(selectedClasse) : null),
    [selectedClasse]
  );
  const ClasseAtivaIcon = selectedClasseTheme?.icon ?? null;
  const hasMagiasNaClasse = selectedClasseMagias.length > 0;
  const hasPericiasDisponiveis = pericias.length > 0;
  const periciasAgrupadasPorTipo = useMemo(() => {
    const grupos = new Map<string, PericiaOption[]>();
    pericias.forEach((pericia) => {
      const key = normalizePericiaTipo(pericia.tipo);
      const current = grupos.get(key) ?? [];
      current.push(pericia);
      grupos.set(key, current);
    });

    return Array.from(grupos.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tipo, items]) => ({
        tipo,
        label: formatPericiaTipo(tipo),
        items: [...items].sort((a, b) => a.nome.localeCompare(b.nome)),
      }));
  }, [pericias]);
  const periciaTipoPorId = useMemo(() => {
    const map = new Map<string, string>();
    pericias.forEach((pericia) => {
      map.set(String(pericia.id), normalizePericiaTipo(pericia.tipo));
    });
    return map;
  }, [pericias]);
  const periciaTiposDisponiveisCount = periciasAgrupadasPorTipo.length;
  const requiredPericiasCount = hasPericiasDisponiveis
    ? calcularQuantidadeObrigatoriaPericias(periciaTiposDisponiveisCount)
    : 0;
  const selectedPericiaTiposCount = useMemo(() => {
    const tipos = new Set(
      selectedPericiaIds
        .map((id) => periciaTipoPorId.get(id))
        .filter((tipo): tipo is string => Boolean(tipo))
    );
    return tipos.size;
  }, [periciaTipoPorId, selectedPericiaIds]);
  const hasDuplicatedPericiaTipo = selectedPericiaTiposCount !== selectedPericiaIds.length;
  const selectedMagias = useMemo(() => {
    if (selectedMagiaIds.length === 0) return [];
    const selectedSet = new Set(selectedMagiaIds);
    return selectedClasseMagias.filter((magia) => selectedSet.has(String(magia.id)));
  }, [selectedClasseMagias, selectedMagiaIds]);
  const normalizedUrlImagem = urlImagem.trim();
  const hasUrlImagem = normalizedUrlImagem.length > 0;
  const isUrlImagemValida = !hasUrlImagem || isValidExternalUrl(normalizedUrlImagem);

  useEffect(() => {
    if (selectedMagiaIds.length === 0) return;
    const magiaIdsValidos = new Set(selectedClasseMagias.map((magia) => String(magia.id)));
    setSelectedMagiaIds((prev) => {
      const next = prev.filter((id) => magiaIdsValidos.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [selectedClasseMagias, selectedMagiaIds.length]);

  useEffect(() => {
    setSelectedPericiaIds((prev) => {
      if (prev.length === 0) return prev;

      const next: string[] = [];
      const tiposSelecionados = new Set<string>();

      for (const id of prev) {
        const tipo = periciaTipoPorId.get(id);
        if (!tipo) continue;
        if (tiposSelecionados.has(tipo)) continue;
        next.push(id);
        tiposSelecionados.add(tipo);
        if (next.length >= requiredPericiasCount) break;
      }

      if (next.length === prev.length && next.every((id, index) => id === prev[index])) {
        return prev;
      }

      return next;
    });
  }, [periciaTipoPorId, requiredPericiasCount]);

  const hpBase = (selectedClasse?.hp ?? 0) + (selectedRaca?.hp ?? 0);
  const manaBase = (selectedClasse?.mana ?? 0) + (selectedRaca?.mana ?? 0);

  const isReady =
    campanhas.length > 0 && classesDisponiveis.length > 0 && racas.length > 0;

  const canAdvanceStep1 = Boolean(racaId);
  const canAdvanceStep2 = Boolean(classeId);
  const canAdvanceStep3 = !hasMagiasNaClasse || selectedMagiaIds.length > 0;
  const canAdvanceStep4 =
    !hasPericiasDisponiveis ||
    (selectedPericiaIds.length === requiredPericiasCount && !hasDuplicatedPericiaTipo);
  const canAdvanceStep5 = Boolean(campanhaId && elemento);
  const canSubmit =
    Boolean(isReady) &&
    Boolean(nome.trim()) &&
    Boolean(campanhaId) &&
    Boolean(classeId) &&
    Boolean(racaId) &&
    Boolean(canAdvanceStep3) &&
    Boolean(canAdvanceStep4) &&
    Boolean(isUrlImagemValida);

  const modalClasse = detailsModal?.kind === "classe" ? detailsModal.item : null;
  const modalRaca = detailsModal?.kind === "raca" ? detailsModal.item : null;
  const modalMagia = detailsModal?.kind === "magia" ? detailsModal.item : null;
  const modalPericia = detailsModal?.kind === "pericia" ? detailsModal.item : null;
  const modalClasseTags = modalClasse ? getClasseTags(modalClasse) : [];
  const modalRacaTheme = modalRaca ? getRacaTheme(modalRaca) : null;
  const ModalRacaIcon = modalRacaTheme?.icon ?? null;
  const progressoPercentual = Math.round((Number(step) / steps.length) * 100);
  const mobileStepStartIndex = Math.min(
    Math.max(Number(step) - 2, 0),
    Math.max(steps.length - 3, 0)
  );
  const mobileVisibleSteps = steps.slice(mobileStepStartIndex, mobileStepStartIndex + 3);

  function handleContinue() {
    if (step === 1) {
      if (!canAdvanceStep1) {
        setError("Selecione uma raça para continuar.");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!canAdvanceStep2) {
        setError("Selecione uma classe para continuar.");
        return;
      }
      setError(null);
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!canAdvanceStep3) {
        setError("Selecione de 1 a 3 magias para continuar.");
        return;
      }
      setError(null);
      setStep(4);
      return;
    }

    if (step === 4) {
      if (!canAdvanceStep4) {
        setError(
          `Selecione ${requiredPericiasCount} ${
            requiredPericiasCount === 1 ? "perícia" : "perícias"
          } (no máximo 1 por tipo).`
        );
        return;
      }
      setError(null);
      setStep(5);
      return;
    }

    if (step === 5) {
      if (!canAdvanceStep5) {
        setError("Escolha campanha e elemento para continuar.");
        return;
      }
      setError(null);
      setStep(6);
    }
  }

  function handleBack() {
    if (step === 6) {
      setStep(5);
      return;
    }
    if (step === 5) {
      setStep(4);
      return;
    }
    if (step === 4) {
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(1);
    }
  }

  function handleSelectClasse(nextClasseId: number) {
    const next = String(nextClasseId);
    if (next !== classeId) {
      setSelectedMagiaIds([]);
    }
    setClasseId(next);
  }

  function handleToggleMagia(magiaId: number) {
    const id = String(magiaId);
    setSelectedMagiaIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= maxMagias) return prev;
      return [...prev, id];
    });
  }

  function handleTogglePericia(pericia: PericiaOption) {
    const targetId = String(pericia.id);
    const targetTipo = normalizePericiaTipo(pericia.tipo);

    setSelectedPericiaIds((prev) => {
      if (prev.includes(targetId)) {
        return prev.filter((id) => id !== targetId);
      }

      const sameTypeId = prev.find(
        (id) => periciaTipoPorId.get(id) === targetTipo
      );
      if (sameTypeId) {
        return prev.map((id) => (id === sameTypeId ? targetId : id));
      }

      if (prev.length >= requiredPericiasCount) {
        return prev;
      }

      return [...prev, targetId];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isUrlImagemValida) {
      setError("Informe uma URL válida com http:// ou https://.");
      return;
    }

    if (!canSubmit) {
      setError(
        isEditMode
          ? "Preencha os campos obrigatórios antes de alterar o personagem."
          : "Preencha os campos obrigatórios antes de criar o personagem."
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        nome: nome.trim(),
        apelido: apelido.trim() || null,
        descricao: descricao.trim() || null,
        url_imagem: urlImagem.trim() || null,
        campanhaId,
        classeId,
        racaId,
        magiaIds: selectedMagiaIds.map((id) => Number(id)),
        periciaIds: selectedPericiaIds.map((id) => Number(id)),
        elemento,
      };

      const endpoint = isEditMode
        ? `/api/personagem/${initialData?.id}`
        : "/api/personagem/create";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data?.error ??
            (isEditMode ? "Erro ao alterar personagem." : "Erro ao criar personagem.")
        );
        return;
      }

      if (data?.id) {
        router.push(`/personagens/${data.id}`);
        router.refresh();
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "Erro ao alterar personagem."
            : "Erro ao criar personagem."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!isReady && (
        <FieldDescription className="text-center text-destructive">
          É preciso ter campanhas, classes (exceto as únicas) e raças cadastradas.
        </FieldDescription>
      )}

      <div className="rounded-2xl border border-border/70 bg-background/60 p-3 lg:hidden">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Passo {step} de {steps.length}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:hidden">
              {mobileVisibleSteps.map((item) => {
                const isActive = step === item.id;
                const isCompleted = step > item.id;
                const isOpen = canOpenStep(step, item.id);

                return (
                  <button
                    key={`mobile-${item.id}`}
                    type="button"
                    onClick={() => {
                      if (isOpen) setStep(item.id);
                    }}
                    disabled={!isOpen}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-left transition",
                      isActive && "border-primary bg-primary/10",
                      isCompleted && "border-emerald-500/40 bg-emerald-500/10",
                      !isActive && !isCompleted && "border-border/60 bg-background/70",
                      !isOpen && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                          isCompleted && "bg-emerald-500 text-white",
                          isActive && "bg-primary text-primary-foreground",
                          !isCompleted && !isActive && "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.id}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-tight">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-tight text-muted-foreground/90">
                      {item.helper}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="hidden grid-cols-6 gap-2 sm:grid">
              {steps.map((item) => {
                const isActive = step === item.id;
                const isCompleted = step > item.id;
                const isOpen = canOpenStep(step, item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isOpen) setStep(item.id);
                    }}
                    disabled={!isOpen}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-left transition",
                      isActive && "border-primary bg-primary/10",
                      isCompleted && "border-emerald-500/40 bg-emerald-500/10",
                      !isActive && !isCompleted && "border-border/60 bg-background/70",
                      !isOpen && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                          isCompleted && "bg-emerald-500 text-white",
                          isActive && "bg-primary text-primary-foreground",
                          !isCompleted && !isActive && "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.id}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-tight">{item.title}</p>
                    <p className="mt-1 text-[10px] leading-tight text-muted-foreground/90">
                      {item.helper}
                    </p>
                  </button>
                );
              })}
            </div>
      </div>

      <form onSubmit={handleSubmit}>
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
            <FieldGroup>
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Defina sua classe</h3>
                    <p className="mt-1 text-sm text-muted-foreground/90">
                      A classe determina sua função tática, recursos base e estilo de combate.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {classesDisponiveis.map((classe) => {
                      const isSelected = classeId === String(classe.id);
                      const theme = getClasseTheme(classe);
                      const ClasseIcon = theme.icon;
                      const classeTags = getClasseTags(classe);

                      return (
                        <article
                          key={classe.id}
                          className={cn(
                            "relative overflow-hidden rounded-2xl border bg-background/80 p-4 transition",
                            isSelected
                              ? theme.selectedRingClass
                              : "border-border/60 hover:border-border"
                          )}
                        >
                          <div
                            className={cn(
                              "pointer-events-none absolute inset-0 bg-linear-to-br opacity-80",
                              theme.glowClass
                            )}
                          />

                          <button
                            type="button"
                            onClick={() => handleSelectClasse(classe.id)}
                            className="relative z-10 w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/20">
                                <ClasseIcon className={cn("h-7 w-7", theme.iconColorClass)} />
                              </div>

                              <div className="flex max-w-[65%] flex-wrap justify-end gap-1.5">
                                {classeTags.map((tag) => (
                                  <span
                                    key={`${classe.id}-${tag}`}
                                    className={cn("rounded-full border px-2 py-1 text-[11px]", theme.chipClass)}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="mt-3 font-semibold">{classe.nome}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {classeResumoCurto(classe)}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                              <span className={cn("rounded-full border px-2 py-1", theme.chipClass)}>
                                HP {classe.hp ?? 0}
                              </span>
                              <span className={cn("rounded-full border px-2 py-1", theme.chipClass)}>
                                Mana {classe.mana ?? 0}
                              </span>
                            </div>
                          </button>

                          <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {isSelected ? "Selecionada" : "Toque para selecionar"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setDetailsModal({ kind: "classe", item: classe })}
                            >
                              Ver mais
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Defina sua raça</h3>
                    <p className="mt-1 text-sm text-muted-foreground/90">
                      A raça estabelece herança, cultura e atributos iniciais da ficha.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {racas.map((raca) => {
                      const isSelected = racaId === String(raca.id);
                      const theme = getRacaTheme(raca);
                      const Icon = theme.icon;

                      return (
                        <article
                          key={raca.id}
                          className={cn(
                            "relative overflow-hidden rounded-3xl border bg-linear-to-b p-4 transition",
                            theme.surfaceClass,
                            theme.frameClass,
                            isSelected && theme.selectedRingClass
                          )}
                        >
                          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-white/15" />
                          <div className="pointer-events-none absolute left-1/2 top-3 h-24 w-24 -translate-x-1/2 rounded-full border border-white/10" />

                          <button
                            type="button"
                            onClick={() => setRacaId(String(raca.id))}
                            className="relative z-10 w-full text-left"
                          >
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                              <Icon className={cn("h-7 w-7", theme.iconColorClass)} />
                            </div>

                            <p className="mt-4 text-center text-base font-semibold">{raca.nome}</p>
                            <p className="mt-2 text-center text-xs text-muted-foreground line-clamp-2">
                              {racaResumoCurto(raca)}
                            </p>

                            <div className="mt-4 flex justify-center gap-2 text-xs">
                              <span className={cn("rounded-full border px-2 py-1", theme.chipClass)}>
                                HP {raca.hp ?? 0}
                              </span>
                              <span className={cn("rounded-full border px-2 py-1", theme.chipClass)}>
                                Mana {raca.mana ?? 0}
                              </span>
                            </div>
                          </button>

                          <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {isSelected ? "Selecionada" : "Toque para selecionar"}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setDetailsModal({ kind: "raca", item: raca })}
                            >
                              Ver mais
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold">Monte seu grimório inicial</h3>
                      <p className="mt-1 text-sm text-muted-foreground/90">
                        Escolha até 3 magias disponíveis para a classe selecionada.
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        selectedMagiaIds.length === maxMagias
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                          : "border-border/70 text-muted-foreground"
                      )}
                    >
                      {selectedMagiaIds.length}/{maxMagias} selecionadas
                    </span>
                  </div>

                  {selectedClasse && selectedClasseTheme && (
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
                      <div className="flex items-center gap-3">
                        {ClasseAtivaIcon && (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20">
                            <ClasseAtivaIcon
                              className={cn("h-5 w-5", selectedClasseTheme.iconColorClass)}
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Classe selecionada</p>
                          <p className="text-sm font-semibold">{selectedClasse.nome}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedClasse && (
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                      Selecione uma classe para carregar o grimório.
                    </div>
                  )}

                  {selectedClasse && !hasMagiasNaClasse && (
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                      Esta classe ainda não possui magias cadastradas. Você pode continuar.
                    </div>
                  )}

                  {selectedClasse && hasMagiasNaClasse && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedClasseMagias.map((magia) => {
                        const magiaId = String(magia.id);
                        const isSelected = selectedMagiaIds.includes(magiaId);
                        const isDisabled = !isSelected && selectedMagiaIds.length >= maxMagias;
                        const ClasseIcon = selectedClasseTheme?.icon;

                        return (
                          <article
                            key={magia.id}
                            className={cn(
                              "relative overflow-hidden rounded-2xl border bg-background/80 p-4 text-left transition",
                              isSelected
                                ? selectedClasseTheme?.selectedRingClass ?? "border-primary bg-primary/10"
                                : "border-border/60 hover:border-border"
                            )}
                          >
                            <div
                              className={cn(
                                "pointer-events-none absolute inset-0 bg-linear-to-br opacity-70",
                                selectedClasseTheme?.glowClass
                              )}
                            />

                            <button
                              type="button"
                              onClick={() => handleToggleMagia(magia.id)}
                              disabled={isDisabled}
                              className={cn(
                                "relative z-10 w-full text-left",
                                isDisabled && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  {ClasseIcon && (
                                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25">
                                      <ClasseIcon
                                        className={cn(
                                          "h-5 w-5",
                                          selectedClasseTheme?.iconColorClass
                                        )}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold">{magia.nome}</p>
                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                      {magiaResumoCurto(magia)}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-1 text-[11px]",
                                    isSelected
                                      ? selectedClasseTheme?.chipClass
                                      : "border-border/70 text-muted-foreground"
                                  )}
                                >
                                  {isSelected ? "Selecionada" : "Selecionar"}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border border-border/70 px-2 py-1 text-muted-foreground">
                                  Alcance: {magia.alcance?.trim() || "-"}
                                </span>
                                <span className="rounded-full border border-border/70 px-2 py-1 text-muted-foreground">
                                  Custo:{" "}
                                  {typeof magia.custo_nivel === "number"
                                    ? magia.custo_nivel
                                    : "-"}
                                </span>
                              </div>
                            </button>

                            <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {isSelected ? "Selecionada" : "Toque para selecionar"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setDetailsModal({ kind: "magia", item: magia })}
                              >
                                Ver magia
                              </Button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {hasPericiasDisponiveis
                          ? `Escolha ${requiredPericiasCount} ${
                              requiredPericiasCount === 1 ? "perícia" : "perícias"
                            }`
                          : "Perícias"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground/90">
                        {hasPericiasDisponiveis
                          ? "Selecione talentos de treinamento, com limites por categoria."
                          : "Nenhuma perícia disponível para seleção nesta etapa."}
                      </p>
                    </div>
                    {hasPericiasDisponiveis && (
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs",
                          canAdvanceStep4
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                            : "border-border/70 text-muted-foreground"
                        )}
                      >
                        {selectedPericiaIds.length}/{requiredPericiasCount} selecionadas
                      </span>
                    )}
                  </div>

                  {!hasPericiasDisponiveis && (
                    <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                      Nenhuma perícia cadastrada no catálogo. Você pode continuar.
                    </div>
                  )}

                  {hasPericiasDisponiveis && (
                    <div className="space-y-4">
                      {periciasAgrupadasPorTipo.map((grupo) => {
                        const selectedIdDoTipo =
                          selectedPericiaIds.find((id) => periciaTipoPorId.get(id) === grupo.tipo) ?? null;

                        return (
                          <section
                            key={grupo.tipo}
                            className="rounded-2xl border border-border/60 bg-background/50 p-3 sm:p-4"
                          >
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{grupo.label}</p>
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-1 text-[11px]",
                                  selectedIdDoTipo
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                                    : "border-border/70 text-muted-foreground"
                                )}
                              >
                                {selectedIdDoTipo ? "1 selecionada" : "0 selecionada"}
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {grupo.items.map((pericia) => {
                                const periciaId = String(pericia.id);
                                const isSelected = selectedPericiaIds.includes(periciaId);
                                const canReplaceSameTipo =
                                  Boolean(selectedIdDoTipo) && selectedIdDoTipo !== periciaId;
                                const isDisabled =
                                  !isSelected &&
                                  selectedPericiaIds.length >= requiredPericiasCount &&
                                  !canReplaceSameTipo;

                                return (
                                  <article
                                    key={pericia.id}
                                    className={cn(
                                      "rounded-2xl border bg-background/80 p-4 transition",
                                      isSelected
                                        ? "ring-2 ring-primary/60 border-primary/60"
                                        : "border-border/60 hover:border-border"
                                    )}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePericia(pericia)}
                                      disabled={isDisabled}
                                      className={cn(
                                        "w-full text-left",
                                        isDisabled && "cursor-not-allowed opacity-60"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-semibold">{pericia.nome}</p>
                                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                            {periciaResumoCurto(pericia)}
                                          </p>
                                        </div>
                                        <span
                                          className={cn(
                                            "rounded-full border px-2 py-1 text-[11px]",
                                            isSelected
                                              ? "border-primary/40 bg-primary/10 text-primary"
                                              : "border-border/70 text-muted-foreground"
                                          )}
                                        >
                                          {isSelected ? "Selecionada" : "Selecionar"}
                                        </span>
                                      </div>
                                    </button>

                                    <div className="mt-4 flex items-center justify-between gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {isSelected
                                          ? "Selecionada"
                                          : canReplaceSameTipo
                                            ? "Troca a escolhida deste tipo"
                                            : "Toque para selecionar"}
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          setDetailsModal({ kind: "pericia", item: pericia })
                                        }
                                      >
                                        Ver mais
                                      </Button>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <Field>
                    <FieldLabel htmlFor="campanhaId">Campanha</FieldLabel>
                    <select
                      id="campanhaId"
                      value={campanhaId}
                      onChange={(e) => setCampanhaId(e.target.value)}
                      className="rounded-md border border-border px-3 py-2 bg-background/60"
                      required
                      disabled={!isReady || campanhas.length === 0}
                    >
                      <option value="" disabled>
                        Selecione uma campanha
                      </option>
                      {campanhas.map((campanha) => (
                        <option key={campanha.id} value={campanha.id}>
                          {campanha.nome}
                        </option>
                      ))}
                    </select>
                    {selectedCampanha?.sinopse && (
                      <FieldDescription>{selectedCampanha.sinopse}</FieldDescription>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel>Elemento</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {elementOptions.map((opt) => {
                        const Icon = opt.icon;
                        const active = elemento === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setElemento(opt.value)}
                            className={cn(
                              "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-6">
                  <Field>
                    <FieldLabel htmlFor="nome">Nome do personagem</FieldLabel>
                    <Input
                      id="nome"
                      name="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Selene"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="apelido">Apelido (opcional)</FieldLabel>
                    <Input
                      id="apelido"
                      name="apelido"
                      value={apelido}
                      onChange={(e) => setApelido(e.target.value)}
                      placeholder="Ex: A Lâmina do Norte"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="descricao">Descrição curta</FieldLabel>
                    <textarea
                      id="descricao"
                      name="descricao"
                      rows={3}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Uma breve história ou personalidade do personagem."
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="url_imagem">URL da imagem (opcional)</FieldLabel>
                    <Input
                      id="url_imagem"
                      name="url_imagem"
                      type="url"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={urlImagem}
                      onChange={(e) => setUrlImagem(e.target.value)}
                      aria-invalid={!isUrlImagemValida}
                      className={cn(
                        !isUrlImagemValida &&
                          "border-destructive focus-visible:ring-destructive/50"
                      )}
                      placeholder="https://..."
                    />
                    <FieldDescription className={cn(!isUrlImagemValida && "text-destructive")}>
                      {isUrlImagemValida
                        ? "Apenas links válidos (http:// ou https://)."
                        : "Informe uma URL válida iniciando com http:// ou https://."}
                    </FieldDescription>
                  </Field>

                  {(selectedClasse || selectedRaca || selectedCampanha) && (
                    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-background via-background/95 to-muted/40 p-5">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />
                      <div className="pointer-events-none absolute -left-8 -bottom-12 h-36 w-36 rounded-full border border-white/10" />

                      <div className="relative z-10">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold tracking-wide">Revisão da ficha</h4>
                          <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            pronta para registro
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {selectedClasse && (
                            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                                Classe
                              </p>
                              <p className="mt-1 text-sm font-medium">{selectedClasse.nome}</p>
                            </div>
                          )}
                          {selectedRaca && (
                            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                                Raça
                              </p>
                              <p className="mt-1 text-sm font-medium">{selectedRaca.nome}</p>
                            </div>
                          )}
                          {selectedCampanha && (
                            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                                Campanha
                              </p>
                              <p className="mt-1 text-sm font-medium line-clamp-1">{selectedCampanha.nome}</p>
                            </div>
                          )}
                          {selectedPericias.length > 0 && (
                            <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                                Perícias
                              </p>
                              <p className="mt-1 text-sm font-medium line-clamp-2">
                                {selectedPericias.map((pericia) => pericia.nome).join(", ")}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-200">
                            HP base: {hpBase}
                          </span>
                          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-700 dark:text-sky-200">
                            Mana base: {manaBase}
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            Magias selecionadas: {selectedMagias.length}
                          </span>
                        </div>

                        {selectedMagias.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                              Grimório selecionado
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedMagias.map((magia) => (
                                <span
                                  key={magia.id}
                                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
                                >
                                  {magia.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <FieldDescription className="text-center text-destructive">
                  {error}
                </FieldDescription>
              )}
            </FieldGroup>

            <aside className="sticky top-24 hidden space-y-4 lg:block">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Progresso
                  </p>
                  <span className="text-xs text-muted-foreground">{progressoPercentual}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${progressoPercentual}%` }}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {steps.map((item) => {
                    const isActive = step === item.id;
                    const isCompleted = step > item.id;
                    const isOpen = canOpenStep(step, item.id);

                    return (
                      <button
                        key={`desktop-side-${item.id}`}
                        type="button"
                        onClick={() => {
                          if (isOpen) setStep(item.id);
                        }}
                        disabled={!isOpen}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                          isActive && "border-primary bg-primary/10",
                          isCompleted && "border-emerald-500/40 bg-emerald-500/10",
                          !isActive && !isCompleted && "border-border/60 bg-background/70",
                          !isOpen && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            isCompleted && "bg-emerald-500 text-white",
                            isActive && "bg-primary text-primary-foreground",
                            !isCompleted && !isActive && "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.id}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium leading-tight">{item.title}</span>
                          <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                            {item.helper}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Resumo
                </p>
                <div className="space-y-2 text-sm">
                  {selectedRaca && (
                    <p className="text-muted-foreground">
                      Raça: <span className="text-foreground">{selectedRaca.nome}</span>
                    </p>
                  )}
                  {selectedClasse && (
                    <p className="text-muted-foreground">
                      Classe: <span className="text-foreground">{selectedClasse.nome}</span>
                    </p>
                  )}
                  {selectedPericias.length > 0 && (
                    <p className="text-muted-foreground">
                      Perícias:{" "}
                      <span className="text-foreground">
                        {selectedPericias.map((pericia) => pericia.nome).join(", ")}
                      </span>
                    </p>
                  )}
                  {selectedCampanha && (
                    <p className="text-muted-foreground">
                      Campanha: <span className="text-foreground">{selectedCampanha.nome}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-200">
                      HP {hpBase}
                    </span>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-700 dark:text-sky-200">
                      Mana {manaBase}
                    </span>
                    <span className="rounded-full border border-border/70 bg-background px-2 py-1 text-xs text-muted-foreground">
                      Magias {selectedMagias.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="space-y-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard">Cancelar</Link>
                  </Button>

                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={handleBack} className="w-full">
                      Voltar
                    </Button>
                  )}

                  {step < 6 ? (
                    <Button type="button" onClick={handleContinue} disabled={!isReady} className="w-full">
                      Continuar
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!canSubmit || loading} className="w-full">
                      {loading
                        ? isEditMode
                          ? "Alterando..."
                          : "Criando..."
                        : isEditMode
                          ? "Alterar personagem"
                          : "Criar personagem"}
                    </Button>
                  )}
                </div>
                <FieldDescription className="mt-3 text-xs">
                  {isEditMode
                    ? "Revise os passos acima e salve quando a ficha estiver pronta."
                    : "A maioria dos dados pode ser ajustada depois, direto na ficha."}
                </FieldDescription>
              </div>
            </aside>
            </div>

            <div className="h-24 lg:hidden" />

            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur lg:hidden">
              <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/dashboard">Cancelar</Link>
                  </Button>
                )}

                {step < 6 ? (
                  <Button
                    type="button"
                    onClick={handleContinue}
                    disabled={!isReady}
                    className="flex-[1.4]"
                  >
                    Continuar
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!canSubmit || loading}
                    className="flex-[1.4]"
                  >
                    {loading
                      ? isEditMode
                        ? "Alterando..."
                        : "Criando..."
                      : isEditMode
                        ? "Alterar personagem"
                        : "Criar personagem"}
                  </Button>
                )}
              </div>
            </div>
      </form>

      <Dialog
        open={!!detailsModal && !modalMagia}
        onOpenChange={(open) => !open && setDetailsModal(null)}
      >
            <DialogContent className="max-w-lg">
              {modalClasse && (
                <>
                  <DialogHeader>
                    <DialogTitle>{modalClasse.nome}</DialogTitle>
                    <DialogDescription>{classeResumoCurto(modalClasse)}</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {modalClasseTags.map((tag) => (
                        <span
                          key={`modal-${modalClasse.id}-${tag}`}
                          className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {modalClasse.descricao && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Descrição
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{modalClasse.descricao}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        HP base: {modalClasse.hp ?? 0}
                      </span>
                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        Mana base: {modalClasse.mana ?? 0}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {modalRaca && (
                <>
                  <DialogHeader>
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-3xl border bg-linear-to-b p-4",
                        modalRacaTheme?.surfaceClass,
                        modalRacaTheme?.frameClass
                      )}
                    >
                      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/15" />
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                          {ModalRacaIcon ? (
                            <ModalRacaIcon
                              className={cn(
                                "h-7 w-7",
                                modalRacaTheme?.iconColorClass
                              )}
                            />
                          ) : null}
                        </div>
                        <div>
                          <DialogTitle>{modalRaca.nome}</DialogTitle>
                          <DialogDescription>
                            Herança e atributos iniciais da ficha.
                          </DialogDescription>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4 text-sm">
                    {modalRaca.descricao && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Descrição
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{modalRaca.descricao}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        HP base: {modalRaca.hp ?? 0}
                      </span>
                      <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        Mana base: {modalRaca.mana ?? 0}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {modalPericia && (
                <>
                  <DialogHeader>
                    <DialogTitle>{modalPericia.nome}</DialogTitle>
                    <DialogDescription>
                      Detalhes da perícia selecionável nesta etapa.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 text-sm">
                    {modalPericia.tipo && (
                      <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground w-fit">
                        Tipo: {modalPericia.tipo}
                      </div>
                    )}

                    {modalPericia.descricao && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Descrição
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{modalPericia.descricao}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Fechar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
      </Dialog>

      <MagiaDetailsDrawer
        open={!!modalMagia}
        onOpenChange={(open) => {
          if (!open) setDetailsModal(null);
        }}
        magia={modalMagia}
        description={modalMagia ? magiaResumoCurto(modalMagia) : "Detalhes da magia."}
        contextBadge={selectedClasse ? `Classe: ${selectedClasse.nome}` : undefined}
      />
    </div>
  );
}
