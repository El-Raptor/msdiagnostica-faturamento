import { renderErrorModal } from "./components/error-modal.js";
import { criarLoading, removerLoading } from "./components/loading.js";
import { criarHeader } from "./components/page-header.js";
import { criarSecaoEstado } from "./components/estado-section.js";
import { getFaturamento, agruparPorEstado } from "./model/faturamento.js"; 
import { gerarRelatorioImpressao } from "./service/print-service.js";

document.addEventListener("DOMContentLoaded", async () => {
    const main = document.querySelector("main");
    const pageWrapper = criarPageWrapper();
    main.appendChild(pageWrapper);

    const loading = criarLoading();
    pageWrapper.appendChild(loading);

    try {
        const resposta = await getFaturamento();
        const { meses, estados } = agruparPorEstado(resposta); 

        removerLoading();
        renderPagina(pageWrapper, meses, estados);
        
        // Adiciona funcionalidade ao botão de imprimir (assumindo que ele está no header)
        configurarBotaoImpressao(estados, meses);

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

function renderPagina(pageWrapper, meses, estados) {
    const header = criarHeader(meses);
    pageWrapper.insertBefore(header, pageWrapper.firstChild);

    if (estados.length === 0) {
        renderEmptyState(pageWrapper);
        return;
    }

    // Renderiza uma seção para cada estado
    estados.forEach((estado) => {
        const secao = criarSecaoEstado(estado, meses);
        pageWrapper.appendChild(secao);
    });
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

function configurarBotaoImpressao(estados, meses) {
    // Busca o botão que deve estar no componente page-header
    const btnPrint = document.querySelector("#btn-imprimir");
    if (btnPrint) {
        btnPrint.addEventListener("click", () => {
            gerarRelatorioImpressao(estados, meses);
        });
    }
}