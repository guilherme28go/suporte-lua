/* Organiza o Painel de Anotações em abas: Anotações | Calculadora e calendário | Alarme.
   Só muda o que aparece (esconde/mostra os blocos que já existem); nada é apagado nem movido de lugar. A aba escolhida fica lembrada neste navegador. */
(function () {
    'use strict';
    var painel = document.getElementById('anotacoes'); if (!painel) return;
    var KEY = 'suporteLuaNotasAba';
    function $(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function ic(n) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s; }
    var ws = painel.querySelector('.ws-wrap'), grade = painel.querySelector('.notes-grid'), atalho = painel.querySelector('.notes-atalho'), ft = painel.querySelector('.ft-card');
    var cron = window.PortalCronometro && window.PortalCronometro.card;
    if (!grade) return;

    /* dica do atalho vira um bloco recolhido (a explicação longa só aparece se a pessoa quiser) */
    if (atalho && atalho.parentNode) {
        var det = $('details', 'notes-dicas'), sum = $('summary', null, 'Dica: atalho do teclado para a janela flutuante');
        det.appendChild(sum); atalho.parentNode.insertBefore(det, atalho); det.appendChild(atalho);
    }

    var ABAS = [['notas', 'Anotações', 'notebook-pen'], ['ferr', 'Calculadora e calendário', 'calculator'], ['alarme', 'Alarme', 'alarm-clock']];
    var aba = 'notas'; try { var s = localStorage.getItem(KEY); if (ABAS.some(function (a) { return a[0] === s; })) aba = s; } catch (e) { }
    var barra = $('div', 'np-abas-nav'); barra.setAttribute('role', 'group'); barra.setAttribute('aria-label', 'Seções do painel de anotações');
    var botoes = {};
    ABAS.forEach(function (a) {
        var b = $('button', 'np-aba-b'); b.type = 'button'; b.appendChild(ic(a[2])); b.appendChild($('span', null, a[1]));
        b.addEventListener('click', function () { mostrar(a[0]); }); botoes[a[0]] = b; barra.appendChild(b);
    });
    var ancora = ws || grade; ancora.parentNode.insertBefore(barra, ancora);
    var aviso = $('p', 'ft-vazio', 'O alarme está aberto na janela flutuante. Troque de aba lá (ou feche a janela) para trazê-lo de volta aqui.'); aviso.hidden = true;
    if (cron && cron.parentNode) cron.parentNode.insertBefore(aviso, cron);

    function aqui(n) { return n && painel.contains(n); }
    function mostrar(a) {
        aba = a; try { localStorage.setItem(KEY, a); } catch (e) { }
        ABAS.forEach(function (x) { botoes[x[0]].setAttribute('aria-pressed', String(x[0] === a)); });
        if (ws) ws.hidden = a !== 'notas'; grade.hidden = a !== 'notas';
        if (ft) ft.hidden = a !== 'ferr';
        if (cron) cron.hidden = aqui(cron) ? a !== 'alarme' : false; /* na janela flutuante o cartão sempre aparece */
        aviso.hidden = !(a === 'alarme' && cron && !aqui(cron));
    }
    mostrar(aba);

    /* o alarme "viaja" para a janela flutuante: mantém a aba coerente */
    if (window.PortalFerramentas && window.PortalFerramentas.sync) {
        var orig = window.PortalFerramentas.sync;
        window.PortalFerramentas.sync = function (v, o) { orig(v, o); mostrar(aba); };
    }
    /* o aviso fixo do alarme leva direto para a aba Alarme */
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.cr-chip-fixo')) mostrar('alarme'); }, true);
})();
