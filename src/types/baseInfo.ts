import type { ColorThemeName } from "@/lib/utils";
import { MagiaPersonagem } from "@/types";

export interface BaseInterface {
    id:number;
    mana:number;
    hp:number;
    nome: string;
    descricao?: string;
    img?: string;
    corTema?: ColorThemeName | null;
    icone?: string | null;
    magias?: MagiaPersonagem[];
    imagem_pixel?: string;
}
