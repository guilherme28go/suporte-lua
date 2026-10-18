/* ==========================================================================
   PORTAL DE TRANSPARÊNCIA EDITÁVEL
   O texto original continua no index.html (serve de reserva). Quando um desenvolvedor salva
   alterações em  Desenvolvedor > Transparência, elas ficam em portal_dados ("transparencia")
   e passam a valer para todo mundo. Quem vê a página continua igual: agentes veem a Transparência
   na aba Gerência; administradores e desenvolvedores veem a Gerência.
   O HTML salvo é limpo antes de aparecer na tela (só tags e classes seguras).
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore, raiz = document.getElementById('gerTransparencia'); if (!C || !raiz) return;
    var el = C.el, HTML_ORIGINAL = raiz.innerHTML, ORIGINAL = capturar(), aplicadoDoBanco = false;

    /* ---------- limpeza do HTML ---------- */
    var TAGS = { P: 1, STRONG: 1, EM: 1, B: 1, I: 1, BR: 1, UL: 1, OL: 1, LI: 1, H4: 1, H5: 1, TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1, CODE: 1, PRE: 1, A: 1, DIV: 1, SPAN: 1, FIGURE: 1, FIGCAPTION: 1, BLOCKQUOTE: 1, DETAILS: 1, SUMMARY: 1, SMALL: 1, MARK: 1, HR: 1 };
    var CLASSES = /^(tr-[a-z0-9-]+)$/;
    function limpar(no, destino) {
        [].slice.call(no.childNodes).forEach(function (n) {
            if (n.nodeType === 3) { destino.appendChild(document.createTextNode(n.nodeValue)); return; }
            if (n.nodeType !== 1) return;
            if (!TAGS[n.tagName]) { limpar(n, destino); return; }   /* tag desconhecida: fica só o texto de dentro */
            var c = document.createElement(n.tagName.toLowerCase());
            if (n.tagName === 'A') {
                var h = n.getAttribute('href') || '', ok = C.urlSegura(h); if (ok) { c.setAttribute('href', ok); if (ok.charAt(0) !== '#') { c.target = '_blank'; c.rel = 'noopener noreferrer'; } }
            }
            var cl = (n.getAttribute('class') || '').split(/\s+/).filter(function (x) { return CLASSES.test(x); }); if (cl.length) c.className = cl.join(' ');
            if ((n.tagName === 'TD' || n.tagName === 'TH') && /^\d{1,2}$/.test(n.getAttribute('colspan') || '')) c.setAttribute('colspan', n.getAttribute('colspan'));
            if (n.tagName === 'DETAILS' && n.hasAttribute('open')) c.setAttribute('open', '');
            limpar(n, c); destino.appendChild(c);
        });
    }
    function sanitizar(html) { var doc = new DOMParser().parseFromString('<body>' + String(html || '') + '</body>', 'text/html'), f = document.createDocumentFragment(); limpar(doc.body, f); return f; }

    /* ---------- seções ---------- */
    function capturar() {
        var out = []; [].slice.call(raiz.children).forEach(function (s, i) {
            var h = s.querySelector(':scope > h3'), u = h && h.querySelector('use'), ic = u ? String(u.getAttribute('href') || '').replace('#i-', '') : 'shield-check', tit = h ? h.textContent.trim() : 'Seção ' + (i + 1), corpo = '';
            [].slice.call(s.childNodes).forEach(function (n) { if (n !== h) corpo += n.nodeType === 1 ? n.outerHTML : (n.nodeType === 3 ? n.nodeValue : ''); });
            out.push({ id: 't' + (i + 1), titulo: tit, icone: ic, html: corpo.trim(), ativo: true });
        }); return out;
    }
    function desenharSecao(s) {
        var sec = el('section', 'notes-card tr-card'), h = el('h3', 'notes-title'); h.appendChild(C.icon(s.icone || 'shield-check')); h.appendChild(el('span', null, s.titulo)); sec.appendChild(h); sec.appendChild(sanitizar(s.html)); return sec;
    }
    function aplicar() {
        var d = C.estado && C.estado.dados && C.estado.dados.transparencia;
        if (d && Array.isArray(d.secoes) && d.secoes.length) {
            raiz.textContent = ''; d.secoes.filter(function (s) { return s.ativo !== false; }).forEach(function (s) { raiz.appendChild(desenharSecao(s)); }); aplicadoDoBanco = true;
        } else if (aplicadoDoBanco) { raiz.innerHTML = HTML_ORIGINAL; aplicadoDoBanco = false; }
        if (window.PortalDestacarCodigo) window.PortalDestacarCodigo();
    }
    document.addEventListener('portal:conteudo', aplicar);

    /* ---------- editor (Desenvolvedor > Transparência) ---------- */
    function btn(txt, ic, fn, cls) { var b = el('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (ic) b.appendChild(C.icon(ic, true)); b.appendChild(el('span', null, txt)); b.addEventListener('click', fn); return b; }
    async function editor(host, msg) {
        host.textContent = ''; msg = msg || function () { };
        var sb = C.sb(), r = await sb.from('portal_dados').select('valor').eq('chave', 'transparencia').maybeSingle();
        var salvo = !!(r.data && r.data.valor && Array.isArray(r.data.valor.secoes)), secoes = JSON.parse(JSON.stringify(salvo ? r.data.valor.secoes : ORIGINAL));
        host.appendChild(el('p', 'card-text', salvo ? 'Esta página já foi editada aqui. O que você salvar vale para todo mundo.' : 'A página ainda está com o texto original do código. Ao salvar, o texto abaixo passa a valer para todo mundo.'));
        host.appendChild(el('p', 'ger-hint', 'Cada bloco é uma seção da página. O texto aceita HTML simples: <p>, <strong>, <ul>/<ol>/<li>, <table>, <code>, <pre>, <details> e links https. Classes de estilo da página (tr-note, tr-list, tr-table…) são mantidas; scripts, imagens e estilos são removidos ao exibir.'));
        var barra = el('div', 'pf-barra'), lista = el('div'); host.appendChild(barra); host.appendChild(lista);
        barra.appendChild(btn('Salvar alterações', 'check', async function () {
            if (secoes.some(function (s) { return !String(s.titulo || '').trim(); })) return msg('Toda seção precisa de um título.', false);
            var v = { versao: 1, secoes: secoes.map(function (s, i) { return { id: s.id || 't' + (i + 1), titulo: String(s.titulo).trim(), icone: sinc(s) || 'shield-check', html: s.html || '', ativo: s.ativo !== false }; }) };
            var x = await sb.from('portal_dados').upsert([{ chave: 'transparencia', valor: v }], { onConflict: 'chave' }).select(); if (x.error) return msg(C.erroBanco(x.error), false);
            msg('Transparência salva. Já vale para todos.', true); await C.recarregar();
        }, 'btn btn--primary btn--sm'));
        barra.appendChild(btn('Adicionar seção', 'plus', function () { secoes.push({ id: 't' + Date.now().toString(36), titulo: 'Nova seção', icone: 'info', html: '<p>Texto da seção.</p>', ativo: true }); pintar(); }));
        barra.appendChild(btn('Voltar ao texto original', 'history', async function () {
            if (!confirm('Descartar todas as edições e voltar ao texto que vem no código do portal?')) return;
            var x = await sb.from('portal_dados').delete().eq('chave', 'transparencia').select(); if (x.error) return msg(C.erroBanco(x.error), false);
            msg('Voltou ao texto original.', true); await C.recarregar(); editor(host, msg);
        }));
        function sinc(s) { if (s._ic) { var v = s._ic(); if (v) s.icone = v; } return s.icone; }
        function pintar() {
            secoes.forEach(sinc); lista.textContent = '';
            secoes.forEach(function (s, i) {
                var card = el('fieldset', 'pf-sec-ed'); card.appendChild(el('legend', null, 'Seção ' + (i + 1) + (s.ativo === false ? ' (escondida)' : '')));
                var t = C.campo('Título', s.titulo, 150), ic = C.seletorIcone('Ícone', s.icone), h = C.campo('Texto (HTML)', s.html, 60000, '', 12); h.i.classList.add('dev-json'); h.i.spellcheck = false;
                t.i.addEventListener('input', function () { s.titulo = t.i.value; }); h.i.addEventListener('input', function () { s.html = h.i.value; });
                card.appendChild(t.n); card.appendChild(ic.n); card.appendChild(h.n);
                s._ic = ic.get;
                var pv = el('div', 'tr-wrap'); pv.hidden = true; var ac = el('div', 'cm-acoes');
                ac.appendChild(btn('Pré-visualizar', 'eye', function () { sinc(s); s.titulo = t.i.value; s.html = h.i.value; pv.textContent = ''; pv.appendChild(desenharSecao(s)); pv.hidden = !pv.hidden; if (!pv.hidden && window.PortalDestacarCodigo) window.PortalDestacarCodigo(); }));
                var ck = el('label', 'cm-check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = s.ativo !== false; cb.addEventListener('change', function () { s.ativo = cb.checked; pintar(); }); ck.appendChild(cb); ck.appendChild(el('span', null, 'Mostrar esta seção')); ac.appendChild(ck);
                if (i > 0) ac.appendChild(btn('Subir', 'chevron-up', function () { secoes.splice(i - 1, 0, secoes.splice(i, 1)[0]); pintar(); }));
                if (i < secoes.length - 1) ac.appendChild(btn('Descer', 'chevron-down', function () { secoes.splice(i + 1, 0, secoes.splice(i, 1)[0]); pintar(); }));
                ac.appendChild(btn('Excluir', 'trash-2', function () { if (confirm('Excluir a seção "' + s.titulo + '"?')) { secoes.splice(i, 1); pintar(); } }));
                card.appendChild(ac); card.appendChild(pv); lista.appendChild(card);
            });
            if (!secoes.length) lista.appendChild(el('p', 'card-text', 'Nenhuma seção. Adicione uma ou volte ao texto original.'));
        }
        pintar();
    }
    window.PortalTransparencia = { editor: editor, sanitizar: sanitizar, original: function () { return ORIGINAL; } };
})();
