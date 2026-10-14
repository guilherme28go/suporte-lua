/* Painel de anotações */
(function () {
    'use strict';
    var KEY = 'suporteLuaNotas', KPIN = 'suporteLuaNotasPin';
    var BASE = [
        { id: 'nome', rot: 'Nome', tipo: 'text', ac: 'off', ph: 'Nome do cliente' },
        { id: 'email', rot: 'E-mail', tipo: 'email', ac: 'off', ph: 'cliente@email.com' },
        { id: 'cpf', rot: 'CPF', tipo: 'text', im: 'numeric', ac: 'off', ph: '000.000.000-00' },
        { id: 'tel', rot: 'Telefone', tipo: 'tel', im: 'tel', ac: 'off', ph: '(00) 00000-0000' }
    ];
    var BASE_SUP = [
        { id: 'sNome', rot: 'Nome do agente', tipo: 'text', ac: 'off', ph: 'Nome do agente' },
        { id: 'sBp', rot: 'BP', tipo: 'text', ac: 'off', ph: 'BP do agente' },
        { id: 'sSag', rot: 'SAG', tipo: 'text', ac: 'off', ph: 'SAG do agente' },
        { id: 'sLoc', rot: 'Localização', tipo: 'text', ac: 'off', ph: 'Localização do agente' },
        { id: 'sCall', rot: 'ID da chamada', tipo: 'text', ac: 'off', ph: 'ID da chamada' }
    ];
    function base() { return (window.suporteLuaAdmin && db.modo === 'suporte') ? BASE_SUP : BASE; }
    var MAXWS = 4;
    function novaAba() { return { livre: '', v: {} }; }
    function limpaAba(a) {
        a = a && typeof a === 'object' ? a : {};
        return { livre: typeof a.livre === 'string' ? a.livre : '', v: a.v && typeof a.v === 'object' ? a.v : {} };
    }
    var db = { ativo: 0, modo: 'agente', abas: [novaAba()], extras: [] }, st = db.abas[0], pin = { on: false, min: false, view: 'livre' };
    try {
        var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.abas) && raw.abas.length) {
                db.abas = raw.abas.slice(0, MAXWS).map(limpaAba);
                db.ativo = Math.min(Math.max(parseInt(raw.ativo, 10) || 0, 0), db.abas.length - 1);
            } else db.abas = [limpaAba(raw)]; /* formato antigo */
            /* campos personalizados */
            var ext = [], porRot = {};
            function juntar(x, ab) {
                if (!x || typeof x.id !== 'string' || typeof x.rot !== 'string') return;
                var k = x.rot.toLowerCase();
                if (!porRot[k]) { porRot[k] = x.id; ext.push({ id: x.id, rot: x.rot }); }
                else if (porRot[k] !== x.id && ab && ab.v[x.id] && !ab.v[porRot[k]]) ab.v[porRot[k]] = ab.v[x.id];
            }
            (Array.isArray(raw.extras) ? raw.extras : []).forEach(function (x) { juntar(x); });
            (Array.isArray(raw.abas) ? raw.abas.slice(0, MAXWS) : [raw]).forEach(function (a, n) { (a && Array.isArray(a.extras) ? a.extras : []).forEach(function (x) { juntar(x, db.abas[n]); }); });
            db.extras = ext;
            db.modo = raw.modo === 'suporte' ? 'suporte' : 'agente';
            st = db.abas[db.ativo];
        }
        var rp = JSON.parse(localStorage.getItem(KPIN) || 'null');
        if (rp && typeof rp === 'object') { pin.on = !!rp.on; pin.min = !!rp.min; pin.view = rp.view === 'dados' ? 'dados' : 'livre'; }
    } catch (e) { /* sem armazenamento: funciona só nesta visita */ }
    function salvar() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignora */ } contar(); }
    function salvarPin() { try { localStorage.setItem(KPIN, JSON.stringify(pin)); } catch (e) { /* ignora */ } }

    var $ = function (id) { return document.getElementById(id); };
    var ppCampos = $('pp-campos'), ppAbas = $('pp-abas'), btnMin = $('notasPopMin'), btnUnpin = $('notasPopUnpin'), pipWin = null, pipMin = false, pipAlt = 480;
    function raizes() { return pipWin && !pipWin.closed ? [document, pipWin.document] : [document]; }
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function icon(n) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('class', 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
        var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s;
    }
    function todos() { return todosDe(st); }
    function todosDe(a) { return base().concat(db.extras.map(function (x) { return { id: x.id, rot: x.rot, tipo: 'text', ac: 'off', extra: true, ph: x.rot }; })); }
    function mascara(id, val) {
        var d = String(val).replace(/\D/g, '');
        if (id === 'cpf') {
            d = d.slice(0, 11);
            return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
        }
        if (id === 'tel') {
            d = d.slice(0, 11);
            if (d.length > 10) return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
            if (d.length > 6) return d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            if (d.length > 2) return d.replace(/^(\d{2})(\d*)/, '($1) $2');
            return d ? '(' + d : '';
        }
        return val;
    }
    function copiarTexto(t) {
        function velho() {
            try { var a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); var ok = document.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
        }
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return velho(); });
        return Promise.resolve(velho());
    }
    function feedbackCopia(btn, ok) {
        var antes = btn.getAttribute('aria-label') || '';
        btn.classList.toggle('is-ok', ok);
        btn.setAttribute('aria-label', ok ? 'Copiado' : 'Não foi possível copiar'); btn.title = btn.getAttribute('aria-label');
        setTimeout(function () { btn.classList.remove('is-ok'); btn.setAttribute('aria-label', antes); btn.title = antes; }, 1600);
    }

    /* campos */
    function sincronizar(origem) {
        raizes().forEach(function (r) {
            r.querySelectorAll('[data-n-livre]').forEach(function (t) { if (t !== origem && t.value !== st.livre) t.value = st.livre; });
            r.querySelectorAll('[data-n-campo]').forEach(function (i) {
                if (i === origem) return;
                var v = st.v[i.dataset.nCampo] || ''; if (i.value !== v) i.value = v;
            });
        });
    }
    function renderCampos(box, pref, pequeno) {
        box.textContent = '';
        todos().forEach(function (c) {
            var w = el('div', 'notes-field'); var iid = pref + c.id;
            var lb = el('label', null, c.rot); lb.setAttribute('for', iid); w.appendChild(lb);
            var row = el('div', 'notes-field-row');
            var inp = el('input', 'login-input'); inp.id = iid; inp.type = c.tipo; inp.autocomplete = 'off'; inp.dataset.nCampo = c.id; inp.maxLength = 120;
            if (c.im) inp.inputMode = c.im; if (c.ph) inp.placeholder = c.ph; inp.value = st.v[c.id] || '';
            if (c.tipo === 'email') inp.setAttribute('spellcheck', 'false');
            inp.addEventListener('input', function () {
                var v = mascara(c.id, inp.value); if (v !== inp.value) inp.value = v;
                st.v[c.id] = v; salvar(); sincronizar(inp);
            });
            row.appendChild(inp);
            var cp = el('button', 'notes-icon-btn'); cp.type = 'button'; cp.setAttribute('aria-label', 'Copiar ' + c.rot); cp.title = 'Copiar ' + c.rot; cp.appendChild(icon('copy'));
            cp.addEventListener('click', function () { var v = st.v[c.id] || ''; if (!v) { feedbackCopia(cp, false); return; } copiarTexto(v).then(function (ok) { feedbackCopia(cp, ok); }); });
            row.appendChild(cp);
            if (c.extra && !pequeno) {
                var rm = el('button', 'notes-icon-btn notes-icon-btn--danger'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remover o campo ' + c.rot); rm.title = 'Remover campo (de todos os passageiros)'; rm.appendChild(icon('trash-2'));
                rm.addEventListener('click', function () {
                    db.extras = db.extras.filter(function (x) { return x.id !== c.id; }); db.abas.forEach(function (a) { delete a.v[c.id]; }); salvar(); renderTodos();
                    var n = $('np-novo'); if (n) n.focus();
                });
                row.appendChild(rm);
            }
            w.appendChild(row); box.appendChild(w);
        });
    }
    function renderTodos() { renderCampos($('np-campos'), 'np-', false); renderCampos(ppCampos, 'pp-', true); aplicarModo(); }
    /* modo suporte */
    function aplicarModo() {
        var adm = !!window.suporteLuaAdmin, sup = adm && db.modo === 'suporte', t = $('notasDadosTxt'), b = $('notasModoBtn'), pb = $('notasPopModo');
        /* o modo suporte só existe para administradores */
        if (b) { b.hidden = !adm; b.style.display = adm ? '' : 'none'; }
        if (pb) { pb.hidden = !adm; pb.style.display = adm ? '' : 'none'; }
        if (t) t.textContent = sup ? 'Dados do agente' : 'Dados do cliente';
        if (b) {
            b.setAttribute('aria-pressed', sup ? 'true' : 'false'); b.classList.toggle('btn--primary', sup); b.classList.toggle('btn--outline', !sup);
            b.querySelector('span').textContent = sup ? 'Sair do modo suporte' : 'Modo suporte';
            b.title = sup ? 'Volta para Dados do cliente' : 'Troca os campos de Dados do cliente por Dados do agente';
        }
        if (pb) { pb.setAttribute('aria-pressed', sup ? 'true' : 'false'); pb.title = sup ? 'Modo suporte ativo (clique para desativar)' : 'Modo suporte inativo (clique para ativar)'; }
    }
    window.suporteLuaNotasModo = function () { aplicarModo(); renderTodos(); };
    function alternarModo() { if (!window.suporteLuaAdmin) return; db.modo = db.modo === 'suporte' ? 'agente' : 'suporte'; salvar(); renderTodos(); }
    (function () { var b = $('notasModoBtn'), pb = $('notasPopModo'); if (b) b.addEventListener('click', alternarModo); if (pb) pb.addEventListener('click', alternarModo); })();
    function contar() {
        var n = 0;
        db.abas.forEach(function (a) { if (a.livre.trim()) n++; todosDe(a).forEach(function (c) { if ((a.v[c.id] || '').trim()) n++; }); });
        [$('np-abas'), ppAbas].forEach(function (bx) {
            if (!bx) return;
            bx.querySelectorAll('.ws-tab').forEach(function (b, i) {
                var a = db.abas[i]; if (a) b.classList.toggle('has-data', !!a.livre.trim() || todosDe(a).some(function (c) { return (a.v[c.id] || '').trim(); }));
            });
        });
        document.querySelectorAll('[data-count-for="anotacoes"]').forEach(function (b) { b.textContent = n; });
    }

    /* bloco livre */
    document.querySelectorAll('[data-n-livre]').forEach(function (t) {
        t.value = st.livre;
        t.addEventListener('input', function () { st.livre = t.value; salvar(); sincronizar(t); });
    });
    var cl = document.querySelector('[data-n-copy-livre]');
    if (cl) cl.addEventListener('click', function () {
        var sp = cl.querySelector('span'), ant = sp.textContent;
        copiarTexto(st.livre).then(function (ok) { sp.textContent = ok && st.livre ? 'Copiado!' : 'Nada para copiar'; setTimeout(function () { sp.textContent = ant; }, 1600); });
    });

    /* campo personalizado */
    $('np-add').addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('np-novo'), rot = inp.value.replace(/\s+/g, ' ').trim();
        if (!rot) { inp.focus(); return; }
        var ja = todos().some(function (c) { return c.rot.toLowerCase() === rot.toLowerCase(); });
        if (ja) { inp.setCustomValidity('Já existe um campo com esse nome.'); inp.reportValidity(); inp.setCustomValidity(''); return; }
        db.extras.push({ id: 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1000), rot: rot });
        inp.value = ''; salvar(); renderTodos();
        var novo = document.querySelector('#np-campos .notes-field:last-child input'); if (novo) novo.focus();
    });

    /* limpar tudo */
    var lim = $('np-clear'), limT = 0;
    lim.addEventListener('click', function () {
        var sp = lim.querySelector('span');
        if (!lim.dataset.confirma) {
            lim.dataset.confirma = '1'; sp.textContent = 'Clique de novo para apagar';
            limT = setTimeout(function () { delete lim.dataset.confirma; sp.textContent = 'Limpar este passageiro'; }, 3500); return;
        }
        clearTimeout(limT); delete lim.dataset.confirma; sp.textContent = 'Limpar este passageiro';
        st = db.abas[db.ativo] = novaAba(); salvar();
        raizes().forEach(function (r) { r.querySelectorAll('[data-n-livre]').forEach(function (t) { t.value = ''; }); });
        renderTodos(); renderAbas();
    });

    /* abas de passageiros */
    var anim = null; /* { tipo: 'sel' | 'in', i } para o próximo desenho das abas */
    function aba(box, curto) {
        box.textContent = '';
        db.abas.forEach(function (a, i) {
            var b = el('button', 'ws-tab' + (todosDe(a).some(function (c) { return (a.v[c.id] || '').trim(); }) || a.livre.trim() ? ' has-data' : ''), curto ? String(i + 1) : 'Passageiro ' + (i + 1));
            b.type = 'button'; b.setAttribute('aria-pressed', i === db.ativo ? 'true' : 'false'); b.setAttribute('aria-label', 'Passageiro ' + (i + 1) + (i === db.ativo ? ' (aberto)' : '')); b.title = 'Passageiro ' + (i + 1);
            if (anim && anim.i === i) b.classList.add(anim.tipo === 'in' ? 'ws-in' : 'ws-sel');
            b.addEventListener('click', function () { if (i !== db.ativo) trocar(i); });
            box.appendChild(b);
        });
        var add = el('button', 'ws-act'); add.type = 'button'; add.appendChild(icon('plus')); add.setAttribute('aria-label', 'Adicionar passageiro'); add.title = 'Adicionar passageiro';
        if (db.abas.length >= MAXWS) { add.disabled = true; add.title = 'Máximo de 4 passageiros'; }
        add.addEventListener('click', function () { if (db.abas.length >= MAXWS) return; db.abas.push(novaAba()); trocar(db.abas.length - 1, true, 'in'); });
        box.appendChild(add);
        var del = el('button', 'ws-act ws-act--del'); del.type = 'button'; del.appendChild(icon('trash-2'));
        var unico = db.abas.length <= 1; /* com um só passageiro, o botão apaga os dados dele em vez de remover a aba */
        var rot = (unico ? 'Apagar os dados do passageiro ' : 'Remover o passageiro ') + (db.ativo + 1); del.setAttribute('aria-label', rot); del.title = rot;
        del.addEventListener('click', function () {
            if (!del.dataset.confirma) {
                del.dataset.confirma = '1'; del.classList.add('is-confirm'); del.appendChild(el('span', null, curto ? 'Apagar?' : (unico ? 'Confirmar: apagar dados' : 'Confirmar exclusão'))); del.setAttribute('aria-label', 'Confirmar: ' + (unico ? 'apagar os dados do passageiro ' : 'remover o passageiro ') + (db.ativo + 1));
                setTimeout(function () { if (del.isConnected && del.dataset.confirma) renderAbas(); }, 3500); return;
            }
            if (unico) {
                st = db.abas[db.ativo] = novaAba(); salvar();
                raizes().forEach(function (r) { r.querySelectorAll('[data-n-livre]').forEach(function (t) { t.value = ''; }); });
                renderTodos(); renderAbas(); animarConteudo(); return;
            }
            var vivos = [$('np-abas'), ppAbas].map(function (bx) { return bx && bx.querySelectorAll('.ws-tab')[db.ativo]; }).filter(Boolean);
            vivos.forEach(function (t) { t.classList.add('ws-out'); });
            setTimeout(function () { db.abas.splice(db.ativo, 1); db.ativo = Math.min(db.ativo, db.abas.length - 1); trocar(db.ativo, true, 'sel'); }, vivos.length ? 200 : 0);
        });
        box.appendChild(del);
    }
    function renderAbas() { aba($('np-abas'), false); aba(ppAbas, true); anim = null; }
    /* reinicia a animação de troca do conteúdo, no painel e na janela flutuante */
    function animarConteudo() {
        raizes().forEach(function (r) {
            r.querySelectorAll('.notes-fields, .notes-area, #np-livre, #pp-livre').forEach(function (n) { n.classList.remove('ws-swap'); void n.offsetWidth; n.classList.add('ws-swap'); });
        });
    }
    function trocar(i, foco, tipo) {
        db.ativo = i; st = db.abas[i]; salvar(); anim = { tipo: tipo || 'sel', i: i };
        raizes().forEach(function (r) { r.querySelectorAll('[data-n-livre]').forEach(function (t) { t.value = st.livre; }); });
        renderTodos(); renderAbas(); animarConteudo();
        if (foco) { var t = document.querySelector('#anotacoes:not([hidden]) #np-livre'); if (t) t.focus(); }
    }

    /* popup fixado */
    var pop = $('notasPop'), pinBtn = $('notasPinBtn'), panel = $('anotacoes'), pipBtn = $('notasPipBtn');
    function aplicarPin() {
        pinBtn.setAttribute('aria-pressed', pin.on ? 'true' : 'false');
        pinBtn.querySelector('span').textContent = pin.on ? 'Desafixar do site' : 'Fixar no site';
        pinBtn.querySelector('use').setAttribute('href', pin.on ? '#i-pin-off' : '#i-pin');
        var mn = pipWin ? pipMin : pin.min;
        pop.classList.toggle('is-min', mn);
        var mb = btnMin; mb.setAttribute('aria-expanded', mn ? 'false' : 'true');
        mb.setAttribute('aria-label', mn ? 'Expandir anotações' : 'Minimizar anotações'); mb.title = mn ? 'Expandir' : 'Minimizar';
        mb.querySelector('use').setAttribute('href', mn ? '#i-chevron-up' : '#i-minus');
        pop.querySelectorAll('[data-pop-view]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.popView === pin.view ? 'true' : 'false'); });
        pop.querySelectorAll('[data-pop-pane]').forEach(function (p) { p.hidden = p.dataset.popPane !== pin.view; });
        pop.hidden = pipWin ? false : !(pin.on && panel.hidden); /* some enquanto o painel completo está aberto */
    }
    pinBtn.addEventListener('click', function () { pin.on = !pin.on; if (pin.on) pin.min = false; salvarPin(); aplicarPin(); });
    btnUnpin.addEventListener('click', function () { if (pipWin) { pipWin.close(); return; } pin.on = false; salvarPin(); aplicarPin(); });
    btnMin.addEventListener('click', function () {
        if (pipWin) {
            /* na janela flutuante, minimizar encolhe a própria janela para só a barra de título */
            try {
                if (!pipMin) { pipAlt = pipWin.innerHeight || pipAlt; pipMin = true; aplicarPin(); pipWin.resizeTo(pipWin.innerWidth, 56); }
                else { pipMin = false; aplicarPin(); pipWin.resizeTo(pipWin.innerWidth, pipAlt); }
            } catch (e) { aplicarPin(); }
            return;
        }
        pin.min = !pin.min; salvarPin(); aplicarPin();
    });
    pop.querySelectorAll('[data-pop-view]').forEach(function (b) { b.addEventListener('click', function () { pin.view = b.dataset.popView; salvarPin(); aplicarPin(); }); });
    new MutationObserver(aplicarPin).observe(panel, { attributes: true, attributeFilter: ['hidden'] });


    /* janela flutuante */
    function fecharPip() {
        if (!pipWin) return;
        pipWin = null; pipMin = false; pop.classList.remove('notes-pop--pip');
        document.body.appendChild(pop);
        btnUnpin.setAttribute('aria-label', 'Desafixar anotações');
        pipBtn.querySelector('span').textContent = 'Abrir janela flutuante';
        aplicarPin();
    }
    if (pipBtn && window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function') {
        pipBtn.hidden = false;
        pipBtn.addEventListener('click', function () {
            if (pipWin) { pipWin.close(); return; }
            window.documentPictureInPicture.requestWindow({ width: 340, height: 480 }).then(function (w) {
                pipWin = w;
                var estilos = '';
                Array.prototype.forEach.call(document.styleSheets, function (sh) { try { Array.prototype.forEach.call(sh.cssRules, function (r) { estilos += r.cssText + '\n'; }); } catch (e) { /* ignora */ } });
                var tag = w.document.createElement('style'); tag.textContent = estilos; w.document.head.appendChild(tag);
                w.document.title = 'Anotações';
                w.document.body.style.margin = '0'; w.document.body.style.background = '#fff';
                /* símbolos dos ícones */
                var simbolos = document.querySelectorAll('svg > symbol');
                if (simbolos.length) { var sv = w.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('style', 'display:none'); sv.setAttribute('aria-hidden', 'true'); simbolos.forEach(function (sy) { if (/^i-(notebook-pen|minus|pin-off|copy|trash-2|chevron-up|check|x)$/.test(sy.id)) sv.appendChild(w.document.importNode(sy, true)); }); w.document.body.appendChild(sv); }
                pipMin = false; pop.classList.add('notes-pop--pip'); pop.classList.remove('is-min'); pop.hidden = false;
                w.document.body.appendChild(pop);
                btnUnpin.setAttribute('aria-label', 'Fechar janela flutuante');
                pipBtn.querySelector('span').textContent = 'Fechar janela flutuante';
                w.addEventListener('pagehide', fecharPip);
                aplicarPin();
            }).catch(function () { /* o navegador recusou: segue só com o quadro fixo */ });
        });
    }

    renderTodos(); renderAbas(); contar(); aplicarPin();
    window.notasEstado = function () { return { modo: db.modo, abas: db.abas.length, ativo: db.ativo, livre: st.livre, v: st.v, extras: db.extras.length, fixado: pin.on, flutuante: !!pipWin }; };
})();
