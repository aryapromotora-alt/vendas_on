# Planilha de Funcionários - Sistema Web

## Descrição
Sistema web desenvolvido em HTML, CSS e JavaScript que simula uma planilha do Excel para gerenciamento de funcionários. O sistema inclui autenticação de usuários, cálculos automáticos e funcionalidades administrativas.

## Funcionalidades

### Para Funcionários Comuns:
- Login com nome de usuário e senha
- Visualização da planilha completa
- Edição apenas dos próprios dados (linha correspondente ao usuário logado)
- Visualização dos totais diários e semanais em tempo real

### Para Administradores:
- Login com credenciais especiais (admin/admin123)
- Acesso ao painel administrativo
- Gerenciamento de funcionários (adicionar/remover)
- Edição completa de todos os dados da planilha
- O administrador não aparece na lista de funcionários

## Estrutura dos Arquivos

- `index.html` - Estrutura principal do site
- `style.css` - Estilização com fundo cinza claro conforme solicitado
- `script.js` - Lógica JavaScript com todas as funcionalidades

## Como Usar

### 1. Abrir o Sistema
Abra o arquivo `index.html` em qualquer navegador web moderno.

### 2. Login de Funcionário
Use as seguintes credenciais padrão:
- **Anderson**: senha `123`
- **Vitoria**: senha `123`
- **Jemima**: senha `123`
- **Maiany**: senha `123`
- **Fernanda**: senha `123`
- **Nadia**: senha `123`
- **Giovana**: senha `123`

### 3. Login de Administrador
- **Usuário**: `admin`
- **Senha**: `admin123`

### 4. Funcionalidades da Planilha
- Clique em qualquer célula editável para inserir valores
- Os totais são calculados automaticamente
- Use números decimais (ex: 150.50) para valores monetários

### 5. Painel Administrativo (apenas admin)
- Clique em "Painel Admin" após fazer login como administrador
- **Aba "Gerenciar Funcionários"**: Visualize e remova funcionários existentes
- **Aba "Adicionar Funcionário"**: Adicione novos funcionários com senha personalizada

## Características Técnicas

### Responsividade
- Layout adaptável para desktop e mobile
- Tabela otimizada para diferentes tamanhos de tela

### Persistência de Dados
- Utiliza localStorage do navegador para salvar dados
- Dados são mantidos entre sessões
- Para resetar todos os dados, abra o console do navegador e digite: `resetData()`

### Segurança Básica
- Senhas são armazenadas localmente (adequado para demonstração)
- Validação de permissões por tipo de usuário
- Campos de senha mascarados na interface

### Cálculos Automáticos
- Soma semanal por funcionário (coluna TOTAL)
- Soma diária por dia da semana (linha TOTAL DIÁRIO)
- Total geral da semana (canto inferior direito)
- Atualização em tempo real após edições

## Estrutura da Planilha

| FUNCIONÁRIO | SEGUNDA | TERÇA | QUARTA | QUINTA | SEXTA | TOTAL |
|-------------|---------|-------|---------|---------|-------|-------|
| Anderson    | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| ...         | ...     | ...   | ...     | ...     | ...   | ...   |
| **TOTAL DIÁRIO** | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 | R$ 0,00 |

## Suporte
Este é um sistema de demonstração desenvolvido conforme as especificações solicitadas. Para modificações ou melhorias, edite os arquivos HTML, CSS e JavaScript conforme necessário.

## Navegadores Compatíveis
- Chrome (recomendado)
- Firefox
- Safari
- Edge
- Qualquer navegador moderno com suporte a ES6+

