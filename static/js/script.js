document.addEventListener('DOMContentLoaded', function () {
    // Validação do formulário de cliente
    const formCliente = document.getElementById('form-cliente');

    if (formCliente) {
        // Evento para validar o formulário ao enviar
        formCliente.addEventListener('submit', function (event) {
            let isValid = true;

            // Limpar todos os erros anteriores
            clearErrors();

            // Validar Nome
            const nome = document.getElementById('nome');
            if (!nome.value.trim()) {
                showError(nome, 'nome-error');
                isValid = false;
            }

            // Validar Email
            const email = document.getElementById('email');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value.trim())) {
                showError(email, 'email-error');
                isValid = false;
            }

            // Validar Telefone
            const telefone = document.getElementById('telefone');
            const telefoneRegex = /^[0-9]{11}$/;
            if (!telefoneRegex.test(telefone.value.trim())) {
                showError(telefone, 'telefone-error');
                isValid = false;
            }

            // Validar campos obrigatórios de endereço
            const camposEndereco = ['rua', 'numero', 'bairro', 'cidade', 'estado'];
            camposEndereco.forEach(campo => {
                const el = document.getElementById(campo);
                if (!el.value.trim()) {
                    showError(el, `${campo}-error`);
                    isValid = false;
                }
            });

            // Impedir envio do formulário se houver erros
            if (!isValid) {
                event.preventDefault();
            }
        });

        // Validação em tempo real para o telefone
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', function () {
                this.value = this.value.replace(/\D/g, '').substring(0, 11);
            });
        }
    }

    // Validação do formulário de equipamento
    const formEquipamento = document.getElementById('form-equipamento');
    if (formEquipamento) {
        formEquipamento.addEventListener('submit', function (event) {
            let isValid = true;

            // Limpar todos os erros anteriores
            clearErrors();

            // Validar Cliente
            const clienteId = document.getElementById('cliente_id');
            if (!clienteId.value) {
                showError(clienteId, 'cliente-error');
                isValid = false;
            }

            // Validar Marca (obrigatório)
            const marca = document.getElementById('marca');
            if (!marca.value.trim()) {
                showError(marca, 'marca-error');
                isValid = false;
            }

            // Validar Modelo (obrigatório)
            const modelo = document.getElementById('modelo');
            if (!modelo.value.trim()) {
                showError(modelo, 'modelo-error');
                isValid = false;
            }

            // Validar Estado do Equipamento
            const estadoEquipamento = document.getElementById('estado_equipamento');
            if (!estadoEquipamento.value.trim()) {
                showError(estadoEquipamento, 'estado-error');
                isValid = false;
            }

            // Validar Defeito Relatado
            const defeitoRelatado = document.getElementById('defeito_relatado');
            if (!defeitoRelatado.value.trim()) {
                showError(defeitoRelatado, 'defeito-error');
                isValid = false;
            }

            // Impedir envio do formulário se houver erros
            if (!isValid) {
                event.preventDefault();
            }
        });
    }

    // Função para mostrar mensagens de erro
    function showError(inputElement, errorId) {
        inputElement.classList.add('error');
        const errorElement = document.getElementById(errorId);
        if (errorElement) {
            errorElement.style.display = 'block';
        }

        // Adicionar evento para limpar erro quando o campo for alterado
        inputElement.addEventListener('input', function () {
            inputElement.classList.remove('error');
            const errorEl = document.getElementById(errorId);
            if (errorEl) {
                errorEl.style.display = 'none';
            }
        }, { once: true });
    }

    // Limpar todas as mensagens de erro
    function clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(el => el.style.display = 'none');

        const errorInputs = document.querySelectorAll('.error');
        errorInputs.forEach(el => el.classList.remove('error'));
    }
});