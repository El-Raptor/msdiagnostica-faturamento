import { formatarMoeda, formatarMesAno } from '../utils/formatters.js';

/**
 * Cria e retorna o card de faturamento de uma cidade.
 *
 * @param {{ nome: string, clientes: Array, totais: object }} cidade
 * @param {string[]} meses - Array de "YYYYMM" ordenados
 * @param {number} index - Índice para controle de animação staggered
 * @returns {HTMLElement}
 */
export function criarCardCidade(cidade, meses, index) {
    const card = document.createElement('div');
    card.className = 'cidade-card';
    card.style.animationDelay = `${index * 80}ms`;

    const totalGeral = meses.reduce((acc, mes) => acc + (cidade.totais[mes] ?? 0), 0);

    card.innerHTML = `
        <div class="cidade-card__header">
            <div class="cidade-card__header-left">
                <span class="cidade-card__icon"><i class="bi bi-geo-alt-fill"></i></span>
                <h2 class="cidade-card__titulo">${cidade.nome}</h2>
            </div>
            <span class="cidade-card__total-geral">${formatarMoeda(totalGeral)}</span>
        </div>

        <div class="cidade-card__table-wrapper">
            <table class="fat-table">
                <thead>
                    <tr>
                        <th class="fat-table__col-cliente">Cliente</th>
                        ${meses.map(mes => `<th class="fat-table__col-valor">${formatarMesAno(mes)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${cidade.clientes.map(cliente => `
                        <tr class="fat-table__row">
                            <td class="fat-table__cell-cliente">${cliente.nome}</td>
                            ${meses.map(mes => {
                                const val = cliente.valores[mes] ?? null;
                                const isEmpty = val === null;
                                const isPositive = val > 0; // Verifica se o valor é positivo
                                
                                return `<td class="fat-table__cell-valor ${isEmpty ? 'fat-table__cell-valor--empty' : ''} ${isPositive ? 'fat-table__cell-valor--positivo' : ''}">${formatarMoeda(val)}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="fat-table__row-total">
                        <td class="fat-table__cell-cliente fat-table__cell-label-total">Total</td>
                        ${meses.map(mes => `
                            <td class="fat-table__cell-valor fat-table__cell-valor--total">
                                ${formatarMoeda(cidade.totais[mes] ?? 0)}
                            </td>
                        `).join('')}
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    return card;
}
