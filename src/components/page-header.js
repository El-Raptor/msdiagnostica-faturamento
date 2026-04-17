import { formatarMesAno } from '../utils/formatters.js';

/**
 * Cria e retorna o cabeçalho da página com título e período exibido.
 * @param {string[]} meses - Array de "YYYYMM"
 * @returns {HTMLElement}
 */
export function criarHeader(meses) {
    const header = document.createElement('header');
    header.className = 'page-header';

    const periodo = meses.length > 0
        ? `${formatarMesAno(meses[0])} – ${formatarMesAno(meses[meses.length - 1])}`
        : '';

    header.innerHTML = `
        <div class="page-header__content">
            <div class="page-header__title-group">
                <h1 class="page-header__title">Faturamento</h1>
                ${periodo ? `<span class="page-header__periodo">${periodo}</span>` : ''}
            </div>
            <div class="page-header__actions" id="header-actions"></div>
        </div>
    `;

    return header;
}
