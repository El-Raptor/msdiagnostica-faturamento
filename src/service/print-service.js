import { formatarMoeda, formatarMesAno } from '../utils/formatters.js';

export function gerarRelatorioImpressao(estados, meses) {
    // Remove relatório anterior se existir
    const existing = document.getElementById('print-section');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'print-section';

    let html = `
        <h1 style="margin-bottom: 20px;">Relatório de Faturamento por Estado</h1>
        <table class="report-table">
            <thead>
                <tr>
                    <th>Localização / Cliente</th>
                    ${meses.map(mes => `<th class="cell-money">${formatarMesAno(mes)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    estados.forEach(estado => {
        // Linha do Estado
        html += `
            <tr class="row-group-state">
                <td colspan="${meses.length + 1}">Estado: ${estado.nome}</td>
            </tr>
        `;

        estado.cidades.forEach(cidade => {
            // Linha da Cidade
            html += `
                <tr class="row-group-city">
                    <td colspan="${meses.length + 1}"> Cidade: ${cidade.nome}</td>
                </tr>
            `;

            // Linhas dos Clientes
            cidade.clientes.forEach(cliente => {
                html += `
                    <tr>
                        <td style="padding-left: 30px;">${cliente.nome}</td>
                        ${meses.map(mes => {
                            const val = cliente.valores[mes] ?? null;
                            const isZeroOrEmpty = val === null || val === 0;
                            const isPositive = val > 0;

                            let colorClass = '';
                            if (isZeroOrEmpty) {
                                colorClass = 'print-text-danger';
                            } else if (isPositive) {
                                colorClass = 'print-text-blue';
                            }

                            return `<td class="cell-money ${colorClass}">${formatarMoeda(val ?? 0)}</td>`;
                        }).join('')}
                    </tr>
                `;
            });
        });
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    document.body.appendChild(container);
    
    window.print();
}