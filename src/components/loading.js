/**
 * Cria e retorna o elemento de loading skeleton.
 * @returns {HTMLElement}
 */
export function criarLoading() {
    const wrapper = document.createElement('div');
    wrapper.className = 'loading-wrapper';
    wrapper.id = 'loading';

    wrapper.innerHTML = `
        <div class="loading-card skeleton-card">
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--row"></div>
            <div class="skeleton skeleton--row skeleton--row-short"></div>
            <div class="skeleton skeleton--row"></div>
        </div>
        <div class="loading-card skeleton-card" style="animation-delay:120ms">
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--row"></div>
            <div class="skeleton skeleton--row"></div>
        </div>
    `;

    return wrapper;
}

/**
 * Remove o elemento de loading do DOM.
 */
export function removerLoading() {
    document.getElementById('loading')?.remove();
}
