import { ServicoDados as JSK } from "../service/ServicoDados.js";
import { isDev } from "../utils/env.js";
import { fetchMock } from "../utils/mock-fetcher.js";

/**
 * Busca os dados brutos de faturamento (mock em dev, API em prod).
 * @returns {Promise<{resultado: Array, status: string, statusMessage: string}>}
 */
export async function getFaturamento() {
    if (isDev) {
        return await fetchMock("faturamento.json");
    }

    const campos = "VLRTOT, NOMECID, NOMEPARC, MES_ANO";
    const results = await JSK.consultarView("VW_FATURAMENTO_X_CIDADE_SKMS", campos, null);

    if (!results || results.status == 0) throw new Error("Erro ao consultar faturamento por cidade.", results.statusMessage);

    const rawRecords = results.responseBody.records.record;

    const registrosLimpos = flatResults(rawRecords);
    console.log("Registros Limpos", registrosLimpos);

    return registrosLimpos;
}

function flatResults(rawRecords) {
  const registrosLimpos = rawRecords.map(row => {
    const flatRow = {};
    
    for (const key in row) {
        let val = row[key];
        
        // Se o valor for um objeto (e não for nulo), precisamos "desempacotar"
        if (typeof val === 'object' && val !== null) {
            // Se for um objeto vazio {}, significa que a tag XML veio vazia (campo sem valor)
            if (Object.keys(val).length === 0) {
                val = null;
            } else {
                // Tenta buscar as chaves padrão de parsers XML-to-JSON ('$', '_', 'value')
                // Se não achar nenhuma dessas, pega a primeira propriedade que existir lá dentro
                val = val.$ || val._ || val.value || Object.values(val)[0]; 
            }
        }
        
        flatRow[key] = val;
    }
    
    return flatRow;
  });
  return registrosLimpos;
}

/**
 * Transforma o array bruto em uma estrutura agrupada por cidade.
 *
 * Retorna:
 * {
 *   meses: ['202502', '202503', '202504'],          // 3 meses ordenados
 *   cidades: [
 *     {
 *       nome: 'São Paulo',
 *       clientes: [
 *         { nome: 'Acme Ltda', valores: { '202502': 45200, '202503': 31800, '202504': 52100 } },
 *         ...
 *       ],
 *       totais: { '202502': 73850, '202503': 65500, '202504': 66900 }
 *     },
 *     ...
 *   ]
 * }
 *
 * @param {Array} resultado - Array de linhas brutas da query
 * @returns {{ meses: string[], cidades: Array }}
 */
export function agruparPorCidade(resultado) {
    const mesesSet = new Set();
    const mapaClientes = new Map(); // "CIDADE|||CLIENTE" → { nome, cidade, valores }

    for (const linha of resultado) {
        const { NOMECID, NOMEPARC, MES_ANO, VLRTOT } = linha;

        if (!NOMECID || !NOMEPARC || !MES_ANO) continue;

        if (VLRTOT !== null) mesesSet.add(MES_ANO);

        const chave = `${NOMECID}|||${NOMEPARC}`;
        if (!mapaClientes.has(chave)) {
            mapaClientes.set(chave, { nome: NOMEPARC, cidade: NOMECID, valores: {} });
        }

        const cliente = mapaClientes.get(chave);
        const valorAtual = cliente.valores[MES_ANO] ?? null;
        const novoValor = VLRTOT !== null ? Number(VLRTOT) : null;

        if (novoValor !== null) {
            cliente.valores[MES_ANO] = (valorAtual ?? 0) + novoValor;
        } else if (valorAtual === undefined) {
            cliente.valores[MES_ANO] = null;
        }
    }

    const meses = Array.from(mesesSet).sort();

    // Agrupar por cidade
    const mapaCidades = new Map();
    for (const cliente of mapaClientes.values()) {
        if (!mapaCidades.has(cliente.cidade)) {
            mapaCidades.set(cliente.cidade, { nome: cliente.cidade, clientes: [], totais: {} });
        }
        mapaCidades.get(cliente.cidade).clientes.push(cliente);
    }

    // Calcular totais por cidade/mês
    for (const cidade of mapaCidades.values()) {
        for (const mes of meses) {
            cidade.totais[mes] = cidade.clientes.reduce((acc, c) => {
                return acc + (c.valores[mes] ?? 0);
            }, 0);
        }
        cidade.clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }

    const cidades = Array.from(mapaCidades.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
    );

    return { meses, cidades };
}
