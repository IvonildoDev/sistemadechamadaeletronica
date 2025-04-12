DROP TABLE IF EXISTS ordens;
DROP TABLE IF EXISTS equipamentos;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,  -- Adicionado UNIQUE para permitir login por nome
    email TEXT NOT NULL,
    senha TEXT NOT NULL,
    cargo TEXT NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT NOT NULL,
    endereco TEXT NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    serie TEXT,
    estado_equipamento TEXT NOT NULL,
    defeito_relatado TEXT NOT NULL,
    codigo_barras TEXT,
    foto1 TEXT,
    foto2 TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes (id)
);

CREATE TABLE ordens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipamento_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    declaracao TEXT,
    relatorio_pecas TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

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
);

-- Inserir um usuário administrador padrão (senha: admin123)
INSERT INTO usuarios (nome, email, senha, cargo) 
VALUES ('admin', 'admin@sistema.com', 'admin123', 'Administrador');