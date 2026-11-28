/* Uso do portal: contadores ANÔNIMOS por dia (acessos e análises do Agente Sabre).
   - Cada navegador conta no máximo 1 acesso por dia; nada identifica a pessoa.
   - Cada análise do Sabre soma +1; o texto colado nunca sai do navegador.
   - Os números mostrados são os reais, sem ajuste.  Precisa do SQL 23; sem ele, tudo funciona e o cartão avisa. */
(function () {
    'use strict';
    var DIA_KEY = 'suporteLuaUsoDia', ultimoSabre = 0, cache = null, cacheTs = 0;
    function sb() { return window.suporteLuaSb || (window.PortalCore && window.PortalCore.sb && window.PortalCore.sb()) || null; }
    function hoje() { var d = new Date(); try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d); } catch (e) { return d.toISOString().slice(0, 10); } }
    function registrar(tipo) { var c = sb(); if (!c) return Promise.resolve(false); return Promise.resolve(c.rpc('registrar_uso', { p_tipo: tipo })).then(function (r) { cache = null; return !(r && r.error); }, function () { return false; }); }

    /* 1 acesso por navegador por dia */
    function contarAcesso(tentativa) {
        var h = hoje(), ja = null; try { ja = localStorage.getItem(DIA_KEY); } catch (e) { return; }
        if (ja === h) return;
        if (!sb()) { if ((tentativa || 0) < 20) setTimeout(function () { contarAcesso((tentativa || 0) + 1); }, 750); return; }
        registrar('acesso').then(function (ok) { if (ok) { try { localStorage.setItem(DIA_KEY, h); } catch (e) { } } });
    }
    /* análise do Sabre: o resumo é redesenhado a cada análise */
    function vigiarSabre() {
        var r = document.getElementById('sbResumo'); if (!r || !window.MutationObserver) return;
        new MutationObserver(function () {
            if (!r.firstElementChild && !r.textContent.trim()) return;
            var t = Date.now(); if (t - ultimoSabre < 4000) return; ultimoSabre = t; registrar('sabre'); cache = null;
        }).observe(r, { childList: true });
    }

    function buscar(dias) {
        if (cache && Date.now() - cacheTs < 60000) return Promise.resolve(cache);
        var c = sb(); if (!c) return Promise.resolve({ erro: true });
        return Promise.resolve(c.rpc('uso_portal', { p_dias: dias || 30 })).then(function (r) {
            if (!r || r.error) return { erro: true, semFuncao: /uso_portal|function|schema cache/i.test((r && r.error && r.error.message) || '') };
            cache = { linhas: r.data || [] }; cacheTs = Date.now(); return cache;
        }, function () { return { erro: true }; });
    }
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function fmt(n) { return Number(n || 0).toLocaleString('pt-BR'); }
    function dm(iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; }

    /* desenha o cartão dentro de "host" (usado na Transparência e no painel de administração) */
    function cartao(host, opts) {
        opts = opts || {}; host.textContent = '';
        var corpo = el('div', 'uso-corpo'); corpo.appendChild(el('p', 'uso-msg', 'Carregando números de uso…')); host.appendChild(corpo);
        buscar(30).then(function (d) {
            corpo.textContent = '';
            if (d.erro) { corpo.appendChild(el('p', 'uso-msg', d.semFuncao ? 'Os contadores ainda não foram ativados neste portal (falta rodar o SQL 23).' : 'Não foi possível carregar os números de uso agora.')); return; }
            var por = { acesso: {}, sabre: {} }; d.linhas.forEach(function (l) { if (por[l.tipo]) por[l.tipo][l.dia] = Number(l.n); });
            var dias = []; var base = new Date(hoje() + 'T12:00:00'); for (var i = 13; i >= 0; i--) { var x = new Date(base.getTime() - i * 86400000); dias.push(x.toISOString().slice(0, 10)); }
            var soma = function (t, lista) { return lista.reduce(function (a, k) { return a + (por[t][k] || 0); }, 0); };
            var todos30 = Object.keys(por.acesso).concat(Object.keys(por.sabre));
            var h = hoje(), a14 = soma('acesso', dias), s14 = soma('sabre', dias);
            var tiles = el('div', 'uso-tiles');
            [['Acessos hoje', fmt(por.acesso[h] || 0)], ['Média diária (14 dias)', fmt(Math.round(a14 / 14))], ['Acessos em 14 dias', fmt(a14)], ['Análises Sabre hoje', fmt(por.sabre[h] || 0)], ['Análises Sabre (14 dias)', fmt(s14)]].forEach(function (t) {
                var c = el('div', 'uso-tile'); c.appendChild(el('strong', null, t[1])); c.appendChild(el('span', null, t[0])); tiles.appendChild(c);
            });
            corpo.appendChild(tiles);
            var max = Math.max.apply(null, dias.map(function (k) { return por.acesso[k] || 0; }).concat([1]));
            var graf = el('div', 'uso-graf'); graf.setAttribute('role', 'img'); graf.setAttribute('aria-label', 'Acessos por dia nos últimos 14 dias');
            dias.forEach(function (k) {
                var v = por.acesso[k] || 0, col = el('div', 'uso-col'), barra = el('span', 'uso-barra' + (k === h ? ' is-hoje' : '')); barra.style.height = Math.max(v ? 6 : 2, Math.round(v / max * 100)) + '%'; barra.title = dm(k) + ': ' + fmt(v) + ' acessos';
                col.appendChild(el('em', 'uso-val', v ? fmt(v) : '')); col.appendChild(barra); col.appendChild(el('small', null, dm(k).slice(0, 2))); graf.appendChild(col);
            });
            corpo.appendChild(graf);
            if (!todos30.length) corpo.appendChild(el('p', 'uso-msg', 'Os contadores começaram agora; os números vão aparecendo conforme o portal é usado.'));
            corpo.appendChild(el('p', 'uso-nota', 'Números reais e anônimos: cada navegador conta no máximo 1 acesso por dia (por isso é uma estimativa de pessoas, não de cliques) e cada análise do Agente Sabre conta 1. Nenhum nome, BP, IP ou texto analisado é guardado.'));
        });
    }
    window.PortalUso = { cartao: cartao };

    /* cartão fixo da Transparência */
    var tr = document.getElementById('trUso');
    if (tr) { var h2 = tr.querySelector('.uso-host'); if (h2) { var pintar = function () { cartao(h2); }; document.addEventListener('portal:aba', function (e) { if (e && e.detail === 'transparencia') pintar(); }); pintar(); } }
    contarAcesso(0); vigiarSabre();
})();
