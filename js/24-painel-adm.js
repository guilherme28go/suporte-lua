/* Painel de Gerência: check-list pessoal + escolha do que aparece no painel.
   Tudo é POR ADMINISTRADOR (salvo na conta de quem está logado, via PortalPrefs): o que um administrador cria ou esconde não muda nada para os outros. */
(function () {
    'use strict';
    var alvo = document.getElementById('gerConteudo'), P = window.PortalPrefs; if (!alvo || !P) return;
    var SECOES = [['checklist', 'Check-list', 'list-checks'], ['links', 'Links de gestão', 'link'], ['atalhos', 'Atalhos de sistemas', 'workflow'], ['uso', 'Uso do portal', 'chart-column']];
    var montando = false, painelAberto = false;
    function hoje() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function ic(nome) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); s.setAttribute('class', 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); u.setAttribute('href', '#i-' + nome); s.appendChild(u); return s; }
    function btn(txt, ico, fn, cls) { var b = el('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (ico) b.appendChild(ic(ico)); if (txt) b.appendChild(el('span', null, txt)); if (fn) b.addEventListener('click', fn); return b; }
    function iconBtn(ico, rot, fn) { var b = el('button', 'ger-ico-btn'); b.type = 'button'; b.title = rot; b.setAttribute('aria-label', rot); b.appendChild(ic(ico)); b.addEventListener('click', fn); return b; }

    /* ---- dados ---- */
    function cfgPainel() { var v = P.ler('gerPainel', null) || {}; return { oculto: Array.isArray(v.oculto) ? v.oculto : [], ordem: Array.isArray(v.ordem) ? v.ordem : [], recolhidas: Array.isArray(v.recolhidas) ? v.recolhidas : [] }; }
    function gravarPainel(c) { P.salvar('gerPainel', { oculto: c.oculto, ordem: c.ordem, recolhidas: c.recolhidas }); }
    function oculto() { return cfgPainel().oculto; }
    function salvarOculto(l) { var c = cfgPainel(); c.oculto = l; gravarPainel(c); }
    /* ordem das seções: a salva pelo administrador primeiro; as que faltam entram no fim, na ordem original */
    function ordemSecoes() { var o = cfgPainel().ordem.filter(function (k) { return SECOES.some(function (s) { return s[0] === k; }); }); SECOES.forEach(function (s) { if (o.indexOf(s[0]) < 0) o.push(s[0]); }); return o; }
    function mover(chave, d) { var o = ordemSecoes(), i = o.indexOf(chave), j = i + d; if (i < 0 || j < 0 || j >= o.length) return; o.splice(j, 0, o.splice(i, 1)[0]); var c = cfgPainel(); c.ordem = o; gravarPainel(c); atualizar(); }
    function alternarRecolher(chave) { var c = cfgPainel(), i = c.recolhidas.indexOf(chave); if (i >= 0) c.recolhidas.splice(i, 1); else c.recolhidas.push(chave); gravarPainel(c); aplicarOrdem(); }
    function checklist() {
        var v = P.ler('gerChecklist', null), c = { itens: [], diario: false, dia: hoje() };
        if (v && typeof v === 'object') {
            if (Array.isArray(v.itens)) c.itens = v.itens.filter(function (i) { return i && typeof i.t === 'string' && i.t.trim(); }).slice(0, 60).map(function (i) { return { id: String(i.id || Math.random().toString(36).slice(2, 9)), t: i.t.slice(0, 160), ok: !!i.ok }; });
            c.diario = !!v.diario; c.dia = typeof v.dia === 'string' ? v.dia : c.dia;
        }
        if (c.diario && c.dia !== hoje()) { c.itens.forEach(function (i) { i.ok = false; }); c.dia = hoje(); P.salvar('gerChecklist', c); }
        return c;
    }
    function salvarChecklist(c) { c.dia = c.dia || hoje(); P.salvar('gerChecklist', c); }

    /* ---- peças ---- */
    function barra() {
        var wrap = el('div', 'gp-barra'), b = btn('Personalizar painel', 'sliders-horizontal', function () { painelAberto = !painelAberto; b.setAttribute('aria-expanded', String(painelAberto)); caixa.hidden = !painelAberto; }, 'btn btn--outline btn--sm');
        b.setAttribute('aria-expanded', String(painelAberto)); b.setAttribute('aria-controls', 'gpCaixa');
        var caixa = el('div', 'gp-caixa'); caixa.id = 'gpCaixa'; caixa.hidden = !painelAberto;
        caixa.appendChild(el('p', 'gp-ajuda', 'Escolha o que aparece no SEU painel. Isso só vale para a sua conta.'));
        var ocultos = oculto();
        caixa.appendChild(el('p', 'gp-ajuda gp-ajuda--sm', 'Marque o que mostrar e use as setas para escolher o que aparece primeiro.'));
        var ordem = ordemSecoes();
        ordem.forEach(function (chave, n) {
            var s = SECOES.filter(function (x) { return x[0] === chave; })[0], li = el('div', 'gp-op');
            var l = el('label', 'gp-op-l'), i = el('input'); i.type = 'checkbox'; i.checked = ocultos.indexOf(s[0]) < 0;
            i.addEventListener('change', function () { var o = oculto().filter(function (k) { return k !== s[0]; }); if (!i.checked) o.push(s[0]); salvarOculto(o); aplicarVisibilidade(); });
            l.appendChild(i); l.appendChild(ic(s[2])); l.appendChild(el('span', null, s[1])); li.appendChild(l);
            var ac = el('span', 'gp-op-ac');
            var su = iconBtn('arrow-up', 'Subir ' + s[1], function () { mover(chave, -1); }), de = iconBtn('arrow-down', 'Descer ' + s[1], function () { mover(chave, 1); });
            su.disabled = n === 0; de.disabled = n === ordem.length - 1; ac.appendChild(su); ac.appendChild(de); li.appendChild(ac); caixa.appendChild(li);
        });
        wrap.appendChild(b); wrap.appendChild(caixa); return wrap;
    }
    function secaoChecklist() {
        var sec = el('section', 'ger-sec gp-check'); sec.setAttribute('data-sec', 'checklist');
        var c = checklist(), h = el('div', 'ger-sec-head'), t = el('h3'); t.appendChild(ic('list-checks')); t.appendChild(el('span', null, 'Check-list'));
        var feitos = c.itens.filter(function (i) { return i.ok; }).length; t.appendChild(el('small', 'gp-cont', c.itens.length ? feitos + '/' + c.itens.length : ''));
        h.appendChild(t); sec.appendChild(h);
        var lista = el('ul', 'gp-lista');
        c.itens.forEach(function (i, n) {
            var li = el('li', 'gp-item' + (i.ok ? ' is-ok' : '')), lb = el('label', 'gp-item-l'), cb = el('input'); cb.type = 'checkbox'; cb.checked = i.ok;
            cb.addEventListener('change', function () { i.ok = cb.checked; salvarChecklist(c); atualizar(); });
            lb.appendChild(cb); lb.appendChild(el('span', null, i.t)); li.appendChild(lb);
            var ac = el('span', 'gp-acoes');
            ac.appendChild(iconBtn('pencil', 'Editar item', function () { var v = window.prompt('Texto do item:', i.t); if (v != null && v.trim()) { i.t = v.trim().slice(0, 160); salvarChecklist(c); atualizar(); } }));
            if (n > 0) ac.appendChild(iconBtn('arrow-up', 'Subir', function () { c.itens.splice(n - 1, 0, c.itens.splice(n, 1)[0]); salvarChecklist(c); atualizar(); }));
            if (n < c.itens.length - 1) ac.appendChild(iconBtn('arrow-down', 'Descer', function () { c.itens.splice(n + 1, 0, c.itens.splice(n, 1)[0]); salvarChecklist(c); atualizar(); }));
            ac.appendChild(iconBtn('trash-2', 'Remover item', function () { c.itens.splice(n, 1); salvarChecklist(c); atualizar(); }));
            li.appendChild(ac); lista.appendChild(li);
        });
        if (!c.itens.length) sec.appendChild(el('p', 'ger-hint', 'Seu check-list está vazio. Adicione as tarefas que você quer acompanhar (ex.: "Conferir fila de pendências", "Responder a gerência").')); else sec.appendChild(lista);
        var f = el('form', 'gp-add'), inp = el('input', 'login-input'); inp.type = 'text'; inp.maxLength = 160; inp.placeholder = 'Nova tarefa…'; inp.setAttribute('aria-label', 'Nova tarefa do check-list');
        var add = btn('Adicionar', 'plus', null, 'btn btn--primary btn--sm'); add.type = 'submit'; f.appendChild(inp); f.appendChild(add);
        f.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.trim(); if (!v) return; c.itens.push({ id: Math.random().toString(36).slice(2, 9), t: v.slice(0, 160), ok: false }); salvarChecklist(c); atualizar(); });
        sec.appendChild(f);
        var rodape = el('div', 'gp-rodape'), dl = el('label', 'gp-op'), d = el('input'); d.type = 'checkbox'; d.checked = c.diario;
        d.addEventListener('change', function () { c.diario = d.checked; c.dia = hoje(); salvarChecklist(c); });
        dl.appendChild(d); dl.appendChild(el('span', null, 'Zerar as marcações todo dia')); rodape.appendChild(dl);
        rodape.appendChild(btn('Desmarcar tudo', 'rotate-ccw', function () { c.itens.forEach(function (i) { i.ok = false; }); salvarChecklist(c); atualizar(); }));
        sec.appendChild(rodape); return sec;
    }
    function secaoUso() {
        var sec = el('section', 'ger-sec'); sec.setAttribute('data-sec', 'uso');
        var h = el('div', 'ger-sec-head'), t = el('h3'); t.appendChild(ic('chart-column')); t.appendChild(el('span', null, 'Uso do portal')); h.appendChild(t); sec.appendChild(h);
        var host = el('div', 'uso-host'); sec.appendChild(host); if (window.PortalUso) window.PortalUso.cartao(host); return sec;
    }
    function aplicarOrdem() {
        var nos = {}; [].slice.call(alvo.children).forEach(function (n) { var k = n.getAttribute && n.getAttribute('data-sec'); if (k) nos[k] = n; });
        var ordem = ordemSecoes().filter(function (k) { return nos[k]; }); if (!ordem.length) return;
        var marca = document.createComment('ordem'); alvo.insertBefore(marca, nos[ordem[0]]);
        var rec = cfgPainel().recolhidas;
        ordem.forEach(function (k) {
            var n = nos[k]; alvo.insertBefore(n, marca);
            var cab = n.querySelector('.ger-sec-head'), fechada = rec.indexOf(k) >= 0; n.classList.toggle('gp-recolhida', fechada);
            if (cab && !cab.querySelector('.gp-rec')) { var b = el('button', 'ger-ico-btn gp-rec'); b.type = 'button'; b.appendChild(ic('chevron-down')); cab.appendChild(b); b.addEventListener('click', function () { alternarRecolher(k); }); }
            var bt = cab && cab.querySelector('.gp-rec'); if (bt) { bt.title = fechada ? 'Expandir seção' : 'Recolher seção'; bt.setAttribute('aria-label', bt.title); bt.setAttribute('aria-expanded', String(!fechada)); }
        });
        marca.remove();
    }
    function aplicarVisibilidade() { var o = oculto(); alvo.querySelectorAll('[data-sec]').forEach(function (s) { s.hidden = o.indexOf(s.getAttribute('data-sec')) >= 0; }); }

    /* ---- montagem (o painel é redesenhado pelo 04-auth-gerencia sempre que algo muda) ---- */
    var obs = null;
    function montar() {
        if (montando || alvo.hidden || !window.suporteLuaAdmin) return; montando = true; if (obs) obs.disconnect();
        try {
            alvo.querySelectorAll('.gp-barra, .gp-check, [data-sec="uso"]').forEach(function (n) { n.remove(); });
            var secs = [].slice.call(alvo.children).filter(function (n) { return n.classList && n.classList.contains('ger-sec'); });
            if (secs[0]) secs[0].setAttribute('data-sec', 'links'); if (secs[1]) secs[1].setAttribute('data-sec', 'atalhos');
            alvo.insertBefore(secaoChecklist(), alvo.firstChild); alvo.insertBefore(barra(), alvo.firstChild);
            alvo.appendChild(secaoUso()); aplicarOrdem(); aplicarVisibilidade();
        } finally { montando = false; if (obs) obs.observe(alvo, { childList: true }); }
    }
    function atualizar() { montar(); }
    if (window.MutationObserver) { obs = new MutationObserver(function () { if (!montando && !alvo.querySelector('.gp-barra')) montar(); }); obs.observe(alvo, { childList: true }); }
    document.addEventListener('portal:gerenciaPronta', function () { setTimeout(montar, 0); });
    P.aoMudar(function () { setTimeout(montar, 0); });
    document.addEventListener('suporteLua:auth', function () { setTimeout(montar, 50); });
})();
