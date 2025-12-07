import type { ColorThemeName } from "@/lib/utils";
import { BaseInterface, MagiaPersonagem } from "@/types";

export interface ClasseInterface extends BaseInterface {
  id: number;
   slug?: string;
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
   Magias?: MagiaPersonagem[]; // <- magias retornadas pela API
}
