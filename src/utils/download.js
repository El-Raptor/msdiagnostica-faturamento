export function baixarJSON(dados, nomeArquivo = "download.json") {
    console.log("dados download", dados)
    // 1. Prepara os dados
    const jsonString = JSON.stringify(dados, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // 2. Cria o link e dispara o clique
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 3. Limpa a memória (MUITO IMPORTANTE)
    URL.revokeObjectURL(url);
}