import { renderErrorModal } from "./components/error-modal.js";
import { criarLoading, removerLoading } from "./components/loading.js";
import { criarHeader } from "./components/page-header.js";
import { criarCardCidade } from "./components/cidade-card.js";
import { getFaturamento, agruparPorCidade } from "./model/faturamento.js";

document.addEventListener("DOMContentLoaded", async () => {
    const main = document.querySelector("main");
    const pageWrapper = criarPageWrapper();
    main.appendChild(pageWrapper);

    const loading = criarLoading();
    pageWrapper.appendChild(loading);

    try {
        const resposta = await getFaturamento();

        const { meses, cidades } = agruparPorCidade(resposta);

        removerLoading();
        renderPagina(pageWrapper, meses, cidades, resposta);

    } catch (error) {
        removerLoading();
        console.error(error);
        renderErrorModal("Erro ao Obter Dados", error.message || "Não foi possível carregar os dados de faturamento.");
    }
});

function criarPageWrapper() {
    const div = document.createElement("div");
    div.className = "page-wrapper";
    return div;
}

function renderPagina(pageWrapper, meses, cidades, dadosBrutos) {
    const header = criarHeader(meses);
    pageWrapper.insertBefore(header, pageWrapper.firstChild);

    if (cidades.length === 0) {
        renderEmptyState(pageWrapper);
        return;
    }

    const grid = document.createElement("div");
    grid.className = "cards-grid";

    cidades.forEach((cidade, index) => {
        const card = criarCardCidade(cidade, meses, index);
        grid.appendChild(card);
    });

    pageWrapper.appendChild(grid);
}

function renderEmptyState(pageWrapper) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
        <span class="empty-state__icon"><i class="bi bi-inbox"></i></span>
        <p class="empty-state__title">Nenhum dado encontrado</p>
        <p class="empty-state__desc">Não há registros de faturamento para o período consultado.</p>
    `;
    pageWrapper.appendChild(empty);
}
