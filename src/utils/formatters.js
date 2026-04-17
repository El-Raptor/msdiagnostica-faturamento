/**
 * Formata um número como moeda brasileira (BRL).
 * @param {number|null} valor
 * @returns {string}
 */
export function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    }).format(valor);
}

/**
 * Converte "YYYYMM" para o nome do mês abreviado com o ano.
 * Ex.: "202503" → "Mar/25"
 * @param {string} mesAno
 * @returns {string}
 */
export function formatarMesAno(mesAno) {
    if (!mesAno) return '';
    const ano = mesAno.slice(0, 4);
    const mes = parseInt(mesAno.slice(4, 6), 10) - 1;
    const data = new Date(Number(ano), mes, 1);
    const nomeMes = data.toLocaleString('pt-BR', { month: 'short' });
    const anoAbrev = ano.slice(2);
    return `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1, 3)}/${anoAbrev}`;
}
