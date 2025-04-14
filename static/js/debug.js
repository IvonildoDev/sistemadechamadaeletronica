// Ferramenta de debug para teclas
console.log('Debug de teclas inicializado');

document.addEventListener('keydown', function (event) {
    console.log('DEBUG | Tecla pressionada:', event.key, 'Código:', event.keyCode);

    // Removida a detecção específica de ESC
});