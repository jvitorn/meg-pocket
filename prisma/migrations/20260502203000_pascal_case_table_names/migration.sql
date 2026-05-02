ALTER TABLE IF EXISTS "campanha_npc" RENAME TO "CampanhaNpc";
ALTER TABLE IF EXISTS "npc_template_geracao" RENAME TO "NpcTemplateGeracao";
ALTER TABLE IF EXISTS "npc_estilo_narrativo" RENAME TO "NpcEstiloNarrativo";
ALTER TABLE IF EXISTS "slots_defensivos" RENAME TO "SlotsDefensivos";
ALTER TABLE IF EXISTS "ameacas" RENAME TO "Ameaca";

ALTER TABLE "CampanhaNpc" RENAME CONSTRAINT "campanha_npc_pkey" TO "CampanhaNpc_pkey";
ALTER TABLE "CampanhaNpc" RENAME CONSTRAINT "campanha_npc_campanhaId_fkey" TO "CampanhaNpc_campanhaId_fkey";
ALTER TABLE "CampanhaNpc" RENAME CONSTRAINT "campanha_npc_racaId_fkey" TO "CampanhaNpc_racaId_fkey";
ALTER TABLE "CampanhaNpc" RENAME CONSTRAINT "campanha_npc_classeId_fkey" TO "CampanhaNpc_classeId_fkey";
ALTER INDEX "campanha_npc_campanhaId_idx" RENAME TO "CampanhaNpc_campanhaId_idx";
ALTER INDEX "campanha_npc_racaId_idx" RENAME TO "CampanhaNpc_racaId_idx";
ALTER INDEX "campanha_npc_classeId_idx" RENAME TO "CampanhaNpc_classeId_idx";

ALTER TABLE "NpcTemplateGeracao" RENAME CONSTRAINT "npc_template_geracao_pkey" TO "NpcTemplateGeracao_pkey";
ALTER TABLE "NpcTemplateGeracao" RENAME CONSTRAINT "npc_template_geracao_racaId_fkey" TO "NpcTemplateGeracao_racaId_fkey";
ALTER TABLE "NpcTemplateGeracao" RENAME CONSTRAINT "npc_template_geracao_classeId_fkey" TO "NpcTemplateGeracao_classeId_fkey";
ALTER INDEX "npc_template_geracao_tipo_ativo_idx" RENAME TO "NpcTemplateGeracao_tipo_ativo_idx";
ALTER INDEX "npc_template_geracao_racaId_idx" RENAME TO "NpcTemplateGeracao_racaId_idx";
ALTER INDEX "npc_template_geracao_classeId_idx" RENAME TO "NpcTemplateGeracao_classeId_idx";

ALTER TABLE "NpcEstiloNarrativo" RENAME CONSTRAINT "npc_estilo_narrativo_pkey" TO "NpcEstiloNarrativo_pkey";
ALTER INDEX "npc_estilo_narrativo_chave_key" RENAME TO "NpcEstiloNarrativo_chave_key";

ALTER TABLE "SlotsDefensivos" RENAME CONSTRAINT "slots_defensivos_pkey" TO "SlotsDefensivos_pkey";
ALTER TABLE "SlotsDefensivos" RENAME CONSTRAINT "slots_defensivos_personagemId_fkey" TO "SlotsDefensivos_personagemId_fkey";
ALTER INDEX "slots_defensivos_personagemId_key" RENAME TO "SlotsDefensivos_personagemId_key";

ALTER TABLE "Ameaca" RENAME CONSTRAINT "ameacas_pkey" TO "Ameaca_pkey";
ALTER INDEX "ameacas_slug_key" RENAME TO "Ameaca_slug_key";
ALTER INDEX "ameacas_tipo_idx" RENAME TO "Ameaca_tipo_idx";
ALTER INDEX "ameacas_elemento_idx" RENAME TO "Ameaca_elemento_idx";
ALTER INDEX "ameacas_va_idx" RENAME TO "Ameaca_va_idx";
