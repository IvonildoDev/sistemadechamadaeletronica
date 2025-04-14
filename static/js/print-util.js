/**
 * Utilitários de impressão e exportação PDF
 * Sistema de Chamada Eletrônica
 */

// Inicializa a biblioteca HTML2PDF quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    // Procurar todos os botões de impressão e PDF e anexar os eventos
    const printButtons = document.querySelectorAll('.btn-print');
    const pdfButtons = document.querySelectorAll('.btn-pdf');

    printButtons.forEach(button => {
        button.addEventListener('click', function () {
            const contentId = this.getAttribute('data-print-target') || 'printable-content';
            prepararImpressao(contentId);
        });
    });

    pdfButtons.forEach(button => {
        button.addEventListener('click', function () {
            const contentId = this.getAttribute('data-print-target') || 'printable-content';
            const filename = this.getAttribute('data-filename') || 'documento.pdf';
            exportarPDF(contentId, filename);
        });
    });
});

/**
 * Prepara e executa a impressão do conteúdo especificado
 */
function prepararImpressao() {
    // Salvar o estado original dos elementos
    const elementosOcultar = document.querySelectorAll('.ordem-header, .barcode-container, .buttons, .no-print');
    elementosOcultar.forEach(el => {
        el.dataset.originalDisplay = el.style.display;
        el.style.display = 'none';
    });

    // Exibir somente as seções desejadas
    const secoesMostrar = document.querySelectorAll('.ordem-info, .termos-condicoes, .assinaturas');
    secoesMostrar.forEach(el => {
        el.style.display = 'block';
    });

    // Pequeno atraso para garantir que o browser processe tudo
    setTimeout(function () {
        window.print();

        // Restaurar os elementos ao estado original
        elementosOcultar.forEach(el => {
            el.style.display = el.dataset.originalDisplay || '';
        });
    }, 300);
}

/**
 * Exporta o conteúdo especificado como PDF
 * @param {string} contentId - ID do elemento a ser exportado
 * @param {string} filename - Nome do arquivo PDF
 */
function exportarPDF(contentId, filename) {
    // Criar um contêiner temporário para o conteúdo do PDF
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '100%';
    tempContainer.style.padding = '20px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.fontFamily = 'Roboto, Arial, sans-serif';

    try {
        // Obter o número da OS da página
        const ordemId = document.querySelector('.title').textContent.replace('Ordem de Serviço #', '').trim();

        // 1. Cabeçalho
        const header = document.createElement('div');
        header.style.textAlign = 'center';
        header.style.marginBottom = '25px';
        header.innerHTML = `<h1 style="color: #333; margin-bottom: 10px;">Ordem de Serviço #${ordemId}</h1>`;
        tempContainer.appendChild(header);

        // 2. Informações do Cliente - copiar HTML diretamente
        const clienteInfoElement = document.querySelector('.ordem-info:nth-of-type(1)');
        if (clienteInfoElement) {
            tempContainer.innerHTML += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="margin-top: 0; margin-bottom: 15px; color: #333; border-left: 4px solid #3498db; padding-left: 10px;">
                        Informações do Cliente
                    </h2>
                    ${clienteInfoElement.querySelector('table').outerHTML}
                </div>
            `;
        }

        // 3. Informações do Equipamento - copiar HTML diretamente
        const equipamentoInfoElement = document.querySelector('.ordem-info:nth-of-type(2)');
        if (equipamentoInfoElement) {
            tempContainer.innerHTML += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="margin-top: 0; margin-bottom: 15px; color: #333; border-left: 4px solid #3498db; padding-left: 10px;">
                        Informações do Equipamento
                    </h2>
                    ${equipamentoInfoElement.querySelector('table').outerHTML}
                </div>
            `;
        }

        // 4. Termos e Condições - copiar conteúdo diretamente
        const termosElement = document.querySelector('.termos-condicoes');
        if (termosElement) {
            // Criar um novo elemento com estilo inline
            const termosHtml = `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="margin-top: 0; margin-bottom: 15px; color: #333; border-left: 4px solid #3498db; padding-left: 10px;">
                        Termos e Condições de Serviço
                    </h2>
                    <div style="margin-top: 15px;">
                        ${termosElement.querySelector('.termos-container').innerHTML}
                    </div>
                </div>
            `;
            tempContainer.innerHTML += termosHtml;
        }

        // 5. Assinaturas
        const assinaturasHtml = `
            <div style="display: flex; justify-content: space-between; margin-top: 50px; width: 100%;">
                <div style="flex: 1; text-align: center; margin: 0 15px;">
                    <div style="border-top: 1px solid black; margin: 30px auto 10px; width: 85%;"></div>
                    <p>Assinatura do Cliente</p>
                </div>
                <div style="flex: 1; text-align: center; margin: 0 15px;">
                    <div style="border-top: 1px solid black; margin: 30px auto 10px; width: 85%;"></div>
                    <p>Assinatura do Atendente</p>
                </div>
            </div>
        `;
        tempContainer.innerHTML += assinaturasHtml;
    } catch (error) {
        console.error("Erro ao gerar conteúdo do PDF:", error);
    }

    // Adicionar o contêiner temporário ao corpo do documento (invisível)
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    // Configurar opções do PDF
    const opcoes = {
        margin: [15, 15, 20, 15], // margem [superior, esquerda, inferior, direita] em mm
        filename: `ordem_servico_${ordemId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    // Mostrar indicador de progresso
    const progressDiv = document.createElement('div');
    progressDiv.className = 'pdf-progress';
    progressDiv.innerHTML = '<div class="pdf-progress-message">Gerando PDF, aguarde...</div>';
    document.body.appendChild(progressDiv);

    // Gerar o PDF
    html2pdf()
        .set(opcoes)
        .from(tempContainer)
        .save()
        .then(() => {
            // Remover elementos temporários
            document.body.removeChild(tempContainer);
            document.body.removeChild(progressDiv);
        })
        .catch(err => {
            console.error('Erro ao gerar PDF:', err);
            alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');

            // Remover elementos temporários
            document.body.removeChild(tempContainer);
            document.body.removeChild(progressDiv);
        });
}

/**
 * Exporta os dados específicos da Ordem de Serviço como PDF
 */
function exportarOrdemPDF() {
    // Mostrar indicador de progresso
    const progressDiv = document.createElement('div');
    progressDiv.className = 'pdf-progress';
    progressDiv.innerHTML = '<div class="pdf-progress-message">Gerando PDF, aguarde...</div>';
    document.body.appendChild(progressDiv);

    // Criar contêiner temporário com apenas as seções relevantes
    const tempContainer = document.createElement('div');
    tempContainer.style.width = '100%';
    tempContainer.style.padding = '20px';
    tempContainer.style.fontFamily = 'Roboto, Arial, sans-serif';

    try {
        // Obter o número da OS da página
        const ordemId = document.querySelector('.title').textContent.replace('Ordem de Serviço #', '').trim();

        // 1. Cabeçalho
        tempContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #333; margin-bottom: 10px;">Ordem de Serviço #${ordemId}</h1>
            </div>
        `;

        // 2. Informações do Cliente
        const clienteInfoElement = document.querySelector('.ordem-info:nth-of-type(1)');
        if (clienteInfoElement) {
            // Copiar e formatar a tabela de informações do cliente
            const clienteTable = clienteInfoElement.querySelector('table').cloneNode(true);

            tempContainer.innerHTML += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="margin-top: 0; margin-bottom: 15px; color: #333; border-left: 4px solid #3498db; padding-left: 10px;">
                        Informações do Cliente
                    </h2>
                    ${clienteTable.outerHTML}
                </div>
            `;
        }

        // 3. Informações do Equipamento
        const equipamentoInfoElement = document.querySelector('.ordem-info:nth-of-type(2)');
        if (equipamentoInfoElement) {
            // Copiar e formatar a tabela de informações do equipamento
            const equipamentoTable = equipamentoInfoElement.querySelector('table').cloneNode(true);

            tempContainer.innerHTML += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="margin-top: 0; margin-bottom: 15px; color: #333; border-left: 4px solid #3498db; padding-left: 10px;">
                        Informações do Equipamento
                    </h2>
                    ${equipamentoTable.outerHTML}
                </div>
            `;
        }

        // 4. Termos e Condições
        const termosElement = document.querySelector('.termos-condicoes');
        if (termosElement) {
            tempContainer.innerHTML += `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="margin-top: 0; margin-bottom: 15px; color: #333; border-left: 4px solid #3498db; padding-left: 10px;">
                        Termos e Condições de Serviço
                    </h2>
                    <div style="margin-top: 15px;">
                        ${termosElement.querySelector('.termos-container').innerHTML}
                    </div>
                </div>
            `;
        }

        // 5. Assinaturas
        tempContainer.innerHTML += `
            <div style="display: flex; justify-content: space-between; margin-top: 50px; width: 100%;">
                <div style="flex: 1; text-align: center; margin: 0 15px;">
                    <div style="border-top: 1px solid black; margin: 30px auto 10px; width: 85%;"></div>
                    <p>Assinatura do Cliente</p>
                </div>
                <div style="flex: 1; text-align: center; margin: 0 15px;">
                    <div style="border-top: 1px solid black; margin: 30px auto 10px; width: 85%;"></div>
                    <p>Assinatura do Atendente</p>
                </div>
            </div>
        `;

        // Adicionar o contêiner temporário ao corpo do documento (invisível)
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        // Configurar opções do PDF
        const opcoes = {
            margin: [15, 15, 20, 15], // margem [superior, esquerda, inferior, direita] em mm
            filename: `ordem_servico_${ordemId}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        };

        // Gerar o PDF
        html2pdf()
            .set(opcoes)
            .from(tempContainer)
            .save()
            .then(() => {
                // Remover elementos temporários
                document.body.removeChild(tempContainer);
                document.body.removeChild(progressDiv);
            })
            .catch(err => {
                console.error('Erro ao gerar PDF:', err);
                alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');

                // Remover elementos temporários
                document.body.removeChild(tempContainer);
                document.body.removeChild(progressDiv);
            });

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert('Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.');
        document.body.removeChild(progressDiv);
    }
}
