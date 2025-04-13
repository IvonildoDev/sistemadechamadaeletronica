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

    // Validação do formulário de usuário
    const usuarioForm = document.getElementById('usuarioForm');
    if (usuarioForm) {
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const senhaInput = document.getElementById('senha');
        const nomeFeedback = document.getElementById('nome-feedback');
        const emailFeedback = document.getElementById('email-feedback');
        const senhaFeedback = document.getElementById('senha-feedback');
        const submitButton = document.getElementById('btnSubmit');

        // Debounce function para evitar muitas requisições
        function debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        // Verificar nome de usuário com debounce
        const verificarNome = debounce(function () {
            const nome = nomeInput.value.trim();
            if (nome.length < 3) {
                nomeFeedback.textContent = 'O nome deve ter pelo menos 3 caracteres';
                nomeFeedback.className = 'feedback-message error';
                nomeInput.classList.add('input-error');
                return;
            }

            // Exibir estado de carregamento
            nomeFeedback.textContent = 'Verificando...';
            nomeFeedback.className = 'feedback-message loading';
            nomeInput.classList.remove('input-error', 'input-success');

            // Fazer requisição AJAX
            const formData = new FormData();
            formData.append('nome', nome);

            fetch('/verificar_usuario', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.valido) {
                        nomeFeedback.textContent = data.mensagem;
                        nomeFeedback.className = 'feedback-message success';
                        nomeInput.classList.add('input-success');
                    } else {
                        nomeFeedback.textContent = data.mensagem;
                        nomeFeedback.className = 'feedback-message error';
                        nomeInput.classList.add('input-error');
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar nome de usuário:', error);
                    nomeFeedback.textContent = 'Erro ao verificar nome de usuário';
                    nomeFeedback.className = 'feedback-message error';
                });
        }, 500);

        // Verificar email com debounce
        const verificarEmail = debounce(function () {
            const email = emailInput.value.trim();
            if (!isValidEmail(email)) {
                emailFeedback.textContent = 'Digite um email válido';
                emailFeedback.className = 'feedback-message error';
                emailInput.classList.add('input-error');
                return;
            }

            // Exibir estado de carregamento
            emailFeedback.textContent = 'Verificando...';
            emailFeedback.className = 'feedback-message loading';
            emailInput.classList.remove('input-error', 'input-success');

            // Fazer requisição AJAX
            const formData = new FormData();
            formData.append('email', email);

            fetch('/verificar_email', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.valido) {
                        emailFeedback.textContent = data.mensagem;
                        emailFeedback.className = 'feedback-message success';
                        emailInput.classList.add('input-success');
                    } else {
                        emailFeedback.textContent = data.mensagem;
                        emailFeedback.className = 'feedback-message error';
                        emailInput.classList.add('input-error');
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar email:', error);
                    emailFeedback.textContent = 'Erro ao verificar email';
                    emailFeedback.className = 'feedback-message error';
                });
        }, 500);

        // Verificar força da senha
        const verificarSenha = function () {
            const senha = senhaInput.value;
            if (senha.length < 6) {
                senhaFeedback.textContent = 'A senha deve ter pelo menos 6 caracteres';
                senhaFeedback.className = 'feedback-message error';
                senhaInput.classList.add('input-error');
                return;
            }

            let forca = 0;
            // Verificar letras minúsculas
            if (senha.match(/[a-z]/)) forca++;
            // Verificar letras maiúsculas
            if (senha.match(/[A-Z]/)) forca++;
            // Verificar números
            if (senha.match(/[0-9]/)) forca++;
            // Verificar caracteres especiais
            if (senha.match(/[^a-zA-Z0-9]/)) forca++;

            if (forca < 2) {
                senhaFeedback.textContent = 'Senha fraca, adicione mais variedade';
                senhaFeedback.className = 'feedback-message error';
                senhaInput.classList.add('input-error');
            } else if (forca < 4) {
                senhaFeedback.textContent = 'Senha média, pode ser melhorada';
                senhaFeedback.className = 'feedback-message warning';
                senhaInput.classList.remove('input-error', 'input-success');
            } else {
                senhaFeedback.textContent = 'Senha forte!';
                senhaFeedback.className = 'feedback-message success';
                senhaInput.classList.add('input-success');
            }
        };

        // Função para validar email
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        // Adicionar event listeners
        nomeInput.addEventListener('input', verificarNome);
        emailInput.addEventListener('input', verificarEmail);
        senhaInput.addEventListener('input', verificarSenha);

        // Validar formulário antes de enviar
        usuarioForm.addEventListener('submit', function (event) {
            // Verificar se há erros de validação
            const hasNomeError = nomeFeedback.className.includes('error');
            const hasEmailError = emailFeedback.className.includes('error');
            const hasSenhaError = senhaFeedback.className.includes('error');

            if (hasNomeError || hasEmailError || hasSenhaError) {
                event.preventDefault();
                alert('Por favor, corrija os erros no formulário antes de enviar.');
            }
        });
    }

    // Variáveis globais
    let clientSignaturePad;
    let repSignaturePad;
    let ordemIdAtual;

    // Função para abrir o modal de entrega
    function abrirModalEntrega(ordemId, clienteNome, equipamentoInfo) {
        // Armazenar o ID da ordem atual
        ordemIdAtual = ordemId;

        // Preencher as informações no modal
        document.getElementById('ordem-id').textContent = ordemId;
        document.getElementById('cliente-nome').textContent = clienteNome;
        document.getElementById('equipamento-info').textContent = equipamentoInfo;
        document.getElementById('ordem_id_input').value = ordemId;

        // Inicializar os campos de assinatura
        inicializarAssinaturas();

        // Exibir o modal
        document.getElementById('entregaModal').style.display = 'block';
    }

    // Inicializar os campos de assinatura
    function inicializarAssinaturas() {
        // Configurar canvas do cliente
        const clientCanvas = document.getElementById('client-signature-pad');
        clientCanvas.width = clientCanvas.parentElement.clientWidth;
        clientCanvas.height = 200;

        // Configurar canvas do representante
        const repCanvas = document.getElementById('rep-signature-pad');
        repCanvas.width = repCanvas.parentElement.clientWidth;
        repCanvas.height = 200;

        // Inicializar SignaturePad para cliente
        clientSignaturePad = new SignaturePad(clientCanvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)'
        });

        // Inicializar SignaturePad para representante
        repSignaturePad = new SignaturePad(repCanvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)'
        });

        // Botão para limpar assinatura do cliente
        document.getElementById('clear-client-signature').addEventListener('click', function () {
            clientSignaturePad.clear();
        });

        // Botão para limpar assinatura do representante
        document.getElementById('clear-rep-signature').addEventListener('click', function () {
            repSignaturePad.clear();
        });
    }

    // Função para criar guia de impressão
    function criarGuiaImpressao() {
        const clienteNome = document.getElementById('cliente-nome').textContent;
        const equipamentoInfo = document.getElementById('equipamento-info').textContent;
        const ordemId = document.getElementById('ordem-id').textContent;
        const recebedorNome = document.getElementById('recebedor_nome').value;
        const recebedorTelefone = document.getElementById('recebedor_telefone').value;
        const tipoEntrega = document.getElementById('tipo_entrega').options[document.getElementById('tipo_entrega').selectedIndex].text;

        // Criar a data formatada
        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');

        // Obter as assinaturas
        const assinaturaCliente = clientSignaturePad.isEmpty() ? '' : clientSignaturePad.toDataURL();
        const assinaturaRepresentante = repSignaturePad.isEmpty() ? '' : repSignaturePad.toDataURL();

        // Criar a guia de impressão
        let guiaHTML = `
            <div class="guia-impressao print-section" id="guia-impressao">
                <div class="guia-header">
                    <h2>Comprovante de Entrega de Equipamento</h2>
                    <p>Ordem de Serviço #${ordemId}</p>
                    <p>Data: ${dataFormatada}</p>
                </div>
                
                <div class="guia-info">
                    <h3>Informações da Ordem</h3>
                    <table>
                        <tr>
                            <th>Cliente:</th>
                            <td>${clienteNome}</td>
                        </tr>
                        <tr>
                            <th>Equipamento:</th>
                            <td>${equipamentoInfo}</td>
                        </tr>
                        <tr>
                            <th>Recebido por:</th>
                            <td>${recebedorNome}</td>
                        </tr>
                        <tr>
                            <th>Telefone:</th>
                            <td>${recebedorTelefone}</td>
                        </tr>
                        <tr>
                            <th>Tipo de Entrega:</th>
                            <td>${tipoEntrega}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="guia-info">
                    <p><strong>Declaração:</strong> Declaro que recebi o equipamento acima especificado em perfeitas condições, 
                    conforme verificado no momento da entrega.</p>
                </div>
                
                <div class="assinaturas-guia">
                    <div class="assinatura-box">
                        <div class="assinatura-img">
                            ${assinaturaCliente ? `<img src="${assinaturaCliente}" alt="Assinatura do Cliente">` : ''}
                        </div>
                        <p>${recebedorNome}</p>
                        <p><small>Cliente/Recebedor</small></p>
                    </div>
                    
                    <div class="assinatura-box">
                        <div class="assinatura-img">
                            ${assinaturaRepresentante ? `<img src="${assinaturaRepresentante}" alt="Assinatura do Representante">` : ''}
                        </div>
                        <p>Representante da Loja</p>
                    </div>
                </div>
            </div>
        `;

        // Adicionar a guia ao body para imprimir
        const guiaContainer = document.createElement('div');
        guiaContainer.innerHTML = guiaHTML;
        document.body.appendChild(guiaContainer);

        return guiaContainer;
    }

    // Botão de imprimir
    document.getElementById('btn-imprimir').addEventListener('click', function () {
        // Verificar campos obrigatórios
        const recebedorNome = document.getElementById('recebedor_nome').value;
        const recebedorTelefone = document.getElementById('recebedor_telefone').value;

        if (!recebedorNome || !recebedorTelefone) {
            alert('Por favor, preencha o nome e telefone de quem recebe.');
            return;
        }

        // Verificar pelo menos a assinatura do cliente
        if (clientSignaturePad.isEmpty()) {
            alert('Por favor, adicione a assinatura do cliente.');
            return;
        }

        // Criar e imprimir a guia
        const guiaContainer = criarGuiaImpressao();

        // Imprimir
        window.print();

        // Remover a guia depois de imprimir
        setTimeout(function () {
            document.body.removeChild(guiaContainer);
        }, 1000);
    });

    // Submeter o formulário de entrega (atualizado para duas assinaturas)
    document.getElementById('entregaForm').addEventListener('submit', function (e) {
        e.preventDefault();

        // Verificar campos obrigatórios
        const recebedorNome = document.getElementById('recebedor_nome').value;
        const recebedorTelefone = document.getElementById('recebedor_telefone').value;

        if (!recebedorNome || !recebedorTelefone) {
            alert('Por favor, preencha o nome e telefone de quem recebe.');
            return;
        }

        // Verificar assinatura do cliente
        if (clientSignaturePad.isEmpty()) {
            alert('Por favor, adicione a assinatura do cliente.');
            return;
        }

        // Verificar assinatura do representante
        if (repSignaturePad.isEmpty()) {
            alert('Por favor, adicione a assinatura do representante da loja.');
            return;
        }

        // Capturar as assinaturas como imagens base64
        const assinaturaCliente = clientSignaturePad.toDataURL();
        const assinaturaRepresentante = repSignaturePad.toDataURL();

        document.getElementById('assinatura_cliente').value = assinaturaCliente;
        document.getElementById('assinatura_representante').value = assinaturaRepresentante;

        // Enviar formulário via AJAX
        const formData = new FormData(this);

        fetch('/processar_entrega', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Fechar o modal
                    modal.style.display = 'none';

                    // Remover a ordem da tabela
                    const tabela = document.getElementById('tabelaOrdens');
                    const linhas = tabela.getElementsByTagName('tr');

                    for (let i = 1; i < linhas.length; i++) {
                        const idCell = linhas[i].cells[0];
                        if (idCell.textContent == ordemIdAtual) {
                            linhas[i].remove();
                            break;
                        }
                    }

                    // Mostrar mensagem de sucesso
                    alert('Equipamento entregue com sucesso!');
                } else {
                    alert('Erro ao registrar entrega: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                alert('Ocorreu um erro ao processar a entrega.');
            });
    });
});