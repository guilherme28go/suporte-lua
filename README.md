<div align="center">

<img src="https://img.shields.io/badge/%E2%9C%88-Hub%20Operacional%20Latam-1B0088?style=for-the-badge&labelColor=0F004D" alt="Hub Operacional Latam"/>

# 🌙 Portal Suporte Lua

**Sistemas, procedimentos, scripts e contatos da operação em um só lugar.**

<p>
  <a href="https://spl-latam.vercel.app"><img src="https://img.shields.io/badge/Acessar%20o%20portal-spl--latam.vercel.app-E8114B?style=for-the-badge&logo=vercel&logoColor=white" alt="Acessar o portal"/></a>
</p>

<p>
  <img src="https://img.shields.io/badge/HTML5-semântico-1B0088?style=flat-square&logo=html5&logoColor=white" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-design%20system%20pr%C3%B3prio-2E10A6?style=flat-square&logo=css3&logoColor=white" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JavaScript-vanilla%20%C2%B7%20sem%20build-4A2BD1?style=flat-square&logo=javascript&logoColor=white" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/Supabase-Auth%20%C2%B7%20Postgres%20%C2%B7%20RLS-E8114B?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Vercel-hospedagem-0F004D?style=flat-square&logo=vercel&logoColor=white" alt="Vercel"/>
  <img src="https://img.shields.io/badge/sem-rastreadores-D10D43?style=flat-square" alt="Sem rastreadores"/>
</p>

[Sobre](#-sobre) •
[Recursos](#-recursos) •
[Abas](#-abas-do-portal) •
[Papéis](#-pap%C3%A9is-e-permiss%C3%B5es) •
[Desenvolvedor](#%EF%B8%8F-painel-do-desenvolvedor) •
[Privacidade](#-privacidade-e-seguran%C3%A7a) •
[Estrutura](#-estrutura-do-projeto) •
[Executar](#-como-executar) •
[Autor](#-autor)

</div>

---

## 📖 Sobre

O **Portal Suporte Lua** é o *Hub Operacional Latam*: uma central de consulta criada para o dia a dia dos agentes e dos suportes da operação. Ele reúne em um único endereço curto tudo o que antes ficava espalhado: sistemas e logins, formulários, fluxos de atendimento, slides oficiais, telefones, scripts e ferramentas de apoio.

Antes, quando um slide, formulário ou sistema não constava no Agente 360, era preciso pedir ao agente que abrisse um chat para a equipe enviar o arquivo. Agora o agente encontra tudo sozinho, em segundos, com busca global.

O portal evoluiu de uma página estática para uma **plataforma editável**: o conteúdo das abas vem do banco (Supabase) e quem tem permissão atualiza tudo pelo próprio portal, **sem mexer no código e sem novo deploy**.

> [!NOTE]
> O portal é uma **ferramenta de apoio** e não substitui os sistemas oficiais. Confirme sempre no sistema original antes de decidir.

### 🎯 Objetivos

- Centralizar a base de conhecimento da operação em um só lugar.
- Ajudar principalmente os **agentes iniciantes**, com passo a passo e linguagem direta.
- Reduzir o tempo de busca durante o atendimento.
- Permitir que a própria equipe mantenha o conteúdo, com controle de quem pode editar o quê.
- Ser leve, rápido e transparente quanto aos dados que utiliza.

---

## ✨ Recursos

| | Recurso | Descrição |
|---|---|---|
| 🔎 | **Busca global** | Pesquisa instantânea em toda a base de conhecimento. Atalho: tecla `/` |
| 🗂️ | **Navegação por abas** | Dock com contadores, atalhos no cabeçalho e teclado (setas, `Home` e `End`) |
| 🕐 | **Relógio da operação** | Horário de Brasília e de Tulsa sempre visíveis |
| 🔐 | **Meus acessos** | Guarda seus dados de login, com senhas cifradas no navegador |
| 🧭 | **Fluxos por SAG** | Mostra se você resolve ou transfere cada tratativa |
| 📝 | **Painel de anotações** | Bloco de notas e dados do cliente (modo agente e modo suporte) |
| 💬 | **Scripts com preenchimento automático** | Seu nome e o do passageiro entram sozinhos nos textos |
| ✈️ | **Confirmação de Voo** | Monta o texto de confirmação com cia, voo, origem, destino, data e horários |
| 🤖 | **Agente Sabre** | Lê e resume históricos de reserva, com regras editáveis pelo banco |
| 🔤 | **Tradutor fonético** | Converte o localizador para o alfabeto NATO em tempo real |
| 🔗 | **Compartilhamento por link** | Gera link direto para um sistema, formulário ou slide |
| 📋 | **Formulários internos** | Substituem os formulários do Google, com respostas, filtros e gráficos |
| 📣 | **Mensagens para agentes** | Faixa, balão ou janela, com público e prazo definidos |
| 🧱 | **Portais e abas dinâmicos** | Desenvolvedores criam, reordenam e escondem abas e portais |
| 🎨 | **Aparência editável** | Cores, marca, topo, rodapé e relógio configuráveis |
| 🛠️ | **Aviso de manutenção** | Faixa automática (padrão: sextas) e página `404.html` própria |
| ⏳ | **Skeleton loaders** | Esqueletos de carregamento com o mesmo layout do conteúdo final |
| 📱 | **Responsivo** | Funciona em computador, tablet e celular |
| ♿ | **Acessível** | Navegação por teclado, foco visível, rótulos ARIA e `prefers-reduced-motion` |

---

## 🧩 Abas do portal

> [!TIP]
> Os cartões, textos, nomes e a ordem das abas vêm do banco. Por isso os números exibidos nos contadores mudam conforme o conteúdo é atualizado.

| Aba | O que tem |
|---|---|
| 🖥️ **Sistemas e Logins** | Sistemas e plataformas operacionais, com a orientação do que cada um pede para entrar (BP, senha da máquina, e-mail corporativo, usuário do Integrall, EPR + senha do Sabre ou nenhum login) |
| 📄 **Formulários** | Formulários de atendimento com acesso direto |
| 🔀 **Fluxos de Atendimento** | Tratativas por SAG: 🟢 você resolve, 🔵 você transfere |
| 🎞️ **Slides Oficiais** | Slides do Suporte Lua e formulário para a equipe sugerir novos materiais |
| 🤖 **Agente Sabre** `BETA` | Análise de histórico de reservas do SABRE |
| ☎️ **Diretório de Telefones** | Contatos e SACs, com descrição do atendimento |
| 💬 **Scripts de Atendimento** | Scripts oficiais para Chat/Zendesk, em grupos, com preenchimento automático |
| 🔤 **Tradutor Fonético** | Localizador de 6 caracteres para o alfabeto aeronáutico (NATO) |
| 📝 **Anotações** | Painel para anotar durante o atendimento |
| 📣 **Feedback e Avisos** | Avisos atuais, compartilhamentos, atualizações futuras e cronologia do site |
| 🛡️ **Gerência** | Painel de administradores: links de gestão, atalhos e respostas dos formulários |
| 🛠️ **Desenvolvedor** | Painel completo de administração do portal |
| 🔍 **Transparência** | Explica, sem rodeios, o que acontece com os dados |

> A **Gerência** e a **Transparência** nunca aparecem juntas: agentes veem a Transparência; administradores e desenvolvedores veem a Gerência.

### 🔀 Fluxos de Atendimento

1. Escolha a sua **SAG**, para o painel saber o que é seu e o que deve ser transferido.
2. Digite a **tratativa** do cliente (ex.: "reembolso EMD", "bagagem danificada") ou escolha uma área.
3. Veja a resposta: 🟢 **verde**, você resolve; 🔵 **azul**, você transfere, e o título diz para onde.

A SAG escolhida fica salva no navegador. Os dados dos fluxos são editados no painel do desenvolvedor.

### 🤖 Agente Sabre `BETA`

Cole um histórico do SABRE (`6*H`, histórico PNR ou `*IA`) e receba a análise em **10 painéis**:

| Painel | Conteúdo |
|---|---|
| **Resumo** | Visão geral da reserva e indícios em destaque |
| **Itinerário** | Itinerário atual em destaque e voos anteriores |
| **Quem mexeu** | Quem alterou, identificado pela **assinatura** e não pelo campo `R-` |
| **Assentos** | Trocas e alterações de assento |
| **Pagamentos** | Formas de pagamento, valores e erros |
| **Bilhetes** | Bilhetes por passageiro e cupom, incluindo produtos como bagagem e assento |
| **Linha do Tempo** | Ações lidas de baixo para cima, com hora (Tulsa) e data |
| **Passageiros** | Nomes, documentos e bilhetes |
| **Referência** | Significado dos códigos encontrados |
| **Linhas não lidas** | O que o Agente não conseguiu interpretar |

Também valida a **involuntária** (atraso ou antecipação de 31 minutos ou mais), avisa mudança de aeroporto acima de 500 km e destaca alertas por cor.

**Regras editáveis, sem novo deploy**

- As regras (status, aeroportos, ações, atores, robôs, remarks, SSR, indícios, alertas, tarifas e outras) ficam no banco e são editadas em *Desenvolvedor → Agente Sabre*.
- Regras mais avançadas entram como **módulos de código** (`Sabre.hook`), com ganchos *antes*, *linha*, *ator*, *remark*, *fatos*, *alertas* e *depois*.
- O navegador guarda uma cópia das regras para abrir rápido e depois busca a versão atual.
- Se o banco não responder, o Agente usa as **regras de fábrica** do `js/02-app.js`.
- **Botão de emergência:** abra o portal com `?sabre=padrao` na URL para ignorar tudo o que veio do banco.
- **Pendências do Sabre:** quando o Agente encontra algo que não identifica (assinatura nova, ação sem regra, linha não interpretada), a reserva é enviada ao banco **com CPF, bilhete, passaporte, telefone e e-mail mascarados**, para os desenvolvedores melhorarem as regras. Só desenvolvedores veem.
- O arquivo `js/pacote-agente-sabre-2026-11-24-v21.json` é um **pacote de backup** das regras e módulos (300 regras e 13 módulos na exportação de 24/11/2026).

> [!WARNING]
> O Agente Sabre **não é inteligência artificial generativa**: é um conjunto de regras fixas que roda no navegador. O mesmo histórico sempre gera o mesmo resultado. Ele pode errar. Nunca decida só pelo que ele mostra e confirme no histórico original do SABRE. Atalho para analisar: `Ctrl + Enter`.

### 💬 Scripts e Confirmação de Voo

- Scripts organizados em grupos, com **preenchimento automático** do nome do agente e do passageiro.
- A **Confirmação de Voo** monta o texto com até 4 trechos (cia, número, origem, destino, data, saída e chegada).

### 📝 Anotações

- até **4 passageiros** ao mesmo tempo, com campos de cliente e campos personalizados;
- **modo suporte**, com Nome do agente, BP, SAG, Localização e ID da chamada;
- bloco de notas livre com botão de copiar;
- botão **Limpar este passageiro** ao final do atendimento;
- opção de **fixar no site** ou abrir em **janela flutuante**;
- tudo salvo **apenas no seu navegador**.

### 📣 Feedback e Avisos

Mural com avisos, ideias compartilhadas, atualizações futuras e a cronologia do site, tudo editável por quem tem permissão.

---

## 👥 Papéis e permissões

O portal funciona sem conta. Com conta (**BP + senha**), o usuário ganha um papel:

| Papel | Nível | O que faz |
|---|:---:|---|
| 🌐 **Público** | 0 | Lê o conteúdo público do portal, sem conta |
| 🧑‍✈️ **Agente** | 1 | Salva o próprio perfil e acessos, usa todas as abas. Todos começam aqui |
| 🛡️ **Administrador** | 2 | Vê a **Gerência**, monta o próprio painel, compartilha links, envia mensagens, vê respostas dos formulários e edita **só o que a matriz de permissões liberar** |
| 🛠️ **Desenvolvedor** | 3 | Altera o portal para todos, define papéis e permissões e acessa o painel completo |

**Áreas que a matriz de permissões pode liberar para administradores:**
Sistemas, Formulários, Slides, Avisos, Compartilhamentos, Telefones, Scripts, Atualizações Futuras, Cronologia, Títulos e textos das seções, Nome/ícone/selo/ordem das abas, Conteúdo dos portais criados, Marca/topo/rodapé/relógio/avisos, Cores e aparência, Dados dos Fluxos e Portal da Transparência.

> [!IMPORTANT]
> As regras de quem pode ler ou gravar cada coisa são aplicadas **no servidor** (RLS do Supabase). A tela apenas esconde o que a pessoa não poderia usar. Cada alteração de conteúdo fica registrada (quem, quando e o quê) em um **histórico** que só desenvolvedores leem.

---

## 🛠️ Painel do Desenvolvedor

Aba exclusiva para quem tem o papel de desenvolvedor, com 14 seções:

| Seção | Função |
|---|---|
| 👥 **Equipe** | Lista de contas, definição de papéis, atividade e exclusão de conta |
| 🔑 **Permissões** | Matriz do que cada papel pode editar |
| 🧱 **Abas e portais** | Ordem, nome, ícone, selo e visibilidade; cria e remove abas e portais |
| ✨ **Aparência** | Tema e cores |
| ✏️ **Textos do site** | Marca, topo, relógio, rodapé, aviso global e faixa de manutenção |
| 🔀 **Fluxos** | SAGs, matrizes e tratativas |
| 🤖 **Agente Sabre** | Regras e módulos de código |
| 📥 **Pendências do Sabre** | Reservas que o Agente não soube interpretar (mascaradas) |
| 🛡️ **Transparência** | Edita o Portal de Transparência com editor de texto "como no Word" |
| 📋 **Formulários** | Construtor de formulários |
| 📊 **Planilhas** | Grade editável com gráficos, importação e exportação |
| 📣 **Mensagens** | Envio de mensagens para os agentes |
| 🗄️ **Backup** | Exportação e restauração do conteúdo |
| 🕘 **Histórico** | Auditoria das alterações |

### 📋 Formulários e planilhas

- **Construtor** com 13 tipos de campo: resposta curta, parágrafo, múltipla escolha, lista suspensa, caixas de seleção, data, número, link, e-mail, anexo de arquivo, relatório (texto técnico), aceite e texto explicativo.
- Abrem por link (`#form/slug`) ou por botão `data-form="slug"`.
- **Respostas** com filtros, status, exportação e **gráficos** (barras, colunas, rosca, pizza, linha e área).
- **Planilhas** editáveis, com gráficos, importação e exportação.
- Anexos com limite de 3 MB por arquivo e 6 MB no total por envio.

### 📣 Mensagens para agentes

Administradores e desenvolvedores escolhem ícone, título, texto, cor, **formato** (faixa no topo, balão no canto ou janela no centro), **quem recebe** e **por quanto tempo** a mensagem fica visível. Depois do prazo ela some sozinha. O agente pode dispensar a mensagem, e o portal consulta novas mensagens ao entrar, a cada minuto e quando a aba volta ao foco.

---

## 🔒 Privacidade e segurança

O portal foi pensado para ser **transparente e sem rodeios**. Resumo:

1. Você usa o portal **sem conta**. Sem entrar, o portal apenas **lê o conteúdo público**; nada do que você digita é enviado.
2. Quem cria conta (**BP + senha**) tem o perfil salvo na nuvem (Supabase), para usar em qualquer computador.
3. As três senhas salvas (máquina, Sabre e Integrall) são **cifradas no navegador antes de sair dele**. O banco só recebe texto embaralhado.
4. A chave da cifra nasce da **senha de login**, que o criador não conhece.
5. Nem tudo é cifrado: nome, BP, e-mail corporativo, EPR, RK e usuário do Integrall ficam legíveis no banco.
6. Anotações e SAG ficam **só no navegador**.
7. **Sem rastreadores**, cookies de análise ou estatísticas de uso.

### Onde cada dado fica

| Dado | Onde fica | Proteção |
|---|---|---|
| BP, nome, e-mail corporativo, EPR, RK, usuário do Integrall | Banco (tabela de perfis) | Trafega por HTTPS; não é cifrado no banco |
| Senhas da máquina, Sabre e Integrall | Banco, em um único pacote | Cifradas no navegador com **AES-256-GCM** |
| Senha de login | Serviço de login do Supabase | Enviada por HTTPS; guardada apenas como hash |
| Chave de criptografia | Navegador | Não exportável; some ao clicar em **Sair** |
| Papel (agente, administrador ou desenvolvedor) | Banco | Definido pelo criador ou por um desenvolvedor |
| Anotações, SAG e preferências | Armazenamento local do navegador | Nunca vão ao banco |
| Texto colado no Agente Sabre | Só na tela | Se houver algo não identificado, vai ao banco **mascarado**, visível só a desenvolvedores |
| Relatório de problema do Agente Sabre | Banco, só se estiver logado | Você revisa o texto antes de enviar. Sem login, vira um `.txt` no seu aparelho |
| Respostas dos formulários | Banco | Guardam nome e BP; só administradores e desenvolvedores veem |

### Como a cifra funciona

- A senha de login é combinada com um sal e passa por **PBKDF2-SHA256 com 600.000 iterações**, gerando uma chave de 256 bits.
- As senhas salvas são cifradas com **AES-256-GCM** e um vetor aleatório novo a cada gravação.
- Só o pacote cifrado (`v`, `iv`, `ct`) vai ao banco; a abertura acontece sempre dentro do navegador.
- Regras de segurança em nível de linha (**RLS**) impedem que uma conta leia o perfil de outra.

> [!IMPORTANT]
> Limites honestos: a senha de login passa pelo servidor no momento de entrar; a proteção depende de uma senha longa e só sua (mínimo de 8 caracteres); e uma cópia adulterada do portal poderia capturar senhas. **Use sempre o endereço oficial.**

### Conta e senha

- **Editar dados:** em *Editar meus dados* você muda ou apaga nome, e-mail, EPR, RK, usuário do Integrall e as três senhas.
- **Trocar a senha de login:** as senhas salvas são regravadas com a nova chave.
- **Alerta de senhas desatualizadas:** o portal avisa quando os acessos salvos passam de um prazo configurável (padrão: 20 dias).
- **Esqueci minha senha:** a recuperação usa BP + EPR e **apaga a conta e os dados salvos nela** (as senhas cifradas não podem ser recuperadas sem a senha anterior).
- **Excluir conta:** feito por um desenvolvedor no painel *Equipe*. O botão de autoexclusão para o próprio agente ainda não existe.

### Confira você mesmo

1. Abra o portal e pressione `F12` → aba **Rede (Network)** → recarregue.
2. Sem login, você verá o carregamento do portal, da fonte, da biblioteca de login e as **leituras** do conteúdo público no Supabase.
3. Logado, ao salvar seus dados, o campo de segredos aparece como texto embaralhado.
4. Em **Aplicativo → Armazenamento local**, veja o que fica no aparelho.
5. Use **Ver código-fonte**: o código inteiro está lá, sem partes escondidas.

### Conexões externas

| Serviço | Para quê |
|---|---|
| Supabase | Conteúdo público, login e perfis |
| jsDelivr (CDN) | Biblioteca do Supabase em versão fixa e, quando um administrador escolhe um ícone novo, ícones Lucide |
| Google Fonts | Fonte Figtree |

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Estrutura | HTML5 semântico |
| Estilo | CSS3 com variáveis (tokens), grid e flexbox |
| Lógica | JavaScript puro (*vanilla*), sem framework e sem etapa de build |
| Ícones | SVG em sprite, traço |
| Gráficos | SVG gerado pelo próprio portal (`js/16-graficos.js`) |
| Tipografia | [Figtree](https://fonts.google.com/specimen/Figtree) (Google Fonts) |
| Banco e autenticação | [Supabase](https://supabase.com) (`@supabase/supabase-js@2.45.2`): Postgres, Auth, RLS e funções RPC |
| Criptografia | Web Crypto API (PBKDF2 + AES-GCM) |
| Hospedagem | Vercel (site estático) |

### 🎨 Design system

Inspirado na identidade LATAM: **índigo profundo + vermelho**, cantos generosos, botões em pílula e ícones de traço. Os tokens ficam no início de `css/style.css`.

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

```text
.
├── index.html                 # Estrutura das abas, painéis e modais
├── 404.html                   # Página "Sistema em manutenção" (libera sozinha quando o sistema volta)
├── css/
│   ├── style.css              # Design system: tokens, base, layout e componentes
│   └── conteudo-admin.css     # Edição por administradores, formulários, skeletons
└── js/
    ├── 01-auth-admin-link.js  # Botão "Solicitar acesso de administrador" (formulário interno)
    ├── 02-app.js              # Núcleo: abas, busca, relógio, scripts, tradutor e Agente Sabre
    ├── 03-config.js           # Configuração do Supabase e opções do portal
    ├── 04-auth-gerencia.js    # Login único, perfil, cifra das senhas e Gerência
    ├── 05-notas.js            # Painel de anotações
    ├── 06-confirmacao-voo.js  # Confirmação de Voo
    ├── 07-aviso-manutencao.js # Faixa de manutenção (auto, sempre ou nunca)
    ├── 08-fluxos.js           # Fluxos de Atendimento por SAG
    ├── 09-compartilhar.js     # Links de compartilhamento e tela de convite
    ├── 10-transparencia-destaque.js # Realce de comentários nos trechos de código
    ├── 11-conteudo.js         # Núcleo do conteúdo vindo do banco e edição por papel
    ├── 12-portais.js          # Abas, portais novos, aparência e textos do site
    ├── 13-desenvolvedor.js    # Painel do Desenvolvedor
    ├── 14-sabre-regras.js     # Regras e módulos do Agente Sabre vindos do banco
    ├── 15-formularios.js      # Formulários (lado de quem responde)
    ├── 16-graficos.js         # Gráficos e filtros
    ├── 17-formularios-admin.js# Construtor, respostas e planilhas
    ├── 18-transparencia.js    # Portal de Transparência editável
    ├── 19-mensagens.js        # Mensagens de administradores para agentes
    ├── 20-skeletons.js        # Skeleton loaders
    ├── 21-editor-rico.js      # Editor de texto "como no Word"
    └── pacote-agente-sabre-2026-11-24-v21.json  # Backup das regras e módulos do Agente Sabre
```

> [!NOTE]
> A **ordem dos scripts** no `index.html` importa: `11-conteudo.js` precisa carregar antes de `12`, `13` e dos demais que usam `window.PortalCore`. O `20-skeletons.js` carrega antes do conteúdo, para preencher as abas enquanto o banco responde.

### 🗄️ Banco de dados (Supabase)

O portal usa as tabelas abaixo (as regras de acesso e as funções ficam no servidor, nos scripts SQL do projeto):

| Grupo | Tabelas |
|---|---|
| **Contas e acesso** | `perfis`, `portal_campos_acesso`, `gerencia_itens` |
| **Conteúdo do portal** | `portal_cards`, `portal_textos`, `portal_abas`, `portal_dados`, `portal_permissoes`, `portal_auditoria` |
| **Mensagens** | `portal_mensagens`, `portal_mensagens_lidas` |
| **Formulários e planilhas** | `pf_formularios`, `pf_respostas`, `pf_anexos`, `pf_visoes`, `pf_planilhas`, `pf_planilha_linhas` |
| **Agente Sabre** | `sabre_regras`, `sabre_modulos`, `sabre_pendencias` |

**Funções RPC:** `definir_papel`, `listar_equipe`, `equipe_atividade`, `excluir_conta`, `esqueci_senha`, `pf_enviar`, `mensagens_para_mim`, `mensagem_dispensar` e `limpar_auditoria`.

---

## 🚀 Como executar

### Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/<seu-usuario>/<seu-repositorio>.git
cd <seu-repositorio>

# 2. Sirva com qualquer servidor estático
python3 -m http.server 8080
# acesse http://localhost:8080
```

> [!TIP]
> Use um servidor local em vez de abrir o `index.html` direto no navegador: os arquivos de `css/` e `js/` e a conexão com o Supabase funcionam melhor assim.

> [!NOTE]
> Sem o Supabase configurado, o portal mantém o conteúdo original que está no HTML como reserva. Anotações, Tradutor, Scripts e o Agente Sabre com as regras de fábrica continuam funcionando.

### Configuração (`js/03-config.js`)

```js
window.PORTAL_CONFIG = {
    SUPABASE_URL: 'https://<seu-projeto>.supabase.co',
    SUPABASE_ANON_KEY: '<chave-publica-anon>',   // somente a chave pública
    EMAIL_DOMAIN: 'agentes.suportelua.app',      // domínio técnico do e-mail "BP@dominio"
    EXIGIR_LOGIN: false,                         // true = o portal só abre depois do login
    DIAS_ALERTA_SENHA: 20                        // avisa que as senhas salvas podem estar desatualizadas
};
```

### Publicando na Vercel

1. Importe o repositório na [Vercel](https://vercel.com).
2. Framework: **Other** (site estático, sem build).
3. Deploy. O `index.html` é servido na raiz e o `404.html` vira a página de manutenção.

### Configurando o seu próprio Supabase

1. Crie um projeto no [Supabase](https://supabase.com).
2. Crie as tabelas e funções listadas em [Banco de dados](#%EF%B8%8F-banco-de-dados-supabase) e ative o **RLS** em todas, para que cada papel leia e grave somente o que pode.
3. Em `js/03-config.js`, informe a URL do projeto e a chave pública.
4. Crie a primeira conta pelo portal e promova o BP dela a **desenvolvedor** direto no banco. As demais promoções são feitas pelo painel *Equipe*.

> [!CAUTION]
> Nunca publique a chave `service_role` no código. Use somente a chave pública, com o RLS ativo. Sem RLS, qualquer visitante poderia ler e alterar dados.

---

## 🧑‍💻 Manutenção do conteúdo

| Quero... | Como fazer |
|---|---|
| Adicionar ou editar um sistema, formulário, slide, telefone ou script | Pelo próprio portal, na aba correspondente (administrador com permissão ou desenvolvedor) |
| Criar uma aba ou portal novo | *Desenvolvedor → Abas e portais* |
| Mudar cores, marca, topo e rodapé | *Desenvolvedor → Aparência* e *Textos do site* |
| Ajustar tratativas e SAGs | *Desenvolvedor → Fluxos* |
| Ensinar uma regra nova ao Agente Sabre | *Desenvolvedor → Agente Sabre* (regra ou módulo) |
| Ver o que o Agente Sabre não entendeu | *Desenvolvedor → Pendências do Sabre* |
| Avisar os agentes | *Desenvolvedor → Mensagens* (ou Gerência) |
| Criar um formulário | *Desenvolvedor → Formulários* |
| Mudar o papel de alguém | *Desenvolvedor → Equipe* |
| Avisar sobre manutenção | *Desenvolvedor → Textos do site* (modo `auto`, `sempre` ou `nunca`) |
| Guardar uma cópia do conteúdo | *Desenvolvedor → Backup* |

---

## 🗺️ Roadmap

- [x] Login único (BP + senha) com Supabase
- [x] Criptografia das senhas no navegador
- [x] Portal de Transparência (agora editável)
- [x] Gerência personalizável por administrador
- [x] Links de compartilhamento de itens
- [x] Conteúdo editável pelo banco, com papéis e matriz de permissões
- [x] Painel do Desenvolvedor, abas e portais dinâmicos
- [x] Formulários internos, respostas, gráficos e planilhas
- [x] Mensagens para agentes
- [x] Regras do Agente Sabre editáveis, com módulos e pendências
- [x] Página de manutenção e skeleton loaders
- [ ] Botão para o agente excluir a própria conta

---

## 🤝 Contribuindo

Sugestões são bem-vindas, principalmente de slides, formulários, tratativas e regras do Agente Sabre que estejam faltando.

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
