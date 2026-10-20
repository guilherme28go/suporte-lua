/* ==========================================================================
   SKELETON LOADERS
   Estruturas de "carregando" com o MESMO layout dos componentes finais (mesmas
   classes de cartão, tabela, script, linha do tempo…), com brilho suave (shimmer).
   O CSS fica em conteudo-admin.css (bloco "SKELETONS"). Respeita prefers-reduced-motion.

   window.PortalSkeleton:
     todos()            → preenche todos os [data-mount] ainda vazios (as abas do portal)
     preencher(host)    → preenche um contêiner de portal criado pelos desenvolvedores
     limpar()           → tira todos os esqueletos que sobraram
     formulario(), tabela(colunas, linhas), grafico(), resumo(n), barra(n)
                        → blocos soltos para modais e painéis (formulários, planilhas, respostas)
   Tudo é aria-hidden; o contêiner recebe aria-busy enquanto carrega.
   ========================================================================== */
(function () {
    'use strict';
    var L = [92, 68, 80, 55, 74, 62], CH = [74, 96, 84, 66, 90];   // larguras (%) e (px) variadas e estáveis

    function h(tag, cls, estilo) { var n = document.createElement(tag); if (cls) n.className = cls; if (estilo) n.setAttribute('style', estilo); return n; }
    function oculto(n) { n.setAttribute('data-skel', ''); n.setAttribute('aria-hidden', 'true'); return n; }
    function bloco(cls, w, hgt, extra) { return h('span', 'sk ' + cls, (w ? 'width:' + w + ';' : '') + (hgt ? 'height:' + hgt + ';' : '') + (extra || '')); }
    function linhas(pai, n, ini) { for (var i = 0; i < n; i++) { var p = h('p', 'card-text'); p.appendChild(bloco('sk-t', (i === n - 1 && n > 1 ? L[(ini + i + 3) % L.length] - 18 : L[(ini + i) % L.length]) + '%')); pai.appendChild(p); } return pai; }
    function botao(w) { return bloco('sk-btn', w + 'px'); }

    /* ---------- cartões ---------- */
    function cabeca(tit, ini) { var hd = h('div', 'card-head'); hd.appendChild(bloco('sk-ico')); if (tit) { var t = h('h3'); t.appendChild(bloco('sk-h', (46 + (ini * 9) % 22) + '%')); hd.appendChild(t); } return hd; }
    function cartao(tipo, i) {
        i = i || 0; var a = oculto(h('article', 'card sk-card'));
        if (tipo === 'sistema') {
            a.appendChild(cabeca(true, i)); linhas(a, 3, i);
            var au = h('div', 'auth'); au.appendChild(bloco('sk-t sk-label', '84px')); var ul = h('div', 'auth-list'); for (var k = 0; k < 3; k++) ul.appendChild(bloco('sk-chip', CH[(i + k) % CH.length] + 'px')); au.appendChild(ul); a.appendChild(au);
            var ac = h('div', 'card-actions'); ac.appendChild(botao(124)); ac.appendChild(botao(104)); a.appendChild(ac);
        } else if (tipo === 'aviso') {
            var hd = h('div', 'card-head'); hd.appendChild(bloco('sk-ico')); var ls = h('div', 'notice-list'); ls.style.flex = '1'; for (var j = 0; j < 2; j++) ls.appendChild(bloco('sk-t', L[(i + j) % L.length] + '%')); hd.appendChild(ls); a.appendChild(hd);
        } else if (tipo === 'cta') {
            var hc = h('div', 'card-head'); hc.appendChild(bloco('sk-ico')); var w = h('div'); w.style.flex = '1'; w.appendChild(bloco('sk-h', '48%', null, 'margin-bottom:10px;')); linhas(w, 2, i); hc.appendChild(w); a.appendChild(hc); var ac2 = h('div', 'card-actions'); ac2.appendChild(botao(150)); a.appendChild(ac2);
        } else if (tipo === 'pessoa') {
            var hp = h('div', 'card-head'); hp.appendChild(bloco('sk-ico')); var wp = h('div'); wp.style.flex = '1'; wp.appendChild(bloco('sk-h', '55%', null, 'margin-bottom:8px;')); wp.appendChild(bloco('sk-t', '85%')); hp.appendChild(wp); a.appendChild(hp);
        } else {                                  /* form, slide, livre */
            a.appendChild(cabeca(true, i)); linhas(a, tipo === 'livre' ? 3 : 2, i);
            var ac3 = h('div', 'card-actions'); ac3.appendChild(botao(tipo === 'slide' ? 118 : 132)); a.appendChild(ac3);
        }
        return a;
    }
    function legenda(i) { var li = oculto(h('li', 'sk-leg')); li.appendChild(bloco('sk-chip', CH[i % CH.length] + 'px')); li.appendChild(bloco('sk-t', L[i % L.length] + '%', null, 'margin-top:8px;')); return li; }
    function linhaTel(i) {
        var tr = oculto(h('tr', 'sk-tr')), t1 = h('td', 'td-name'), nc = h('div', 'name-cell'); nc.appendChild(bloco('sk-ico sk-ico--sm')); nc.appendChild(bloco('sk-t', (90 + (i * 17) % 80) + 'px', null, 'margin:0;')); t1.appendChild(nc);
        var t2 = h('td', 'td-desc'); t2.appendChild(bloco('sk-t', L[i % L.length] + '%', null, 'margin:0;')); t2.appendChild(bloco('sk-t sk-mais', '60%', null, 'margin:6px 0 0;'));
        var t3 = h('td', 'td-phone'), ph = h('div', 'phones'); for (var k = 0; k < 3; k++) ph.appendChild(bloco('sk-chip sk-chip--tel' + (k > (i % 2) ? ' sk-mais' : ''), (112 + k * 12) + 'px')); t3.appendChild(ph);
        tr.appendChild(t1); tr.appendChild(t2); tr.appendChild(t3); return tr;
    }
    function scriptCartao(i) {
        var a = oculto(h('article', 'sk-script')), hd = h('header', 'script-head'); hd.appendChild(bloco('sk-ico sk-ico--script'));
        var tt = h('div', 'script-title'); tt.appendChild(bloco('sk-h', (44 + (i * 11) % 24) + '%', null, 'margin-bottom:10px;')); tt.appendChild(bloco('sk-t', '26%', null, 'margin:0;')); hd.appendChild(tt); hd.appendChild(botao(138));
        var bd = h('div', 'script-body'), tx = h('div', 'sk-script-texto'); for (var k = 0; k < 6; k++) tx.appendChild(bloco('sk-t' + (k > 3 ? ' sk-mais' : ''), (k === 3 || k === 5 ? 46 : L[(i + k) % L.length]) + '%')); bd.appendChild(tx); a.appendChild(hd); a.appendChild(bd); return a;
    }
    function marco(i) { var li = oculto(h('li', 'timeline-item sk-marco')); li.appendChild(bloco('sk-h', (36 + (i * 13) % 26) + '%', null, 'margin-bottom:10px;')); li.appendChild(bloco('sk-t', L[i % L.length] + '%')); li.appendChild(bloco('sk-t', '58%')); return li; }

    /* ---------- o que vai em cada [data-mount] ---------- */
    function para(chave, m) {
        var k = String(chave || ''), i;
        function varios(n, f) { for (i = 0; i < n; i++) m.appendChild(f(i)); }
        if (k === 'sistemas') varios(6, function (j) { return cartao('sistema', j); });
        else if (k === 'forms') varios(6, function (j) { return cartao('form', j); });
        else if (k === 'slides') varios(6, function (j) { return cartao('slide', j); });
        else if (k === 'sistemas.legenda') varios(4, legenda);
        else if (k === 'slides.cta' || k === 'compartilhamentos.cta') m.appendChild(cartao('cta', 0));
        else if (k === 'compartilhamentos.pessoas') varios(3, function (j) { return cartao('pessoa', j); });
        else if (k === 'avisos' || k === 'futuras') varios(k === 'avisos' ? 2 : 2, function (j) { return cartao('aviso', j); });
        else if (k === 'telefones') varios(8, linhaTel);
        else if (k === 'scripts') { var g = oculto(h('div', 'sk-grupo')), ls = h('div', 'script-list'); for (i = 0; i < 3; i++) ls.appendChild(scriptCartao(i)); g.appendChild(ls); m.appendChild(g); }
        else if (k === 'cronologia') varios(4, marco);
        else return false;
        m.setAttribute('aria-busy', 'true'); return true;
    }
    function vazio(m) { return !m.firstChild; }
    function todos(forcar) {
        document.querySelectorAll('[data-mount]').forEach(function (m) { if (forcar) { m.textContent = ''; } if (vazio(m)) para(m.getAttribute('data-mount'), m); });
    }
    function preencher(g) { if (g && vazio(g)) { for (var i = 0; i < 3; i++) g.appendChild(cartao('livre', i)); g.setAttribute('aria-busy', 'true'); } }
    function limpar() {
        document.querySelectorAll('[data-mount] [data-skel], [data-portal] [data-skel]').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        document.querySelectorAll('[aria-busy]').forEach(function (n) { if ((n.hasAttribute('data-mount') || n.hasAttribute('data-portal')) && !n.querySelector('[data-skel]')) n.removeAttribute('aria-busy'); });
    }

    /* ---------- blocos soltos (modais e painéis) ---------- */
    function formulario() {
        var w = oculto(h('div', 'sk-form')); w.appendChild(bloco('sk-h sk-h--grande', '58%')); w.appendChild(bloco('sk-t', '92%')); w.appendChild(bloco('sk-t', '70%'));
        for (var i = 0; i < 3; i++) { var c = h('div', 'sk-campo'); c.appendChild(bloco('sk-t sk-label', (28 + i * 9) + '%')); c.appendChild(bloco('sk-input')); w.appendChild(c); }
        var ac = h('div', 'sk-acoes'); ac.appendChild(botao(110)); ac.appendChild(botao(140)); w.appendChild(ac); return w;
    }
    function resumo(n) { var w = oculto(h('div', 'sk-resumo')); for (var i = 0; i < (n || 5); i++) w.appendChild(bloco('sk-pill', (84 + (i * 14) % 40) + 'px')); return w; }
    function barra(n) { var w = oculto(h('div', 'sk-barra')); for (var i = 0; i < (n || 4); i++) w.appendChild(botao(88 + (i * 17) % 40)); return w; }
    function grafico() {
        var w = oculto(h('div', 'sk-grafico')); w.appendChild(bloco('sk-h', '34%', null, 'margin-bottom:14px;'));
        var barras = h('div', 'sk-barras'); [88, 64, 46, 30, 18].forEach(function (p, i) { var r = h('div', 'sk-barra-lin'); r.appendChild(bloco('sk-t', null, null, 'width:70px;margin:0;')); r.appendChild(bloco('sk-bar', p + '%')); barras.appendChild(r); }); w.appendChild(barras); return w;
    }
    function tabela(colunas, linhasN) {
        var w = oculto(h('div', 'sk-tabela table-card')), t = h('div', 'sk-tab-grade'), n = colunas || 5;
        t.style.setProperty('--sk-cols', n); var cab = h('div', 'sk-tab-lin sk-tab-cab'); for (var c = 0; c < n; c++) cab.appendChild(bloco('sk-t', (46 + (c * 13) % 36) + '%', null, 'margin:0;')); t.appendChild(cab);
        for (var r = 0; r < (linhasN || 7); r++) { var ln = h('div', 'sk-tab-lin'); for (var c2 = 0; c2 < n; c2++) ln.appendChild(bloco('sk-cel', (58 + ((r * 7 + c2 * 19) % 36)) + '%')); t.appendChild(ln); }
        w.appendChild(t); return w;
    }

    window.PortalSkeleton = { todos: todos, preencher: preencher, limpar: limpar, cartao: cartao, formulario: formulario, tabela: tabela, grafico: grafico, resumo: resumo, barra: barra };

    /* quando o conteúdo real chega, nada de esqueleto sobrando; e uma trava caso o banco demore demais */
    document.addEventListener('portal:conteudo', limpar);
    setTimeout(limpar, 25000);
    var estado = window.PortalCore && window.PortalCore.estado; if (!(estado && estado.pronto)) todos();
})();
