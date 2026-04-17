import { baixarJSON } from '../utils/download.js';

export function criarBtnDownloadJson(dados, nomeArquivo) {
    // 1. Cria o elemento HTML
    const button = document.createElement('button');
    button.className = 'btn-download-json';
    button.textContent = 'Baixar JSON';

    // 2. Adiciona apenas a lógica pertinente a ele
    button.addEventListener("click", () => {
        baixarJSON(dados, nomeArquivo);
    });

    return button;
}