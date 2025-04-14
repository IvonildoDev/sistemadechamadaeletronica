/**
 * Teclas de atalho do sistema
 * 
 * F1 - Cadastrar clientes
 * F2 - Cadastrar equipamento
 * F4 - Entrega de equipamentos
 */

// Log para debug
console.log('Carregando atalhos de teclado...');

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM carregado - inicializando atalhos');

    // Adiciona a classe home-page ao body quando na página inicial
    if (window.location.pathname === '/' || window.location.pathname === '/index') {
        document.body.classList.add('home-page');
    }

    // Adiciona o listener para as teclas de atalho
    document.addEventListener('keydown', function (event) {
        // Evita execução se estiver dentro de um campo de texto ou área de texto
        if (event.target.tagName.toLowerCase() === 'input' ||
            event.target.tagName.toLowerCase() === 'textarea') {
            return;
        }

        console.log('Tecla detectada:', event.key);

        switch (event.key) {
            // F1 - Cadastrar clientes
            case 'F1':
                event.preventDefault(); // Evita comportamento padrão do F1 (ajuda do navegador)
                window.location.href = '/cliente';
                break;

            // F2 - Cadastrar equipamento
            case 'F2':
                event.preventDefault();
                window.location.href = '/equipamento';
                break;

            // F4 - Entrega de equipamentos
            case 'F4':
                event.preventDefault();
                window.location.href = '/pendentes_entrega';
                break;
        }
    });

    // Exibe dica sobre teclas de atalho após o carregamento da página
    const shortcuts = document.createElement('div');
    shortcuts.className = 'shortcuts-tip';
    shortcuts.innerHTML = `
        <p><strong>Teclas de atalho:</strong> F1 (Clientes) | F2 (Equipamentos) | F4 (Entregas)</p>
        <span class="close-tip">×</span>
    `;
    document.body.appendChild(shortcuts);

    // Permite fechar a dica
    document.querySelector('.close-tip').addEventListener('click', function () {
        shortcuts.style.display = 'none';

        // Armazena preferência do usuário
        localStorage.setItem('hideShortcutsTip', 'true');
    });

    // Verifica se o usuário já fechou a dica antes
    if (localStorage.getItem('hideShortcutsTip') === 'true') {
        shortcuts.style.display = 'none';
    }

    console.log('Atalhos de teclado inicializados!');
});

