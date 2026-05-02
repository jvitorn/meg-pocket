-- Inventario distribuido entre personagens de exemplo
COPY "ItemInventario" ("id", "personagemId", "itemId", "quantidade", "durabilidadeAtual", "durabilidadeMax", "efeitoAtivo", "esgotadoEm", "observacoes", "createdAt", "updatedAt") FROM stdin WITH (FORMAT csv, HEADER true, NULL 'null');
id,personagemId,itemId,quantidade,durabilidadeAtual,durabilidadeMax,efeitoAtivo,esgotadoEm,observacoes,createdAt,updatedAt
1,1,1,1,4,4,false,null,Arma principal de Celi,2026-05-02 12:05:00,2026-05-02 12:05:00
2,1,2,2,1,1,false,null,Cura rápida,2026-05-02 12:05:00,2026-05-02 12:05:00
3,2,1,1,4,4,false,null,Arma tribal de treino,2026-05-02 12:05:00,2026-05-02 12:05:00
4,2,2,1,1,1,false,null,Emergência,2026-05-02 12:05:00,2026-05-02 12:05:00
5,3,4,1,6,6,false,null,Canalizador arcano,2026-05-02 12:05:00,2026-05-02 12:05:00
6,8,6,1,1,1,false,null,Equipamento de jornada,2026-05-02 12:05:00,2026-05-02 12:05:00
7,5,3,2,1,1,false,null,Preparada para conjurações longas,2026-05-02 12:05:00,2026-05-02 12:05:00
8,8,5,4,null,null,false,null,Componentes para ritual,2026-05-02 12:05:00,2026-05-02 12:05:00
9,3,3,3,1,1,false,null,Reserva de mana,2026-05-02 12:05:00,2026-05-02 12:05:00
10,8,2,2,1,1,false,null,Poções anotadas na ficha,2026-05-02 12:05:00,2026-05-02 12:05:00
11,8,3,2,1,1,false,null,Poções anotadas na ficha,2026-05-02 12:05:00,2026-05-02 12:05:00
12,10,4,1,5,6,false,null,Grimório marcado por cinzas,2026-05-02 12:05:00,2026-05-02 12:05:00
13,13,1,1,4,4,false,null,Espada simples de Alberto,2026-05-02 12:05:00,2026-05-02 12:05:00
14,18,4,1,6,6,false,null,Tomo do eclipse,2026-05-02 12:05:00,2026-05-02 12:05:00
15,19,5,3,null,null,false,null,Ervas e reagentes naturais,2026-05-02 12:05:00,2026-05-02 12:05:00
16,25,4,1,6,6,false,null,Grimório de batalha da princesa,2026-05-02 12:05:00,2026-05-02 12:05:00
17,26,2,2,1,1,false,null,Poções recuperadas pelo mestre,2026-05-02 12:05:00,2026-05-02 12:05:00
18,26,3,1,1,1,false,null,Mana de reserva,2026-05-02 12:05:00,2026-05-02 12:05:00
19,27,6,1,1,1,true,null,Defesa arcana ativa,2026-05-02 12:05:00,2026-05-02 12:05:00
20,28,1,1,3,4,false,null,Lâmina contratual,2026-05-02 12:05:00,2026-05-02 12:05:00
\.
SELECT setval(pg_get_serial_sequence('"ItemInventario"', 'id'), COALESCE((SELECT MAX("id") FROM "ItemInventario"), 1), true);
