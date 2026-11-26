/* Cronômetro e alarme do Painel de Anotações.
   O agente escolhe quantos minutos OU um horário específico; ao chegar a hora toca um alarme (e aparece um aviso em qualquer aba do portal).
   Fica salvo só neste navegador (localStorage), como o resto das anotações. */
(function () {
    'use strict';
    var KEY = 'suporteLuaCrono', MAX = 5, SNOOZE_MIN = 5, TOCA_MAX_MS = 90000;
    var painel = document.getElementById('anotacoes'); if (!painel) return;

    function $(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function ic(n) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s; }
    function btn(txt, icone, fn, cls) { var b = $('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (icone) b.appendChild(ic(icone)); b.appendChild($('span', null, txt)); b.addEventListener('click', fn); return b; }
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function hhmm(ms) { var d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }
    function fmt(ms) { var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s = s % 60; return (h ? h + ':' + p2(m) : p2(m)) + ':' + p2(s); }

    /* ---------- dados ---------- */
    var lista = [];
    try { var r = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(r)) lista = r.filter(function (x) { return x && isFinite(x.fim); }).slice(0, MAX).map(function (x) { return { id: String(x.id || Math.random()), fim: +x.fim, rot: String(x.rot || '').slice(0, 40), tocou: !!x.tocou, mudo: !!x.mudo }; }); } catch (e) { }
    function salvar() { try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { } }

    /* ---------- som (Web Audio; precisa ser "destravado" por um clique, por isso o ctx nasce no botão Iniciar) ---------- */
    var ctx = null, somTimer = null, somFim = 0;
    function destravar() { try { var A = window.AudioContext || window.webkitAudioContext; if (!A) return; if (!ctx) ctx = new A(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { } }
    function bip(t0, f, dur) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02); }
    function rajada() { if (!ctx) return; try { var t = ctx.currentTime + 0.02; [0, 0.28, 0.56].forEach(function (d, i) { bip(t + d, i === 2 ? 1175 : 880, 0.2); }); } catch (e) { } if (navigator.vibrate) { try { navigator.vibrate([200, 100, 200, 100, 200]); } catch (e) { } } }
    function tocar() { if (somTimer) return; destravar(); somFim = Date.now() + TOCA_MAX_MS; rajada(); somTimer = setInterval(function () { if (Date.now() > somFim) return parar(true); rajada(); }, 1500); }
    function parar() { if (somTimer) { clearInterval(somTimer); somTimer = null; } }

    /* ---------- tela: cartão no painel de anotações ---------- */
    var card = $('section', 'notes-card cr-card'); card.setAttribute('aria-labelledby', 'crTit');
    var h = $('h3', 'notes-title'); h.id = 'crTit'; h.appendChild(ic('alarm-clock')); h.firstChild.setAttribute('class', 'ic'); h.appendChild($('span', null, 'Cronômetro e alarme')); card.appendChild(h);
    card.appendChild($('p', 'cr-ajuda', 'Escolha em quantos minutos o alarme deve tocar, ou um horário específico. Deixe esta página aberta: o aviso aparece em qualquer aba do portal.'));

    var modo = 'min';
    var seg = $('div', 'cr-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Como definir o alarme');
    var bMin = btn('Em minutos', 'timer', function () { setModo('min'); }, 'cr-seg-b'), bHor = btn('Em um horário', 'clock', function () { setModo('hora'); }, 'cr-seg-b');
    seg.appendChild(bMin); seg.appendChild(bHor); card.appendChild(seg);

    var form = $('form', 'cr-form'); form.autocomplete = 'off';
    var gMin = $('div', 'cr-grupo'), lm = $('label', null, 'Minutos'); lm.htmlFor = 'crMin';
    var inMin = $('input', 'login-input cr-num'); inMin.id = 'crMin'; inMin.type = 'number'; inMin.min = '1'; inMin.max = '720'; inMin.step = '1'; inMin.inputMode = 'numeric'; inMin.placeholder = '10'; inMin.value = '10';
    var pre = $('div', 'cr-pre'); [1, 5, 10, 15, 30, 60].forEach(function (m) { var b = $('button', 'cr-chip', m + (m === 60 ? ' h' : ' min')); if (m === 60) b.textContent = '1 h'; b.type = 'button'; b.addEventListener('click', function () { inMin.value = m; }); pre.appendChild(b); });
    gMin.appendChild(lm); gMin.appendChild(inMin); gMin.appendChild(pre);
    var gHor = $('div', 'cr-grupo'), lh = $('label', null, 'Horário'); lh.htmlFor = 'crHora';
    var inHor = $('input', 'login-input cr-num'); inHor.id = 'crHora'; inHor.type = 'time';
    var dica = $('p', 'cr-dica', 'Se o horário já passou hoje, o alarme toca amanhã.');
    gHor.appendChild(lh); gHor.appendChild(inHor); gHor.appendChild(dica);
    var gRot = $('div', 'cr-grupo'), lr = $('label', null, 'Lembrete (opcional)'); lr.htmlFor = 'crRot';
    var inRot = $('input', 'login-input'); inRot.id = 'crRot'; inRot.type = 'text'; inRot.maxLength = 40; inRot.placeholder = 'Ex.: Retornar ligação, intervalo, pausa';
    gRot.appendChild(lr); gRot.appendChild(inRot);
    var ok = $('button', 'btn btn--primary btn--sm cr-go'); ok.type = 'submit'; ok.appendChild(ic('plus')); ok.appendChild($('span', null, 'Iniciar'));
    var erro = $('p', 'cr-erro'); erro.hidden = true; erro.setAttribute('role', 'alert');
    form.appendChild(gMin); form.appendChild(gHor); form.appendChild(gRot); form.appendChild(ok); form.appendChild(erro); card.appendChild(form);
    function setModo(m) { modo = m; gMin.hidden = m !== 'min'; gHor.hidden = m !== 'hora'; bMin.setAttribute('aria-pressed', m === 'min'); bHor.setAttribute('aria-pressed', m === 'hora'); erro.hidden = true; }
    setModo('min');

    var ul = $('ul', 'cr-lista'); ul.setAttribute('aria-live', 'off'); card.appendChild(ul);
    var vazio = $('p', 'cr-vazio', 'Nenhum alarme ativo.'); card.appendChild(vazio);
    var notaNav = $('p', 'cr-dica', 'O som só toca se esta página estiver aberta no navegador. Se o navegador pedir, permita as notificações para receber o aviso mesmo em outra janela.'); card.appendChild(notaNav);

    var grade = painel.querySelector('.notes-grid');
    if (grade && grade.parentNode) grade.parentNode.insertBefore(card, grade.nextSibling); else painel.appendChild(card);

    function falha(t) { erro.textContent = t; erro.hidden = false; }
    form.addEventListener('submit', function (e) {
        e.preventDefault(); erro.hidden = true; destravar();
        if (lista.length >= MAX) return falha('Limite de ' + MAX + ' alarmes ao mesmo tempo. Cancele algum para criar outro.');
        var fim, rot = inRot.value.trim();
        if (modo === 'min') {
            var m = parseFloat(String(inMin.value).replace(',', '.')); if (!isFinite(m) || m < 1 || m > 720) return falha('Digite de 1 a 720 minutos.');
            fim = Date.now() + Math.round(m * 60000);
        } else {
            var v = inHor.value; if (!/^\d{2}:\d{2}$/.test(v)) return falha('Escolha um horário.');
            var d = new Date(); d.setHours(+v.slice(0, 2), +v.slice(3, 5), 0, 0); if (d.getTime() <= Date.now() + 1000) d.setDate(d.getDate() + 1); fim = d.getTime();
        }
        lista.push({ id: String(Date.now()) + Math.random().toString(36).slice(2, 6), fim: fim, rot: rot, tocou: false, mudo: false }); salvar();
        inRot.value = ''; pedirNotificacao(); desenhar(); tick();
    });

    function pedirNotificacao() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { } }
    function notificar(x) { try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) { var n = new Notification('⏰ Alarme do Portal Suporte Lua', { body: x.rot || 'O tempo acabou.', tag: 'cr-' + x.id }); n.onclick = function () { window.focus(); n.close(); }; } } catch (e) { } }

    /* ---------- lista ---------- */
    var refs = {};
    function desenhar() {
        ul.textContent = ''; refs = {};
        lista.slice().sort(function (a, b) { return a.fim - b.fim; }).forEach(function (x) {
            var li = $('li', 'cr-item'), tempo = $('span', 'cr-tempo'), info = $('div', 'cr-info');
            info.appendChild($('strong', null, x.rot || 'Alarme')); var sub = $('span', 'cr-sub'); info.appendChild(sub);
            var ac = $('div', 'cr-acoes');
            ac.appendChild(btn('+5 min', null, function () { x.fim = Math.max(x.fim, Date.now()) + 5 * 60000; x.tocou = false; parar(); salvar(); desenhar(); tick(); }, 'btn btn--ghost btn--sm'));
            var cancel = btn('', 'x', function () { lista = lista.filter(function (z) { return z !== x; }); if (!lista.some(function (z) { return z.tocou && Date.now() >= z.fim && !z.mudo; })) parar(); salvar(); desenhar(); tick(); }, 'ger-ico-btn cr-x'); cancel.setAttribute('aria-label', 'Cancelar este alarme'); cancel.title = 'Cancelar'; ac.appendChild(cancel);
            li.appendChild(tempo); li.appendChild(info); li.appendChild(ac); ul.appendChild(li); refs[x.id] = { li: li, tempo: tempo, sub: sub, x: x };
        });
        vazio.hidden = !!lista.length; atualizarChip();
    }

    /* ---------- aviso fixo (aparece em qualquer aba) ---------- */
    var chip = $('button', 'cr-chip-fixo'); chip.type = 'button'; chip.hidden = true; chip.appendChild(ic('alarm-clock')); var chipTxt = $('span'); chip.appendChild(chipTxt);
    chip.addEventListener('click', function () { if (typeof openTab === 'function') { try { openTab('anotacoes'); } catch (e) { } } card.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    document.body.appendChild(chip);
    var alerta = $('div', 'cr-alerta'); alerta.hidden = true; alerta.setAttribute('role', 'alertdialog'); alerta.setAttribute('aria-live', 'assertive');
    var alIc = $('span', 'cr-alerta-ic'); alIc.appendChild(ic('bell')); var alTx = $('div', 'cr-alerta-tx'), alT = $('strong'), alS = $('span'); alTx.appendChild(alT); alTx.appendChild(alS);
    var alBt = $('div', 'cr-alerta-bt');
    alBt.appendChild(btn('Parar', 'bell-off', function () { silenciar(); }, 'btn btn--primary btn--sm'));
    alBt.appendChild(btn('Adiar ' + SNOOZE_MIN + ' min', 'timer', function () { adiar(); }));
    alerta.appendChild(alIc); alerta.appendChild(alTx); alerta.appendChild(alBt); document.body.appendChild(alerta);
    function tocando() { return lista.filter(function (x) { return x.tocou && !x.mudo && Date.now() >= x.fim; }); }
    function silenciar() { parar(); lista.forEach(function (x) { if (x.tocou && Date.now() >= x.fim) x.mudo = true; }); lista = lista.filter(function (x) { return !(x.mudo && Date.now() >= x.fim); }); salvar(); desenhar(); tick(); }
    function adiar() { parar(); lista.forEach(function (x) { if (x.tocou && !x.mudo && Date.now() >= x.fim) { x.fim = Date.now() + SNOOZE_MIN * 60000; x.tocou = false; } }); salvar(); desenhar(); tick(); }
    function atualizarChip() {
        var ativos = lista.filter(function (x) { return Date.now() < x.fim; }).sort(function (a, b) { return a.fim - b.fim; });
        var noPainel = !painel.hidden;
        chip.hidden = !ativos.length || noPainel || !!tocando().length;
        if (ativos.length) chipTxt.textContent = fmt(ativos[0].fim - Date.now()) + (ativos.length > 1 ? ' (+' + (ativos.length - 1) + ')' : '');
    }
    var tituloOrig = document.title, piscar = false;

    function tick() {
        var agora = Date.now(), tc = [];
        lista.forEach(function (x) {
            var r = refs[x.id]; if (!r) return;
            var resta = x.fim - agora;
            if (resta > 0) { r.tempo.textContent = fmt(resta); r.sub.textContent = 'Toca às ' + hhmm(x.fim); r.li.classList.remove('is-toca'); }
            else {
                if (!x.tocou) { x.tocou = true; salvar(); if (agora - x.fim < 30 * 60000) { tocar(); notificar(x); } else x.mudo = true; }
                r.tempo.textContent = '00:00'; r.sub.textContent = x.mudo ? 'Terminou às ' + hhmm(x.fim) : 'O tempo acabou!'; r.li.classList.toggle('is-toca', !x.mudo);
            }
        });
        tc = tocando();
        alerta.hidden = !tc.length;
        if (tc.length) { alT.textContent = tc[0].rot || 'O tempo acabou!'; alS.textContent = tc.length > 1 ? tc.length + ' alarmes tocando' : 'Alarme das ' + hhmm(tc[0].fim); piscar = !piscar; document.title = (piscar ? '⏰ ' : '') + tituloOrig; }
        else if (document.title !== tituloOrig) document.title = tituloOrig;
        if (!tc.length && somTimer) parar();
        atualizarChip();
    }
    document.addEventListener('visibilitychange', tick);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.dock-tile, .mini-tab')) setTimeout(atualizarChip, 80); });
    window.addEventListener('hashchange', function () { setTimeout(atualizarChip, 80); });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { try { var r2 = JSON.parse(e.newValue || '[]'); if (Array.isArray(r2)) { lista = r2.slice(0, MAX); desenhar(); tick(); } } catch (x) { } } });

    desenhar(); tick(); setInterval(tick, 500);
    window.PortalCronometro = { lista: function () { return lista.slice(); } };
})();
