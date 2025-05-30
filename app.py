from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import sqlite3
import os
from werkzeug.utils import secure_filename
import hashlib
import functools
import barcode
from barcode.writer import ImageWriter
from io import BytesIO
import base64
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta_aqui'  # Altere para uma chave segura em produção
app.config['UPLOAD_FOLDER'] = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Adicionar filtro para formatação de data
@app.template_filter('formatdate')
def format_date(value):
    if value:
        from datetime import datetime
        # Converte string para objeto datetime se necessário
        if isinstance(value, str):
            try:
                value = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return value
        # Formata como dia/mês/ano
        return value.strftime('%d/%m/%Y')
    return ""

# Certifique-se de que o diretório de uploads existe
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def init_db():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS entregas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ordem_id INTEGER NOT NULL,
                recebedor_nome TEXT NOT NULL,
                recebedor_telefone TEXT NOT NULL,
                tipo_entrega TEXT NOT NULL,
                data_entrega TIMESTAMP NOT NULL,
                FOREIGN KEY (ordem_id) REFERENCES ordens (id)
            )
        ''')
        
        conn.commit()

# Verificar e criar tabelas necessárias que possam estar faltando
def verificar_tabelas():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        # Verificar se a tabela servicos_tecnicos existe
        cursor.execute('''
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='servicos_tecnicos'
        ''')
        if not cursor.fetchone():
            print("Criando tabela servicos_tecnicos...")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS servicos_tecnicos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ordem_id INTEGER NOT NULL,
                    diagnostico TEXT NOT NULL,
                    descricao_servico TEXT NOT NULL,
                    valor_mao_obra REAL NOT NULL,
                    servico_realizado TEXT NOT NULL,
                    produtos TEXT,
                    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (ordem_id) REFERENCES ordens (id)
                )
            ''')
            conn.commit()
            print("Tabela servicos_tecnicos criada com sucesso!")

        # Verificar se a coluna 'visivel' existe na tabela ordens
        cursor.execute("PRAGMA table_info(ordens)")
        colunas = cursor.fetchall()
        nomes_colunas = [coluna[1] for coluna in colunas]
        
        # Se não existir, adicionar a coluna
        if 'visivel' not in nomes_colunas:
            print("Adicionando coluna 'visivel' à tabela ordens...")
            cursor.execute('''
                ALTER TABLE ordens 
                ADD COLUMN visivel INTEGER DEFAULT 1
            ''')
            conn.commit()

# Inicializar o banco de dados imediatamente
init_db()

# Chamar a função para verificar tabelas
verificar_tabelas()

# Decorator para verificar se o usuário está logado
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'usuario_id' not in session:
            return redirect(url_for('login'))
        return view(**kwargs)
    return wrapped_view

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
@login_required
def index():
    return render_template('index.html', usuario=session.get('usuario_nome'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        nome = request.form['nome']
        senha = request.form['senha']
        
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, nome, email, senha, cargo FROM usuarios WHERE nome = ?', (nome,))
            usuario = cursor.fetchone()
            
            if usuario and usuario[3] == senha:
                session.clear()
                session['usuario_id'] = usuario[0]
                session['usuario_nome'] = usuario[1]
                session['usuario_email'] = usuario[2]
                session['usuario_cargo'] = usuario[4]
                return redirect(url_for('index'))
            else:
                error = 'Nome de usuário ou senha incorretos'
    
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/cliente', methods=['GET', 'POST'])
@login_required
def cliente():
    if request.method == 'POST':
        nome = request.form['nome']
        email = request.form['email']
        telefone = request.form['telefone']
        
        # Validação do telefone
        if not telefone.isdigit() or len(telefone) != 11:
            flash('O telefone deve conter exatamente 11 dígitos numéricos (DDD + 9 dígitos).')
            return render_template('cliente.html', 
                                  usuario=session.get('usuario_nome'),
                                  dados=request.form)  # Devolve os dados preenchidos
        
        # Campos de endereço
        rua = request.form['rua']
        numero = request.form['numero']
        complemento = request.form.get('complemento', '')  # Campo opcional
        bairro = request.form['bairro']
        cidade = request.form['cidade']
        estado = request.form['estado']
        cep = request.form.get('cep', '')  # Campo opcional
        
        # Construir um endereço completo a partir dos campos individuais
        endereco = f"{rua}, {numero}"
        if complemento:
            endereco += f" - {complemento}"
        endereco += f", {bairro}, {cidade} - {estado}"
        if cep:
            endereco += f", CEP: {cep}"
        
        try:
            with sqlite3.connect('database.db') as conn:
                cursor = conn.cursor()
                cursor.execute('INSERT INTO clientes (nome, email, telefone, endereco) VALUES (?, ?, ?, ?)', 
                            (nome, email, telefone, endereco))
                conn.commit()
                flash('Cliente cadastrado com sucesso!')
            return redirect(url_for('index'))
        except sqlite3.Error as e:
            print(f"Erro ao inserir cliente: {e}")
            flash('Erro ao cadastrar cliente. Por favor, tente novamente.')
            return render_template('cliente.html', 
                                  usuario=session.get('usuario_nome'),
                                  dados=request.form)
            
    return render_template('cliente.html', usuario=session.get('usuario_nome'))

@app.route('/equipamento', methods=['GET', 'POST'])
@login_required
def equipamento():
    if request.method == 'POST':
        cliente_id = request.form['cliente_id']
        marca = request.form['marca']
        modelo = request.form['modelo']
        serie = request.form['serie']
        estado_equipamento = request.form['estado_equipamento']
        defeito_relatado = request.form['defeito_relatado']
        
        foto1 = request.files['foto1']
        foto2 = request.files['foto2']
        
        foto1_path = foto2_path = None
        if foto1 and allowed_file(foto1.filename):
            filename = secure_filename(foto1.filename)
            foto1_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            foto1.save(foto1_path)
        if foto2 and allowed_file(foto2.filename):
            filename = secure_filename(foto2.filename)
            foto2_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            foto2.save(foto2_path)
        
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            # Primeiro insere o equipamento para obter o ID
            cursor.execute('''
                INSERT INTO equipamentos 
                (cliente_id, marca, modelo, serie, estado_equipamento, defeito_relatado, foto1, foto2) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (cliente_id, marca, modelo, serie, estado_equipamento, defeito_relatado, foto1_path, foto2_path))
            conn.commit()
            
            # Obtém o ID do equipamento inserido
            equipamento_id = cursor.lastrowid
            
            # Gerar código de barras para o equipamento
            equip_cod = f"EQ{equipamento_id:06d}"  # Formata como "EQ000001"
            barcode_class = barcode.get_barcode_class('code128')
            barcode_objeto = barcode_class(equip_cod, writer=ImageWriter())
            
            # Salvar a imagem do código de barras
            barcode_path = os.path.join(app.config['UPLOAD_FOLDER'], f'barcode_{equip_cod}.png')
            barcode_objeto.save(barcode_path.rsplit('.', 1)[0])  # A biblioteca adiciona a extensão automaticamente
            
            # Atualizar o registro do equipamento com o código de barras
            cursor.execute('UPDATE equipamentos SET codigo_barras = ? WHERE id = ?', 
                          (equip_cod, equipamento_id))
            conn.commit()
            
            flash('Equipamento cadastrado com sucesso!')
            return redirect(url_for('visualizar_equipamento', equipamento_id=equipamento_id))
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, nome FROM clientes')
        clientes = cursor.fetchall()
    return render_template('equipamento.html', clientes=clientes, usuario=session.get('usuario_nome'))

@app.route('/equipamento/<int:equipamento_id>')
@login_required
def visualizar_equipamento(equipamento_id):
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT e.id, c.nome, e.marca, e.modelo, e.serie, e.estado_equipamento, 
                   e.defeito_relatado, e.codigo_barras, e.data_cadastro
            FROM equipamentos e
            JOIN clientes c ON e.cliente_id = c.id
            WHERE e.id = ?
        ''', (equipamento_id,))
        equipamento = cursor.fetchone()
    
    if not equipamento:
        flash('Equipamento não encontrado.')
        return redirect(url_for('index'))
    
    # Gerar código de barras para exibição
    equip_cod = equipamento[7]  # código de barras armazenado no banco
    barcode_class = barcode.get_barcode_class('code128')
    barcode_objeto = barcode_class(equip_cod, writer=ImageWriter())
    
    buffer = BytesIO()
    barcode_objeto.write(buffer)
    buffer.seek(0)
    barcode_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    return render_template('visualizar_equipamento.html', 
                          equipamento=equipamento,
                          barcode=barcode_base64,
                          usuario=session.get('usuario_nome'))

@app.route('/get_fotos/<int:equipamento_id>')
@login_required
def get_fotos(equipamento_id):
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT foto1, foto2 FROM equipamentos WHERE id = ?', (equipamento_id,))
        resultado = cursor.fetchone()
        
        if resultado:
            foto1, foto2 = resultado
            
            # Preparar caminho da foto1
            foto1_url = None
            if foto1:
                # Check if the path already contains 'static/uploads'
                if foto1.startswith('static/uploads') or foto1.startswith('static\\uploads'):
                    # Remove the 'static/' prefix since url_for will add it
                    clean_path = foto1.replace('\\', '/')  # Convert backslashes to forward slashes
                    foto1_url = url_for('static', filename=clean_path[7:])  # Remove 'static/' prefix
                else:
                    # Ensure we use forward slashes
                    clean_path = foto1.replace('\\', '/')
                    foto1_url = url_for('static', filename=f'uploads/{clean_path}')
                
            # Preparar caminho da foto2
            foto2_url = None
            if foto2:
                # Check if the path already contains 'static/uploads'
                if foto2.startswith('static/uploads') or foto2.startswith('static\\uploads'):
                    # Remove the 'static/' prefix since url_for will add it
                    clean_path = foto2.replace('\\', '/')  # Convert backslashes to forward slashes
                    foto2_url = url_for('static', filename=clean_path[7:])  # Remove 'static/' prefix
                else:
                    # Ensure we use forward slashes
                    clean_path = foto2.replace('\\', '/')
                    foto2_url = url_for('static', filename=f'uploads/{clean_path}')
                
            return jsonify({
                'foto1': foto1_url,
                'foto2': foto2_url
            })
        
        return jsonify({
            'foto1': None,
            'foto2': None
        })

@app.route('/ordem', methods=['GET', 'POST'])
@login_required
def ordem():
    if request.method == 'POST':
        equipamento_id = request.form['equipamento_id']
        usuario_id = session.get('usuario_id')
        status = request.form['status']
        relatorio_pecas = request.form.get('relatorio_pecas', '')
        declaracao = 'Produto tem prazo de 90 dias após o conserto.'
        
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ordens (equipamento_id, usuario_id, status, declaracao, relatorio_pecas) 
                VALUES (?, ?, ?, ?, ?)
            ''', (equipamento_id, usuario_id, status, declaracao, relatorio_pecas))
            conn.commit()
            ordem_id = cursor.lastrowid
            
            flash('Ordem de serviço criada com sucesso!')
            return redirect(url_for('visualizar_ordem', ordem_id=ordem_id))
    
    # Pegar o equipamento_id da query string se disponível
    equipamento_id = request.args.get('equipamento_id', '')
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, marca, modelo FROM equipamentos')
        equipamentos = cursor.fetchall()
    
    return render_template('ordem.html', 
                          equipamentos=equipamentos, 
                          equipamento_selecionado=equipamento_id,
                          usuario=session.get('usuario_nome'),
                          usuario_id=session.get('usuario_id'),
                          usuario_cargo=session.get('usuario_cargo'))

@app.route('/ordem/<int:ordem_id>')
@login_required
def visualizar_ordem(ordem_id):
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT o.id, c.nome, e.marca, e.modelo, e.serie, e.estado_equipamento, 
                  e.defeito_relatado, o.status, o.declaracao, o.relatorio_pecas, 
                  o.data_criacao, u.nome, c.telefone
            FROM ordens o
            JOIN equipamentos e ON o.equipamento_id = e.id
            JOIN clientes c ON e.cliente_id = c.id
            JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.id = ?
        ''', (ordem_id,))
        ordem = cursor.fetchone()
    
    if not ordem:
        flash('Ordem de serviço não encontrada.')
        return redirect(url_for('index'))
    
    # Gerar código de barras para a ordem
    ordem_cod = f"OS{ordem[0]:06d}"  # Formata como "OS000001"
    barcode_class = barcode.get_barcode_class('code128')
    barcode_objeto = barcode_class(ordem_cod, writer=ImageWriter())
    
    buffer = BytesIO()
    barcode_objeto.write(buffer)
    buffer.seek(0)
    barcode_base64 = base64.b64encode(buffer.read()).decode('utf-8')
    
    return render_template('visualizar_ordem.html', 
                           ordem=ordem,
                           ordem_cod=ordem_cod,
                           barcode=barcode_base64,
                           usuario=session.get('usuario_nome'))

@app.route('/servico-tecnico/<int:ordem_id>', methods=['GET', 'POST'])
@login_required
def servico_tecnico(ordem_id):
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT o.id, c.nome, e.marca, e.modelo, e.serie, e.estado_equipamento, e.defeito_relatado,
                   o.status, o.declaracao, o.relatorio_pecas, o.data_criacao, u.nome
            FROM ordens o
            JOIN equipamentos e ON o.equipamento_id = e.id
            JOIN clientes c ON e.cliente_id = c.id
            JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.id = ?
        ''', (ordem_id,))
        ordem = cursor.fetchone()
        
        if not ordem:
            flash('Ordem de serviço não encontrada.')
            return redirect(url_for('index'))
        
        # Verificar se já existe um serviço técnico para esta ordem
        cursor.execute('''
            SELECT diagnostico, descricao_servico, valor_mao_obra, servico_realizado, produtos
            FROM servicos_tecnicos
            WHERE ordem_id = ?
        ''', (ordem_id,))
        servico = cursor.fetchone()
        
        if servico:
            # Converter produtos de JSON para dicionário
            produtos = json.loads(servico[4]) if servico[4] else []
            servico = {
                'diagnostico': servico[0],
                'descricao_servico': servico[1],
                'valor_mao_obra': servico[2],
                'servico_realizado': servico[3],
                'produtos': produtos
            }
    
    if request.method == 'POST':
        diagnostico = request.form['diagnostico']
        descricao_servico = request.form['descricao_servico']
        valor_mao_obra = request.form['valor_mao_obra']
        servico_realizado = request.form['servico_realizado']
        status = request.form['status']
        
        # Coletar informações dos produtos
        produto_descricao = request.form.getlist('produto_descricao[]')
        produto_quantidade = request.form.getlist('produto_quantidade[]')
        produto_valor = request.form.getlist('produto_valor[]')
        
        produtos = []
        for i in range(len(produto_descricao)):
            if produto_descricao[i].strip():  # Verificar se a descrição não está vazia
                produtos.append({
                    'descricao': produto_descricao[i],
                    'quantidade': produto_quantidade[i],
                    'valor': produto_valor[i]
                })
        
        produtos_json = json.dumps(produtos)
        
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            
            # Verificar se já existe um serviço técnico para esta ordem
            cursor.execute('SELECT id FROM servicos_tecnicos WHERE ordem_id = ?', (ordem_id,))
            servico_id = cursor.fetchone()
            
            if servico_id:
                # Atualizar serviço existente
                cursor.execute('''
                    UPDATE servicos_tecnicos
                    SET diagnostico = ?, descricao_servico = ?, valor_mao_obra = ?,
                        servico_realizado = ?, produtos = ?, data_atualizacao = CURRENT_TIMESTAMP
                    WHERE ordem_id = ?
                ''', (diagnostico, descricao_servico, valor_mao_obra, servico_realizado, produtos_json, ordem_id))
            else:
                # Inserir novo serviço
                cursor.execute('''
                    INSERT INTO servicos_tecnicos
                    (ordem_id, diagnostico, descricao_servico, valor_mao_obra, servico_realizado, produtos)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (ordem_id, diagnostico, descricao_servico, valor_mao_obra, servico_realizado, produtos_json))
            
            # Atualizar status da ordem
            cursor.execute('''
                UPDATE ordens SET status = ?, relatorio_pecas = ? WHERE id = ?
            ''', (status, servico_realizado, ordem_id))
            
            conn.commit()
            
        flash('Serviço técnico registrado com sucesso!')
        return redirect(url_for('visualizar_ordem', ordem_id=ordem_id))
    
    return render_template('servico_tecnico.html', 
                           ordem=ordem, 
                           servico=servico,
                           usuario=session.get('usuario_nome'))

@app.route('/entrega_equipamento/<int:ordem_id>', methods=['GET', 'POST'])
@login_required
def entrega_equipamento(ordem_id):
    from datetime import datetime, timedelta
    
    # Data atual para a entrega
    data_atual = datetime.now()
    
    # Data de fim da garantia (90 dias)
    data_garantia = data_atual + timedelta(days=90)
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        
        # Buscar dados da ordem
        cursor.execute('''
            SELECT o.id, c.nome, e.marca, e.modelo, e.serie, e.estado_equipamento, 
                  e.defeito_relatado, o.status, o.declaracao, o.relatorio_pecas, 
                  o.data_criacao, u.nome, c.telefone
            FROM ordens o
            JOIN equipamentos e ON o.equipamento_id = e.id
            JOIN clientes c ON e.cliente_id = c.id
            JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.id = ?
        ''', (ordem_id,))
        ordem = cursor.fetchone()
        
        if not ordem:
            flash('Ordem de serviço não encontrada', 'error')
            return redirect(url_for('index'))
        
        ordem_status = ordem[7]  # Status da ordem
        
        # Se for uma ordem concluída, buscar detalhes do serviço
        servico = None
        total_pecas = 0
        valor_total = 0
        
        if ordem_status == 'Concluído':
            cursor.execute('''
                SELECT diagnostico, descricao_servico, valor_mao_obra, servico_realizado, produtos
                FROM servicos_tecnicos
                WHERE ordem_id = ?
            ''', (ordem_id,))
            servico_dados = cursor.fetchone()
            
            if servico_dados:
                # Converter produtos de JSON para lista
                produtos = json.loads(servico_dados[4]) if servico_dados[4] else []
                
                # Calcular total de peças
                for produto in produtos:
                    quantidade = float(produto['quantidade'])
                    valor = float(produto['valor'])
                    total_pecas += quantidade * valor
                
                # Valor total (mão de obra + peças)
                valor_total = float(servico_dados[2]) + total_pecas
                
                servico = {
                    'diagnostico': servico_dados[0],
                    'descricao_servico': servico_dados[1],
                    'valor_mao_obra': servico_dados[2],
                    'servico_realizado': servico_dados[3],
                    'produtos': produtos
                }
        
        # Tipo de entrega (padrão: loja)
        tipo_entrega = 'loja'
        
        # Motivo de devolução (se for o caso)
        motivo_devolucao = "Orçamento não aprovado pelo cliente" if ordem_status == 'Devolvido sem reparo' else ""
        
        # Se for POST, processar a entrega
        if request.method == 'POST':
            tipo_entrega = request.form.get('tipo_entrega', 'loja')
            
            if ordem_status == 'Devolvido sem reparo':
                motivo_devolucao = request.form.get('motivo_devolucao', '')
            
            # Atualizar status da ordem para "Entregue"
            cursor.execute('''
                UPDATE ordens
                SET status = 'Entregue'
                WHERE id = ?
            ''', (ordem_id,))
            conn.commit()
            
            flash('Equipamento entregue com sucesso!', 'success')
            
            # Redirecionar para visualização da ordem
            return redirect(url_for('visualizar_ordem', ordem_id=ordem_id))
        
        return render_template('entrega_equipamento.html', 
                              ordem=ordem,
                              ordem_status=ordem_status,
                              servico=servico,
                              total_pecas=total_pecas,
                              valor_total=valor_total,
                              tipo_entrega=tipo_entrega,
                              motivo_devolucao=motivo_devolucao,
                              data_atual=data_atual,
                              data_garantia=data_garantia,
                              usuario=session.get('usuario_nome'))

@app.route('/relatorio')
@login_required
def relatorio():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT o.id, c.nome, e.marca, e.modelo, o.status, o.relatorio_pecas, 
                   u.nome as tecnico, o.data_criacao, e.id, e.foto1, e.foto2, c.telefone
            FROM ordens o
            JOIN equipamentos e ON o.equipamento_id = e.id
            JOIN clientes c ON e.cliente_id = c.id
            JOIN usuarios u ON o.usuario_id = u.id
            WHERE o.visivel = 1  -- Somente ordens visíveis
            ORDER BY o.data_criacao DESC
        ''')
        ordens = cursor.fetchall()
    return render_template('relatorio.html', ordens=ordens, usuario=session.get('usuario_nome'))

# Adicione esta rota após a rota de relatório

@app.route('/pendentes_entrega')
@login_required
def pendentes_entrega():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT o.id, c.nome, e.marca, e.modelo, o.status, o.data_criacao
            FROM ordens o
            JOIN equipamentos e ON o.equipamento_id = e.id
            JOIN clientes c ON e.cliente_id = c.id
            WHERE o.status IN ('Concluído', 'Devolvido sem reparo')
            ORDER BY o.data_criacao DESC
        ''')
        ordens = cursor.fetchall()
    return render_template('pendentes_entrega.html', ordens=ordens, usuario=session.get('usuario_nome'))

# Rota para cadastro de usuários (apenas acessível para administradores)
@app.route('/usuario', methods=['GET', 'POST'])
@login_required
def usuario():
    if request.method == 'POST':
        nome = request.form['nome']
        email = request.form['email']
        senha = request.form['senha']
        cargo = request.form['cargo']

        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            
            # Verificar se o nome de usuário já existe
            cursor.execute('SELECT id FROM usuarios WHERE nome = ?', (nome,))
            if cursor.fetchone():
                flash('Este nome de usuário já está sendo utilizado. Por favor, escolha outro nome.', 'error')
                return render_template('usuario.html', usuario=session.get('usuario_nome'))
            
            # Verificar se o email já existe
            cursor.execute('SELECT id FROM usuarios WHERE email = ?', (email,))
            if cursor.fetchone():
                flash('Este email já está registrado no sistema. Use outro email.', 'error')
                return render_template('usuario.html', usuario=session.get('usuario_nome'))
            
            # Se não existir, insere o novo usuário
            try:
                cursor.execute('INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, ?)',
                           (nome, email, senha, cargo))
                conn.commit()
                flash('Usuário cadastrado com sucesso!')
                return redirect(url_for('index'))
            except sqlite3.IntegrityError as e:
                flash(f'Erro ao cadastrar usuário: {str(e)}', 'error')
                return render_template('usuario.html', usuario=session.get('usuario_nome'))

    return render_template('usuario.html', usuario=session.get('usuario_nome'))

# Novas rotas para verificação assíncrona de usuário/email
@app.route('/verificar_usuario', methods=['POST'])
def verificar_usuario():
    nome = request.form.get('nome')
    if not nome:
        return jsonify({'valido': False, 'mensagem': 'Nome de usuário não fornecido'})
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM usuarios WHERE nome = ?', (nome,))
        usuario_existente = cursor.fetchone()
        
    if usuario_existente:
        return jsonify({'valido': False, 'mensagem': 'Este nome de usuário já está sendo utilizado'})
    else:
        return jsonify({'valido': True, 'mensagem': 'Nome de usuário disponível'})

@app.route('/verificar_email', methods=['POST'])
def verificar_email():
    email = request.form.get('email')
    if not email:
        return jsonify({'valido': False, 'mensagem': 'Email não fornecido'})
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM usuarios WHERE email = ?', (email,))
        email_existente = cursor.fetchone()
        
    if email_existente:
        return jsonify({'valido': False, 'mensagem': 'Este email já está registrado no sistema'})
    else:
        return jsonify({'valido': True, 'mensagem': 'Email disponível'})

@app.route('/usuarios')
@login_required
def listar_usuarios():
    # Verificar se o usuário logado é administrador
    if session.get('usuario_cargo') != 'Administrador':
        flash('Acesso restrito a administradores', 'error')
        return redirect(url_for('index'))
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, nome, email, cargo FROM usuarios ORDER BY nome')
        usuarios = cursor.fetchall()
    
    return render_template('usuarios.html', usuarios=usuarios, usuario=session.get('usuario_nome'))

@app.route('/excluir_usuario/<int:usuario_id>', methods=['POST'])
@login_required
def excluir_usuario(usuario_id):
    # Verificar se o usuário logado é administrador
    if session.get('usuario_cargo') != 'Administrador':
        return jsonify({'success': False, 'message': 'Acesso restrito a administradores'})
    
    # Verificar se o usuário está tentando excluir seu próprio usuário
    if usuario_id == session.get('usuario_id'):
        return jsonify({'success': False, 'message': 'Você não pode excluir seu próprio usuário'})
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        
        # Verificar se usuário tem ordens de serviço associadas
        cursor.execute('SELECT COUNT(*) FROM ordens WHERE usuario_id = ?', (usuario_id,))
        count = cursor.fetchone()[0]
        
        if count > 0:
            return jsonify({
                'success': False, 
                'message': 'Não é possível excluir este usuário pois ele possui ordens de serviço associadas'
            })
            
        # Excluir o usuário
        cursor.execute('DELETE FROM usuarios WHERE id = ?', (usuario_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Usuário excluído com sucesso'})

@app.route('/editar_usuario/<int:usuario_id>', methods=['GET', 'POST'])
@login_required
def editar_usuario(usuario_id):
    # Verificar se o usuário logado é administrador
    if session.get('usuario_cargo') != 'Administrador':
        flash('Acesso restrito a administradores', 'error')
        return redirect(url_for('index'))
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        
        if request.method == 'POST':
            nome = request.form['nome']
            email = request.form['email']
            cargo = request.form['cargo']
            
            # Se a senha foi preenchida, atualiza a senha também
            if request.form['senha'].strip():
                senha = request.form['senha']
                # Opcionalmente, você pode adicionar hash de senha aqui
                cursor.execute('''
                    UPDATE usuarios 
                    SET nome = ?, email = ?, senha = ?, cargo = ? 
                    WHERE id = ?
                ''', (nome, email, senha, cargo, usuario_id))
            else:
                # Se não, mantém a senha atual
                cursor.execute('''
                    UPDATE usuarios 
                    SET nome = ?, email = ?, cargo = ? 
                    WHERE id = ?
                ''', (nome, email, cargo, usuario_id))
                
            conn.commit()
            flash('Usuário atualizado com sucesso!')
            return redirect(url_for('listar_usuarios'))
            
        # Buscar dados do usuário para exibir no formulário
        cursor.execute('SELECT id, nome, email, cargo FROM usuarios WHERE id = ?', (usuario_id,))
        usuario_dados = cursor.fetchone()
        
        if not usuario_dados:
            flash('Usuário não encontrado', 'error')
            return redirect(url_for('listar_usuarios'))
            
    return render_template('editar_usuario.html', 
                          usuario_dados=usuario_dados, 
                          usuario=session.get('usuario_nome'))

# Adicione a rota para processar a entrega

@app.route('/processar_entrega', methods=['POST'])
@login_required
def processar_entrega():
    if request.method == 'POST':
        ordem_id = request.form.get('ordem_id')
        recebedor_nome = request.form.get('recebedor_nome')
        recebedor_telefone = request.form.get('recebedor_telefone')
        tipo_entrega = request.form.get('tipo_entrega')
        assinatura_cliente = request.form.get('assinatura_cliente')
        assinatura_representante = request.form.get('assinatura_representante')
        
        # Validar dados
        if not all([ordem_id, recebedor_nome, recebedor_telefone, assinatura_cliente]):
            return jsonify({
                'success': False,
                'message': 'Todos os campos são obrigatórios.'
            })
        
        try:
            # Salvar a assinatura do cliente como arquivo
            assinatura_dir = os.path.join(app.static_folder, 'assinaturas')
            if not os.path.exists(assinatura_dir):
                os.makedirs(assinatura_dir)
            
            # Processar string base64 da assinatura do cliente
            assinatura_cliente_data = assinatura_cliente.split(',')[1]
            assinatura_cliente_binary = base64.b64decode(assinatura_cliente_data)
            
            # Criar nome de arquivo único para assinatura do cliente
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            cliente_filename = f'assinatura_cliente_os_{ordem_id}_{timestamp}.png'
            cliente_filepath = os.path.join(assinatura_dir, cliente_filename)
            
            # Salvar a imagem da assinatura do cliente
            with open(cliente_filepath, 'wb') as f:
                f.write(assinatura_cliente_binary)
            
            # Caminho relativo para salvar no banco de dados
            assinatura_cliente_path = f'static/assinaturas/{cliente_filename}'
            
            # Se houver assinatura do representante, salvar também
            assinatura_representante_path = None
            if assinatura_representante:
                # Processar string base64 da assinatura do representante
                assinatura_representante_data = assinatura_representante.split(',')[1]
                assinatura_representante_binary = base64.b64decode(assinatura_representante_data)
                
                # Criar nome de arquivo único para assinatura do representante
                rep_filename = f'assinatura_rep_os_{ordem_id}_{timestamp}.png'
                rep_filepath = os.path.join(assinatura_dir, rep_filename)
                
                # Salvar a imagem da assinatura do representante
                with open(rep_filepath, 'wb') as f:
                    f.write(assinatura_representante_binary)
                
                # Caminho relativo para salvar no banco de dados
                assinatura_representante_path = f'static/assinaturas/{rep_filename}'
            
            with sqlite3.connect('database.db') as conn:
                cursor = conn.cursor()
                
                # Registrar entrega com as duas assinaturas
                cursor.execute('''
                    INSERT INTO entregas (
                        ordem_id, recebedor_nome, recebedor_telefone, 
                        tipo_entrega, assinatura_cliente_path, assinatura_representante_path, data_entrega
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    ordem_id, recebedor_nome, recebedor_telefone, 
                    tipo_entrega, assinatura_cliente_path, assinatura_representante_path, datetime.now()
                ))
                
                # Atualizar status da ordem para "Entregue"
                cursor.execute('''
                    UPDATE ordens 
                    SET status = 'Entregue' 
                    WHERE id = ?
                ''', (ordem_id,))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Equipamento entregue com sucesso!'
                })
                
        except Exception as e:
            print(f"Erro ao processar entrega: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Erro ao processar entrega: {str(e)}'
            })
    
    return jsonify({
        'success': False,
        'message': 'Método inválido.'
    })

@app.route('/marcar_como_entregue', methods=['POST'])
@login_required
def marcar_como_entregue():
    if request.method == 'POST':
        ordem_id = request.form.get('ordem_id')
        recebedor_nome = request.form.get('recebedor_nome')
        recebedor_telefone = request.form.get('recebedor_telefone')
        tipo_entrega = request.form.get('tipo_entrega')
        
        # Validar dados
        if not all([ordem_id, recebedor_nome, recebedor_telefone]):
            return jsonify({
                'success': False,
                'message': 'Todos os campos são obrigatórios.'
            })
        
        try:
            with sqlite3.connect('database.db') as conn:
                cursor = conn.cursor()
                
                # Registrar entrega sem salvar assinaturas
                cursor.execute('''
                    INSERT INTO entregas (
                        ordem_id, recebedor_nome, recebedor_telefone, 
                        tipo_entrega, data_entrega
                    ) VALUES (?, ?, ?, ?, ?)
                ''', (
                    ordem_id, recebedor_nome, recebedor_telefone, 
                    tipo_entrega, datetime.now()
                ))
                
                # Atualizar status da ordem para "Entregue"
                cursor.execute('''
                    UPDATE ordens 
                    SET status = 'Entregue' 
                    WHERE id = ?
                ''', (ordem_id,))
                
                conn.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Equipamento entregue com sucesso!'
                })
                
        except Exception as e:
            print(f"Erro ao processar entrega: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Erro ao processar entrega: {str(e)}'
            })
    
    return jsonify({
        'success': False,
        'message': 'Método inválido.'
    })

# Adicionar a rota para ocultar ordem
@app.route('/ocultar_ordem/<int:ordem_id>', methods=['POST'])
@login_required
def ocultar_ordem(ordem_id):
    try:
        with sqlite3.connect('database.db') as conn:
            cursor = conn.cursor()
            
            # Verificar se a ordem existe e está marcada como "Entregue"
            cursor.execute('SELECT status FROM ordens WHERE id = ?', (ordem_id,))
            result = cursor.fetchone()
            
            if not result:
                return jsonify({'success': False, 'message': 'Ordem não encontrada.'})
            
            if result[0] != 'Entregue':
                return jsonify({'success': False, 'message': 'Apenas ordens entregues podem ser ocultadas.'})
            
            # Marcar a ordem como não visível
            cursor.execute('UPDATE ordens SET visivel = 0 WHERE id = ?', (ordem_id,))
            conn.commit()
            
            return jsonify({'success': True, 'message': 'Ordem ocultada com sucesso.'})
            
    except Exception as e:
        print(f"Erro ao ocultar ordem: {str(e)}")
        return jsonify({'success': False, 'message': f'Erro ao processar: {str(e)}'})

if __name__ == '__main__':
    if not os.path.exists('database.db'):
        init_db()
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)