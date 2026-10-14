<div align="center">

<img src="https://img.shields.io/badge/%E2%9C%88-Hub%20Operacional%20Latam-1B0088?style=for-the-badge&labelColor=0F004D" alt="Hub Operacional Latam"/>

# 🌙 Portal Suporte Lua

**Sistemas, procedimentos, scripts e contatos da operação em um só lugar.**

<p>
  <a href="https://spl-latam.vercel.app"><img src="https://img.shields.io/badge/Acessar%20o%20portal-spl--latam.vercel.app-E8114B?style=for-the-badge&logo=vercel&logoColor=white" alt="Acessar o portal"/></a>
</p>

<p>
  <img src="https://img.shields.io/badge/HTML5-arquivo%20%C3%BAnico-1B0088?style=flat-square&logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-design%20system%20pr%C3%B3prio-2E10A6?style=flat-square&logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JavaScript-vanilla-4A2BD1?style=flat-square&logo=javascript&logoColor=white" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/Supabase-login%20%2B%20perfis-E8114B?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Vercel-hospedagem-0F004D?style=flat-square&logo=vercel&logoColor=white" alt="Vercel"/>
  <img src="https://img.shields.io/badge/sem-rastreadores-D10D43?style=flat-square" alt="Sem rastreadores"/>
</p>

[Sobre](#-sobre) •
[Recursos](#-recursos) •
[Abas do portal](#-abas-do-portal) •
[Privacidade](#-privacidade-e-seguran%C3%A7a) •
[Tecnologias](#-tecnologias) •
[Estrutura](#-estrutura-do-projeto) •
[Executar](#-como-executar) •
[Autor](#-autor)

</div>

---

## 📖 Sobre

O **Portal Suporte Lua** é o *Hub Operacional Latam*: uma central de consulta criada para o dia a dia dos agentes e dos suportes da operação. Ele reúne em um único endereço curto tudo o que antes ficava espalhado: sistemas e logins, formulários, fluxos de atendimento, slides oficiais, telefones, scripts e ferramentas de apoio.

Antes, quando um slide, formulário ou sistema não constava no Agente 360, era preciso pedir ao agente que abrisse um chat para a equipe enviar o arquivo. Agora o agente encontra tudo sozinho, em segundos, com busca global.

> [!NOTE]
> O portal é uma **ferramenta de apoio** e não substitui os sistemas oficiais. Confirme sempre no sistema original antes de decidir.

### 🎯 Objetivos

- Centralizar a base de conhecimento da operação em um só lugar.
- Ajudar principalmente os **agentes iniciantes**, com passo a passo e linguagem direta.
- Reduzir o tempo de busca durante o atendimento.
- Ser leve, rápido e transparente quanto aos dados que utiliza.

---

## ✨ Recursos

| | Recurso | Descrição |
|---|---|---|
| 🔎 | **Busca global** | Pesquisa em toda a base de conhecimento. Atalho: tecla `/` |
| 🗂️ | **Navegação por abas** | Dock de abas com contadores e atalhos no cabeçalho |
| 🕐 | **Relógio da operação** | Horário de Brasília e de Tulsa sempre visíveis |
| 🔐 | **Meus acessos** | Guarda seus dados de login com senhas cifradas no navegador |
| 🧭 | **Fluxos por SAG** | Mostra se você resolve ou transfere cada tratativa |
| 📝 | **Painel de anotações** | Bloco de notas e dados do cliente durante o atendimento |
| 💬 | **Scripts com preenchimento automático** | Seu nome e o do passageiro entram sozinhos nos textos |
| 🤖 | **Agente Sabre** | Lê e resume históricos de reserva do SABRE |
| 🔤 | **Tradutor fonético** | Converte o localizador para o alfabeto NATO |
| 🔗 | **Compartilhamento de itens** | Administradores geram links diretos para sistemas, formulários e slides |
| 📱 | **Responsivo** | Funciona em computador, tablet e celular |
| ♿ | **Acessível** | Navegação por teclado, foco visível e rótulos ARIA |

---

## 🧩 Abas do portal

### 🖥️ Sistemas e Logins
**49 sistemas** e plataformas operacionais, com orientação clara sobre o que cada um pede para entrar: BP, senha da máquina, e-mail corporativo, usuário do Integrall, EPR + senha do Sabre ou nenhum login.

### 📄 Formulários
**6 formulários** de atendimento, como Forms de Contingência e Declaração de Embarque, com acesso direto.

### 🔀 Fluxos de Atendimento
**158 tratativas** organizadas por SAG. O fluxo é simples:

1. Escolha a sua **SAG**, para o painel saber o que é seu e o que deve ser transferido.
2. Digite a **tratativa** do cliente (ex.: "reembolso EMD", "bagagem danificada") ou escolha uma área.
3. Veja a resposta: 🟢 **verde**, você resolve; 🔵 **azul**, você transfere, e o título diz para onde.

### 🎞️ Slides Oficiais
**28 slides** oficiais do Suporte Lua, com formulário para a equipe sugerir novos materiais.

### 🤖 Agente Sabre `BETA`
Cole um histórico do SABRE (`6*H`, histórico PNR ou `*IA`) e receba:

- **Resumo** da reserva;
- **Linha do tempo** das ações, lida de baixo para cima;
- **Passageiros**, documentos e bilhetes;
- **Referência** dos códigos de ação (A, X, M, S, H e compostos);
- **Indícios** destacados por cor, como alteração pelo site ou pelo CPC.

> [!WARNING]
> O Agente Sabre **não é inteligência artificial generativa**: é um conjunto de regras fixas que roda 100% no navegador. Pode errar. Nunca decida só pelo que ele mostra e confirme no histórico original do SABRE. Atalho para analisar: `Ctrl + Enter`.

### ☎️ Diretório de Telefones
**26 contatos** e SACs, com descrição do atendimento e telefones de cada setor.

### 💬 Scripts de Atendimento
**35 scripts oficiais** para Chat/Zendesk, em cinco grupos, com preenchimento automático do nome do agente e do passageiro:

- Atendimento Padrão
- Zendesk e Resoluções
- Pagamentos e Biometria
- Cotação e Emissão
- Serviços Especiais e Regras

### 🔤 Tradutor Fonético
Digite o localizador de 6 caracteres e veja a tradução automática para o **Alfabeto Aeronáutico (NATO)**.

### 📝 Anotações
Painel para anotar durante o atendimento sem perder nada:

- até **4 passageiros** ao mesmo tempo;
- bloco de notas livre com botão de copiar;
- dados do cliente e campos personalizados;
- botão **Limpar este passageiro** ao final do atendimento;
- opção de **fixar no site** ou abrir em **janela flutuante**;
- tudo salvo **apenas no seu navegador**.

### 📣 Feedback e Avisos
Mural de avisos da operação e fluxo para **relatar problemas** de explicação ou sugerir melhorias. O relatório é gerado como arquivo `.txt` no seu aparelho; nada é enviado automaticamente.

### 🛡️ Gerência *(administradores)* e Transparência *(agentes)*
- **Agentes** veem o **Portal de Transparência**, que explica o que acontece com cada dado.
- **Administradores** veem a **Gerência**, um painel personalizável com links de gestão e atalhos de sistemas, salvos no banco por administrador.

---

## 🔒 Privacidade e segurança

O portal foi pensado para ser **transparente e sem rodeios**. Resumo:

1. Você usa o portal **sem conta**. Sem entrar, nada é enviado ao banco de dados.
2. Quem cria conta (**BP + senha**) tem o perfil salvo na nuvem (Supabase), para usar em qualquer computador.
3. As três senhas salvas (máquina, Sabre e Integrall) são **cifradas no navegador antes de sair dele**. O banco só recebe texto embaralhado.
4. A chave da cifra nasce da **senha de login**, que o criador não conhece.
5. Nem tudo é cifrado: nome, BP, e-mail corporativo, EPR, RK e usuário do Integrall ficam legíveis no banco.
6. Anotações, SAG e o que é colado no Agente Sabre ficam **só no navegador**.
7. **Sem rastreadores**, cookies de análise ou estatísticas de uso.

### Onde cada dado fica

| Dado | Onde fica | Proteção |
|---|---|---|
| BP, nome, e-mail corporativo, EPR, RK, usuário do Integrall | Banco (tabela de perfis) | Trafega por HTTPS; não é cifrado no banco |
| Senhas da máquina, Sabre e Integrall | Banco, em um único pacote | Cifradas no navegador com **AES-256-GCM** |
| Senha de login | Serviço de login do Supabase | Enviada por HTTPS; guardada apenas como hash |
| Chave de criptografia | Navegador | Não exportável; some ao clicar em **Sair** |
| Papel (agente ou administrador) | Banco | Definido pelo criador; todos começam como agente |
| Anotações, SAG e preferências | Armazenamento local do navegador | Nunca vão ao banco |
| Texto colado no Agente Sabre | Só na tela | Não é gravado nem enviado |

### Como a cifra funciona

- A senha de login é combinada com um sal e passa por **PBKDF2-SHA256 com 600.000 iterações**, gerando uma chave de 256 bits.
- As senhas salvas são cifradas com **AES-256-GCM** e um vetor aleatório novo a cada gravação.
- Só o pacote cifrado (`v`, `iv`, `ct`) vai ao banco; a abertura acontece sempre dentro do navegador.
- Regras de segurança em nível de linha (**RLS**) no Supabase impedem que uma conta leia o perfil de outra.

> [!IMPORTANT]
> Limites honestos: a senha de login passa pelo servidor no momento de entrar; a proteção depende de uma senha longa e só sua; e uma cópia adulterada do portal poderia capturar senhas. **Use sempre o endereço oficial.**

### Confira você mesmo

1. Abra o portal e pressione `F12` → aba **Rede (Network)** → recarregue.
2. Sem login, você verá apenas o carregamento do portal, da fonte e da biblioteca de login.
3. Logado, ao salvar seus dados, o campo de segredos aparece como texto embaralhado.
4. Em **Aplicativo → Armazenamento local**, veja o que fica no aparelho.
5. Use **Ver código-fonte**: o código inteiro está lá, sem partes escondidas.

### Conexões externas

| Serviço | Para quê |
|---|---|
| Supabase | Login e perfis, só quando você entra ou salva dados |
| jsDelivr (CDN) | Baixar a biblioteca do Supabase, em versão fixa |
| Google Fonts | Baixar a fonte Figtree |

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Estrutura | HTML5 semântico |
| Estilo | CSS3 com variáveis (tokens), grid e flexbox |
| Lógica | JavaScript puro (*vanilla*), sem framework |
| Ícones | SVG em sprite, traço, sem dependências |
| Tipografia | [Figtree](https://fonts.google.com/specimen/Figtree) (Google Fonts) |
| Autenticação e dados | [Supabase](https://supabase.com) (`@supabase/supabase-js@2.45.2`) |
| Criptografia | Web Crypto API (PBKDF2 + AES-GCM) |
| Hospedagem | Vercel |

### 🎨 Design system

Inspirado na identidade LATAM: **índigo profundo + vermelho**, cantos generosos, botões em pílula e ícones de traço.

| Cor | Hex | Uso |
|---|---|---|
| ![](https://img.shields.io/badge/%20-%20%20%20%20%20-1B0088?style=flat-square) Índigo 700 | `#1B0088` | Cor principal |
| ![](https://img.shields.io/badge/%20-%20%20%20%20%20-0F004D?style=flat-square) Índigo 900 | `#0F004D` | Fundos escuros |
| ![](https://img.shields.io/badge/%20-%20%20%20%20%20-E8114B?style=flat-square) Vermelho 500 | `#E8114B` | Destaque e ação |
| ![](https://img.shields.io/badge/%20-%20%20%20%20%20-0E9F8E?style=flat-square) Verde-água | `#0E9F8E` | Apoio por tipo de conteúdo |
| ![](https://img.shields.io/badge/%20-%20%20%20%20%20-F57C00?style=flat-square) Âmbar | `#F57C00` | Apoio por tipo de conteúdo |
| ![](https://img.shields.io/badge/%20-%20%20%20%20%20-7A3FD1?style=flat-square) Violeta | `#7A3FD1` | Apoio por tipo de conteúdo |

---

## 📁 Estrutura do projeto

O portal é um **arquivo único**: HTML, CSS e JavaScript ficam embutidos no `index.html`.

```text
.
├── index.html   # Portal completo (HTML + CSS + JS embutidos)
└── README.md    # Este arquivo
```

Dentro do `index.html`, o CSS segue esta organização: tokens → reset e base → layout → componentes → abas → responsividade.

---

## 🚀 Como executar

### Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/<seu-usuario>/<seu-repositorio>.git
cd <seu-repositorio>

# 2. Abra o index.html no navegador
#    ou sirva com qualquer servidor estático:
python3 -m http.server 8080
# acesse http://localhost:8080
```

> [!TIP]
> Sem configurar o Supabase, o portal funciona normalmente como **visitante**: busca, fluxos, scripts, anotações, Tradutor e Agente Sabre não dependem de conta.

### Publicando na Vercel

1. Importe o repositório na [Vercel](https://vercel.com).
2. Framework: **Other** (site estático, sem build).
3. Deploy. O `index.html` é servido na raiz.

### Configurando o seu próprio Supabase *(opcional, para login e perfis)*

1. Crie um projeto no [Supabase](https://supabase.com).
2. Crie as tabelas usadas pelo portal:
   - `perfis`: dados do agente e o pacote cifrado de senhas;
   - `gerencia_itens`: links e atalhos do painel de cada administrador.
3. Ative o **RLS** nas duas tabelas, para que cada conta leia e grave só as próprias linhas.
4. No `index.html`, ajuste a configuração do Supabase (`SUPABASE_URL` e a chave pública `anon`).

> [!CAUTION]
> Nunca publique a chave `service_role` no código. Use somente a chave pública `anon`, com o RLS ativo.

---

## 🧑‍💻 Manutenção

| Quero... | Onde mexer |
|---|---|
| Adicionar um sistema, formulário ou slide | Na aba correspondente, copiando um card existente |
| Atualizar um telefone ou contato | Aba **Diretório de Telefones** |
| Incluir ou ajustar uma tratativa | Base de dados da aba **Fluxos de Atendimento** |
| Adicionar um script | Aba **Scripts de Atendimento**, no grupo adequado |
| Mudar cores e formas | Tokens `:root` no início do CSS |
| Tornar alguém administrador | Direto no banco (campo de papel do perfil) |

---

## 🗺️ Roadmap

- [x] Login único (BP + senha) com Supabase
- [x] Criptografia das senhas no navegador
- [x] Portal de Transparência
- [x] Gerência personalizável por administrador
- [x] Links de compartilhamento de itens
- [ ] Portal personalizado para cada suporte da operação
- [ ] Botão para excluir a própria conta

---

## 🤝 Contribuindo

Sugestões são bem-vindas, principalmente de slides, formulários e tratativas que estejam faltando.

1. Faça um *fork* do projeto.
2. Crie uma branch: `git checkout -b minha-melhoria`.
3. Faça o commit: `git commit -m "Descreve a melhoria"`.
4. Envie: `git push origin minha-melhoria`.
5. Abra um *Pull Request*.

Quem usa o portal também pode enviar ideias pela aba **Feedback e Avisos**.

---

## 👤 Autor

<div align="center">

**Guilherme Jesus dos Santos**
Agente do Suporte Lua e criador do portal

*Todos os sistemas tiveram a colaboração de todas as SAGs. Obrigado a todos que apoiaram.* 💜

</div>

---

<div align="center">

<sub>Ferramenta de apoio à operação. Não substitui os sistemas oficiais.</sub>

</div>
