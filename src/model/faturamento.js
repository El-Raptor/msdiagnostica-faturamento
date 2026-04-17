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

    const campos = "VLRTOT, NOMECID, NOMEPARC, MES_ANO, UF";
    const results = await JSK.consultarView("VW_FATURAMENTO_X_CIDADE_SKMS", campos, null);

    if (!results || results.status == 0) throw new Error("Erro ao consultar faturamento por cidade.", results.statusMessage);

    const rawRecords = results.responseBody.records.record;

    const registrosLimpos = flatResults(rawRecords);
    console.log("Registros Limpos", registrosLimpos);

    return registrosLimpos;
}

function formatarNomeEstado(nome) {
    if (!nome) return "Estado Não Informado";
    const preposicoes = ["de", "da", "do", "das", "dos", "e"];
    return nome
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index > 0 && preposicoes.includes(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
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

export function agruparPorEstado(resultado) {
    const mesesSet = new Set();
    const mapaClientes = new Map(); // "UF|||CIDADE|||CLIENTE"

    for (const linha of resultado) {
        const { UF, NOMECID, NOMEPARC, MES_ANO, VLRTOT } = linha;

        if (!NOMECID || !NOMEPARC || !MES_ANO) continue;

        if (VLRTOT !== null) mesesSet.add(MES_ANO);

        const nomeUfFormatado = formatarNomeEstado(UF);
        const chave = `${nomeUfFormatado}|||${NOMECID}|||${NOMEPARC}`;

        if (!mapaClientes.has(chave)) {
            mapaClientes.set(chave, { estado: nomeUfFormatado, nome: NOMEPARC, cidade: NOMECID, valores: {} });
        }

        const cliente = mapaClientes.get(chave);
        const valorAtual = cliente.valores[MES_ANO] ?? null;
        const novoValor = VLRTOT !== null ? Number(VLRTOT) : null;

        if (novoValor !== null) {
            cliente.valores[MES_ANO] = (valorAtual ?? 0) + novoValor;
        } else if (valorAtual === undefined) {
            cliente.valores[MES_ANO] = null;
        }
    }const meses = Array.from(mesesSet).sort();

    // Agrupar clientes primeiro por Estado, depois por Cidade
    const mapaEstados = new Map();
    for (const cliente of mapaClientes.values()) {
        if (!mapaEstados.has(cliente.estado)) {
            mapaEstados.set(cliente.estado, { nome: cliente.estado, cidadesMap: new Map() });
        }

        const estadoObj = mapaEstados.get(cliente.estado);
        if (!estadoObj.cidadesMap.has(cliente.cidade)) {
            estadoObj.cidadesMap.set(cliente.cidade, { nome: cliente.cidade, clientes: [], totais: {} });
        }

        estadoObj.cidadesMap.get(cliente.cidade).clientes.push(cliente);
    }

    // Calcular totais e transformar os Maps em Arrays ordenados
    const estados = Array.from(mapaEstados.values()).map(estado => {
        const cidades = Array.from(estado.cidadesMap.values()).map(cidade => {
            for (const mes of meses) {
                cidade.totais[mes] = cidade.clientes.reduce((acc, c) => acc + (c.valores[mes] ?? 0), 0);
            }
            cidade.clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            return cidade;
        }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        return { nome: estado.nome, cidades };
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return { meses, estados };
}