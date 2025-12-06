import type { ColorThemeName } from "@/lib/utils";
import { BaseInterface, MagiaPersonagem } from "@/types";

export interface ClasseInterface extends BaseInterface {
  id: number;
   slug?: string | null;
   nome: string;
   subtitulo?: string | null;
   background?: string | null;
   img_corpo?: string | null;
   exemploPersonagem?: string | null;
   sobre?: string | null;
   gameplay?: string | null;
   hp: number;
   mana: number;
   tags?: string[] | null;
   Magias?: MagiaPersonagem[]; // <- magias retornadas pela API
}
