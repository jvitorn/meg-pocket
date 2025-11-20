"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/migrate_from_redis.ts
var redis_1 = require("@upstash/redis");
var prisma_1 = require("../src/lib/prisma");
var redis = new redis_1.Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var key, data, personagensArray, _i, personagensArray_1, p, racaIdOriginal, raca, classeIdOriginal, classe, hpBase, manaBase, created, _a, _b, m, _c, _d, per, err_1;
        var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
        return __generator(this, function (_7) {
            switch (_7.label) {
                case 0:
                    console.log('Buscando personagens do Redis...');
                    key = 'personagens';
                    return [4 /*yield*/, redis.json.get(key)];
                case 1:
                    data = _7.sent();
                    if (!data) {
                        console.error('Nenhum dado encontrado na chave personagens');
                        process.exit(1);
                    }
                    personagensArray = Object.values(data);
                    console.log("Encontrados ".concat(personagensArray.length, " personagens. Iniciando migra\u00E7\u00E3o..."));
                    _i = 0, personagensArray_1 = personagensArray;
                    _7.label = 2;
                case 2:
                    if (!(_i < personagensArray_1.length)) return [3 /*break*/, 23];
                    p = personagensArray_1[_i];
                    _7.label = 3;
                case 3:
                    _7.trys.push([3, 21, , 22]);
                    racaIdOriginal = Number((_f = (_e = p.raca_id) !== null && _e !== void 0 ? _e : p.racaId) !== null && _f !== void 0 ? _f : 0);
                    raca = null;
                    if (!racaIdOriginal) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma_1.prisma.raca.upsert({
                            where: { id: racaIdOriginal },
                            update: {},
                            create: {
                                id: racaIdOriginal,
                                nome: "raca-".concat(racaIdOriginal),
                                descricao: null,
                                hp: 0,
                                mana: 0,
                            },
                        })];
                case 4:
                    // tentamos achar por nome (se existir uma tabela racas populada) ou criar placeholder
                    raca = _7.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, prisma_1.prisma.raca.create({
                        data: {
                            nome: "raca-unknown",
                            descricao: null,
                            hp: 0,
                            mana: 0,
                        },
                    })];
                case 6:
                    // fallback: cria raca genérica
                    raca = _7.sent();
                    _7.label = 7;
                case 7:
                    classeIdOriginal = Number((_h = (_g = p.classe_id) !== null && _g !== void 0 ? _g : p.classeId) !== null && _h !== void 0 ? _h : 0);
                    classe = null;
                    if (!classeIdOriginal) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma_1.prisma.classe.upsert({
                            where: { id: classeIdOriginal },
                            update: {},
                            create: {
                                id: classeIdOriginal,
                                nome: "classe-".concat(classeIdOriginal),
                                descricao: null,
                                hp: 0,
                                mana: 0,
                            },
                        })];
                case 8:
                    classe = _7.sent();
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, prisma_1.prisma.classe.create({
                        data: {
                            nome: "classe-unknown",
                            descricao: null,
                            hp: 0,
                            mana: 0,
                        },
                    })];
                case 10:
                    classe = _7.sent();
                    _7.label = 11;
                case 11:
                    hpBase = ((_j = raca.hp) !== null && _j !== void 0 ? _j : 0) + ((_k = classe.hp) !== null && _k !== void 0 ? _k : 0);
                    manaBase = ((_l = raca.mana) !== null && _l !== void 0 ? _l : 0) + ((_m = classe.mana) !== null && _m !== void 0 ? _m : 0);
                    return [4 /*yield*/, prisma_1.prisma.personagem.create({
                            data: {
                                external_id: (_o = p._id) !== null && _o !== void 0 ? _o : null,
                                nome: (p.apelido && p.apelido.trim() !== '') ? p.apelido : p.nome,
                                apelido: (_p = p.apelido) !== null && _p !== void 0 ? _p : null,
                                descricao: (_r = (_q = p.sobre) !== null && _q !== void 0 ? _q : p.descricao) !== null && _r !== void 0 ? _r : null,
                                campanha_id: Number((_s = p.campanha_id) !== null && _s !== void 0 ? _s : 0),
                                classeId: classe.id,
                                racaId: raca.id,
                                elemento: (_t = p.elemento) !== null && _t !== void 0 ? _t : '',
                                hp_atual: (_u = p.hp_atual) !== null && _u !== void 0 ? _u : null,
                                mana_atual: (_v = p.mana_atual) !== null && _v !== void 0 ? _v : null,
                                hp_base: hpBase,
                                mana_base: manaBase,
                                imagem_pixel: (_w = p.imagem_pixel) !== null && _w !== void 0 ? _w : null,
                                url_imagem: (_x = p.url_imagem) !== null && _x !== void 0 ? _x : null,
                                index: typeof p.index === 'number' ? p.index : null,
                                status_baile: (_y = p.status_baile) !== null && _y !== void 0 ? _y : null,
                            },
                        })];
                case 12:
                    created = _7.sent();
                    if (!Array.isArray(p.magias)) return [3 /*break*/, 16];
                    _a = 0, _b = p.magias;
                    _7.label = 13;
                case 13:
                    if (!(_a < _b.length)) return [3 /*break*/, 16];
                    m = _b[_a];
                    return [4 /*yield*/, prisma_1.prisma.magia.create({
                            data: {
                                personagemId: created.id,
                                nome: (_z = m.nome) !== null && _z !== void 0 ? _z : 'sem-nome',
                                alcance: (_0 = m.alcance) !== null && _0 !== void 0 ? _0 : null,
                                descricao: (_1 = m.descricao) !== null && _1 !== void 0 ? _1 : '',
                                custo_nivel: (_2 = m.custo_nivel) !== null && _2 !== void 0 ? _2 : null,
                            },
                        })];
                case 14:
                    _7.sent();
                    _7.label = 15;
                case 15:
                    _a++;
                    return [3 /*break*/, 13];
                case 16:
                    if (!Array.isArray(p.pericias)) return [3 /*break*/, 20];
                    _c = 0, _d = p.pericias;
                    _7.label = 17;
                case 17:
                    if (!(_c < _d.length)) return [3 /*break*/, 20];
                    per = _d[_c];
                    return [4 /*yield*/, prisma_1.prisma.pericia.create({
                            data: {
                                personagemId: created.id,
                                nome: (_3 = per.nome) !== null && _3 !== void 0 ? _3 : 'sem-nome',
                                tipo: (_4 = per.tipo) !== null && _4 !== void 0 ? _4 : '',
                                pontuacao: Number((_5 = per.pontuacao) !== null && _5 !== void 0 ? _5 : 0),
                                descricao: (_6 = per.descricao) !== null && _6 !== void 0 ? _6 : null,
                            },
                        })];
                case 18:
                    _7.sent();
                    _7.label = 19;
                case 19:
                    _c++;
                    return [3 /*break*/, 17];
                case 20:
                    console.log("Personagem migrado: external_id=".concat(p._id, " -> id=").concat(created.id));
                    return [3 /*break*/, 22];
                case 21:
                    err_1 = _7.sent();
                    console.error('Erro ao migrar personagem', p._id, err_1);
                    return [3 /*break*/, 22];
                case 22:
                    _i++;
                    return [3 /*break*/, 2];
                case 23:
                    console.log('Migração finalizada.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma_1.prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
