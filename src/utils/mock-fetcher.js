export async function fetchMock(mockFileName) {
    console.log(`🛠️ Modo Dev: Carregando dados do mock ${mockFileName}...`);
    const response = await fetch(`./src/mocks/${mockFileName}`);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    return await response.json();
}