import type { MDXComponents } from "mdx/types";

import {
  ManualAviso,
  ManualDados,
  ManualExemplo,
  ManualIlustracao,
  ManualRegra,
} from "@/components/manual/mdx";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Regra: ManualRegra,
    Exemplo: ManualExemplo,
    Aviso: ManualAviso,
    Ilustracao: ManualIlustracao,
    Dados: ManualDados,
    ...components,
  };
}
