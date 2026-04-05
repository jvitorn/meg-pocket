import { BaseInterface, MagiaPersonagem } from "@/types";
import type { ColorThemeName } from "@/lib/utils";

export interface ClassePersonagemPreview {
  id: number;
  nome: string;
  apelido?: string | null;
  url_imagem?: string | null;
  imagem_pixel?: string | null;
}

export interface ClasseInterface extends BaseInterface {
  id: number;
   slug?: string;
   icone?: string | null;
   corTema?: ColorThemeName | null;
   nome: string;
   subtitulo?: string;
   background?: string;
   img_corpo?: string;
   exemploPersonagem?: string;
   sobre?: string;
   gameplay?: string;
   hp: number;
   mana: number;
   tags?: string[] | null;
   Personagens?: ClassePersonagemPreview[];
   Magias?: MagiaPersonagem[]; // <- magias retornadas pela API
}
