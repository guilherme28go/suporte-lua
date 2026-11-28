/* Ferramentas rápidas do Painel de Anotações: calculadora e calendário (+ o alarme que já existe).
   Aparecem no painel #anotacoes e também na janela flutuante (quadro fixo e janela "sempre à frente"), nas abas Calc, Calendário e Alarme.
   Nada é enviado a servidor: tudo roda no navegador. A calculadora não usa eval (tem analisador próprio). */
(function () {
    'use strict';
    var painel = document.getElementById('anotacoes'), pop = document.getElementById('notasPop');
    if (!painel) return;

    function $(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function ic(n, cls) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', cls || 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s; }
    function btn(txt, icone, fn, cls, rotulo) { var b = $('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (icone) b.appendChild(ic(icone)); if (txt) b.appendChild($('span', null, txt)); if (rotulo) { b.setAttribute('aria-label', rotulo); b.title = rotulo; } b.addEventListener('click', fn); return b; }
    function p2(n) { return (n < 10 ? '0' : '') + n; }

    /* ======================= CALCULADORA ======================= */
    function calcular(txt) {
        var s = String(txt).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\./g, function () { return '.'; });
        if (!s) return { vazio: true };
        if (/[^0-9.,+\-*/()%]/.test(s)) return { erro: 'Use só números e + − × ÷ ( ) %' };
        var i = 0;
        function erro(m) { var e = new Error(m); e.msg = m; throw e; }
        function num() {
            var m = /^[0-9]*[.,]?[0-9]*/.exec(s.slice(i))[0];
            if (!m || m === '.' || m === ',') erro('Faltou um número');
            i += m.length; return parseFloat(m.replace(',', '.'));
        }
        function fator() {
            var c = s.charAt(i), r;
            if (c === '-') { i++; r = fator(); return { v: -r.v, pct: r.pct }; }
            if (c === '+') { i++; return fator(); }
            if (c === '(') { i++; var v = soma(); if (s.charAt(i) !== ')') erro('Faltou fechar o parêntese'); i++; r = { v: v, pct: false }; }
            else r = { v: num(), pct: false };
            if (s.charAt(i) === '%') { i++; r = { v: r.v / 100, pct: true, base: r.v }; }
            return r;
        }
        function termo() {
            var a = fator();
            while (s.charAt(i) === '*' || s.charAt(i) === '/') {
                var op = s.charAt(i++), b = fator();
                if (op === '/') { if (b.v === 0) erro('Divisão por zero'); a = { v: a.v / b.v, pct: false }; } else a = { v: a.v * b.v, pct: false };
            }
            return a;
        }
        function soma() {
            var a = termo().v, ini = true;
            while (s.charAt(i) === '+' || s.charAt(i) === '-') {
                var op = s.charAt(i++), b = termo();
                var val = b.pct ? a * b.v : b.v; /* 100 + 10% = 110 */
                a = op === '+' ? a + val : a - val; ini = false;
            }
            return a;
        }
        try {
            var v = soma(); if (i < s.length) erro('Expressão incompleta');
            if (!isFinite(v)) return { erro: 'Resultado inválido' };
            return { v: parseFloat(v.toPrecision(12)) };
        } catch (e) { return { erro: e.msg || 'Expressão inválida' }; }
    }
    function fmtNum(v) { return v.toLocaleString('pt-BR', { maximumFractionDigits: 6 }); }
    function copiarTexto(t, doc) {
        try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return falha(); }); } catch (e) { }
        return Promise.resolve(falha());
        function falha() { try { var d = doc || document, ta = d.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select(); var ok = d.execCommand('copy'); d.body.removeChild(ta); return ok; } catch (e) { return false; } }
    }

    function montarCalc() {
        var raiz = $('div', 'ft-calc');
        var tela = $('input', 'login-input ft-calc-tela'); tela.type = 'text'; tela.autocomplete = 'off'; tela.spellcheck = false; tela.inputMode = 'none'; tela.placeholder = '0'; tela.setAttribute('aria-label', 'Conta');
        var res = $('output', 'ft-calc-res', ''); res.setAttribute('aria-live', 'polite');
        var ultimo = null, hist = [];
        raiz.appendChild(tela); raiz.appendChild(res);
        function mostrar() {
            var r = calcular(tela.value);
            if (r.vazio) { res.textContent = ' '; ultimo = null; }
            else if (r.erro) { res.textContent = /[+\-*/×÷−(,.]$/.test(tela.value.trim()) ? ' ' : r.erro; ultimo = null; }
            else { ultimo = r.v; res.textContent = '= ' + fmtNum(r.v); }
            res.classList.toggle('is-erro', !!r.erro && res.textContent.trim() !== '');
        }
        function inserir(t) {
            var a = tela.selectionStart == null ? tela.value.length : tela.selectionStart, b = tela.selectionEnd == null ? a : tela.selectionEnd;
            tela.setRangeText(t, a, b, 'end'); mostrar(); try { tela.focus({ preventScroll: true }); } catch (e) { }
        }
        function igual() {
            var r = calcular(tela.value); if (r.vazio) return;
            if (r.erro) { res.textContent = r.erro; return; }
            hist.unshift({ c: tela.value.trim(), v: r.v }); hist = hist.slice(0, 5); desenharHist();
            tela.value = String(r.v).replace('.', ','); mostrar();
        }
        tela.addEventListener('input', function () { tela.value = tela.value.replace(/[^0-9.,+\-*/()%×÷−\s]/g, ''); mostrar(); });
        tela.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); igual(); }
            else if (e.key === 'Escape') { tela.value = ''; mostrar(); }
        });
        var teclas = [['C', 'C'], ['(', '('], [')', ')'], ['⌫', 'DEL'], ['7'], ['8'], ['9'], ['÷'], ['4'], ['5'], ['6'], ['×'], ['1'], ['2'], ['3'], ['−'], ['0'], [','], ['%'], ['+']];
        var gr = $('div', 'ft-calc-teclas');
        teclas.forEach(function (k) {
            var t = k[0], cod = k[1] || t, b = $('button', 'ft-tecla' + (/[÷×−+]/.test(t) ? ' is-op' : (cod === 'C' || cod === 'DEL' ? ' is-ctl' : '')), t);
            b.type = 'button'; if (cod === 'DEL') b.setAttribute('aria-label', 'Apagar o último'); if (cod === 'C') b.setAttribute('aria-label', 'Limpar tudo');
            b.addEventListener('click', function () {
                if (cod === 'C') { tela.value = ''; mostrar(); try { tela.focus({ preventScroll: true }); } catch (e) { } }
                else if (cod === 'DEL') { var a = tela.selectionStart, z = tela.selectionEnd; if (a != null && a !== z) tela.setRangeText('', a, z, 'end'); else if (a != null && a > 0) tela.setRangeText('', a - 1, a, 'end'); mostrar(); }
                else inserir(t);
            });
            gr.appendChild(b);
        });
        var eq = $('button', 'ft-tecla is-igual', '='); eq.type = 'button'; eq.setAttribute('aria-label', 'Calcular'); eq.addEventListener('click', igual); gr.appendChild(eq);
        raiz.appendChild(gr);

        /* cotação: converte o resultado (ex.: tarifa em dólar → real) */
        var cot = $('div', 'ft-cot');
        var lc = $('label', null, 'Cotação'); var inCot = $('input', 'login-input'); inCot.type = 'text'; inCot.inputMode = 'decimal'; inCot.placeholder = 'Ex.: 5,40'; inCot.maxLength = 10; var idc = 'ftCot' + Math.random().toString(36).slice(2, 6); inCot.id = idc; lc.htmlFor = idc;
        function cotacao() { var v = parseFloat(String(inCot.value).replace(',', '.')); return isFinite(v) && v > 0 ? v : null; }
        function aplicarCot(mult) {
            var c = cotacao(); if (c == null) { res.textContent = 'Digite a cotação'; return; }
            var r = ultimo != null ? ultimo : (calcular(tela.value).v); if (r == null) { res.textContent = 'Faça uma conta primeiro'; return; }
            var n = parseFloat((mult ? r * c : r / c).toPrecision(12)); tela.value = String(n).replace('.', ','); mostrar();
        }
        cot.appendChild(lc); cot.appendChild(inCot);
        cot.appendChild(btn('× cot.', null, function () { aplicarCot(true); }, 'btn btn--outline btn--sm', 'Multiplicar o resultado pela cotação'));
        cot.appendChild(btn('÷ cot.', null, function () { aplicarCot(false); }, 'btn btn--outline btn--sm', 'Dividir o resultado pela cotação'));
        raiz.appendChild(cot);

        var acoes = $('div', 'ft-calc-acoes');
        acoes.appendChild(btn('Copiar resultado', 'copy', function () {
            var r = ultimo != null ? ultimo : calcular(tela.value).v; if (r == null) return;
            copiarTexto(String(r).replace('.', ','), tela.ownerDocument).then(function (ok) { res.textContent = ok ? 'Copiado: ' + String(r).replace('.', ',') : 'Não consegui copiar'; });
        }));
        raiz.appendChild(acoes);
        var lh = $('ul', 'ft-hist'); raiz.appendChild(lh);
        function desenharHist() {
            lh.textContent = '';
            hist.forEach(function (h) {
                var li = $('li'), b = $('button', 'ft-hist-b'); b.type = 'button'; b.title = 'Usar este resultado'; b.appendChild($('span', 'ft-hist-c', h.c)); b.appendChild($('strong', null, '= ' + fmtNum(h.v)));
                b.addEventListener('click', function () { inserir(String(h.v).replace('.', ',')); }); li.appendChild(b); lh.appendChild(li);
            });
        }
        return raiz;
    }

    /* ======================= CALENDÁRIO ======================= */
    var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    var DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    function dia(y, m, d) { return new Date(y, m, d, 12, 0, 0, 0); }
    function mesmo(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
    function pascoa(y) {
        var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
            h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
            mes = Math.floor((h + l - 7 * m + 114) / 31), di = ((h + l - 7 * m + 114) % 31) + 1;
        return dia(y, mes - 1, di);
    }
    var cacheFer = {};
    function feriados(y) {
        if (cacheFer[y]) return cacheFer[y];
        var f = {};
        function add(d, nome, fac) { f[d.getMonth() + '-' + d.getDate()] = { nome: nome, fac: !!fac }; }
        add(dia(y, 0, 1), 'Confraternização Universal'); add(dia(y, 3, 21), 'Tiradentes'); add(dia(y, 4, 1), 'Dia do Trabalho'); add(dia(y, 8, 7), 'Independência do Brasil');
        add(dia(y, 9, 12), 'Nossa Sra. Aparecida'); add(dia(y, 10, 2), 'Finados'); add(dia(y, 10, 15), 'Proclamação da República'); if (y >= 2024) add(dia(y, 10, 20), 'Consciência Negra'); add(dia(y, 11, 25), 'Natal');
        var p = pascoa(y);
        function mv(n, nome, fac) { var d = new Date(p.getTime()); d.setDate(d.getDate() + n); add(d, nome, fac); }
        mv(-48, 'Carnaval (ponto facultativo)', true); mv(-47, 'Carnaval (ponto facultativo)', true); mv(-2, 'Sexta-feira Santa'); mv(0, 'Páscoa'); mv(60, 'Corpus Christi (ponto facultativo)', true);
        cacheFer[y] = f; return f;
    }
    function feriado(d) { return feriados(d.getFullYear())[d.getMonth() + '-' + d.getDate()] || null; }
    function longa(d) { return DIAS[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
    function curta(d) { return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' (' + DIAS_C[d.getDay()] + ')'; }
    function diaDoAno(d) { return Math.round((d - dia(d.getFullYear(), 0, 1)) / 86400000) + 1; }
    function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
    function deIso(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? dia(+m[1], +m[2] - 1, +m[3]) : null; }

    function montarCal() {
        var hoje = new Date(), sel = dia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), vis = dia(sel.getFullYear(), sel.getMonth(), 1);
        var raiz = $('div', 'ft-cal');
        var topo = $('div', 'ft-cal-topo'), tit = $('strong', 'ft-cal-tit'); tit.setAttribute('aria-live', 'polite');
        topo.appendChild(btn('', 'chevron-left', function () { vis = dia(vis.getFullYear(), vis.getMonth() - 1, 1); desenhar(); }, 'btn btn--ghost btn--sm', 'Mês anterior'));
        topo.appendChild(tit);
        topo.appendChild(btn('', 'chevron-right', function () { vis = dia(vis.getFullYear(), vis.getMonth() + 1, 1); desenhar(); }, 'btn btn--ghost btn--sm', 'Próximo mês'));
        topo.appendChild(btn('Hoje', null, function () { var h = new Date(); sel = dia(h.getFullYear(), h.getMonth(), h.getDate()); vis = dia(sel.getFullYear(), sel.getMonth(), 1); desenhar(); }, 'btn btn--outline btn--sm'));
        raiz.appendChild(topo);
        var grade = $('div', 'ft-cal-grade'); grade.setAttribute('role', 'grid'); raiz.appendChild(grade);
        var info = $('p', 'ft-cal-info'); info.setAttribute('aria-live', 'polite'); raiz.appendChild(info);

        /* contas com datas */
        var caixa = $('div', 'ft-cal-conta');
        var l1 = $('label', null, 'Somar ou subtrair dias da data selecionada'); var idn = 'ftDias' + Math.random().toString(36).slice(2, 6); l1.htmlFor = idn;
        var lin = $('div', 'ft-cal-lin');
        var inD = $('input', 'login-input'); inD.type = 'number'; inD.id = idn; inD.min = '0'; inD.max = '3650'; inD.step = '1'; inD.inputMode = 'numeric'; inD.placeholder = 'Ex.: 7';
        var r1 = $('p', 'ft-cal-res');
        function somar(sinal) {
            var n = parseInt(inD.value, 10); if (!isFinite(n)) { r1.textContent = 'Digite quantos dias.'; return; }
            var d = new Date(sel.getTime()); d.setDate(d.getDate() + sinal * n); r1.textContent = (sinal > 0 ? '+' : '−') + n + ' dias = ' + curta(d) + (feriado(d) ? ' · ' + feriado(d).nome : '');
            r1.dataset.alvo = iso(d);
        }
        lin.appendChild(inD); lin.appendChild(btn('+ dias', null, function () { somar(1); })); lin.appendChild(btn('− dias', null, function () { somar(-1); }));
        lin.appendChild(btn('Ir', null, function () { var d = deIso(r1.dataset.alvo); if (d) { sel = d; vis = dia(d.getFullYear(), d.getMonth(), 1); desenhar(); } }, 'btn btn--ghost btn--sm', 'Ir para a data do resultado'));
        caixa.appendChild(l1); caixa.appendChild(lin); caixa.appendChild(r1);
        var l2 = $('label', null, 'Dias entre a data selecionada e outra data'); var ida = 'ftAte' + Math.random().toString(36).slice(2, 6); l2.htmlFor = ida;
        var inA = $('input', 'login-input'); inA.type = 'date'; inA.id = ida;
        var r2 = $('p', 'ft-cal-res');
        function dif() {
            var d = deIso(inA.value); if (!d) { r2.textContent = ''; return; }
            var n = Math.round((d - sel) / 86400000), a = Math.abs(n), sem = Math.floor(a / 7), rest = a % 7;
            r2.textContent = n === 0 ? 'É o mesmo dia.' : a + (a === 1 ? ' dia ' : ' dias ') + (n > 0 ? 'depois' : 'antes') + (a >= 7 ? ' (' + sem + (sem === 1 ? ' semana' : ' semanas') + (rest ? ' e ' + rest + (rest === 1 ? ' dia' : ' dias') : '') + ')' : '') + ' · ' + curta(d);
        }
        inA.addEventListener('input', dif); caixa.appendChild(l2); caixa.appendChild(inA); caixa.appendChild(r2);
        raiz.appendChild(caixa);

        function desenhar() {
            tit.textContent = MESES[vis.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' de ' + vis.getFullYear();
            grade.textContent = '';
            DIAS_C.forEach(function (n) { var c = $('span', 'ft-cal-sem', n.charAt(0).toUpperCase() + n.slice(1)); c.setAttribute('role', 'columnheader'); grade.appendChild(c); });
            var ini = new Date(vis.getTime()); ini.setDate(1 - vis.getDay());
            var h = new Date(), hj = dia(h.getFullYear(), h.getMonth(), h.getDate());
            for (var i = 0; i < 42; i++) {
                var d = new Date(ini.getTime()); d.setDate(ini.getDate() + i);
                if (i >= 35 && d.getMonth() !== vis.getMonth()) break;
                var f = feriado(d), b = $('button', 'ft-cal-dia' + (d.getMonth() !== vis.getMonth() ? ' is-fora' : '') + (d.getDay() === 0 || d.getDay() === 6 ? ' is-fds' : '') + (f ? (f.fac ? ' is-fac' : ' is-fer') : '') + (mesmo(d, hj) ? ' is-hoje' : '') + (mesmo(d, sel) ? ' is-sel' : ''), String(d.getDate()));
                b.type = 'button'; b.setAttribute('aria-label', longa(d) + (f ? ' — ' + f.nome : '')); if (f) b.title = f.nome; if (mesmo(d, sel)) b.setAttribute('aria-pressed', 'true');
                (function (dd) { b.addEventListener('click', function () { sel = dd; if (dd.getMonth() !== vis.getMonth()) vis = dia(dd.getFullYear(), dd.getMonth(), 1); desenhar(); }); })(d);
                grade.appendChild(b);
            }
            var fs = feriado(sel), n = Math.round((sel - hj) / 86400000);
            info.textContent = longa(sel) + ' · dia ' + diaDoAno(sel) + ' do ano' + (n === 0 ? ' · hoje' : n > 0 ? ' · daqui a ' + n + (n === 1 ? ' dia' : ' dias') : ' · há ' + (-n) + (n === -1 ? ' dia' : ' dias')) + (fs ? ' · ' + fs.nome : '');
            dif();
        }
        desenhar();
        return raiz;
    }

    /* ======================= montagem ======================= */
    var card = $('section', 'notes-card ft-card'); card.setAttribute('aria-labelledby', 'ftTit');
    var h = $('h3', 'notes-title'); h.id = 'ftTit'; var hi = ic('calculator', 'ic'); h.appendChild(hi); h.appendChild($('span', null, 'Calculadora e calendário')); card.appendChild(h);
    card.appendChild($('p', 'cr-ajuda', 'Para conferir tarifas, prazos e datas de voo sem sair do portal. A janela flutuante também traz estas ferramentas e o alarme (abas Calc, Calendário e Alarme).'));
    var gr = $('div', 'ft-grid');
    var c1 = $('div', 'ft-bloco'); c1.appendChild($('h4', 'ft-sub', 'Calculadora')); c1.appendChild(montarCalc());
    var c2 = $('div', 'ft-bloco'); c2.appendChild($('h4', 'ft-sub', 'Calendário')); c2.appendChild(montarCal());
    gr.appendChild(c1); gr.appendChild(c2); card.appendChild(gr);
    var grade = painel.querySelector('.notes-grid');
    if (grade && grade.parentNode) grade.parentNode.insertBefore(card, grade.nextSibling); else painel.appendChild(card);

    /* janela flutuante: abas Calc / Calendário / Alarme */
    var cron = window.PortalCronometro && window.PortalCronometro.card, marca = null;
    if (cron && cron.parentNode) { marca = document.createComment('alarme'); cron.parentNode.insertBefore(marca, cron); }
    var paneCalc = document.getElementById('pp-calc'), paneCal = document.getElementById('pp-cal'), paneTimer = document.getElementById('pp-timer');
    if (paneCalc) paneCalc.appendChild(montarCalc());
    if (paneCal) paneCal.appendChild(montarCal());

    /* o alarme é UM só cartão: mora no painel e "viaja" para a janela flutuante quando a aba Alarme está aberta lá */
    window.PortalFerramentas = {
        sync: function (view, popAberto) {
            if (!cron || !marca || !marca.parentNode) return;
            var quer = !!(popAberto && view === 'timer' && paneTimer);
            if (quer && cron.parentNode !== paneTimer) paneTimer.appendChild(cron);
            else if (!quer && cron.parentNode === paneTimer) marca.parentNode.insertBefore(cron, marca.nextSibling);
        }
    };
    if (typeof window.__reaplicarPinNotas === 'function') window.__reaplicarPinNotas();
})();
