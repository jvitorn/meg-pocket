export type AmeacaTipo =
  | "Goblinoide"
  | "Besta"
  | "Gigante"
  | "Constructo"
  | "Morto-vivo"
  | "Planta"
  | "Dragão"
  | "Colosso"
  | "Elemental"
  | "Humanoide"
  | "Lobo"
  | "Sombra"
  | "Espírito"
  | "Ave"
  | "Celestial"
  | "Entidade";

export type AmeacaElemento =
  | "Neutro"
  | "Vento"
  | "Fogo"
  | "Natureza"
  | "Etéreo"
  | "Água"
  | "Sombrio"
  | "Radiante"
  | "Terra"
  | "Fogo ou Radiante";

export type AmeacaGolpe = {
  nome: string;
  descricao: string;
  dano?: string;
  custoMana?: number;
};

export type Ameaca = {
  id: string;
  nome: string;
  tipo: AmeacaTipo;
  tipoSecundario?: string;
  elemento: AmeacaElemento;
  va: number;
  pv: number;
  mana: number;
  danoBase: string;
  danoMedio: number;
  defesa: number;
  funcao: string;
  reacoes: {
    bloqueio: number;
    esquiva: number;
    contraAtaque: number;
  };
  fraquezas: string[];
  resistencias: string[];
  imunidades: string[];
  descricao: string;
  narrativa: string;
  golpes: AmeacaGolpe[];
};

export const dataBestiario: Ameaca[] = [
  {
    "id": "goblin",
    "nome": "Goblin",
    "tipo": "Goblinoide",
    "elemento": "Neutro",
    "va": 0.5,
    "pv": 4,
    "mana": 3,
    "danoBase": "1d4",
    "danoMedio": 2,
    "defesa": 11,
    "funcao": "Lacaio",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 0,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Área",
      "Perfurante"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Pequena criatura covarde, barulhenta e oportunista. Sozinho, um Goblin raramente é perigoso. Em grupo, vira problema.",
    "narrativa": "Use Goblins em bandos, emboscadas simples, saques de estrada e invasões de acampamento.",
    "golpes": [
      {
        "nome": "Facada Suja",
        "descricao": "1d4 físico",
        "dano": "1d4"
      },
      {
        "nome": "Pedrada",
        "descricao": "1d3 físico",
        "dano": "1d3"
      },
      {
        "nome": "Fuga Covarde",
        "descricao": "gasta 1 mana e se afasta.",
        "custoMana": 1
      }
    ]
  },
  {
    "id": "goblin-saqueador",
    "nome": "Goblin Saqueador",
    "tipo": "Goblinoide",
    "elemento": "Neutro",
    "va": 0.5,
    "pv": 5,
    "mana": 2,
    "danoBase": "1d4",
    "danoMedio": 2,
    "defesa": 11,
    "funcao": "Lacaio agressivo",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Área",
      "Perfurante"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Goblin mais ousado, que tenta roubar objetos pequenos no meio do caos.",
    "narrativa": "Bom para ataques a carroças, feiras, acampamentos e vilarejos.",
    "golpes": [
      {
        "nome": "Facada Rápida",
        "descricao": "1d4",
        "dano": "1d4"
      },
      {
        "nome": "Roubo Rápido",
        "descricao": "se acertar, o alvo sofre −1 no próximo teste ou perde um item pequeno"
      },
      {
        "nome": "Recuo Sujo",
        "descricao": "afasta-se após atacar."
      }
    ]
  },
  {
    "id": "goblin-atirador",
    "nome": "Goblin Atirador",
    "tipo": "Goblinoide",
    "elemento": "Neutro",
    "va": 1,
    "pv": 6,
    "mana": 4,
    "danoBase": "1d4",
    "danoMedio": 2,
    "defesa": 12,
    "funcao": "Atacante à distância",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Corpo a corpo",
      "Área"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Goblin esperto que prefere atacar de longe com flechas, pedras e truques.",
    "narrativa": "Coloque em árvores, ruínas, barricadas ou túneis. Ele deve incomodar, não tankar.",
    "golpes": [
      {
        "nome": "Flecha Simples",
        "descricao": "1d4 perfurante",
        "dano": "1d4"
      },
      {
        "nome": "Pedrinha Certeira",
        "descricao": "1d3 e −1 no próximo acerto do alvo",
        "dano": "1d3"
      },
      {
        "nome": "Flecha Venenosa",
        "descricao": "1d3 + 1d3 veneno, custa 2 mana",
        "dano": "1d3 + 1d3",
        "custoMana": 2
      },
      {
        "nome": "Armadilha Improvisada",
        "descricao": "prende o alvo se falhar em teste, custa 2 mana.",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "goblin-xama",
    "nome": "Goblin Xamã",
    "tipo": "Goblinoide",
    "elemento": "Etéreo",
    "va": 2,
    "pv": 8,
    "mana": 8,
    "danoBase": "1d4",
    "danoMedio": 2,
    "defesa": 10,
    "funcao": "Suporte",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Corpo a corpo",
      "Perfurante"
    ],
    "resistencias": [
      "Etéreo"
    ],
    "imunidades": [],
    "descricao": "Goblin coberto de ossos, marcas tortas e amuletos quebrados. Usa rituais primitivos para fortalecer sua tribo.",
    "narrativa": "Use como suporte de hordas. Ele deve ficar atrás dos goblins comuns.",
    "golpes": [
      {
        "nome": "Faísca Tribal",
        "descricao": "1d4 etéreo",
        "dano": "1d4"
      },
      {
        "nome": "Totem Goblin",
        "descricao": "até 2 goblins recebem +1 em acerto, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Maldição Fraca",
        "descricao": "alvo sofre −1 em defesa, custa 2 mana.",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "capitao-goblin",
    "nome": "Capitão Goblin",
    "tipo": "Goblinoide",
    "elemento": "Neutro",
    "va": 3,
    "pv": 16,
    "mana": 8,
    "danoBase": "1d8",
    "danoMedio": 4,
    "defesa": 12,
    "funcao": "Líder",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Área",
      "Perfurante"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Goblin veterano, maior e mais cruel, que sobreviveu tempo suficiente para comandar outros.",
    "narrativa": "Use como chefe de bando antes do Rei Goblin.",
    "golpes": [
      {
        "nome": "Corte de Comando",
        "descricao": "1d8",
        "dano": "1d8"
      },
      {
        "nome": "Ordem de Ataque",
        "descricao": "1 goblin aliado ataca imediatamente, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Grito Covarde",
        "descricao": "goblins próximos recebem +1 em defesa por 1 turno."
      }
    ]
  },
  {
    "id": "rei-goblin",
    "nome": "Rei Goblin",
    "tipo": "Goblinoide",
    "elemento": "Neutro",
    "va": 5,
    "pv": 24,
    "mana": 14,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 13,
    "funcao": "Elite / Mini-chefe",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Área",
      "Corpo a corpo"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Cruel, barulhento e astuto. O Rei Goblin governa pelo medo e pela promessa de pilhagem.",
    "narrativa": "Nunca use sozinho. Ele deve comandar goblins, gritar ordens e se esconder atrás dos lacaios.",
    "golpes": [
      {
        "nome": "Corte Real",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Comando Covarde",
        "descricao": "1 goblin aliado ataca, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Rajada de Ordens",
        "descricao": "até 2 goblins recebem +1 em acerto, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Golpe do Rei",
        "descricao": "2d8 e −1 defesa, custa 3 mana.",
        "dano": "2d8",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "lobo-jovem",
    "nome": "Lobo Jovem",
    "tipo": "Lobo",
    "elemento": "Neutro",
    "va": 0.5,
    "pv": 5,
    "mana": 3,
    "danoBase": "1d4",
    "danoMedio": 2,
    "defesa": 12,
    "funcao": "Lacaio rápido",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Fogo",
      "Perfurante"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Predador jovem e veloz. Não deve ser usado sozinho; seu perigo aparece em alcateia.",
    "narrativa": "Use em perseguições, florestas, estradas e ataques noturnos.",
    "golpes": [
      {
        "nome": "Mordida Rápida",
        "descricao": "1d4",
        "dano": "1d4"
      },
      {
        "nome": "Arranhão",
        "descricao": "1d4",
        "dano": "1d4"
      },
      {
        "nome": "Bote Voraz",
        "descricao": "1d6, custa 2 mana.",
        "dano": "1d6",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "lobo-cinzento",
    "nome": "Lobo Cinzento",
    "tipo": "Lobo",
    "elemento": "Neutro",
    "va": 1,
    "pv": 7,
    "mana": 4,
    "danoBase": "1d6",
    "danoMedio": 3,
    "defesa": 12,
    "funcao": "Predador",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Perfurante"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Lobo adulto e experiente. Sabe atacar alvos feridos e recuar no momento certo.",
    "narrativa": "Use como ameaça principal em uma pequena alcateia.",
    "golpes": [
      {
        "nome": "Mordida",
        "descricao": "1d6",
        "dano": "1d6"
      },
      {
        "nome": "Caçada em Dupla",
        "descricao": "se outro lobo atacou o mesmo alvo, causa +1 dano"
      },
      {
        "nome": "Rasgo Rápido",
        "descricao": "1d4 e recua 1 metro.",
        "dano": "1d4"
      }
    ]
  },
  {
    "id": "lobo-alfa",
    "nome": "Lobo Alfa",
    "tipo": "Lobo",
    "elemento": "Neutro",
    "va": 1,
    "pv": 8,
    "mana": 5,
    "danoBase": "1d6",
    "danoMedio": 3,
    "defesa": 13,
    "funcao": "Líder de alcateia",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Perfurante"
    ],
    "resistencias": [],
    "imunidades": [],
    "descricao": "Maior, mais imponente e marcado por disputas antigas. Seu uivo organiza a alcateia.",
    "narrativa": "Use para transformar lobos comuns em um encontro mais coordenado.",
    "golpes": [
      {
        "nome": "Mordida",
        "descricao": "1d6",
        "dano": "1d6"
      },
      {
        "nome": "Uivo de Caça",
        "descricao": "lobos aliados recebem +1 em acerto, custa 1 mana",
        "custoMana": 1
      },
      {
        "nome": "Bote Coordenado",
        "descricao": "1d6; se houver outro lobo adjacente, +1 dano.",
        "dano": "1d6"
      }
    ]
  },
  {
    "id": "lobo-sombrio",
    "nome": "Lobo Sombrio",
    "tipo": "Lobo",
    "tipoSecundario": "Sombra",
    "elemento": "Sombrio",
    "va": 2,
    "pv": 12,
    "mana": 8,
    "danoBase": "1d6",
    "danoMedio": 3,
    "defesa": 13,
    "funcao": "Predador corrompido",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [],
    "descricao": "Lobo tocado por energia sombria. Seus olhos brilham no escuro e sua mordida parece ferir corpo e espírito.",
    "narrativa": "Use como sinal de corrupção em florestas, cemitérios ou regiões afetadas por mana sombria.",
    "golpes": [
      {
        "nome": "Mordida Umbral",
        "descricao": "1d6 sombrio",
        "dano": "1d6"
      },
      {
        "nome": "Salto Sombrio",
        "descricao": "move-se pelas sombras e ataca, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Uivo Frio",
        "descricao": "alvo sofre −1 em acerto por 1 turno."
      }
    ]
  },
  {
    "id": "serpente-esmeralda",
    "nome": "Serpente Esmeralda",
    "tipo": "Besta",
    "tipoSecundario": "Venenoso",
    "elemento": "Natureza",
    "va": 1,
    "pv": 6,
    "mana": 4,
    "danoBase": "1d3 + veneno",
    "danoMedio": 2,
    "defesa": 13,
    "funcao": "Controlador",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Natureza",
      "Longa distância"
    ],
    "resistencias": [
      "Veneno"
    ],
    "imunidades": [],
    "descricao": "Serpente encantada, rápida e venenosa. Prefere prender, enfraquecer e atacar de surpresa.",
    "narrativa": "Boa para florestas, templos antigos, jardins mágicos e covis de alquimistas.",
    "golpes": [
      {
        "nome": "Bote Rápido",
        "descricao": "1d3",
        "dano": "1d3"
      },
      {
        "nome": "Mordida Venenosa",
        "descricao": "1d3 + 1d4 veneno, custa 2 mana",
        "dano": "1d3 + 1d4",
        "custoMana": 2
      },
      {
        "nome": "Enroscar",
        "descricao": "alvo faz teste; se falhar, fica preso por 1 turno"
      },
      {
        "nome": "Sibilo Paralisante",
        "descricao": "−2 em agilidade, custa 2 mana.",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "javali-blindado",
    "nome": "Javali Blindado",
    "tipo": "Besta",
    "elemento": "Neutro",
    "va": 2,
    "pv": 14,
    "mana": 6,
    "danoBase": "1d6",
    "danoMedio": 3,
    "defesa": 9,
    "funcao": "Tanque",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 0,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Longa distância",
      "Perfurante"
    ],
    "resistencias": [
      "Neutro"
    ],
    "imunidades": [],
    "descricao": "Javali robusto e territorial, coberto por placas naturais endurecidas.",
    "narrativa": "Use como primeiro inimigo resistente para ensinar posicionamento.",
    "golpes": [
      {
        "nome": "Chifrada",
        "descricao": "1d6",
        "dano": "1d6"
      },
      {
        "nome": "Investida Curta",
        "descricao": "1d6",
        "dano": "1d6"
      },
      {
        "nome": "Investida Carregada",
        "descricao": "2d4 e empurra, custa 2 mana",
        "dano": "2d4",
        "custoMana": 2
      },
      {
        "nome": "Rugido Territorial",
        "descricao": "inimigos próximos sofrem −1 em resistência, custa 3 mana.",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "falcao-das-brumas",
    "nome": "Falcão das Brumas",
    "tipo": "Besta",
    "tipoSecundario": "Místico",
    "elemento": "Vento",
    "va": 2,
    "pv": 10,
    "mana": 6,
    "danoBase": "1d6",
    "danoMedio": 3,
    "defesa": 14,
    "funcao": "Suporte tático",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Perfurante",
      "Área"
    ],
    "resistencias": [
      "Vento"
    ],
    "imunidades": [],
    "descricao": "Ave envolta por brumas, rápida e difícil de atingir.",
    "narrativa": "Use em penhascos, torres, florestas altas e regiões de névoa.",
    "golpes": [
      {
        "nome": "Rasante Rápido",
        "descricao": "1d6",
        "dano": "1d6"
      },
      {
        "nome": "Asas Cortantes",
        "descricao": "1d3",
        "dano": "1d3"
      },
      {
        "nome": "Corte de Vento",
        "descricao": "2d4 em linha, custa 2 mana",
        "dano": "2d4",
        "custoMana": 2
      },
      {
        "nome": "Fenda de Bruma",
        "descricao": "inimigos sofrem −2 em ataques por 1 turno, custa 3 mana.",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "sombra-fraca",
    "nome": "Sombra Fraca",
    "tipo": "Sombra",
    "elemento": "Sombrio",
    "va": 1,
    "pv": 6,
    "mana": 5,
    "danoBase": "1d4",
    "danoMedio": 2,
    "defesa": 13,
    "funcao": "Controlador",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Forma escura e instável que sussurra pensamentos ruins e ataca pelas frestas da coragem.",
    "narrativa": "Use em ruínas, casas abandonadas, tumbas e lugares sem luz.",
    "golpes": [
      {
        "nome": "Toque da Escuridão",
        "descricao": "1d4",
        "dano": "1d4"
      },
      {
        "nome": "Sussurro da Perdição",
        "descricao": "1d4 e −1 resistência",
        "dano": "1d4"
      },
      {
        "nome": "Lâmina de Sombra",
        "descricao": "1d6, custa 2 mana",
        "dano": "1d6",
        "custoMana": 2
      },
      {
        "nome": "Manto Noturno",
        "descricao": "+2 defesa por 1 turno, custa 2 mana.",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "sombra-atormentada",
    "nome": "Sombra Atormentada",
    "tipo": "Sombra",
    "elemento": "Sombrio",
    "va": 2,
    "pv": 12,
    "mana": 8,
    "danoBase": "1d6",
    "danoMedio": 3,
    "defesa": 13,
    "funcao": "Controlador / Anti-cura",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Sombra mais densa, formada por dor e memórias quebradas. Sua presença torna a cura mais difícil.",
    "narrativa": "Boa para combates sombrios e psicológicos.",
    "golpes": [
      {
        "nome": "Garras Nebulosas",
        "descricao": "1d6",
        "dano": "1d6"
      },
      {
        "nome": "Risada Sombria",
        "descricao": "−1 em teste mental do alvo"
      },
      {
        "nome": "Corrente da Dor",
        "descricao": "2d4 + 1d4 no turno seguinte, custa 2 mana",
        "dano": "2d4 + 1d4",
        "custoMana": 2
      },
      {
        "nome": "Chamado do Vazio",
        "descricao": "2d4 e impede cura por 1 turno, custa 4 mana.",
        "dano": "2d4",
        "custoMana": 4
      }
    ]
  },
  {
    "id": "aparicao-penitente",
    "nome": "Aparição Penitente",
    "tipo": "Espírito",
    "tipoSecundario": "Sombra",
    "elemento": "Sombrio",
    "va": 4,
    "pv": 18,
    "mana": 12,
    "danoBase": "1d8",
    "danoMedio": 4,
    "defesa": 12,
    "funcao": "Controlador mental",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Fogo",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Espírito preso ao peso de culpas antigas. Sua presença obriga os vivos a encararem remorso.",
    "narrativa": "Funciona melhor como encontro narrativo, em igrejas destruídas, campos de batalha ou mansões antigas.",
    "golpes": [
      {
        "nome": "Lamento Espectral",
        "descricao": "1d8",
        "dano": "1d8"
      },
      {
        "nome": "Mãos das Almas",
        "descricao": "−1 em testes do alvo"
      },
      {
        "nome": "Corrente do Remorso",
        "descricao": "3d4 e reduz movimento, custa 2 mana",
        "dano": "3d4",
        "custoMana": 2
      },
      {
        "nome": "Toque da Culpa",
        "descricao": "se o alvo falhar, perde a próxima ação, custa 4 mana.",
        "custoMana": 4
      }
    ]
  },
  {
    "id": "ogro",
    "nome": "Ogro",
    "tipo": "Gigante",
    "elemento": "Neutro",
    "va": 3,
    "pv": 18,
    "mana": 5,
    "danoBase": "1d10",
    "danoMedio": 5,
    "defesa": 9,
    "funcao": "Atacante bruto",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 0,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Longa distância"
    ],
    "resistencias": [
      "Neutro"
    ],
    "imunidades": [],
    "descricao": "Grande, violento e pouco inteligente. Se alcança o alvo, algo quebra.",
    "narrativa": "Use como guarda de ponte, ameaça de vilarejo ou força bruta manipulada por alguém mais esperto.",
    "golpes": [
      {
        "nome": "Pancada Pesada",
        "descricao": "1d10",
        "dano": "1d10"
      },
      {
        "nome": "Esmagar",
        "descricao": "2d6, custa 2 mana",
        "dano": "2d6",
        "custoMana": 2
      },
      {
        "nome": "Arremesso de Pedra",
        "descricao": "1d8 à distância",
        "dano": "1d8"
      },
      {
        "nome": "Rugido Brutal",
        "descricao": "alvo sofre −1 em acerto por 1 turno."
      }
    ]
  },
  {
    "id": "mago-inimigo",
    "nome": "Mago Inimigo",
    "tipo": "Humanoide",
    "tipoSecundario": "Místico",
    "elemento": "Etéreo",
    "va": 3,
    "pv": 14,
    "mana": 14,
    "danoBase": "2d4",
    "danoMedio": 5,
    "defesa": 11,
    "funcao": "Conjurador",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 1,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Corpo a corpo",
      "Perfurante"
    ],
    "resistencias": [
      "Etéreo"
    ],
    "imunidades": [],
    "descricao": "Conjurador hostil que manipula energia mística, barreiras e ataques à distância.",
    "narrativa": "Use protegido por lacaios. Ele é perigoso à distância, mas frágil se encurralado.",
    "golpes": [
      {
        "nome": "Raio Místico",
        "descricao": "2d4",
        "dano": "2d4"
      },
      {
        "nome": "Orbe Elemental",
        "descricao": "2d6, custa 2 mana",
        "dano": "2d6",
        "custoMana": 2
      },
      {
        "nome": "Barreira Mística",
        "descricao": "reduz 1d4 de dano, custa 2 mana",
        "dano": "1d4",
        "custoMana": 2
      },
      {
        "nome": "Explosão Instável",
        "descricao": "2d4 em área curta, custa 3 mana.",
        "dano": "2d4",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "urso-de-pedra",
    "nome": "Urso de Pedra",
    "tipo": "Besta",
    "tipoSecundario": "Místico",
    "elemento": "Natureza",
    "va": 3,
    "pv": 20,
    "mana": 10,
    "danoBase": "1d8",
    "danoMedio": 4,
    "defesa": 9,
    "funcao": "Tanque",
    "reacoes": {
      "bloqueio": 2,
      "esquiva": 0,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Água",
      "Perfurante"
    ],
    "resistencias": [
      "Natureza",
      "Neutro"
    ],
    "imunidades": [],
    "descricao": "Criatura pesada, de pele endurecida como rocha. Lenta, resistente e difícil de derrubar.",
    "narrativa": "Use como guardião natural ou protetor de cavernas.",
    "golpes": [
      {
        "nome": "Patada Rápida",
        "descricao": "1d8",
        "dano": "1d8"
      },
      {
        "nome": "Rosnado de Aviso",
        "descricao": "−2 em ataques do alvo"
      },
      {
        "nome": "Impacto Sísmico",
        "descricao": "2d6 e pode derrubar, custa 2 mana",
        "dano": "2d6",
        "custoMana": 2
      },
      {
        "nome": "Pelagem de Rocha",
        "descricao": "+2 defesa por 1 turno, custa 2 mana.",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "leao-solar",
    "nome": "Leão Solar",
    "tipo": "Besta",
    "tipoSecundario": "Místico",
    "elemento": "Radiante",
    "va": 3,
    "pv": 18,
    "mana": 10,
    "danoBase": "1d8",
    "danoMedio": 4,
    "defesa": 12,
    "funcao": "Suporte ofensivo",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Sombrio",
      "Perfurante"
    ],
    "resistencias": [
      "Radiante"
    ],
    "imunidades": [],
    "descricao": "Criatura nobre e luminosa, que inspira aliados e desestabiliza inimigos.",
    "narrativa": "Use como guardião solar, fera sagrada ou aliado corrompido por algum ritual.",
    "golpes": [
      {
        "nome": "Garra Luminosa",
        "descricao": "1d8",
        "dano": "1d8"
      },
      {
        "nome": "Rugido Inspirador",
        "descricao": "aliados recebem +2 em acerto por 1 turno"
      },
      {
        "nome": "Presa Ardente",
        "descricao": "2d5 fogo, custa 2 mana",
        "dano": "2d5",
        "custoMana": 2
      },
      {
        "nome": "Explosão Solar",
        "descricao": "inimigos sofrem −1 defesa, custa 2 mana.",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "urso-coruja",
    "nome": "Urso-Coruja",
    "tipo": "Besta",
    "tipoSecundario": "Místico",
    "elemento": "Neutro",
    "va": 4,
    "pv": 22,
    "mana": 8,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 11,
    "funcao": "Predador forte",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 0,
      "contraAtaque": 2
    },
    "fraquezas": [
      "Fogo",
      "Perfurante"
    ],
    "resistencias": [
      "Neutro"
    ],
    "imunidades": [],
    "descricao": "Mistura brutal de urso com coruja. Forte, territorial e assustadoramente ágil para seu tamanho.",
    "narrativa": "Use como predador de floresta antiga ou lenda local.",
    "golpes": [
      {
        "nome": "Garra Brutal",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Bicada Profunda",
        "descricao": "1d10",
        "dano": "1d10"
      },
      {
        "nome": "Voo Predatório",
        "descricao": "move-se e ataca, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Uivo Lunar",
        "descricao": "inimigos próximos sofrem −1 defesa."
      }
    ]
  },
  {
    "id": "elemental-de-fogo",
    "nome": "Elemental de Fogo",
    "tipo": "Elemental",
    "elemento": "Fogo",
    "va": 4,
    "pv": 20,
    "mana": 14,
    "danoBase": "2d4",
    "danoMedio": 5,
    "defesa": 11,
    "funcao": "Atacante",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Água",
      "Longa distância"
    ],
    "resistencias": [
      "Fogo"
    ],
    "imunidades": [
      "Queimadura"
    ],
    "descricao": "Corpo flamejante, instável e agressivo. Suas chamas queimam tudo ao redor.",
    "narrativa": "Use em vulcões, forjas antigas, incêndios mágicos e templos solares corrompidos.",
    "golpes": [
      {
        "nome": "Toque Flamejante",
        "descricao": "2d4 fogo",
        "dano": "2d4"
      },
      {
        "nome": "Explosão Curta",
        "descricao": "2d6 em área pequena, custa 3 mana",
        "dano": "2d6",
        "custoMana": 3
      },
      {
        "nome": "Corpo Incandescente",
        "descricao": "quem atacar corpo a corpo sofre 1 dano."
      }
    ]
  },
  {
    "id": "elemental-de-gelo",
    "nome": "Elemental de Gelo",
    "tipo": "Elemental",
    "elemento": "Água",
    "va": 4,
    "pv": 20,
    "mana": 14,
    "danoBase": "2d4",
    "danoMedio": 5,
    "defesa": 10,
    "funcao": "Controlador",
    "reacoes": {
      "bloqueio": 2,
      "esquiva": 0,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Fogo"
    ],
    "resistencias": [
      "Água"
    ],
    "imunidades": [
      "Congelamento"
    ],
    "descricao": "Entidade cristalina e gelada, capaz de reduzir movimento e controlar terreno.",
    "narrativa": "Use em cavernas glaciais, montanhas nevadas e locais tomados por frio mágico.",
    "golpes": [
      {
        "nome": "Toque Congelante",
        "descricao": "2d4 água/gelo",
        "dano": "2d4"
      },
      {
        "nome": "Estilhaço de Gelo",
        "descricao": "1d8",
        "dano": "1d8"
      },
      {
        "nome": "Prisão Glacial",
        "descricao": "alvo perde movimento por 1 turno, custa 3 mana",
        "custoMana": 3
      },
      {
        "nome": "Névoa Polar",
        "descricao": "área causa −2 em acerto, custa 3 mana.",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "elemental-verdejante",
    "nome": "Elemental Verdejante",
    "tipo": "Elemental",
    "elemento": "Natureza",
    "va": 4,
    "pv": 22,
    "mana": 12,
    "danoBase": "2d4",
    "danoMedio": 5,
    "defesa": 10,
    "funcao": "Controlador",
    "reacoes": {
      "bloqueio": 2,
      "esquiva": 0,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Vento"
    ],
    "resistencias": [
      "Natureza"
    ],
    "imunidades": [
      "Veneno"
    ],
    "descricao": "Massa viva de raízes, galhos, folhas e mana natural.",
    "narrativa": "Use em florestas antigas, santuários naturais e áreas dominadas por plantas.",
    "golpes": [
      {
        "nome": "Chicote de Raízes",
        "descricao": "2d4",
        "dano": "2d4"
      },
      {
        "nome": "Prisão de Cipós",
        "descricao": "prende o alvo, custa 3 mana",
        "custoMana": 3
      },
      {
        "nome": "Regeneração Natural",
        "descricao": "cura 1d4, custa 2 mana.",
        "dano": "1d4",
        "custoMana": 2
      }
    ]
  },
  {
    "id": "elemental-dos-vendavais",
    "nome": "Elemental dos Vendavais",
    "tipo": "Elemental",
    "elemento": "Vento",
    "va": 4,
    "pv": 18,
    "mana": 14,
    "danoBase": "2d4",
    "danoMedio": 5,
    "defesa": 14,
    "funcao": "Evasivo",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Natureza",
      "Área"
    ],
    "resistencias": [
      "Vento"
    ],
    "imunidades": [
      "Queda"
    ],
    "descricao": "Forma instável de ar cortante, poeira e movimento constante.",
    "narrativa": "Use em penhascos, tempestades, torres abertas e campos de batalha com vento forte.",
    "golpes": [
      {
        "nome": "Corte de Ar",
        "descricao": "2d4",
        "dano": "2d4"
      },
      {
        "nome": "Rajada Repulsora",
        "descricao": "empurra 3 metros, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Turbilhão",
        "descricao": "área pequena causa 2d4, custa 3 mana.",
        "dano": "2d4",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "elemental-sombrio",
    "nome": "Elemental Sombrio",
    "tipo": "Elemental",
    "elemento": "Sombrio",
    "va": 5,
    "pv": 22,
    "mana": 16,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 13,
    "funcao": "Controlador elite",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Mana sombria condensada em forma viva. Não anda: desliza pela escuridão.",
    "narrativa": "Use como guardião de portais, ruínas amaldiçoadas ou locais próximos ao vazio.",
    "golpes": [
      {
        "nome": "Lâmina Sombria",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Véu de Escuridão",
        "descricao": "inimigos sofrem −2 em acerto, custa 3 mana",
        "custoMana": 3
      },
      {
        "nome": "Afundar na Sombra",
        "descricao": "usa esquiva com vantagem narrativa."
      }
    ]
  },
  {
    "id": "elemental-radiante",
    "nome": "Elemental Radiante",
    "tipo": "Elemental",
    "elemento": "Radiante",
    "va": 5,
    "pv": 22,
    "mana": 16,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 13,
    "funcao": "Suporte elite",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Sombrio"
    ],
    "resistencias": [
      "Radiante"
    ],
    "imunidades": [
      "Medo"
    ],
    "descricao": "Ser de aurora viva, brilho intenso e energia elevada.",
    "narrativa": "Pode ser guardião sagrado, prova divina ou criatura corrompida pela própria luz.",
    "golpes": [
      {
        "nome": "Raio Radiante",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Clarão Ofuscante",
        "descricao": "inimigos sofrem −2 em acerto, custa 3 mana",
        "custoMana": 3
      },
      {
        "nome": "Pulso Restaurador",
        "descricao": "cura 1d6 em aliado, custa 3 mana.",
        "dano": "1d6",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "elemental-etereo",
    "nome": "Elemental Etéreo",
    "tipo": "Elemental",
    "elemento": "Etéreo",
    "va": 5,
    "pv": 20,
    "mana": 18,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 14,
    "funcao": "Místico",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Neutro",
      "Corpo a corpo"
    ],
    "resistencias": [
      "Etéreo"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Manifestação de mana pura, alma e energia invisível.",
    "narrativa": "Use em lugares entre mundos, grimórios antigos ou falhas mágicas.",
    "golpes": [
      {
        "nome": "Pulso Etéreo",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Deslocamento Instável",
        "descricao": "troca de posição curta, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Toque da Mana",
        "descricao": "reduz 1 mana do alvo, custa 3 mana.",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "elemental-neutro",
    "nome": "Elemental Neutro",
    "tipo": "Elemental",
    "elemento": "Neutro",
    "va": 5,
    "pv": 26,
    "mana": 10,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 10,
    "funcao": "Tanque",
    "reacoes": {
      "bloqueio": 3,
      "esquiva": 0,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Etéreo",
      "Perfurante"
    ],
    "resistencias": [
      "Neutro"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Massa bruta de mana material, pesada e difícil de destruir.",
    "narrativa": "Use como guardião bruto, criatura invocada incompleta ou defesa antiga.",
    "golpes": [
      {
        "nome": "Pancada Bruta",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Endurecer",
        "descricao": "reduz 5 de dano no próximo ataque, custa 2 mana",
        "custoMana": 2
      },
      {
        "nome": "Onda de Impacto",
        "descricao": "derruba inimigos próximos, custa 3 mana.",
        "custoMana": 3
      }
    ]
  },
  {
    "id": "gigante-de-ferro",
    "nome": "Gigante de Ferro",
    "tipo": "Constructo",
    "tipoSecundario": "Gigante",
    "elemento": "Neutro",
    "va": 5,
    "pv": 26,
    "mana": 12,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 8,
    "funcao": "Elite tanque",
    "reacoes": {
      "bloqueio": 3,
      "esquiva": 0,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Perfurante",
      "Etéreo"
    ],
    "resistencias": [
      "Neutro",
      "Fogo"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Colosso metálico de força brutal e defesa quase impenetrável.",
    "narrativa": "Use como guardião de ruínas, arma antiga ou criação de Artífices esquecidos.",
    "golpes": [
      {
        "nome": "Soco de Aço",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Pisada Amedrontadora",
        "descricao": "1d6 e −1 acerto",
        "dano": "1d6"
      },
      {
        "nome": "Golpe Devastador",
        "descricao": "2d8 e empurra, custa 2 mana",
        "dano": "2d8",
        "custoMana": 2
      },
      {
        "nome": "Impacto Sismorruína",
        "descricao": "3d6 em área, custa 4 mana.",
        "dano": "3d6",
        "custoMana": 4
      }
    ]
  },
  {
    "id": "basilisco-verdejante",
    "nome": "Basilisco Verdejante",
    "tipo": "Besta",
    "tipoSecundario": "Venenoso",
    "elemento": "Natureza",
    "va": 5,
    "pv": 24,
    "mana": 12,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 12,
    "funcao": "Elite controlador",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Natureza",
      "Longa distância"
    ],
    "resistencias": [
      "Veneno",
      "Natureza"
    ],
    "imunidades": [
      "Veneno"
    ],
    "descricao": "Criatura ancestral de escamas verdes, olhar paralisante e toxinas naturais.",
    "narrativa": "Use em selvas, templos naturais, ruínas verdes e áreas de cobertura densa.",
    "golpes": [
      {
        "nome": "Cauda Veloz",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Olhar Paralisante",
        "descricao": "alvo pode perder ação"
      },
      {
        "nome": "Mordida Tóxica",
        "descricao": "2d6 + 1d4 veneno, custa 2 mana",
        "dano": "2d6 + 1d4",
        "custoMana": 2
      },
      {
        "nome": "Espinhos da Perdição",
        "descricao": "2d8+2 e −2 defesa, custa 4 mana.",
        "dano": "2d8+2",
        "custoMana": 4
      }
    ]
  },
  {
    "id": "lacaio-da-noite-eterna",
    "nome": "Lacaio da Noite Eterna",
    "tipo": "Sombra",
    "elemento": "Sombrio",
    "va": 5,
    "pv": 22,
    "mana": 14,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 13,
    "funcao": "Elite sombrio",
    "reacoes": {
      "bloqueio": 0,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Manifestação profunda de escuridão. Não apenas ataca: apaga a confiança dos inimigos.",
    "narrativa": "Use como comandante de sombras ou servo de uma entidade maior.",
    "golpes": [
      {
        "nome": "Garra da Escuridão",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Névoa da Agonia",
        "descricao": "reduz dano do alvo em −1d4",
        "dano": "1d4"
      },
      {
        "nome": "Grito do Abismo",
        "descricao": "2d8 e −2 ataque, custa 2 mana",
        "dano": "2d8",
        "custoMana": 2
      },
      {
        "nome": "Eclipse Mortal",
        "descricao": "6d3 em área e −2 defesa, custa 5 mana.",
        "dano": "6d3",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "fenix-celeste",
    "nome": "Fênix Celeste",
    "tipo": "Ave",
    "tipoSecundario": "Místico",
    "elemento": "Fogo ou Radiante",
    "va": 8,
    "pv": 28,
    "mana": 18,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 14,
    "funcao": "Boss suporte",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 0
    },
    "fraquezas": [
      "Água",
      "Sombrio"
    ],
    "resistencias": [
      "Fogo",
      "Radiante"
    ],
    "imunidades": [
      "Queimadura"
    ],
    "descricao": "Ave sagrada de fogo celestial, símbolo de esperança, renascimento e poder elevado.",
    "narrativa": "Pode ser inimiga, guardiã, prova divina ou criatura corrompida.",
    "golpes": [
      {
        "nome": "Corte Solar",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Asas Cegantes",
        "descricao": "inimigos sofrem −2 em acerto"
      },
      {
        "nome": "Fulgor Restaurador",
        "descricao": "cura 4d3, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Renascimento",
        "descricao": "ao morrer, volta com metade da vida, uma vez por combate."
      }
    ]
  },
  {
    "id": "dragao-das-cinzas",
    "nome": "Dragão das Cinzas",
    "tipo": "Dragão",
    "elemento": "Fogo",
    "va": 10,
    "pv": 38,
    "mana": 20,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 12,
    "funcao": "Boss",
    "reacoes": {
      "bloqueio": 2,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Água",
      "Perfurante"
    ],
    "resistencias": [
      "Fogo"
    ],
    "imunidades": [
      "Queimadura"
    ],
    "descricao": "Dragão antigo marcado por cinzas, fogo e destruição.",
    "narrativa": "Use como ameaça central de arco.",
    "golpes": [
      {
        "nome": "Garra Flamejante",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Cauda Cortante",
        "descricao": "4d3",
        "dano": "4d3"
      },
      {
        "nome": "Sopro de Cinzas",
        "descricao": "4d3 em cone, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Ira Ancestral",
        "descricao": "4d10 em área, recarga de 3 rodadas.",
        "dano": "4d10"
      }
    ]
  },
  {
    "id": "dragao-glacial",
    "nome": "Dragão Glacial",
    "tipo": "Dragão",
    "elemento": "Água",
    "va": 10,
    "pv": 38,
    "mana": 20,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 11,
    "funcao": "Boss controlador",
    "reacoes": {
      "bloqueio": 2,
      "esquiva": 0,
      "contraAtaque": 2
    },
    "fraquezas": [
      "Fogo",
      "Perfurante"
    ],
    "resistencias": [
      "Água"
    ],
    "imunidades": [
      "Congelamento"
    ],
    "descricao": "Dragão de escamas glaciais, sopro congelante e presença opressora.",
    "narrativa": "Use em montanhas, cavernas congeladas, lagos antigos e fortalezas tomadas pelo inverno.",
    "golpes": [
      {
        "nome": "Garra Glacial",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Sopro Congelante",
        "descricao": "4d3 em cone e reduz movimento, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Muralha de Gelo",
        "descricao": "bloqueia passagem, custa 5 mana.",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "dragao-verdejante",
    "nome": "Dragão Verdejante",
    "tipo": "Dragão",
    "elemento": "Natureza",
    "va": 10,
    "pv": 40,
    "mana": 18,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 11,
    "funcao": "Boss territorial",
    "reacoes": {
      "bloqueio": 2,
      "esquiva": 1,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Vento"
    ],
    "resistencias": [
      "Natureza"
    ],
    "imunidades": [
      "Veneno"
    ],
    "descricao": "Dragão coberto de vinhas, espinhos e escamas verdes antigas.",
    "narrativa": "Use como guardião de floresta proibida ou criatura venerada por cultos naturais.",
    "golpes": [
      {
        "nome": "Garra Verdejante",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Sopro de Esporos",
        "descricao": "dano e veneno, custa 4 mana",
        "custoMana": 4
      },
      {
        "nome": "Raízes Ancestrais",
        "descricao": "prende inimigos, custa 5 mana.",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "dragao-dos-vendavais",
    "nome": "Dragão dos Vendavais",
    "tipo": "Dragão",
    "elemento": "Vento",
    "va": 10,
    "pv": 34,
    "mana": 22,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 14,
    "funcao": "Boss evasivo",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Natureza",
      "Área"
    ],
    "resistencias": [
      "Vento"
    ],
    "imunidades": [
      "Queda"
    ],
    "descricao": "Dragão veloz, cercado por correntes de ar cortante e trovões distantes.",
    "narrativa": "Use em penhascos, céus abertos, torres partidas e batalhas com terreno instável.",
    "golpes": [
      {
        "nome": "Garra de Vento",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Sopro Cortante",
        "descricao": "4d3 em linha, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Voo Turbulento",
        "descricao": "desloca todos próximos, custa 5 mana.",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "dragao-umbral",
    "nome": "Dragão Umbral",
    "tipo": "Dragão",
    "tipoSecundario": "Sombra",
    "elemento": "Sombrio",
    "va": 10,
    "pv": 36,
    "mana": 22,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 13,
    "funcao": "Boss sombrio",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento",
      "Medo"
    ],
    "descricao": "Dragão de sombras densas, olhos frios e presença que apaga a coragem.",
    "narrativa": "Use como ameaça ligada a ruínas Umbra, vazios dimensionais ou pactos antigos.",
    "golpes": [
      {
        "nome": "Garra Umbral",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Sopro de Trevas",
        "descricao": "4d3 sombrio, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Devorar Luz",
        "descricao": "reduz acerto dos inimigos, custa 5 mana.",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "dragao-da-aurora",
    "nome": "Dragão da Aurora",
    "tipo": "Dragão",
    "elemento": "Radiante",
    "va": 10,
    "pv": 36,
    "mana": 22,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 13,
    "funcao": "Boss radiante",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Sombrio",
      "Perfurante"
    ],
    "resistencias": [
      "Radiante"
    ],
    "imunidades": [
      "Medo"
    ],
    "descricao": "Dragão de brilho dourado, asas luminosas e rugido como nascer do sol.",
    "narrativa": "Pode ser guardião sagrado, juiz antigo ou criatura cuja luz saiu de controle.",
    "golpes": [
      {
        "nome": "Garra Radiante",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Sopro da Aurora",
        "descricao": "4d3 radiante, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Clarão Majestoso",
        "descricao": "inimigos sofrem −2 em acerto, custa 5 mana.",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "dragao-etereo",
    "nome": "Dragão Etéreo",
    "tipo": "Dragão",
    "elemento": "Etéreo",
    "va": 10,
    "pv": 34,
    "mana": 24,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 15,
    "funcao": "Boss místico",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Neutro",
      "Corpo a corpo"
    ],
    "resistencias": [
      "Etéreo"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento"
    ],
    "descricao": "Dragão que parece existir entre o mundo físico e uma camada espiritual da realidade.",
    "narrativa": "Use em campanhas envolvendo grimórios antigos, portais, sonhos ou outros mundos.",
    "golpes": [
      {
        "nome": "Garra Etérea",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Sopro da Alma",
        "descricao": "4d3 etéreo, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Distorção",
        "descricao": "troca de posição ou cria ilusão, custa 5 mana.",
        "custoMana": 5
      }
    ]
  },
  {
    "id": "dragao-primordial",
    "nome": "Dragão Primordial",
    "tipo": "Dragão",
    "elemento": "Neutro",
    "va": 10,
    "pv": 42,
    "mana": 16,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 10,
    "funcao": "Boss bruto",
    "reacoes": {
      "bloqueio": 3,
      "esquiva": 0,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Etéreo",
      "Perfurante"
    ],
    "resistencias": [
      "Neutro"
    ],
    "imunidades": [],
    "descricao": "Dragão ancestral de força pura, mais antigo que muitas linhagens conhecidas.",
    "narrativa": "Use como ameaça física extrema, guardião de eras antigas ou besta impossível de negociar.",
    "golpes": [
      {
        "nome": "Mordida Primordial",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Cauda Devastadora",
        "descricao": "4d3 em área",
        "dano": "4d3"
      },
      {
        "nome": "Rugido Antigo",
        "descricao": "inimigos sofrem −2 em testes, custa 4 mana.",
        "custoMana": 4
      }
    ]
  },
  {
    "id": "leviata-abissal",
    "nome": "Leviatã Abissal",
    "tipo": "Colosso",
    "tipoSecundario": "Dragão",
    "elemento": "Água",
    "va": 10,
    "pv": 36,
    "mana": 20,
    "danoBase": "3d6",
    "danoMedio": 10,
    "defesa": 10,
    "funcao": "Boss controlador",
    "reacoes": {
      "bloqueio": 3,
      "esquiva": 0,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Vento",
      "Perfurante"
    ],
    "resistencias": [
      "Água"
    ],
    "imunidades": [
      "Afogamento"
    ],
    "descricao": "Criatura colossal das profundezas, envolta em pressão, água e tempestades.",
    "narrativa": "Use em navios, cidades costeiras, ruínas submersas e arenas com água.",
    "golpes": [
      {
        "nome": "Mordida das Profundezas",
        "descricao": "3d6",
        "dano": "3d6"
      },
      {
        "nome": "Cauda Voraz",
        "descricao": "4d3",
        "dano": "4d3"
      },
      {
        "nome": "Jato Pressurizado",
        "descricao": "8d2, custa 3 mana",
        "dano": "8d2",
        "custoMana": 3
      },
      {
        "nome": "Tufão do Abismo",
        "descricao": "6d3 em área e arrasta inimigos, custa 8 mana.",
        "dano": "6d3",
        "custoMana": 8
      }
    ]
  },
  {
    "id": "serafim-da-aurora",
    "nome": "Serafim da Aurora",
    "tipo": "Celestial",
    "elemento": "Radiante",
    "va": 10,
    "pv": 34,
    "mana": 22,
    "danoBase": "2d6",
    "danoMedio": 7,
    "defesa": 14,
    "funcao": "Boss suporte",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Sombrio",
      "Perfurante"
    ],
    "resistencias": [
      "Radiante"
    ],
    "imunidades": [
      "Medo"
    ],
    "descricao": "Entidade de luz elevada, majestosa e severa. Sua presença inspira aliados e julga inimigos.",
    "narrativa": "Use em provas divinas, templos antigos ou conflitos morais.",
    "golpes": [
      {
        "nome": "Lâmina da Aurora",
        "descricao": "2d6",
        "dano": "2d6"
      },
      {
        "nome": "Voz Celestial",
        "descricao": "aliados recebem +3 em testes, custa 3 mana",
        "custoMana": 3
      },
      {
        "nome": "Asas do Refúgio",
        "descricao": "cura 2d6, custa 5 mana",
        "dano": "2d6",
        "custoMana": 5
      },
      {
        "nome": "Exílio Divino",
        "descricao": "4d6 e remove alvo por 1 turno se falhar, custa 8 mana.",
        "dano": "4d6",
        "custoMana": 8
      }
    ]
  },
  {
    "id": "entidade-do-vazio",
    "nome": "Entidade do Vazio",
    "tipo": "Entidade",
    "tipoSecundario": "Cósmico",
    "elemento": "Sombrio",
    "va": 12,
    "pv": 36,
    "mana": 22,
    "danoBase": "4d4",
    "danoMedio": 10,
    "defesa": 15,
    "funcao": "Boss final",
    "reacoes": {
      "bloqueio": 1,
      "esquiva": 2,
      "contraAtaque": 1
    },
    "fraquezas": [
      "Fogo",
      "Vento",
      "Radiante"
    ],
    "resistencias": [
      "Sombrio",
      "Etéreo"
    ],
    "imunidades": [
      "Veneno",
      "Sangramento",
      "Medo"
    ],
    "descricao": "Uma existência nascida do nada absoluto. Não é apenas uma criatura, mas uma falha viva na realidade.",
    "narrativa": "Use como ameaça final de campanha, manifestação de desequilíbrio cósmico ou entidade ligada a mundos externos.",
    "golpes": [
      {
        "nome": "Garras do Vazio",
        "descricao": "4d4",
        "dano": "4d4"
      },
      {
        "nome": "Aura Espectral",
        "descricao": "inimigos sofrem −2 em acerto"
      },
      {
        "nome": "Corrente Dimensional",
        "descricao": "puxa o inimigo e causa 4d3, custa 4 mana",
        "dano": "4d3",
        "custoMana": 4
      },
      {
        "nome": "Ruína Final",
        "descricao": "8d3 sombrio; se o alvo estiver com 16 PV ou menos, explode causando 2d6 em área, custa 6 mana.",
        "dano": "8d3",
        "custoMana": 6
      }
    ]
  }
];

export function getAmeacaById(id: string) {
  return dataBestiario.find((ameaca) => ameaca.id === id) ?? null;
}
