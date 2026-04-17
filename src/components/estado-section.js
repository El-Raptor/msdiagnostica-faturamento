import { criarCardCidade } from "./cidade-card.js";

/**
 * Cria a seção colapsável do Estado contendo o grid de cidades.
 */
export function criarSecaoEstado(estado, meses) {
    const section = document.createElement('section');
    section.className = 'estado-section';

    // Header clicável para abrir/fechar
    const header = document.createElement('div');
    header.className = 'estado-header';
    header.innerHTML = `
        <div class="estado-header__title-group">
            <h2 class="estado-title">${estado.nome}</h2>
            <span class="estado-count">${estado.cidades.length} ${estado.cidades.length === 1 ? 'cidade' : 'cidades'}</span>
        </div>
        <i class="bi bi-chevron-down estado-toggle"></i>
    `;

    // Wrapper animado do conteúdo
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'estado-content';

    const contentInner = document.createElement('div');
    contentInner.className = 'estado-content-inner';

    // O seu grid de cidades atual
    const grid = document.createElement('div');
    grid.className = 'cards-grid';

    estado.cidades.forEach((cidade, index) => {
        const card = criarCardCidade(cidade, meses, index);
        grid.appendChild(card);
    });

    contentInner.appendChild(grid);
    contentWrapper.appendChild(contentInner);
    
    section.appendChild(header);
    section.appendChild(contentWrapper);

    // Evento de Toggle
    header.addEventListener('click', () => {
        section.classList.toggle('is-collapsed');
    });

    return section;
}