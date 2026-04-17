export function renderErrorModal(title, message) {
    return `
        <div class="error-modal" role="alertdialog" aria-modal="true" aria-labelledby="error-modal-title">
            <div class="alert-body">
                <div class="error-modal-icon">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
                <h3 id="error-modal-title" class="error-modal-title">${title}</h3>
                <p class="error-modal-message">${message}</p>
            </div>
            <button class="error-modal-btn-ok" id="error-modal-ok">Fechar</button>
        </div>
    `
}