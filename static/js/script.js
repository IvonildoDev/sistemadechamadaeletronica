// Adicione no início do seu script.js para diagnóstico
console.log('Página atual:', window.location.pathname);
console.log('IDs disponíveis na página:');
document.querySelectorAll('[id]').forEach(el => {
    console.log(' - ' + el.id);
});

// Função auxiliar para verificar se um elemento existe
function elementExists(id) {
    return document.getElementById(id) !== null;
}

// Wrapper seguro para getElementById
function getElementSafely(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Elemento com ID "${id}" não encontrado na página atual.`);
        return null;
    }
    return element;
}

// Função para detectar a página atual
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('equipamento')) return 'equipamento';
    if (path.includes('cliente')) return 'cliente';
    if (path.includes('usuario')) return 'usuario';
    if (path.includes('pendentes_entrega')) return 'pendentes_entrega';
    return 'index';
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Inicializando script.js...');

    // Detectar página atual
    const currentPage = getCurrentPage();

    // Inicializar elementos com base na página atual
    switch (currentPage) {
        case 'equipamento':
            initEquipamentoPage();
            break;
        case 'cliente':
            initClientePage();
            break;
        case 'usuario':
            initUsuarioPage();
            break;
        case 'pendentes_entrega':
            initEntregaPage();
            break;
        default:
            // Nada a inicializar nesta página
            break;
    }
});

// Inicialização de cada página
function initEquipamentoPage() {
    const formEquipamento = getElementSafely('form-equipamento');
    if (formEquipamento) {
        console.log('Inicializando formulário de equipamento');
        // Código específico para o formulário de equipamento
    }
}

function initClientePage() {
    const clienteForm = getElementSafely('cliente-form');
    if (clienteForm) {
        console.log('Inicializando formulário de cliente');
        // Código específico para o formulário de cliente
    }
}

function initUsuarioPage() {
    const usuarioForm = getElementSafely('usuarioForm');
    if (usuarioForm) {
        console.log('Inicializando formulário de usuário');
        // Código específico para o formulário de usuário
    }
}

function initEntregaPage() {
    const entregaForm = getElementSafely('entregaForm');
    if (entregaForm) {
        console.log('Inicializando formulário de entrega');
        // Código específico para o formulário de entrega
    }
}