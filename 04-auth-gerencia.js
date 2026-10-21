/* ==========================================================================
   LOGIN UNIFICADO = PERFIL DO AGENTE + PORTAL DE GERÊNCIA
   ========================================================================== */
(function () {
    'use strict';
    var CFG = window.PORTAL_CONFIG || {};
    var $ = function (id) { return document.getElementById(id); };
    var noop = function () { /* ignora */ };

    var GER_FLAG = 'suporteLuaGerLiberada';
    var ITER = 600000;
    var LIMITE_DIAS = CFG.DIAS_ALERTA_SENHA || 20;
    var TRACK_ID = 'TRACKID1NO2HABILITADO3EN4EL4SITIO567'; /* valor padrão */
    var CAMPOS = [
        { k: 'bp',        label: 'BP (usuário)',                  secret: false, input: 'loginBp' },
        { k: 'email',     label: 'E-mail corporativo',            secret: false, input: 'loginEmail' },
        { k: 'senha',     label: 'Senha da máquina',              secret: true,  input: 'loginSenha' },
        { k: 'epr',       label: 'EPR',                           secret: false, input: 'loginEpr' },
        { k: 'eprSenha',  label: 'Senha do Sabre (senha do EPR)', secret: true,  input: 'loginEprSenha' },
        { k: 'integrallUser', label: 'Usuário do Integrall',      secret: false, input: 'loginIntegrallUser' },
        { k: 'integrall', label: 'Senha do Integrall',            secret: true,  input: 'loginIntegrall' },
        { k: 'rk',        label: 'RK',                            secret: false, input: 'loginRk' }
    ];
    var AUTH_CAMPO = { bp: 'bp', pw: 'senha', epr: 'epr', eprpw: 'eprSenha', sabrepw: 'eprSenha', rk: 'rk', intpw: 'integrall', mail: 'email', intuser: 'integrallUser' };
    var SEGREDOS = ['senha', 'eprSenha', 'integrall'];
    var CONFIGURADO = !!CFG.SUPABASE_URL && !!CFG.SUPABASE_ANON_KEY &&
        String(CFG.SUPABASE_URL).indexOf('COLE_AQUI') < 0 && String(CFG.SUPABASE_ANON_KEY).indexOf('COLE_AQUI') < 0;

    var sb = null;
    var st = novoEstado();
    var perfil = vazio();
    var chaveMem = null, saindo = false, travado = false, reqGer = 0, colunasNovas = true;
    var opener = null, acessosOpener = null, authOpener = null;

    function novoEstado() { return { logado: false, uid: null, bloqueado: false, chave: null, segRaw: null }; }
    function vazio() { return { nome: '', bp: '', email: '', senha: '', epr: '', eprSenha: '', integrall: '', integrallUser: '', rk: '', role: 'agente', salt: '', acessosEm: '', extras: {}, xs: {} }; }
    var campos = [], extrasOk = false; /* campos extras criados pelos administradores (tabela portal_campos_acesso) */
    function campoPor(chave) { return campos.filter(function (c) { return c.chave === chave; })[0] || null; }
    async function carregarCampos() {
        campos = []; extrasOk = false; if (!sb || !st.logado) return;
        try { var r = await sb.from('portal_campos_acesso').select('chave,rotulo,tipo,valor,ordem').order('ordem').order('criado_em'); campos = r.error ? [] : (r.data || []); } catch (e) { campos = []; }
        try { var e2 = await sb.from('perfis').select('extras').eq('id', st.uid).maybeSingle(); if (!e2.error && e2.data) { extrasOk = true; perfil.extras = e2.data.extras || {}; } } catch (e3) { extrasOk = false; }
    }
    window.suporteLuaCampos = { lista: function () { return campos.slice(); }, recarregar: carregarCampos };
    function emailDe(bp) { return bp + '@' + (CFG.EMAIL_DOMAIN || 'agentes.suportelua.app'); }
    function ehAdmin() { return st.logado && (perfil.role === 'administrador' || perfil.role === 'desenvolvedor'); }
    function ehDev() { return st.logado && perfil.role === 'desenvolvedor'; }
    function cripto() { return !!(window.crypto && crypto.subtle && window.isSecureContext !== false); }

    /* ---------- DOM ---------- */
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function icon(n) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('class', 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
        var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n);
        s.appendChild(u); return s;
    }
    function btn(cls, txt, ic, attr) {
        var b = el('button', cls); b.type = 'button'; b.setAttribute(attr, '');
        if (ic) b.appendChild(icon(ic));
        b.appendChild(el('span', null, txt)); return b;
    }
    function toast(m) { if (typeof showToast === 'function') showToast(m); }
    function setMsg(id, txt, ok) {
        var m = $(id); if (!m) return;
        m.hidden = !txt; m.textContent = txt || '';
        m.className = 'bk-msg ' + (ok ? 'bk-msg--ok' : 'bk-msg--err'); m.setAttribute('role', ok ? 'status' : 'alert');
    }
    function fmtData(d) { return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); }
    function iconeValido(n) { return typeof n === 'string' && /^[a-z0-9-]+$/.test(n) && document.getElementById('i-' + n) ? n : 'link'; }
    function urlSegura(u) { try { var x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }

    /* ---------- criptografia das senhas do perfil ---------- */
    var enc = new TextEncoder(), dec = new TextDecoder();
    function b64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i += 8192) s += String.fromCharCode.apply(null, a.subarray(i, i + 8192)); return btoa(s); }
    function unb64(t) { var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
    function derivar(senha, sal) {
        return crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']).then(function (base) {
            return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode(sal), iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        });
    }
    function cifrar(chave, obj) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, chave, enc.encode(JSON.stringify(obj))).then(function (ct) { return { v: 1, iv: b64(iv), ct: b64(ct) }; });
    }
    function decifrar(chave, pacote) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(pacote.iv) }, chave, unb64(pacote.ct)).then(function (buf) { return JSON.parse(dec.decode(buf)); });
    }
    /* a chave derivada, não exportável, fica neste navegador para as senhas abrirem após recarregar a página */
    var DBN = 'suporteLuaCofre';
    function idb(modo, fn) {
        return new Promise(function (ok, no) {
            try {
                var rq = indexedDB.open(DBN, 1);
                rq.onupgradeneeded = function () { rq.result.createObjectStore('k'); };
                rq.onerror = function () { no(rq.error); };
                rq.onsuccess = function () {
                    var tx = rq.result.transaction('k', modo), r = fn(tx.objectStore('k'));
                    tx.oncomplete = function () { rq.result.close(); ok(r && r.result); };
                    tx.onerror = function () { no(tx.error); };
                };
            } catch (e) { no(e); }
        });
    }
    function lerChave(uid) { return window.indexedDB ? idb('readonly', function (s) { return s.get(uid); }) : Promise.resolve(null); }
    function guardarChave(uid, k) { return window.indexedDB ? idb('readwrite', function (s) { return s.put(k, uid); }) : Promise.resolve(); }
    function apagarChaves() { return window.indexedDB ? idb('readwrite', function (s) { return s.clear(); }) : Promise.resolve(); }

    /* ---------- mensagens de erro do Supabase ---------- */
    function msgErro(e) {
        var m = String((e && e.message) || '').toLowerCase(), c = e && e.code;
        if (m.indexOf('invalid login') >= 0) return 'BP ou senha incorretos.';
        if (c === 'user_already_exists' || m.indexOf('already registered') >= 0) return 'Este BP já tem conta. Use a aba "Entrar".';
        if (m.indexOf('database error') >= 0) return 'Não foi possível criar a conta com este BP. Confira o número; se estiver certo, peça liberação a um administrador.';
        if (m.indexOf('email not confirmed') >= 0) return 'A confirmação por e-mail está ativada no Supabase. Desative "Confirm email" (veja o LEIA-ME).';
        if (c === 'email_address_invalid' || (m.indexOf('email') >= 0 && m.indexOf('invalid') >= 0)) return 'O Supabase recusou o domínio de e-mail configurado (EMAIL_DOMAIN). Veja o LEIA-ME.';
        if (c === 'over_request_rate_limit' || m.indexOf('rate limit') >= 0) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
        if (c === 'weak_password' || (m.indexOf('password') >= 0 && (m.indexOf('least') >= 0 || m.indexOf('weak') >= 0))) return 'A senha é fraca ou curta demais para a regra do Supabase.';
        if (m.indexOf('failed to fetch') >= 0 || m.indexOf('network') >= 0 || m.indexOf('fetch') >= 0) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
        return 'Não foi possível concluir agora. Tente de novo em instantes.';
    }

    /* ---------- topo da página hero e avisos ---------- */
    function render() {
        var box = $('heroUser'); if (!box) return;
        box.textContent = '';
        if (st.logado) {
            var p = el('p', 'hero-greet'); p.appendChild(document.createTextNode(ehAdmin() ? 'Oi, ' : 'Oi, agente '));
            p.appendChild(el('strong', null, perfil.nome || ('BP ' + perfil.bp))); p.appendChild(document.createTextNode('!'));
            if (ehAdmin()) p.appendChild(el('span', 'role-chip role-chip--' + (ehDev() ? 'dev' : 'adm'), ehDev() ? 'Desenvolvedor' : 'Administrador'));
            box.appendChild(p);
            box.appendChild(btn('hero-link', 'Editar meus dados', null, 'data-login-open'));
            box.appendChild(btn('hero-link', 'Sair', null, 'data-sair'));
        } else {
            box.appendChild(btn('btn btn--primary btn--sm', 'Entrar ou criar conta', 'log-in', 'data-login-open'));
        }
        var campo = $('inputAgent');
        if (campo && perfil.nome && typeof updateScripts === 'function') {
            if (!campo.value.trim() || campo.dataset.fromLogin === '1') { campo.value = perfil.nome; campo.dataset.fromLogin = '1'; updateScripts(); }
        }
    }
    window.suporteLuaRender = render;

    /* aviso no topo */
    function avisoSenha() {
        var b = $('senhaBanner'); if (!b) return;
        var d = perfil.acessosEm ? new Date(perfil.acessosEm) : null;
        var dias = d && !isNaN(d) ? Math.floor((Date.now() - d.getTime()) / 86400000) : 0;
        var temSeg = SEGREDOS.some(function (k) { return !!perfil[k]; });
        var manut = $('maintBanner');
        var mostrar = st.logado && temSeg && dias > LIMITE_DIAS && !(manut && !manut.hidden);
        if (mostrar) $('senhaBannerTxt').textContent = 'Seus acessos foram atualizados pela última vez em ' + fmtData(d) + ' (há ' + dias + ' dias).';
        b.hidden = !mostrar;
    }
    window.atualizarAvisoSenha = avisoSenha;

    /* ---------- aba Gerência / Transparência ---------- */
    function rotular(adm) {
        var PC = window.PortalCore, T = PC ? PC.T : function () { return null; }, aba = null;
        if (PC) PC.estado.abas.forEach(function (a) { if (a.chave === 'gerencia') aba = a; });
        var nome = adm ? ((aba && aba.rotulo) || 'Gerência') : (T('transparencia.rotulo') || 'Transparência');
        var ic = adm ? ((aba && aba.icone) || 'shield-check') : (T('transparencia.icone') || 'eye');
        document.querySelectorAll('.dock-tile[data-tab="gerencia"]:not(.boot-sk *) .dock-label, .mini-tab[data-tab="gerencia"]:not(.boot-sk *) .mini-label').forEach(function (n) { n.textContent = nome; });
        document.querySelectorAll('.mini-tab[data-tab="gerencia"]').forEach(function (b) { b.setAttribute('aria-label', nome); b.title = nome; });
        document.querySelectorAll('[data-tab="gerencia"] use').forEach(function (u) { u.setAttribute('href', '#i-' + ic); });
        var pan = $('gerencia'); if (pan) pan.dataset.noun = nome.toLowerCase();
        $('gerEyebrow').textContent = nome;
        $('gerTitulo').textContent = adm ? (T('gerencia.titulo') || 'Painel de Gerência') : (T('transparencia.titulo') || 'Portal de Transparência');
    }
    function botaoLink(item, primario) {
        var url = urlSegura(item.url), a = el(url ? 'a' : 'span', 'btn ' + (primario ? 'btn--primary' : 'btn--outline') + ' btn--sm');
        if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        a.appendChild(icon(iconeValido(item.icone))); a.appendChild(el('span', null, primario ? 'Abrir' : item.titulo)); return a;
    }
    /* ---------- personalização do painel ---------- */
    var itensGer = [], itensCache = null, itensTs = 0, TTL_ITENS = 300000;
    var ICONES = [
        [/relat|dashboard|painel|indicador|kpi|resultado|m[eé]trica/i, 'chart-column'], [/planilha|sheet|excel|tabela/i, 'table'],
        [/apresenta|slide|ppt/i, 'presentation'], [/tipifica|checklist|tarefa|lista/i, 'list-checks'], [/document|\bdoc\b|word|pdf|manual|procedimento|verifica/i, 'file-text'],
        [/calend|agenda|escala|hor[aá]rio/i, 'calendar-clock'], [/e-?mail|outlook/i, 'mail'], [/chat|mensag|whats|slack|teams/i, 'message-square'],
        [/forms|formul|pesquisa/i, 'clipboard-list'], [/treinamento|curso|academia|capacita/i, 'graduation-cap'], [/equipe|time\b|\brh\b|colaborador|agente|pessoas/i, 'users-round'],
        [/qualidade|monitoria|avalia|auditoria/i, 'shield-check'], [/mapa|unidade|local/i, 'map-pin'], [/ajuda|suporte|help|chamado/i, 'life-buoy'],
        [/financ|custo|pagamento|valor/i, 'banknote'], [/seguran|senha|acesso|login/i, 'key-round'], [/not[ií]cia|comunic|aviso|mural/i, 'megaphone'],
        [/pasta|drive|arquivo/i, 'folder'], [/rota|voo|opera/i, 'route']
    ];
    function escolherIcone(texto, url) {
        var u = String(url || '').toLowerCase();
        if (/docs\.google\.com\/spreadsheets|\.xlsx?(\?|$)/.test(u)) return 'table';
        if (/docs\.google\.com\/presentation|\.pptx?(\?|$)/.test(u)) return 'presentation';
        if (/docs\.google\.com\/document|\.docx?(\?|$)|\.pdf(\?|$)/.test(u)) return 'file-text';
        if (/docs\.google\.com\/forms|forms\.gle|forms\.office/.test(u)) return 'clipboard-list';
        for (var i = 0; i < ICONES.length; i++) if (ICONES[i][0].test(texto || '') && document.getElementById('i-' + ICONES[i][1])) return ICONES[i][1];
        return 'link';
    }
    function sistemasDoPortal() {
        return Array.prototype.map.call(document.querySelectorAll('#sistemas .card--system'), function (c) {
            var h = c.querySelector('h3'), a = c.querySelector('.card-actions a'), u = c.querySelector('.card-icon use');
            return { titulo: h ? h.textContent.trim() : '', url: a ? urlSegura(a.getAttribute('href') || '') : '', icone: u ? (u.getAttribute('href') || '').replace('#i-', '') : '' };
        }).filter(function (x) { return x.titulo; });
    }
    function proxOrdem() { return itensGer.reduce(function (m, i) { return Math.max(m, Number(i.ordem) || 0); }, 0) + 1; }
    function ocupado(sim) { document.querySelectorAll('#gerConteudo .btn, #gerConteudo .ger-sub, #gerConteudo .ger-ico-btn, #gerModal .btn, #gerModal input, #gerModal .ger-ico-btn').forEach(function (n) { n.disabled = !!sim; }); }
    async function gravar(linhas, remover) {
        if (!sb || !ehAdmin()) return false;
        ocupado(true);
        try {
            if (linhas.length) { var r = await sb.from('gerencia_itens').insert(linhas); if (r.error) throw r.error; }
            for (var i = 0; i < remover.length; i++) {
                var d = await sb.from('gerencia_itens').delete().eq('tipo', remover[i].tipo).eq('titulo', remover[i].titulo).eq('url', remover[i].url).select();
                if (d.error) throw d.error;
                if (!d.data || !d.data.length) throw new Error('nenhum item removido (confira as permissões da tabela)');
            }
        } catch (e) { ocupado(false); statusGer('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro desconhecido') + '.', true, false); return false; }
        await carregarItens(true); return true;
    }
    function campo(id, rot, ph, max, valor) {
        var d = el('div', 'lf'), l = el('label', null, rot), i = el('input', 'login-input');
        l.htmlFor = id; i.id = id; i.type = 'text'; i.maxLength = max; i.placeholder = ph || ''; i.autocomplete = 'off'; if (valor) i.value = valor;
        d.appendChild(l); d.appendChild(i); return d;
    }
    function botao(txt, ic, cls) { var b = el('button', 'btn ' + (cls || 'btn--primary') + ' btn--sm'); b.type = 'button'; b.appendChild(icon(ic)); b.appendChild(el('span', null, txt)); return b; }
    function botaoIcone(ic, rotulo, cls) { var b = el('button', 'ger-ico-btn' + (cls ? ' ' + cls : '')); b.type = 'button'; b.setAttribute('aria-label', rotulo); b.title = rotulo; b.appendChild(icon(ic)); return b; }
    function botaoSutil(txt, ic) { var b = el('button', 'ger-sub'); b.type = 'button'; b.appendChild(icon(ic)); b.appendChild(el('span', null, txt)); return b; }

    /* ---------- painel flutuante ---------- */
    var focoAntes = null;
    function escModal(e) { if (e.key === 'Escape') { e.stopPropagation(); fecharModal(); } }
    function fecharModal() {
        var m = $('gerModal'); if (!m) return;
        document.removeEventListener('keydown', escModal, true); m.remove();
        if (focoAntes && focoAntes.focus) { try { focoAntes.focus(); } catch (e) { /* ignora */ } }
    }
    function abrirModal(titulo, ic, corpo) {
        fecharModal(); focoAntes = document.activeElement;
        var ov = el('div', 'ger-modal'), box = el('div', 'ger-modal-box'), hd = el('div', 'ger-modal-head'), x = el('button', 'ger-ico-btn');
        ov.id = 'gerModal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', titulo);
        x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.title = 'Fechar'; x.appendChild(icon('x'));
        hd.appendChild(icon(ic)); hd.appendChild(el('h3', null, titulo)); hd.appendChild(x);
        box.appendChild(hd); box.appendChild(corpo); ov.appendChild(box); document.body.appendChild(ov);
        x.addEventListener('click', fecharModal);
        ov.addEventListener('mousedown', function (e) { if (e.target === ov) fecharModal(); });
        document.addEventListener('keydown', escModal, true);
        var f = box.querySelector('input'); (f || x).focus();
    }
    async function editar(velho, novo) {
        if (!sb || !ehAdmin()) return false;
        ocupado(true);
        try {
            var d = await sb.from('gerencia_itens').delete().eq('tipo', velho.tipo).eq('titulo', velho.titulo).eq('url', velho.url).select();
            if (d.error) throw d.error;
            if (!d.data || !d.data.length) throw new Error('nenhum item alterado (confira as permissões da tabela)');
            var r = await sb.from('gerencia_itens').insert([novo]);
            if (r.error) {
                await sb.from('gerencia_itens').insert([{ tipo: velho.tipo, titulo: velho.titulo, descricao: velho.descricao || null, url: velho.url, icone: velho.icone, ordem: velho.ordem, ativo: true }]);
                throw r.error;
            }
        } catch (e) { ocupado(false); statusGer('Não foi possível salvar: ' + (e && e.message ? e.message : 'erro desconhecido') + '.', true, false); return false; }
        await carregarItens(true); return true;
    }
    /* adicionar (item = null) ou editar um link de gestão, no painel flutuante */
    function abrirFormLink(item) {
        var corpo = el('div', 'ger-add-body'), msg = el('p', 'ger-msg'); msg.hidden = true;
        corpo.appendChild(campo('gerNome', 'Nome', 'Ex.: Painel de indicadores', 60, item && item.titulo));
        corpo.appendChild(campo('gerDesc', 'Descrição (opcional)', 'Para que serve este link', 140, item && item.descricao));
        corpo.appendChild(campo('gerUrl', 'Link', 'https://…', 500, item && item.url));
        var b = botao(item ? 'Salvar alterações' : 'Adicionar ao meu painel', item ? 'check' : 'plus'); corpo.appendChild(msg); corpo.appendChild(b);
        b.addEventListener('click', async function () {
            var t = $('gerNome').value.trim(), ds = $('gerDesc').value.trim(), u = $('gerUrl').value.trim();
            if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
            var url = urlSegura(u); msg.hidden = false;
            if (!t || !url) { msg.textContent = 'Preencha o nome e um link válido.'; return; }
            if (itensGer.some(function (i) { return i.tipo === 'link' && i.url === url && !(item && i.url === item.url && i.titulo === item.titulo); })) { msg.textContent = 'Esse link já está no seu painel.'; return; }
            msg.hidden = true;
            var linha = { tipo: 'link', titulo: t, descricao: ds || null, url: url, icone: escolherIcone(t + ' ' + ds, url), ordem: item ? item.ordem : proxOrdem(), ativo: true };
            var ok = item ? await editar(item, linha) : await gravar([linha], []);
            if (ok) fecharModal(); else { msg.textContent = 'Não foi possível salvar agora. Tente de novo.'; msg.hidden = false; }
        });
        abrirModal(item ? 'Editar link' : 'Adicionar link de gestão', item ? 'pencil' : 'plus', corpo);
    }
    function abrirFormAtalhos(atalhos) {
        var corpo = el('div', 'ger-add-body'), grade = el('div', 'ger-pick'), caixas = [], msg = el('p', 'ger-msg'); msg.hidden = true;
        corpo.appendChild(el('p', 'ger-hint', 'Marque os sistemas que você quer como atalho no seu painel. O ícone é escolhido automaticamente.'));
        sistemasDoPortal().forEach(function (sis) {
            var lb = el('label'), cb = el('input'); cb.type = 'checkbox';
            cb.checked = atalhos.some(function (a) { return a.titulo === sis.titulo; }); cb.disabled = !sis.url && !cb.checked;
            if (cb.disabled) { lb.className = 'is-off'; lb.title = 'Este sistema ainda não tem link cadastrado'; }
            lb.appendChild(cb); lb.appendChild(icon(iconeValido(sis.icone))); lb.appendChild(el('span', null, sis.titulo)); grade.appendChild(lb); caixas.push([sis, cb]);
        });
        var b = botao('Salvar atalhos', 'check'); corpo.appendChild(grade); corpo.appendChild(msg); corpo.appendChild(b);
        b.addEventListener('click', async function () {
            var add = [], rem = [], ord = proxOrdem();
            caixas.forEach(function (c) {
                var ex = atalhos.filter(function (a) { return a.titulo === c[0].titulo; })[0];
                if (c[1].checked && !ex && c[0].url) add.push({ tipo: 'atalho', titulo: c[0].titulo, descricao: null, url: c[0].url, icone: iconeValido(c[0].icone) !== 'link' ? c[0].icone : escolherIcone(c[0].titulo, c[0].url), ordem: ord++, ativo: true });
                if (!c[1].checked && ex) rem.push(ex);
            });
            if (!add.length && !rem.length) { fecharModal(); return; }
            var ok = await gravar(add, rem);
            if (ok) fecharModal(); else { msg.textContent = 'Não foi possível salvar agora. Tente de novo.'; msg.hidden = false; }
        });
        abrirModal('Atalhos de sistemas', 'workflow', corpo);
    }
    function cabecaSecao(ic, titulo, acao) {
        var h = el('div', 'ger-sec-head'), t = el('h3'); t.appendChild(icon(ic)); t.appendChild(el('span', null, titulo)); h.appendChild(t); h.appendChild(acao); return h;
    }
    function mostrarItens(itens) {
        itensGer = itens || [];
        var alvo = $('gerConteudo'); alvo.textContent = '';
        var links = itensGer.filter(function (i) { return i.tipo === 'link'; }), atalhos = itensGer.filter(function (i) { return i.tipo === 'atalho'; });
        var s1 = el('section', 'ger-sec'), bAdd = botaoSutil('Adicionar link', 'plus');
        bAdd.addEventListener('click', function () { abrirFormLink(null); });
        s1.appendChild(cabecaSecao('link', 'Links de gestão', bAdd));
        if (!links.length) s1.appendChild(el('p', 'ger-hint', 'Você ainda não adicionou links. Use "Adicionar link" para incluir o primeiro.'));
        else {
            var g = el('div', 'grid');
            links.forEach(function (l) {
                var c = el('article', 'card'), h = el('div', 'card-head'), ci = el('span', 'card-icon'); ci.appendChild(icon(iconeValido(l.icone))); h.appendChild(ci); h.appendChild(el('h3', null, l.titulo)); c.appendChild(h);
                if (l.descricao) c.appendChild(el('p', 'card-text', l.descricao));
                var ac = el('div', 'card-actions'), ed = botaoIcone('pencil', 'Editar "' + l.titulo + '"'), rm = botaoIcone('trash-2', 'Remover "' + l.titulo + '"', 'ger-ico-btn--del');
                ac.appendChild(botaoLink(l, true)); ac.appendChild(ed); ac.appendChild(rm); c.appendChild(ac); g.appendChild(c);
                ed.addEventListener('click', function () { abrirFormLink(l); });
                rm.addEventListener('click', function () { if (window.confirm('Remover "' + l.titulo + '" do seu painel?')) gravar([], [l]); });
            });
            s1.appendChild(g);
        }
        alvo.appendChild(s1);
        var s2 = el('section', 'ger-sec'), bAt = botaoSutil('Editar atalhos', 'pencil');
        bAt.addEventListener('click', function () { abrirFormAtalhos(atalhos); });
        s2.appendChild(cabecaSecao('workflow', 'Atalhos de sistemas', bAt));
        if (!atalhos.length) s2.appendChild(el('p', 'ger-hint', 'Você ainda não escolheu atalhos de sistemas.'));
        else { var ch = el('div', 'ger-chips'); atalhos.forEach(function (x) { ch.appendChild(botaoLink(x, false)); }); s2.appendChild(ch); }
        alvo.appendChild(s2);
        alvo.hidden = false;
    }
    function statusGer(txt, erro, comRetry) {
        var s = $('gerStatus'); s.textContent = txt || ''; s.hidden = !txt; s.className = 'ger-status' + (erro ? ' ger-status--erro' : '');
        if (txt && comRetry) { var b = el('button', 'btn btn--outline btn--sm'); b.type = 'button'; b.setAttribute('data-ger-retry', ''); b.appendChild(el('span', null, 'Tentar de novo')); s.appendChild(b); }
    }
    /* repete só falhas passageiras (rede, 429, 5xx) com espera crescente e aleatória: evita que muitos acessos simultâneos reatinjam o servidor ao mesmo tempo */
    async function comRetry(fn, vezes) {
        var r;
        for (var i = 0; i <= vezes; i++) {
            try { r = await fn(); } catch (e) { r = { error: e }; }
            if (!r || !r.error) return r;
            var sc = r.status, passageiro = sc === 0 || sc === 429 || sc >= 500 || (sc == null);
            if (!passageiro || i === vezes) return r;
            await new Promise(function (ok) { setTimeout(ok, 400 * Math.pow(2, i) + Math.random() * 400); });
        }
        return r;
    }
    /* carrega os itens do painel; usa a cópia em memória enquanto estiver fresca (5 min) e só consulta o banco de novo ao gravar, ao tentar de novo ou quando ficar velha */
    async function carregarItens(forcar) {
        try { return await carregarItensBase(forcar); } finally { document.dispatchEvent(new CustomEvent('portal:gerenciaPronta')); }
    }
    async function carregarItensBase(forcar) {
        if (!sb || !ehAdmin()) return;
        var meu = ++reqGer, tinha = !!itensCache && !forcar, painel = $('gerConteudo');
        if (tinha) {
            if (painel.hidden || !painel.firstChild) { statusGer('', false, false); mostrarItens(itensCache); }
            if (Date.now() - itensTs < TTL_ITENS) return;
        } else { statusGer('', false, false); painel.textContent = ''; painel.hidden = false; if (window.PortalSkeleton) painel.appendChild(window.PortalSkeleton.painel('cartoes')); else { painel.hidden = true; statusGer('Carregando o seu portal…', false, false); } }
        var r = await comRetry(function () { return sb.from('gerencia_itens').select('tipo,titulo,descricao,url,icone,ordem').eq('ativo', true).order('ordem', { ascending: true }).order('titulo', { ascending: true }); }, 2);
        if (meu !== reqGer || !ehAdmin()) return; /* saiu ou outra carga começou */
        if (r.error) { if (!tinha) { painel.textContent = ''; painel.hidden = true; statusGer('Não foi possível carregar o seu portal agora.', true, true); } return; }
        var novo = r.data || [], igual = tinha && JSON.stringify(novo) === JSON.stringify(itensCache);
        itensCache = novo; itensTs = Date.now();
        if (!igual) { statusGer('', false, false); mostrarItens(novo); }
    }
    function renderGerencia() {
        var adm = ehAdmin();
        $('gerTransparencia').hidden = adm; $('gerAdmin').hidden = !adm;
        if (!adm) { reqGer++; itensCache = null; fecharModal(); $('gerConteudo').textContent = ''; $('gerConteudo').hidden = true; $('gerOi').hidden = true; statusGer('', false, false); return; }
        $('gerOi').textContent = 'Olá, ' + (perfil.nome || 'administrador') + '!'; $('gerOi').hidden = false;
        carregarItens();
    }

    /* aplica o estado atual (visitante, agente ou administrador) em toda a página */
    function aplicar(opts) {
        opts = opts || {};
        var adm = ehAdmin();
        window.suporteLuaAdmin = adm ? { nome: perfil.nome || ('BP ' + perfil.bp) } : null; /* administrador OU desenvolvedor */
        window.suporteLuaDev = ehDev() ? { nome: perfil.nome || ('BP ' + perfil.bp) } : null;
        window.suporteLuaPapel = st.logado ? perfil.role : '';
        window.suporteLuaNivel = !st.logado ? 0 : (ehDev() ? 3 : (adm ? 2 : 1));
        window.suporteLuaPerfil = st.logado ? { bp: perfil.bp, nome: perfil.nome, role: perfil.role, epr: perfil.epr || '' } : null;
        try { if (adm) localStorage.setItem(GER_FLAG, '1'); else localStorage.removeItem(GER_FLAG); } catch (e) { /* ignora */ }
        if (typeof gerenciaPrimeiro === 'function') gerenciaPrimeiro(adm);
        rotular(adm); render(); avisoSenha(); renderGerencia();
        if (window.suporteLuaShareRefresh) window.suporteLuaShareRefresh();
        if (window.suporteLuaNotasModo) window.suporteLuaNotasModo();
        document.dispatchEvent(new CustomEvent('suporteLua:auth')); /* avisa o 11-conteudo.js: entrou, saiu ou virou administrador */
        if (adm && typeof openTab === 'function' && (opts.abrirGerencia || (opts.inicial && !window.location.hash && currentTab !== 'gerencia'))) {
            openTab('gerencia', { initial: !!opts.inicial, keepScroll: true });
        }
    }

    /* ---------- perfil ---------- */
    async function carregarPerfil(user, senha) {
        var r = await comRetry(function () { return sb.from('perfis').select('bp,nome,role,epr,rk,email_corp,integrall_usuario,segredos,salt_cofre,acessos_atualizados_em').eq('id', user.id).maybeSingle(); }, 2);
        if (r.error && (r.error.code === '42703' || r.error.code === 'PGRST204')) { /* banco ainda sem as colunas novas (rode o 1-agentes.sql): entra sem elas */
            console.warn('[portal] Faltam as colunas email_corp/integrall_usuario em perfis. Rode o 1-agentes.sql no Supabase.');
            colunasNovas = false;
            r = await comRetry(function () { return sb.from('perfis').select('bp,nome,role,epr,rk,segredos,salt_cofre,acessos_atualizados_em').eq('id', user.id).maybeSingle(); }, 2);
        } else if (!r.error) colunasNovas = true;
        if (r.error || !r.data) { if (r.error) console.error('[portal] perfil:', r.error); throw new Error('perfil'); }
        var d = r.data, p = vazio();
        p.bp = d.bp; p.nome = d.nome || ''; p.role = d.role || 'agente'; p.epr = d.epr || ''; p.rk = d.rk || ''; p.email = d.email_corp || ''; p.integrallUser = d.integrall_usuario || ''; p.salt = d.salt_cofre; p.acessosEm = d.acessos_atualizados_em || '';
        var chave = null;
        try {
            if (senha) { chave = await derivar(senha, d.salt_cofre); chaveMem = chave; guardarChave(user.id, chave).then(null, noop); }
            else { chave = chaveMem || await lerChave(user.id) || null; }
        } catch (e) { chave = null; }
        var bloqueado = false;
        if (d.segredos) {
            if (!chave) bloqueado = true;
            else {
                try { var s = await decifrar(chave, d.segredos); SEGREDOS.forEach(function (k) { if (typeof s[k] === 'string') p[k] = s[k]; }); Object.keys(s).forEach(function (k) { if (k.indexOf('x_') === 0 && typeof s[k] === 'string') p.xs[k.slice(2)] = s[k]; }); }
                catch (e) { bloqueado = true; }
            }
        }
        perfil = p; st = { logado: true, uid: user.id, bloqueado: bloqueado, chave: chave, segRaw: d.segredos || null };
        await carregarCampos();
    }
    function limparLocal() {
        var campo = $('inputAgent');
        if (campo && campo.dataset.fromLogin === '1') { campo.value = ''; campo.dataset.fromLogin = ''; if (typeof updateScripts === 'function') updateScripts(); }
        st = novoEstado(); perfil = vazio(); campos = []; extrasOk = false; chaveMem = null; itensCache = null;
        apagarChaves().then(null, noop);
        ['authOverlay', 'loginOverlay', 'senhaOverlay', 'acessosOverlay'].forEach(function (i) { if ($(i)) $(i).hidden = true; });
        aplicar();
    }
    async function sair() {
        saindo = true;
        try { if (sb) await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* ignora */ }
        limparLocal(); saindo = false;
        if (CFG.EXIGIR_LOGIN && CONFIGURADO) { abrirAuth(null, 'entrar'); travar(true); }
        toast('Você saiu da sua conta.');
    }
    function sessaoEncerrada() {
        if (saindo || !st.logado) return;
        limparLocal(); toast('Sua sessão expirou. Entre novamente.');
        if (CFG.EXIGIR_LOGIN && CONFIGURADO) { abrirAuth(null, 'entrar'); travar(true); }
    }

    /* ---------- tela de entrada (login / criar conta) ---------- */
    function travar(on) {
        travado = on;
        var ov = $('authOverlay');
        Array.prototype.forEach.call(document.body.children, function (n) {
            if (n === ov || n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.id === 'toast') return;
            if (on) { if (!n.hasAttribute('inert')) { n.setAttribute('inert', ''); n.setAttribute('data-travado', ''); } }
            else if (n.hasAttribute('data-travado')) { n.removeAttribute('inert'); n.removeAttribute('data-travado'); }
        });
        $('authCancel').hidden = on;
    }
    function authView(v) {
        var esq = v === 'esqueci', criar = v === 'criar';
        $('authForm').dataset.view = esq ? 'esqueci' : (criar ? 'criar' : 'entrar');
        document.querySelectorAll('.bk-tabs [data-auth-view]').forEach(function (b) { b.setAttribute('aria-pressed', !esq && b.dataset.authView === (criar ? 'criar' : 'entrar') ? 'true' : 'false'); });
        $('authRepetir').hidden = !criar;
        $('authSenhaWrap').hidden = esq; $('authShowWrap').hidden = esq;
        $('authEprWrap').hidden = !esq; $('authBack').hidden = !esq; $('authForgot').hidden = esq || criar;
        if (esq) {
            $('authTitle').lastChild.textContent = 'Esqueci a senha';
            $('authIntro').textContent = 'Não temos como validar a sua identidade para redefinir a senha. Digite o seu BP e o EPR salvo no seu perfil: se baterem, a sua conta e os dados salvos serão apagados e você poderá criar a conta de novo, com uma senha nova.';
            $('authSubmit').querySelector('span').textContent = 'Apagar meus dados';
            setMsg('authMsg', '');
            if (!CONFIGURADO) setMsg('authMsg', 'O login ainda não foi configurado neste portal (faltam a URL e a chave do Supabase no index.html).', false);
            return;
        }
        $('authSenha').type = 'password'; $('authShow').checked = false;
        $('authSenha').autocomplete = criar ? 'new-password' : 'current-password';
        $('authTitle').lastChild.textContent = criar ? 'Criar minha conta' : 'Entrar no portal';
        $('authIntro').textContent = criar ? 'Informe seu BP (só números) e crie uma senha. Sua conta nasce como agente e o perfil fica salvo para você usar em qualquer computador.' : 'Use o seu BP e a sua senha. É um único login para todo o portal.';
        $('authSubmit').querySelector('span').textContent = criar ? 'Criar conta' : 'Entrar';
        setMsg('authMsg', '');
        if (!CONFIGURADO) setMsg('authMsg', 'O login ainda não foi configurado neste portal (faltam a URL e a chave do Supabase no index.html).', false);
        else if (!window.supabase) setMsg('authMsg', 'Não foi possível carregar o serviço de login. Verifique a internet e recarregue a página.', false);
    }
    function authMostrar(on) { ['authSenha', 'authSenha2'].forEach(function (i) { $(i).type = on ? 'text' : 'password'; }); }
    function abrirAuth(from, view) {
        authOpener = from || null;
        ['acessosOverlay', 'loginOverlay', 'senhaOverlay'].forEach(function (i) { $(i).hidden = true; });
        ['authBp', 'authSenha', 'authSenha2', 'authEpr'].forEach(function (i) { $(i).value = ''; });
        $('authShow').checked = false; authMostrar(false);
        authView(view || 'entrar');
        $('authOverlay').hidden = false; $('authBp').focus();
    }
    function fecharAuth() { if (travado) return; $('authOverlay').hidden = true; if (authOpener && document.contains(authOpener)) authOpener.focus(); }
    function ocupado(on, rotulo) {
        var b = $('authSubmit'); b.disabled = on;
        var vw = $('authForm').dataset.view; b.querySelector('span').textContent = on ? rotulo : (vw === 'criar' ? 'Criar conta' : (vw === 'esqueci' ? 'Apagar meus dados' : 'Entrar'));
    }
    async function esqueciSenha(bp) {
        var epr = $('authEpr').value.trim();
        if (!epr) { setMsg('authMsg', 'Digite o seu EPR.', false); $('authEpr').focus(); return; }
        if (!window.confirm('Isso APAGA a conta do BP ' + bp + ' e todos os dados salvos nela (nome, acessos e senhas). Não dá para desfazer. Continuar?')) return;
        ocupado(true, 'Verificando…'); setMsg('authMsg', '');
        try {
            var r = await sb.rpc('esqueci_senha', { p_bp: bp, p_epr: epr });
            if (r.error) {
                var m = String(r.error.message || '').toLowerCase();
                setMsg('authMsg', m.indexOf('muitas') >= 0 ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' : msgErro(r.error), false); return;
            }
            if (r.data !== true) { setMsg('authMsg', 'BP ou EPR não conferem. Se não lembra do EPR salvo, peça ajuda a um administrador.', false); return; }
            $('authEpr').value = '';
            authView('criar'); $('authBp').value = bp;
            setMsg('authMsg', 'Dados apagados. Agora crie a conta de novo com uma senha nova.', true);
            $('authSenha').focus();
        } catch (e) {
            setMsg('authMsg', msgErro(e), false);
        } finally { ocupado(false); }
    }
    async function enviarAuth(ev) {
        ev.preventDefault();
        if (!sb) { authView($('authForm').dataset.view); return; }
        var criar = $('authForm').dataset.view === 'criar';
        var bp = $('authBp').value.replace(/\D/g, ''), senha = $('authSenha').value;
        if (!/^[0-9]{3,15}$/.test(bp)) { setMsg('authMsg', 'Digite o seu BP usando só números (de 3 a 15 dígitos).', false); $('authBp').focus(); return; }
        if ($('authForm').dataset.view === 'esqueci') { return esqueciSenha(bp); }
        if (!senha) { setMsg('authMsg', 'Digite a sua senha.', false); $('authSenha').focus(); return; }
        if (criar) {
            if (senha.length < 8) { setMsg('authMsg', 'Crie uma senha com pelo menos 8 caracteres.', false); $('authSenha').focus(); return; }
            if (senha !== $('authSenha2').value) { setMsg('authMsg', 'As duas senhas não são iguais.', false); $('authSenha2').focus(); return; }
        }
        if (!cripto()) { setMsg('authMsg', 'Este navegador não oferece criptografia nesta página. Abra o portal por https no Chrome ou Edge atualizado.', false); return; }
        ocupado(true, criar ? 'Criando conta…' : 'Entrando…'); setMsg('authMsg', '');
        try {
            var r = criar ? await sb.auth.signUp({ email: emailDe(bp), password: senha }) : await sb.auth.signInWithPassword({ email: emailDe(bp), password: senha });
            if (r.error) { setMsg('authMsg', msgErro(r.error), false); return; }
            if (!r.data || !r.data.session) { setMsg('authMsg', 'A confirmação por e-mail está ativada no Supabase. Desative "Confirm email" (veja o LEIA-ME).', false); return; }
            try { await carregarPerfil(r.data.user, senha); }
            catch (e) {
                try { await sb.auth.signOut({ scope: 'local' }); } catch (e2) { /* ignora */ }
                setMsg('authMsg', 'Não foi possível carregar o seu perfil. Tente de novo em instantes.', false); return;
            }
            travar(false); $('authOverlay').hidden = true; authOpener = null;
            aplicar({ abrirGerencia: true });
            if (criar && !perfil.nome) { abrirPerfil(null, true); }
            else toast((ehAdmin() ? 'Bem-vindo, ' : 'Bem-vindo, agente ') + (perfil.nome || ('BP ' + perfil.bp)) + '!');
        } catch (e) {
            setMsg('authMsg', msgErro(e), false);
        } finally { ocupado(false); }
    }

    /* ---------- "Meus dados" (perfil) ---------- */
    function mostrarSenhas(on) { CAMPOS.forEach(function (c) { if (c.secret) $(c.input).type = on ? 'text' : 'password'; }); document.querySelectorAll('#loginExtras input[data-xsenha]').forEach(function (i) { i.type = on ? 'text' : 'password'; }); }
    function desenharExtras() {
        var box = $('loginExtras'); if (!box) return; box.textContent = '';
        campos.filter(function (c) { return c.tipo !== 'padrao'; }).forEach(function (c) {
            var d = el('div', 'lf'), l = el('label', null, c.rotulo), i = el('input', 'login-input'), id = 'loginX_' + c.chave;
            l.htmlFor = id; i.id = id; i.maxLength = 120; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('autocapitalize', 'off'); i.setAttribute('data-x', c.chave);
            if (c.tipo === 'senha') { i.type = 'password'; i.setAttribute('data-xsenha', '1'); i.value = (perfil.xs && perfil.xs[c.chave]) || ''; } else { i.type = 'text'; i.value = (perfil.extras && perfil.extras[c.chave]) || ''; }
            d.appendChild(l); d.appendChild(i); box.appendChild(d);
        });
    }
    function abrirPerfil(from, boasVindas) {
        opener = from || null;
        ['acessosOverlay', 'authOverlay', 'senhaOverlay'].forEach(function (i) { $(i).hidden = true; });
        $('loginName').value = perfil.nome;
        CAMPOS.forEach(function (c) { $(c.input).value = perfil[c.k]; });
        desenharExtras();
        $('loginShow').checked = false; mostrarSenhas(false);
        $('loginError').hidden = true; setMsg('loginMsg', '');
        if (boasVindas) setMsg('loginMsg', 'Conta criada! Diga o seu nome para completar o perfil. Os acessos abaixo são opcionais.', true);
        if (st.bloqueado) setMsg('loginMsg', 'Suas senhas salvas não puderam ser abertas neste navegador. Saia e entre de novo; se continuar assim, digite-as novamente e salve.', false);
        $('loginOverlay').hidden = false; $('loginName').focus(); $('loginName').select();
    }
    function fecharPerfil() { $('loginOverlay').hidden = true; if (opener && document.contains(opener)) opener.focus(); }
    function abrirConta(from) { if (st.logado) abrirPerfil(from); else abrirAuth(from, 'entrar'); }
    async function salvarPerfil(ev) {
        ev.preventDefault();
        if (!sb || !st.logado) return;
        var v = $('loginName').value.replace(/\s+/g, ' ').trim();
        if (!v) { $('loginError').hidden = false; $('loginName').focus(); return; }
        v = v.replace(/(^|\s)(\S)/g, function (m, s, c) { return s + c.toLocaleUpperCase('pt-BR'); });
        var novo = { nome: v, bp: perfil.bp };
        CAMPOS.forEach(function (c) { if (c.k !== 'bp') novo[c.k] = $(c.input).value.trim(); });
        var xsNovo = {}, exNovo = {}; document.querySelectorAll('#loginExtras input[data-x]').forEach(function (i) { var v2 = i.value.trim(); if (!v2) return; if (i.hasAttribute('data-xsenha')) xsNovo[i.getAttribute('data-x')] = v2; else exNovo[i.getAttribute('data-x')] = v2; });
        var temSeg = SEGREDOS.some(function (k) { return !!novo[k]; }) || Object.keys(xsNovo).length > 0;
        if (Object.keys(exNovo).length && !extrasOk) { setMsg('loginMsg', 'Os campos extras ainda não podem ser salvos: falta rodar o 16-campos-acessos.sql no Supabase.', false); return; }
        if (novo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo.email)) { setMsg('loginMsg', 'Digite um e-mail corporativo válido ou deixe o campo vazio.', false); $('loginEmail').focus(); return; }
        var upd = { nome: v, email_corp: novo.email || null, epr: novo.epr || null, rk: novo.rk || null, integrall_usuario: novo.integrallUser || null };
        var mudou = ['epr', 'rk', 'integrallUser'].concat(SEGREDOS).some(function (k) { return novo[k] !== perfil[k]; }) || JSON.stringify(exNovo) !== JSON.stringify(perfil.extras || {}) || JSON.stringify(xsNovo) !== JSON.stringify(perfil.xs || {});
        if (extrasOk) upd.extras = exNovo;
        if (mudou) upd.acessos_atualizados_em = new Date().toISOString();
        var b = $('loginSalvar'); b.disabled = true; setMsg('loginMsg', '');
        try {
            if (temSeg) {
                if (!st.chave) { setMsg('loginMsg', 'Para salvar senhas, saia e entre de novo (a chave de proteção não está disponível neste navegador).', false); return; }
                var pacote = { senha: novo.senha, eprSenha: novo.eprSenha, integrall: novo.integrall }; Object.keys(xsNovo).forEach(function (k) { pacote['x_' + k] = xsNovo[k]; }); upd.segredos = await cifrar(st.chave, pacote);
            } else if (!st.bloqueado) { upd.segredos = null; }
            if (!colunasNovas) {
                if (upd.email_corp || upd.integrall_usuario) { setMsg('loginMsg', 'O e-mail e o usuário do Integrall ainda não podem ser salvos: falta rodar o 1-agentes.sql no Supabase.', false); return; }
                delete upd.email_corp; delete upd.integrall_usuario;
            }
            var r = await sb.from('perfis').update(upd).eq('id', st.uid);
            if (r.error) { console.error('[portal] salvar:', r.error); setMsg('loginMsg', 'Não foi possível salvar agora. ' + msgErro(r.error), false); return; }
            if ('segredos' in upd) { st.segRaw = upd.segredos; st.bloqueado = false; }
            perfil.nome = v; perfil.epr = novo.epr; perfil.rk = novo.rk; perfil.email = novo.email; perfil.integrallUser = novo.integrallUser;
            SEGREDOS.forEach(function (k) { perfil[k] = novo[k]; }); perfil.xs = xsNovo; if (extrasOk) perfil.extras = exNovo;
            if (upd.acessos_atualizados_em) perfil.acessosEm = upd.acessos_atualizados_em;
            aplicar(); fecharPerfil(); opener = null;
            toast('Dados salvos, ' + (ehAdmin() ? '' : 'agente ') + perfil.nome + '!');
        } catch (e) {
            setMsg('loginMsg', msgErro(e), false);
        } finally { b.disabled = false; }
    }

    /* ---------- alterar a senha de login ---------- */
    function abrirSenha() {
        $('loginOverlay').hidden = true;
        ['senhaAtual', 'senhaNova', 'senhaNova2'].forEach(function (i) { $(i).value = ''; $(i).type = 'password'; });
        $('senhaShow').checked = false; setMsg('senhaMsg', '');
        $('senhaOverlay').hidden = false; $('senhaAtual').focus();
    }
    function fecharSenha() { $('senhaOverlay').hidden = true; }
    async function alterarSenha(ev) {
        ev.preventDefault();
        if (!sb || !st.logado) return;
        var atual = $('senhaAtual').value, nova = $('senhaNova').value;
        if (!atual) { setMsg('senhaMsg', 'Digite a sua senha atual.', false); $('senhaAtual').focus(); return; }
        if (nova.length < 8) { setMsg('senhaMsg', 'A nova senha precisa ter pelo menos 8 caracteres.', false); $('senhaNova').focus(); return; }
        if (nova === atual) { setMsg('senhaMsg', 'A nova senha precisa ser diferente da atual.', false); $('senhaNova').focus(); return; }
        if (nova !== $('senhaNova2').value) { setMsg('senhaMsg', 'As duas senhas novas não são iguais.', false); $('senhaNova2').focus(); return; }
        if (!cripto()) { setMsg('senhaMsg', 'Este navegador não oferece criptografia nesta página.', false); return; }
        var b = $('senhaSubmit'); b.disabled = true; setMsg('senhaMsg', 'Alterando…', true);
        try {
            var re = await sb.auth.signInWithPassword({ email: emailDe(perfil.bp), password: atual });
            if (re.error) { setMsg('senhaMsg', String(re.error.message || '').toLowerCase().indexOf('invalid login') >= 0 ? 'A senha atual está incorreta.' : msgErro(re.error), false); return; }
            var segs = null, perdeu = false;
            if (st.segRaw) { try { segs = await decifrar(await derivar(atual, perfil.salt), st.segRaw); } catch (e) { perdeu = true; } }
            var chaveNova = await derivar(nova, perfil.salt);
            var up = await sb.auth.updateUser({ password: nova });
            if (up.error) { setMsg('senhaMsg', msgErro(up.error), false); return; }
            st.chave = chaveNova; chaveMem = chaveNova; guardarChave(st.uid, chaveNova).then(null, noop);
            if (st.segRaw) {
                var pacote = segs ? await cifrar(chaveNova, segs) : null;
                var ru = await sb.from('perfis').update({ segredos: pacote }).eq('id', st.uid);
                if (ru.error) { st.bloqueado = true; setMsg('senhaMsg', 'Sua senha foi alterada, mas não consegui regravar as senhas salvas. Em "Meus dados", digite-as novamente e salve.', false); return; }
                st.segRaw = pacote;
                if (segs) { SEGREDOS.forEach(function (k) { if (typeof segs[k] === 'string') perfil[k] = segs[k]; }); st.bloqueado = false; }
                else { SEGREDOS.forEach(function (k) { perfil[k] = ''; }); st.bloqueado = false; }
            }
            ['senhaAtual', 'senhaNova', 'senhaNova2'].forEach(function (i) { $(i).value = ''; });
            setMsg('senhaMsg', 'Senha alterada!' + (perdeu ? ' Suas senhas salvas não puderam ser abertas e foram descartadas: digite-as de novo em "Meus dados".' : ''), true);
            toast('Senha de login alterada.');
        } catch (e) {
            setMsg('senhaMsg', msgErro(e), false);
        } finally { b.disabled = false; }
    }

    /* ---------- pop-up "Meus acessos" por sistema ---------- */
    function copiar(txt) {
        if (typeof copyText !== 'function') return;
        copyText(txt).then(function (ok) { if (ok) toast('Copiado com sucesso!'); });
    }
    function linha(rotulo, valor, secret) {
        var li = el('li', 'acc-row');
        li.appendChild(el('span', 'acc-label', rotulo));
        var val = el('span', 'acc-value', secret ? '••••••••' : valor);
        li.appendChild(val);
        var acoes = el('span', 'acc-actions');
        if (secret) {
            var olho = el('button', 'icon-btn'); olho.type = 'button'; olho.setAttribute('aria-pressed', 'false');
            olho.setAttribute('aria-label', 'Mostrar ' + rotulo); olho.appendChild(icon('eye'));
            olho.addEventListener('click', function () {
                var on = olho.getAttribute('aria-pressed') !== 'true';
                olho.setAttribute('aria-pressed', on ? 'true' : 'false');
                olho.setAttribute('aria-label', (on ? 'Ocultar ' : 'Mostrar ') + rotulo);
                val.textContent = on ? valor : '••••••••';
                olho.textContent = ''; olho.appendChild(icon(on ? 'eye-off' : 'eye'));
            });
            acoes.appendChild(olho);
        }
        var cp = el('button', 'icon-btn'); cp.type = 'button'; cp.setAttribute('aria-label', 'Copiar ' + rotulo);
        cp.appendChild(icon('copy')); cp.addEventListener('click', function () { copiar(valor); });
        acoes.appendChild(cp); li.appendChild(acoes); return li;
    }
    function abrirAcessos(botao) {
        var card = botao.closest('.card'); var auth = card && card.querySelector('.auth');
        var titulo = card ? card.querySelector('h3').textContent.trim() : 'Sistema';
        var keys = auth ? auth.getAttribute('data-auth').split(',') : [];
        acessosOpener = botao;
        $('acessosTitleText').textContent = 'Meus acessos · ' + titulo;
        $('acessosEdit').querySelector('span').textContent = st.logado ? 'Editar meus dados' : 'Entrar';
        var lista = $('acessosList'); lista.textContent = '';
        var intro = $('acessosIntro');
        if (!st.logado) {
            intro.textContent = 'Você ainda não entrou. Clique em "Entrar" para ver aqui o seu BP, EPR, senhas e RK, guardados na sua conta.';
            if (keys.indexOf('track') >= 0) { lista.appendChild(linha('Track ID', TRACK_ID, false)); intro.textContent += ' O Track ID é o mesmo para todos os agentes e já está aqui para copiar.'; }
        } else {
            var pend = 0, sem = keys.indexOf('none') >= 0;
            keys.forEach(function (k) {
                if (AUTH_CAMPO[k]) {
                    var c = CAMPOS.filter(function (x) { return x.k === AUTH_CAMPO[k]; })[0];
                    var v = perfil[c.k];
                    if (v) lista.appendChild(linha(c.label, v, c.secret));
                    else { pend++; var li = el('li', 'acc-row acc-row--empty'); li.appendChild(el('span', 'acc-label', c.label)); li.appendChild(el('span', 'acc-value', 'Não cadastrado')); lista.appendChild(li); }
                } else if (k === 'print') { var cp0 = campoPor('print'); lista.appendChild(linha(cp0 ? cp0.rotulo : 'Impressora', cp0 && cp0.valor ? cp0.valor : 'D5D805', false)); }
                else if (k === 'track') { var ct0 = campoPor('track'); lista.appendChild(linha(ct0 ? ct0.rotulo : 'Track ID', ct0 && ct0.valor ? ct0.valor : TRACK_ID, false)); }
                else if (k.indexOf('c:') === 0) {
                    var cx = campoPor(k.slice(2)); if (!cx) return;
                    var vx = cx.tipo === 'padrao' ? cx.valor : (cx.tipo === 'senha' ? (perfil.xs || {})[cx.chave] : (perfil.extras || {})[cx.chave]);
                    if (vx) lista.appendChild(linha(cx.rotulo, vx, cx.tipo === 'senha'));
                    else { pend++; var lx = el('li', 'acc-row acc-row--empty'); lx.appendChild(el('span', 'acc-label', cx.rotulo)); lx.appendChild(el('span', 'acc-value', 'Não cadastrado')); lista.appendChild(lx); }
                }
            });
            intro.textContent = 'Oi, ' + (ehAdmin() ? (perfil.nome || 'administrador') : 'agente ' + (perfil.nome || perfil.bp)) + '! ' + (keys.indexOf('track') >= 0 ? 'O Track ID é padrão para todos os agentes: basta copiar. ' : '') + (sem ? 'Este sistema não pede senha, basta o seu e-mail corporativo. ' : '') + (st.bloqueado ? 'Suas senhas salvas não puderam ser abertas neste navegador: saia e entre de novo. ' : '') + (pend ? 'Complete os itens não cadastrados em "Editar meus dados".' : 'Seus dados para este sistema:');
            if (!lista.children.length) intro.textContent = sem ? 'Este sistema não pede senha: entre só com o seu e-mail corporativo.' : 'Este sistema não usa nenhum dos campos que você pode cadastrar.';
        }
        $('acessosOverlay').hidden = false;
        $('acessosEdit').focus();
    }
    function fecharAcessos() { $('acessosOverlay').hidden = true; if (acessosOpener && document.contains(acessosOpener)) acessosOpener.focus(); }

    /* ---------- inicialização ---------- */
    function semSessao() {
        var tinhaDica = false; try { tinhaDica = localStorage.getItem(GER_FLAG) === '1'; } catch (e) { /* ignora */ }
        aplicar();
        if (tinhaDica && !window.location.hash && typeof currentTab !== 'undefined' && currentTab === 'gerencia') openTab(DEFAULT_TAB, { initial: true });
        if (CFG.EXIGIR_LOGIN && CONFIGURADO) { abrirAuth(null, 'entrar'); travar(true); }
    }
    function iniciar() {
        if (!CONFIGURADO || !window.supabase || typeof window.supabase.createClient !== 'function') {
            if (CONFIGURADO) console.error('[portal] A biblioteca do Supabase não carregou (verifique a internet/CDN).');
            else console.warn('[portal] Supabase ainda não configurado: preencha PORTAL_CONFIG no index.html.');
            semSessao(); return;
        }
        sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
        window.suporteLuaSb = sb; /* o 11-conteudo.js usa o mesmo cliente para ler e (se administrador) editar o conteúdo do portal */
        sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') setTimeout(sessaoEncerrada, 0); });
        sb.auth.getSession().then(function (r) {
            var s = r && r.data && r.data.session;
            if (!s) { semSessao(); return; }
            return carregarPerfil(s.user).then(function () { aplicar({ inicial: true }); }, function () {
                semSessao(); toast('Não foi possível carregar o seu perfil agora. Recarregue a página.');
            });
        }, function () { semSessao(); });
    }

    function start() {
        document.addEventListener('click', function (e) {
            var t = e.target;
            var o = t.closest('[data-login-open]'); if (o) { abrirConta(o); return; }
            if (t.closest('[data-sair]')) { sair(); return; }
            if (t.closest('[data-auth-forgot]')) { authView('esqueci'); $('authBp').focus(); return; }
            var av = t.closest('[data-auth-view]'); if (av) { authView(av.dataset.authView); return; }
            if (t.closest('[data-auth-close]') || t === $('authOverlay')) { fecharAuth(); return; }
            if (t.closest('[data-login-close]') || t === $('loginOverlay')) { fecharPerfil(); return; }
            if (t.closest('[data-senha-open]')) { abrirSenha(); return; }
            if (t.closest('[data-senha-close]') || t === $('senhaOverlay')) { fecharSenha(); return; }
            var a = t.closest('[data-acessos]'); if (a) { abrirAcessos(a); return; }
            if (t.closest('[data-acessos-close]') || t === $('acessosOverlay')) { fecharAcessos(); return; }
            if (t.closest('[data-ger-retry]')) carregarItens(true);
        });
        $('authForm').addEventListener('submit', enviarAuth);
        $('loginForm').addEventListener('submit', salvarPerfil);
        $('senhaForm').addEventListener('submit', alterarSenha);
        $('authBp').addEventListener('input', function () { var v = this.value.replace(/\D/g, ''); if (v !== this.value) this.value = v; });
        $('authShow').addEventListener('change', function () { authMostrar(this.checked); });
        $('loginShow').addEventListener('change', function () { mostrarSenhas(this.checked); });
        $('senhaShow').addEventListener('change', function () { var on = this.checked; ['senhaAtual', 'senhaNova', 'senhaNova2'].forEach(function (i) { $(i).type = on ? 'text' : 'password'; }); });
        $('loginName').addEventListener('input', function () { $('loginError').hidden = true; });
        $('acessosEdit').addEventListener('click', function () { var op = acessosOpener; $('acessosOverlay').hidden = true; abrirConta(op); });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            if (!$('senhaOverlay').hidden) fecharSenha();
            else if (!$('acessosOverlay').hidden) fecharAcessos();
            else if (!$('loginOverlay').hidden) fecharPerfil();
            else if (!$('authOverlay').hidden) fecharAuth();
        });
        var campo = $('inputAgent');
        if (campo) campo.addEventListener('input', function () { campo.dataset.fromLogin = ''; });
        iniciar();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
