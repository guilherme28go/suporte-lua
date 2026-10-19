/* ==========================================================================
   FORMULÁRIOS DO PORTAL (substituem os formulários do Google)
   Os formulários são criados pelos desenvolvedores (Desenvolvedor > Formulários)
   e ficam no banco. Aqui fica só quem RESPONDE:
     PortalForms.abrir('slug', {preset:{campo:valor}, aoEnviar:fn, aoFalhar:fn})
   Também abre por   <a href="#form/slug">   ou   <button data-form="slug">.
   As respostas vão para o banco e aparecem na Gerência / Desenvolvedor.
   ========================================================================== */
(function () {
    'use strict';
    var MAX_ARQ = 3000000, MAX_TOTAL = 6000000, aberto = null;
    function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function sb() { return window.suporteLuaSb; }
    function toast(m) { if (typeof showToast === 'function') try { showToast(m); } catch (e) { /* ignora */ } }
    function perfil() { return window.suporteLuaPerfil || null; }
    function lerArquivo(f) { return new Promise(function (ok, err) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1] || ''); }; r.onerror = function () { err(new Error('Não consegui ler o arquivo.')); }; r.readAsDataURL(f); }); }
    function tamanho(n) { return n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
    function urlOk(u) { try { var x = new URL(String(u).trim()); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { return false; } }

    function fechar() {
        if (!aberto) return; document.removeEventListener('keydown', aberto.esc, true); aberto.ov.remove();
        try { if (aberto.foco && aberto.foco.focus) aberto.foco.focus(); } catch (e) { /* ignora */ } aberto = null;
    }
    function moldura(titulo) {
        fechar(); var ov = el('div', 'fb-overlay pf-overlay'), box = el('div', 'fb-modal fb-modal--wide pf-modal'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', titulo || 'Formulário');
        ov.appendChild(box); document.body.appendChild(ov);
        var esc = function (e) { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
        document.addEventListener('keydown', esc, true);
        ov.addEventListener('mousedown', function (e) { if (e.target === ov) fechar(); });
        aberto = { ov: ov, esc: esc, foco: document.activeElement }; return box;
    }
    function aviso(box, titulo, txt, extra) {
        box.textContent = ''; box.appendChild(el('h2', null, titulo)); box.appendChild(el('p', null, txt));
        var ac = el('div', 'fb-actions fb-actions--center'); var x = el('button', 'btn btn--outline btn--sm', 'Fechar'); x.type = 'button'; x.addEventListener('click', fechar); ac.appendChild(x);
        if (extra) ac.appendChild(extra); box.appendChild(ac); x.focus();
    }

    /* ---------- regras do fluxo (igual ao Google Forms: "pular para a seção") ---------- */
    function indiceSecao(def, id) { for (var i = 0; i < def.secoes.length; i++) if (def.secoes[i].id === id) return i; return -1; }
    function proxima(def, i, resp) {
        var s = def.secoes[i];
        for (var k = 0; k < s.campos.length; k++) {
            var c = s.campos[k]; if ((c.tipo === 'escolha' || c.tipo === 'lista') && resp[c.id] != null) {
                var o = (c.opcoes || []).filter(function (x) { return x.v === resp[c.id]; })[0];
                if (o && o.ir) return o.ir === 'fim' ? -1 : indiceSecao(def, o.ir);
            }
        }
        if (s.depois) return s.depois === 'fim' ? -1 : indiceSecao(def, s.depois);
        return i + 1 < def.secoes.length ? i + 1 : -1;
    }
    function caminho(def, resp) { var out = [], i = 0, guard = 0; while (i >= 0 && guard++ < 60) { if (out.indexOf(i) >= 0) break; out.push(i); i = proxima(def, i, resp); } return out; }

    /* ---------- campos ---------- */
    function criarCampo(c, st, preset) {
        var wrap = el('div', 'lf lf--full pf-campo'), id = 'pf-' + c.id + '-' + Math.random().toString(36).slice(2, 6), get = function () { return ''; }, pronto = null;
        if (c.tipo === 'nota') { wrap.appendChild(el('p', 'ger-hint', c.rotulo)); return { n: wrap, c: c, vazio: function () { return false; }, get: function () { return undefined; } }; }
        var lab = el('label', null, c.rotulo); lab.htmlFor = id; if (c.obrigatorio) { var ast = el('span', 'lf-req', ' *'); lab.appendChild(ast); }
        var grupo = c.tipo === 'escolha' || c.tipo === 'multipla' || c.tipo === 'aceite';
        if (grupo) { lab = el('div', 'pf-rot', c.rotulo + (c.obrigatorio ? ' *' : '')); }
        wrap.appendChild(lab); if (c.ajuda) wrap.appendChild(el('p', 'ger-hint pf-ajuda', c.ajuda));
        var ini = st.resp[c.id] != null ? st.resp[c.id] : (preset && preset[c.id] != null ? preset[c.id] : null);
        if (ini == null && c.auto && perfil()) ini = perfil()[c.auto] || null;
        var vazio;
        if (c.tipo === 'texto' || c.tipo === 'link' || c.tipo === 'email' || c.tipo === 'numero' || c.tipo === 'data') {
            var i = el('input', 'login-input'); i.id = id; i.type = c.tipo === 'texto' ? 'text' : (c.tipo === 'link' ? 'url' : c.tipo); i.maxLength = c.max || 300; i.autocomplete = 'off'; if (c.tipo === 'link') i.placeholder = 'https://'; if (ini != null) i.value = ini; wrap.appendChild(i);
            get = function () { return i.value.trim(); }; vazio = function () { return !i.value.trim(); };
        } else if (c.tipo === 'longo' || c.tipo === 'relatorio') {
            var t = el('textarea', 'login-input cm-area' + (c.tipo === 'relatorio' ? ' dev-json' : '')); t.id = id; t.rows = c.tipo === 'relatorio' ? 7 : 5; t.maxLength = c.tipo === 'relatorio' ? 120000 : (c.max || 4000); if (ini != null) t.value = ini; wrap.appendChild(t);
            get = function () { return t.value.trim(); }; vazio = function () { return !t.value.trim(); };
        } else if (c.tipo === 'lista') {
            var s = el('select', 'login-input'); s.id = id; var o0 = el('option', null, 'Escolha…'); o0.value = ''; s.appendChild(o0);
            (c.opcoes || []).forEach(function (o) { var op = el('option', null, o.v); op.value = o.v; if (ini === o.v) op.selected = true; s.appendChild(op); }); wrap.appendChild(s);
            get = function () { return s.value; }; vazio = function () { return !s.value; };
        } else if (c.tipo === 'escolha' || c.tipo === 'aceite') {
            var box = el('div', 'pf-opcoes'); box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', c.rotulo); var nome = 'pf-r-' + id, sel = ini;
            (c.opcoes || []).forEach(function (o) { var l = el('label', 'cm-check'), r = el('input'); r.type = 'radio'; r.name = nome; r.value = o.v; r.checked = ini === o.v; r.addEventListener('change', function () { sel = o.v; st.mudou && st.mudou(); }); l.appendChild(r); l.appendChild(el('span', null, o.v)); box.appendChild(l); }); wrap.appendChild(box);
            get = function () { var x = box.querySelector('input:checked'); return x ? x.value : ''; }; vazio = function () { return !box.querySelector('input:checked'); };
        } else if (c.tipo === 'multipla') {
            var bm = el('div', 'pf-opcoes'); (c.opcoes || []).forEach(function (o) { var l = el('label', 'cm-check'), r = el('input'); r.type = 'checkbox'; r.value = o.v; r.checked = Array.isArray(ini) && ini.indexOf(o.v) >= 0; l.appendChild(r); l.appendChild(el('span', null, o.v)); bm.appendChild(l); }); wrap.appendChild(bm);
            get = function () { return [].slice.call(bm.querySelectorAll('input:checked')).map(function (x) { return x.value; }); }; vazio = function () { return !bm.querySelector('input:checked'); };
        } else if (c.tipo === 'arquivo') {
            var f = el('input', 'login-input'); f.type = 'file'; f.id = id; wrap.appendChild(f); var info = el('p', 'ger-hint', 'Tamanho máximo: ' + tamanho(MAX_ARQ) + ' por arquivo.'); wrap.appendChild(info);
            if (st.arquivos[c.id]) info.textContent = 'Arquivo já escolhido: ' + st.arquivos[c.id].nome + ' (' + tamanho(st.arquivos[c.id].tamanho) + '). Escolha outro para trocar.';
            f.addEventListener('change', function () { var a = f.files[0]; if (!a) { delete st.arquivos[c.id]; return; } if (a.size > MAX_ARQ) { info.textContent = 'Esse arquivo tem ' + tamanho(a.size) + ': o limite é ' + tamanho(MAX_ARQ) + '.'; f.value = ''; delete st.arquivos[c.id]; return; } st.arquivos[c.id] = { nome: a.name, tipo: a.type || '', tamanho: a.size, arq: a }; info.textContent = a.name + ' (' + tamanho(a.size) + ')'; });
            get = function () { return st.arquivos[c.id] ? st.arquivos[c.id].nome : ''; }; vazio = function () { return !st.arquivos[c.id]; };
        }
        pronto = { n: wrap, c: c, get: get, vazio: vazio }; return pronto;
    }
    function validar(campo, vazioGrupo) {
        var c = campo.c, v = campo.get(), vz = campo.vazio();
        if (c.tipo === 'nota') return '';
        if (vz) { if (c.ou) return vazioGrupo ? 'Preencha pelo menos um: ' + vazioGrupo : ''; return c.obrigatorio ? 'Responda: ' + c.rotulo : ''; }
        if (c.tipo === 'link' && !urlOk(v)) return 'O endereço de "' + c.rotulo + '" precisa começar com https://';
        if (c.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '"' + c.rotulo + '" não parece um e-mail válido.';
        if (c.tipo === 'numero' && !isFinite(Number(String(v).replace(',', '.')))) return '"' + c.rotulo + '" precisa ser um número.';
        if (c.validacao === 'numeros' && !/^\d{3,15}$/.test(String(v))) return '"' + c.rotulo + '": use só números (de 3 a 15 dígitos).';
        return '';
    }

    /* ---------- abrir ---------- */
    async function abrir(slug, opts) {
        opts = opts || {}; var box = moldura('Formulário');
        box.appendChild(el('p', null, 'Carregando formulário…'));
        var cli = sb();
        if (!cli) return aviso(box, 'Indisponível', 'O portal ainda não conectou ao banco de dados. Tente de novo em instantes.');
        var r = await cli.from('pf_formularios').select('slug,titulo,descricao,definicao,publico,msg_sucesso').eq('slug', slug).maybeSingle();
        if (r.error || !r.data) {
            var logado = !!perfil();
            if (!logado) { var b = el('button', 'btn btn--primary btn--sm', 'Entrar no portal'); b.type = 'button'; b.addEventListener('click', function () { fechar(); var o = document.querySelector('[data-login-open]'); if (o) o.click(); }); return aviso(box, 'Entre para responder', 'Este formulário é só para agentes com conta. Entre (ou crie a sua conta) e tente de novo.', b); }
            return aviso(box, 'Formulário indisponível', 'Não encontrei este formulário ou ele foi desativado.');
        }
        var f = r.data, def = f.definicao || {}; if (!Array.isArray(def.secoes) || !def.secoes.length) return aviso(box, 'Formulário vazio', 'Este formulário ainda não tem perguntas.');
        if (!perfil() && !f.publico) { var b2 = el('button', 'btn btn--primary btn--sm', 'Entrar no portal'); b2.type = 'button'; b2.addEventListener('click', function () { fechar(); var o = document.querySelector('[data-login-open]'); if (o) o.click(); }); return aviso(box, 'Entre para responder', 'Este formulário é só para agentes com conta. Entre (ou crie a sua conta) e tente de novo.', b2); }
        var st = { resp: {}, arquivos: {}, pilha: [0], enviando: false };
        function desenhar() {
            var i = st.pilha[st.pilha.length - 1], s = def.secoes[i]; box.textContent = '';
            var form = el('form', 'pf-form'); form.noValidate = true;
            box.appendChild(form);
            var h = el('h2', null, st.pilha.length === 1 ? f.titulo : s.titulo); form.appendChild(h);
            if (st.pilha.length === 1 && f.descricao && !s.descricao) form.appendChild(el('p', null, f.descricao));
            if (st.pilha.length > 1) form.appendChild(el('p', 'ger-hint', f.titulo));
            if (s.descricao) form.appendChild(el('p', null, s.descricao));
            if (st.pilha.length === 1 && s.titulo && s.titulo !== f.titulo) form.appendChild(el('h3', 'pf-sec', s.titulo));
            var campos = s.campos.map(function (c) { return criarCampo(c, st, opts.preset); }); campos.forEach(function (c) { form.appendChild(c.n); });
            var msg = el('p', 'ger-msg'); msg.hidden = true; msg.setAttribute('role', 'alert'); form.appendChild(msg);
            function ler() { campos.forEach(function (c) { var v = c.get(); if (c.c.tipo !== 'nota' && c.c.tipo !== 'arquivo') st.resp[c.c.id] = (Array.isArray(v) ? v : (v === '' ? null : v)); if (c.c.tipo === 'arquivo') st.resp[c.c.id] = v || null; }); }
            var tmp = Object.assign({}, st.resp);
            function proxPreview() { ler(); return proxima(def, i, st.resp); }
            var ac = el('div', 'fb-actions'); var cancel = el('button', 'btn btn--outline btn--sm', 'Cancelar'); cancel.type = 'button'; cancel.addEventListener('click', fechar); ac.appendChild(cancel);
            if (st.pilha.length > 1) { var vl = el('button', 'btn btn--outline btn--sm', 'Voltar'); vl.type = 'button'; vl.addEventListener('click', function () { ler(); st.pilha.pop(); desenhar(); }); ac.appendChild(vl); }
            var go = el('button', 'btn btn--primary btn--sm'); go.type = 'submit'; var rot = el('span', null, 'Próxima'); go.appendChild(rot); ac.appendChild(go); form.appendChild(ac);
            function rotular() { var n = proxPreview(); rot.textContent = n < 0 ? 'Enviar' : 'Próxima'; }
            form.addEventListener('change', rotular); rotular();
            var primeiro = form.querySelector('input:not([type=radio]):not([type=checkbox]), textarea, select'); if (primeiro && !primeiro.value) primeiro.focus({ preventScroll: true }); else go.focus({ preventScroll: true }); box.scrollTop = 0;
            form.addEventListener('submit', async function (e) {
                e.preventDefault(); if (st.enviando) return; msg.hidden = true; ler();
                var ouVazio = {}; campos.forEach(function (c) { if (c.c.ou) { ouVazio[c.c.ou] = ouVazio[c.c.ou] || { todos: [], vazios: 0 }; ouVazio[c.c.ou].todos.push(c.c.rotulo); if (c.vazio()) ouVazio[c.c.ou].vazios++; } });
                for (var k = 0; k < campos.length; k++) { var cc = campos[k], g = cc.c.ou && ouVazio[cc.c.ou], er = validar(cc, g && g.vazios === g.todos.length ? g.todos.join(' ou ') : ''); if (er) { msg.textContent = er; msg.hidden = false; var inp = cc.n.querySelector('input, textarea, select'); if (inp) inp.focus(); return; } }
                var n = proxima(def, i, st.resp);
                if (n >= 0) { st.pilha.push(n); desenhar(); return; }
                enviar(go, msg);
            });
        }
        async function enviar(go, msg) {
            st.enviando = true; go.disabled = true; var rotOld = go.textContent; go.textContent = 'Enviando…';
            try {
                var cam = caminho(def, st.resp), dados = {}, rotulos = {}, anexos = [], total = 0;
                cam.forEach(function (i) { def.secoes[i].campos.forEach(function (c) { if (c.tipo === 'nota') return; var v = st.resp[c.id]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return; dados[c.id] = v; rotulos[c.id] = c.rotulo; }); });
                for (var id in st.arquivos) { if (dados[id] == null) continue; var a = st.arquivos[id]; total += a.tamanho; if (total > MAX_TOTAL) throw new Error('Os anexos somam mais de ' + tamanho(MAX_TOTAL) + '.'); anexos.push({ campo: id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, conteudo: await lerArquivo(a.arq) }); }
                if (!Object.keys(dados).length) throw new Error('Preencha o formulário.');
                var x = await sb().rpc('pf_enviar', { p_slug: slug, p_dados: dados, p_rotulos: rotulos, p_anexos: anexos });
                if (x.error) throw new Error(x.error.message || 'Falha ao enviar.');
                box.textContent = ''; var ok = el('span', 'fb-done'); box.classList.add('fb-modal--center'); box.appendChild(ok); box.appendChild(el('h2', null, 'Enviado!')); box.appendChild(el('p', null, f.msg_sucesso || 'Resposta enviada! Obrigado.'));
                var acs = el('div', 'fb-actions fb-actions--center'), fx = el('button', 'btn btn--primary btn--sm', 'Fechar'); fx.type = 'button'; fx.addEventListener('click', fechar); acs.appendChild(fx); box.appendChild(acs); fx.focus();
                toast('Resposta enviada!'); document.dispatchEvent(new CustomEvent('portal:formEnviado', { detail: { slug: slug, id: x.data } }));
                if (typeof opts.aoEnviar === 'function') opts.aoEnviar(x.data);
            } catch (e) {
                st.enviando = false; go.disabled = false; go.textContent = rotOld; msg.textContent = (e && e.message) || 'Não foi possível enviar agora.'; msg.hidden = false;
                if (typeof opts.aoFalhar === 'function') opts.aoFalhar(e);
            }
        }
        desenhar();
    }

    document.addEventListener('click', function (e) {
        var a = e.target.closest('[data-form], a[href^="#form/"]'); if (!a) return;
        var slug = a.getAttribute('data-form') || String(a.getAttribute('href') || '').replace('#form/', ''); if (!/^[a-z0-9][a-z0-9-]{1,58}$/.test(slug)) return;
        e.preventDefault(); abrir(slug);
    });
    function porHash() { var m = /^#form\/([a-z0-9][a-z0-9-]{1,58})$/.exec(location.hash); if (m) { history.replaceState(null, '', location.pathname + location.search); setTimeout(function () { abrir(m[1]); }, 400); } }
    window.addEventListener('hashchange', porHash); porHash();

    /* botão "Solicitar acesso de administrador": na janela de login e em "Meus dados" (para quem é agente) */
    var SLUG_ACESSO = 'acesso-administracao';
    function fecharJanelas() { ['authOverlay', 'loginOverlay', 'senhaOverlay', 'acessosOverlay'].forEach(function (i) { var o = document.getElementById(i); if (o) o.hidden = true; }); }
    (function () {
        var a = document.getElementById('authAdminReq'); if (!a) return;
        a.removeAttribute('target'); a.removeAttribute('data-forms-admin'); a.setAttribute('href', '#form/' + SLUG_ACESSO);
        a.addEventListener('click', async function (e) {
            e.preventDefault(); e.stopPropagation();
            var m = document.getElementById('authMsg'), cli = sb();
            if (!perfil()) {   /* sem login: só abre se o formulário estiver liberado para quem não tem conta */
                var r = cli ? await cli.from('pf_formularios').select('publico').eq('slug', SLUG_ACESSO).maybeSingle() : { data: null };
                if (!(r.data && r.data.publico)) { if (m) { m.textContent = 'Primeiro crie a sua conta de agente (aba "Criar conta") e entre. Depois você pede o acesso de administrador em "Meus dados".'; m.hidden = false; } return; }
            }
            fecharJanelas(); abrir(SLUG_ACESSO);
        }, true);
    })();
    (function () {
        var caixa = document.getElementById('loginAdminBox'), bt = document.getElementById('loginAdminReq'), txt = document.getElementById('loginAdminTxt'), ov = document.getElementById('loginOverlay'); if (!caixa || !bt || !ov) return;
        var rot = bt.querySelector('span');
        async function atualizar() {
            var p = perfil(); caixa.hidden = !(p && p.role === 'agente'); if (caixa.hidden) return;
            txt.textContent = 'Precisa editar o conteúdo do portal? Peça o acesso de administrador. Um desenvolvedor analisa o pedido.'; rot.textContent = 'Solicitar acesso de administrador';
            try {
                var f = await sb().from('pf_formularios').select('id').eq('slug', SLUG_ACESSO).maybeSingle(); if (!f.data) { caixa.hidden = true; return; }
                var r = await sb().from('pf_respostas').select('criado_em,status').eq('form_id', f.data.id).order('criado_em', { ascending: false }).limit(1), u = r.data && r.data[0];
                if (u && u.status !== 'concluida') { txt.textContent = 'Seu pedido de acesso foi enviado em ' + new Date(u.criado_em).toLocaleDateString('pt-BR') + ' e está ' + ({ nova: 'aguardando análise', em_analise: 'em análise', bloqueada: 'bloqueado', descartada: 'descartado' }[u.status] || u.status) + '. Se precisar, você pode enviar outro.'; rot.textContent = 'Enviar novo pedido'; }
            } catch (e) { /* mostra o botão simples */ }
        }
        new MutationObserver(function () { if (!ov.hidden) atualizar(); }).observe(ov, { attributes: true, attributeFilter: ['hidden'] });
        bt.addEventListener('click', function () { fecharJanelas(); abrir(SLUG_ACESSO); });
        document.addEventListener('portal:formEnviado', atualizar); document.addEventListener('suporteLua:auth', atualizar);
    })();

    window.PortalForms = { abrir: abrir, fechar: fechar };
})();
