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
    /* personalização dos campos padrão (só com login): { c:{id:{r,p,h}}, o:{agente:[ids],suporte:[ids]} } */
    var cfg = { c: {}, o: {} };
    function modoSup() { return !!(window.suporteLuaAdmin && db.modo === 'suporte'); }
    function chaveModo() { return modoSup() ? 'suporte' : 'agente'; }
    function logadoPrefs() { return !!(window.PortalPrefs && window.PortalPrefs.logado()); }
    function cfgLimpa(o) {
        var r = { c: {}, o: {} }; if (!o || typeof o !== 'object') return r;
        var c = o.c && typeof o.c === 'object' ? o.c : {};
        Object.keys(c).slice(0, 40).forEach(function (id) {
            var x = c[id]; if (!x || typeof x !== 'object') return;
            var y = {}; if (typeof x.r === 'string' && x.r.trim()) y.r = x.r.trim().slice(0, 40);
            if (typeof x.p === 'string') y.p = x.p.slice(0, 60);
            if (x.h) y.h = 1; if (y.r || 'p' in y || y.h) r.c[id] = y;
        });
        ['agente', 'suporte'].forEach(function (m) { var l = o.o && o.o[m]; if (Array.isArray(l)) r.o[m] = l.filter(function (i) { return typeof i === 'string'; }).slice(0, 40); });
        return r;
    }
    /* campos padrão do modo atual já com as alterações (inclui os ocultos quando todos=true) */
    function baseCfg(todos) {
        var lista = modoSup() ? BASE_SUP : BASE;
        if (!logadoPrefs()) return todos ? lista.map(function (b) { return Object.assign({}, b); }) : lista;
        var ord = cfg.o[chaveModo()] || [], pos = function (id) { var i = ord.indexOf(id); return i < 0 ? 999 : i; };
        var out = lista.map(function (b, n) {
            var o = cfg.c[b.id] || {}, r = Object.assign({}, b, { _n: n, _h: !!o.h, _rotPadrao: b.rot });
            if (o.r) r.rot = o.r; if ('p' in o) r.ph = o.p;
            return r;
        });
        out.sort(function (a, b) { return (pos(a.id) - pos(b.id)) || (a._n - b._n); });
        return todos ? out : out.filter(function (c) { return !c._h; });
    }
    function base() { return baseCfg(false); }
    function salvarCfg() { if (window.PortalPrefs) window.PortalPrefs.salvar('notasCfg', { c: cfg.c, o: cfg.o, x: db.extras }); }
    function carregarCfg() {
        if (!window.PortalPrefs) return;
        var v = window.PortalPrefs.ler('notasCfg', null);
        cfg = cfgLimpa(v);
        if (v && Array.isArray(v.x) && logadoPrefs()) {
            var ids = {}; db.extras.forEach(function (x) { ids[x.id] = 1; });
            var mudou = false;
            v.x.forEach(function (x) { if (x && typeof x.id === 'string' && typeof x.rot === 'string' && !ids[x.id] && !db.extras.some(function (e) { return e.rot.toLowerCase() === x.rot.toLowerCase(); })) { db.extras.push({ id: x.id, rot: x.rot.slice(0, 40) }); mudou = true; } });
            if (mudou) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignora */ } }
        }
    }
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

    var $ = function (id) { var e = document.getElementById(id); if (!e && pipWin) { try { e = pipWin.document.getElementById(id); } catch (x) { e = null; } } return e; };
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
    function copiarTexto(t, doc) {
        var d = doc || document, w = d.defaultView || window;
        function velho() {
            try { var a = d.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; d.body.appendChild(a); a.focus(); a.select(); var ok = d.execCommand('copy'); a.remove(); return ok; } catch (e) { return false; }
        }
        try { if (w.navigator && w.navigator.clipboard && w.isSecureContext) return w.navigator.clipboard.writeText(t).then(function () { return true; }, function () { return velho(); }); } catch (e) { }
        return Promise.resolve(velho());
    }
    function feedbackCopia(btn, ok) {
        var antes = btn.getAttribute('aria-label') || '', uso = btn.querySelector('use'), href = uso && uso.getAttribute('href');
        btn.classList.toggle('is-ok', ok); btn.classList.toggle('is-erro', !ok);
        if (uso) uso.setAttribute('href', ok ? '#i-check' : '#i-x');
        btn.setAttribute('aria-label', ok ? 'Copiado' : 'Não foi possível copiar'); btn.title = btn.getAttribute('aria-label');
        setTimeout(function () { btn.classList.remove('is-ok', 'is-erro'); if (uso && href) uso.setAttribute('href', href); btn.setAttribute('aria-label', antes); btn.title = antes; }, 1600);
    }

    /* campos */
    function sincronizar(origem) {
        if (window.atualizarAutoNotas) window.atualizarAutoNotas();
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
            cp.addEventListener('click', function () { var v = st.v[c.id] || ''; if (!v) { feedbackCopia(cp, false); return; } copiarTexto(v, cp.ownerDocument).then(function (ok) { feedbackCopia(cp, ok); }); });
            row.appendChild(cp);
            if (c.extra && !pequeno) {
                var rm = el('button', 'notes-icon-btn notes-icon-btn--danger'); rm.type = 'button'; rm.setAttribute('aria-label', 'Remover o campo ' + c.rot); rm.title = 'Remover campo (de todos os passageiros)'; rm.appendChild(icon('trash-2'));
                rm.addEventListener('click', function () {
                    db.extras = db.extras.filter(function (x) { return x.id !== c.id; }); db.abas.forEach(function (a) { delete a.v[c.id]; }); salvar(); if (logadoPrefs()) salvarCfg(); renderTodos();
                    var n = $('np-novo'); if (n) n.focus();
                });
                row.appendChild(rm);
            }
            w.appendChild(row); box.appendChild(w);
        });
    }
    function renderTodos() { renderCampos($('np-campos'), 'np-', false); renderCampos(ppCampos, 'pp-', true); aplicarModo(); if (window.atualizarAutoNotas) window.atualizarAutoNotas(); }
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
        if (pb) { pb.setAttribute('aria-pressed', sup ? 'true' : 'false'); var ps = pb.querySelector('span'); if (ps) ps.textContent = sup ? 'Suporte ativo' : 'Suporte'; pb.title = sup ? 'Modo suporte ativo (clique para desativar)' : 'Modo suporte inativo (clique para ativar)'; }
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
    document.querySelectorAll('[data-n-copy-livre]').forEach(function (cl) {
        cl.addEventListener('click', function () {
            var sp = cl.querySelector('span'), ant = sp.textContent;
            copiarTexto(chatLivre(), cl.ownerDocument).then(function (ok) { var bom = ok && !!st.livre; cl.classList.toggle('is-ok', bom); sp.textContent = bom ? 'Copiado!' : (ok ? 'Nada para copiar' : 'Não consegui copiar'); setTimeout(function () { cl.classList.remove('is-ok'); sp.textContent = ant; }, 1600); });
        });
    });

    /* campo personalizado */
    $('np-add').addEventListener('submit', function (e) {
        e.preventDefault();
        var inp = $('np-novo'), rot = inp.value.replace(/\s+/g, ' ').trim();
        if (!rot) { inp.focus(); return; }
        var ja = todos().some(function (c) { return c.rot.toLowerCase() === rot.toLowerCase(); });
        if (ja) { inp.setCustomValidity('Já existe um campo com esse nome.'); inp.reportValidity(); inp.setCustomValidity(''); return; }
        db.extras.push({ id: 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1000), rot: rot });
        inp.value = ''; salvar(); if (logadoPrefs()) salvarCfg(); renderTodos();
        var novo = document.querySelector('#np-campos .notes-field:last-child input'); if (novo) novo.focus();
    });

    /* personalizar campos padrão (somente com login) */
    var pcBox = $('np-pers'), pcBtn = $('np-pers-btn');
    function pcRender() {
        if (!pcBox) return; pcBox.textContent = '';
        var lista = baseCfg(true);
        lista.forEach(function (c, i) {
            var o = cfg.c[c.id] || {};
            var li = el('div', 'np-pers-item' + (c._h ? ' is-off' : ''));
            var r = el('input', 'login-input'); r.type = 'text'; r.maxLength = 40; r.value = c.rot; r.placeholder = c._rotPadrao; r.setAttribute('aria-label', 'Nome do campo ' + c._rotPadrao);
            var p = el('input', 'login-input'); p.type = 'text'; p.maxLength = 60; p.value = c.ph || ''; p.placeholder = 'Texto de exemplo'; p.setAttribute('aria-label', 'Exemplo do campo ' + c._rotPadrao);
            function gravar() {
                var nr = r.value.replace(/\s+/g, ' ').trim(), x = cfg.c[c.id] || {};
                if (nr && nr !== c._rotPadrao) x.r = nr; else delete x.r;
                var orig = (modoSup() ? BASE_SUP : BASE).filter(function (b) { return b.id === c.id; })[0];
                if (p.value !== (orig ? orig.ph : '')) x.p = p.value; else delete x.p;
                if (x.r || 'p' in x || x.h) cfg.c[c.id] = x; else delete cfg.c[c.id];
                salvarCfg(); renderTodos();
            }
            r.addEventListener('change', gravar); p.addEventListener('change', gravar);
            function btn(ic, rot, fn, off) { var b = el('button', 'notes-icon-btn'); b.type = 'button'; b.title = rot; b.setAttribute('aria-label', rot); b.disabled = !!off; b.appendChild(icon(ic)); b.addEventListener('click', fn); return b; }
            function mover(d) {
                var ids = lista.map(function (x) { return x.id; }), j = i + d; if (j < 0 || j >= ids.length) return;
                var t = ids[i]; ids[i] = ids[j]; ids[j] = t; cfg.o[chaveModo()] = ids; salvarCfg(); renderTodos(); pcRender();
            }
            var campos = el('div', 'np-pers-campos'); campos.appendChild(r); campos.appendChild(p);
            var acoes = el('div', 'np-pers-acoes');
            acoes.appendChild(btn('arrow-up', 'Subir', function () { mover(-1); }, i === 0));
            acoes.appendChild(btn('arrow-down', 'Descer', function () { mover(1); }, i === lista.length - 1));
            acoes.appendChild(btn(c._h ? 'eye' : 'eye-off', c._h ? 'Mostrar campo' : 'Ocultar campo', function () { var x = cfg.c[c.id] || {}; if (x.h) delete x.h; else x.h = 1; if (x.r || 'p' in x || x.h) cfg.c[c.id] = x; else delete cfg.c[c.id]; salvarCfg(); renderTodos(); pcRender(); }));
            li.appendChild(campos); li.appendChild(acoes); pcBox.appendChild(li);
        });
        var rs = el('button', 'btn btn--ghost btn--sm'); rs.type = 'button'; rs.appendChild(icon('rotate-ccw')); rs.appendChild(el('span', null, 'Restaurar padrão'));
        rs.addEventListener('click', function () { var m = chaveModo(), ids = (modoSup() ? BASE_SUP : BASE).map(function (b) { return b.id; }); ids.forEach(function (id) { delete cfg.c[id]; }); delete cfg.o[m]; salvarCfg(); renderTodos(); pcRender(); });
        pcBox.appendChild(rs);
    }
    function pcEstado() {
        if (!pcBtn) return; var ok = logadoPrefs();
        pcBtn.disabled = !ok; pcBtn.title = ok ? 'Alterar nome, exemplo, ordem e visibilidade dos campos padrão' : 'Entre na sua conta para personalizar os campos';
        var sp = pcBtn.querySelector('span'); if (sp) sp.textContent = ok ? 'Personalizar campos' : 'Personalizar campos (entre na conta)';
        if (!ok && pcBox) { pcBox.hidden = true; pcBtn.setAttribute('aria-expanded', 'false'); }
    }
    if (pcBtn) pcBtn.addEventListener('click', function () { if (!logadoPrefs()) return; var abrir = pcBox.hidden; pcBox.hidden = !abrir; pcBtn.setAttribute('aria-expanded', String(abrir)); if (abrir) pcRender(); });
    function aplicarPrefs() { carregarCfg(); pcEstado(); renderTodos(); renderAbas(); contar(); if (pcBox && !pcBox.hidden) pcRender(); }
    if (window.PortalPrefs) window.PortalPrefs.aoMudar(aplicarPrefs);
    document.addEventListener('suporteLua:auth', function () { setTimeout(aplicarPrefs, 0); });

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
                if (simbolos.length) { var sv = w.document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.setAttribute('style', 'display:none'); sv.setAttribute('aria-hidden', 'true'); simbolos.forEach(function (sy) { if (/^i-(notebook-pen|minus|pin-off|copy|trash-2|chevron-up|check|x|headset|bold|italic|strikethrough|palette|wand-sparkles)$/.test(sy.id)) sv.appendChild(w.document.importNode(sy, true)); }); w.document.body.appendChild(sv); }
                pipMin = false; pop.classList.add('notes-pop--pip'); pop.classList.remove('is-min'); pop.hidden = false;
                w.document.body.appendChild(pop);
                btnUnpin.setAttribute('aria-label', 'Fechar janela flutuante');
                pipBtn.querySelector('span').textContent = 'Fechar janela flutuante';
                w.addEventListener('pagehide', fecharPip);
                aplicarPin();
            }).catch(function () { /* o navegador recusou: segue só com o quadro fixo */ });
        });
    }


    /* ---------- bloco livre formatado + texto automático (modelo) ---------- */
    var TC = window.PortalTextoChat;
    function chatLivre() { return TC ? TC.livre(st.livre).chat : st.livre; }
    function camposValores() {
        var lista = baseCfg(true).concat(db.extras.map(function (x) { return { id: x.id, rot: x.rot }; }));
        return lista.map(function (c) { return { rot: c.rot, valor: st.v[c.id] || '' }; });
    }
    function modeloPadrao() {
        return base().concat(db.extras).map(function (c) { return '*' + c.rot + ':* {' + c.rot + '}'; }).join('\n');
    }
    function modeloAtual() {
        var m = window.PortalPrefs && window.PortalPrefs.ler('notasModelo', null);
        var t = m && typeof m === 'object' ? m[chaveModo()] : null;
        return typeof t === 'string' ? t : modeloPadrao();
    }
    function gravarModelo(t) {
        if (!window.PortalPrefs) return;
        var m = window.PortalPrefs.ler('notasModelo', null); m = m && typeof m === 'object' ? Object.assign({}, m) : {};
        m[chaveModo()] = String(t).slice(0, 4000); window.PortalPrefs.salvar('notasModelo', m);
    }
    function layoutAtual() {
        if (!logadoPrefs()) return 'livre';
        var l = window.PortalPrefs.ler('notasLayout', 'livre'); return l === 'ambos' || l === 'auto' ? l : 'livre';
    }
    function elx(tag, cls, txt, doc) { var n = (doc || document).createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    var CORES_ROT = { vermelho: 'Vermelho', laranja: 'Laranja', verde: 'Verde', azul: 'Azul', roxo: 'Roxo', cinza: 'Cinza' };

    function barraFormato(ta) {
        var bar = elx('div', 'nf-bar'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Formatação do texto');
        function b(ic, rot, fn) { var x = elx('button', 'nf-btn'); x.type = 'button'; x.title = rot; x.setAttribute('aria-label', rot); x.appendChild(icon(ic)); x.addEventListener('mousedown', function (e) { e.preventDefault(); }); x.addEventListener('click', fn); return x; }
        bar.appendChild(b('bold', 'Negrito (Ctrl+B)', function () { TC.aplicar(ta, 'b'); }));
        bar.appendChild(b('italic', 'Itálico (Ctrl+I)', function () { TC.aplicar(ta, 'i'); }));
        bar.appendChild(b('strikethrough', 'Tachado', function () { TC.aplicar(ta, 's'); }));
        var cores = elx('span', 'nf-cores'); cores.setAttribute('role', 'group'); cores.setAttribute('aria-label', 'Cor do texto selecionado');
        Object.keys(TC.CORES).forEach(function (k) {
            var c = elx('button', 'nf-cor'); c.type = 'button'; c.style.background = TC.CORES[k]; c.title = 'Cor: ' + CORES_ROT[k]; c.setAttribute('aria-label', 'Cor ' + CORES_ROT[k]);
            c.addEventListener('mousedown', function (e) { e.preventDefault(); }); c.addEventListener('click', function () { TC.aplicar(ta, 'cor', k); }); cores.appendChild(c);
        });
        var sem = elx('button', 'nf-cor nf-cor--sem'); sem.type = 'button'; sem.title = 'Tirar a cor'; sem.setAttribute('aria-label', 'Tirar a cor'); sem.textContent = '×';
        sem.addEventListener('mousedown', function (e) { e.preventDefault(); }); sem.addEventListener('click', function () { TC.aplicar(ta, 'cor', ''); }); cores.appendChild(sem);
        bar.appendChild(cores);
        ta.addEventListener('keydown', function (e) {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return; var k = e.key.toLowerCase();
            if (k === 'b') { e.preventDefault(); TC.aplicar(ta, 'b'); } else if (k === 'i') { e.preventDefault(); TC.aplicar(ta, 'i'); }
        });
        return bar;
    }
    function botaoCopiar(texto, fn, rot) {
        var cb = elx('button', 'btn btn--outline btn--sm'); cb.type = 'button'; cb.appendChild(icon('copy')); var sp = elx('span', null, rot); cb.appendChild(sp);
        cb.addEventListener('click', function () {
            var t = fn(); var ant = sp.textContent;
            copiarTexto(t, cb.ownerDocument).then(function (ok) { var bom = ok && !!t; cb.classList.toggle('is-ok', bom); sp.textContent = bom ? 'Copiado!' : (ok ? 'Nada para copiar' : 'Não consegui copiar'); setTimeout(function () { cb.classList.remove('is-ok'); sp.textContent = ant; }, 1600); });
        });
        return cb;
    }

    var extras = []; /* { raiz, livreGrupo, previaLivre, autoGrupo, previa, edGrupo, edTa, chips, seg, tudo } */
    function montarExtras(raiz, pequeno) {
        var ta = raiz.querySelector('[data-n-livre]'); if (!ta || ta.dataset.nfOk) return; ta.dataset.nfOk = '1';
        var pai = ta.parentNode, x = { pequeno: pequeno };
        /* grupo do texto livre: barra + textarea + prévia + botões */
        var g = elx('div', 'nf-livre'); pai.insertBefore(g, ta.previousElementSibling && ta.previousElementSibling.tagName === 'LABEL' ? ta.previousElementSibling : ta);
        var lab = ta.previousElementSibling && ta.previousElementSibling.tagName === 'LABEL' ? ta.previousElementSibling : null; if (lab) g.appendChild(lab);
        g.appendChild(barraFormato(ta)); g.appendChild(ta);
        x.previaLivre = elx('div', 'nf-previa nf-previa--livre'); x.previaLivre.hidden = true; x.previaLivre.setAttribute('aria-label', 'Como o texto livre vai ficar'); g.appendChild(x.previaLivre);
        var acoes = pai.querySelector('.notes-actions'); if (acoes) g.appendChild(acoes);
        x.livreGrupo = g;
        /* seletor de layout (só no painel completo) */
        if (!pequeno) {
            var seg = elx('div', 'nf-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'O que mostrar nas anotações');
            [['livre', 'Só livre'], ['ambos', 'Livre + automático'], ['auto', 'Só automático']].forEach(function (o) {
                var bt = elx('button', 'nf-seg-b', o[1]); bt.type = 'button'; bt.dataset.layout = o[0];
                bt.addEventListener('click', function () { if (!logadoPrefs()) return; window.PortalPrefs.salvar('notasLayout', o[0]); aplicarLayout(); });
                seg.appendChild(bt);
            });
            var segTxt = elx('p', 'nf-seg-ajuda', 'Escolha como mostrar o bloco de notas (só com login).');
            var topo = elx('div', 'nf-topo'); topo.appendChild(seg); topo.appendChild(segTxt);
            pai.insertBefore(topo, pai.querySelector('h3') ? pai.querySelector('h3').nextSibling : pai.firstChild); x.seg = seg; x.segTxt = segTxt; x.topo = topo;
        }
        /* grupo do texto automático */
        var a = elx('div', 'nf-auto'); a.hidden = true;
        var ht = elx('div', 'nf-auto-tit'); ht.appendChild(icon('wand-sparkles')); ht.appendChild(elx('span', null, 'Texto automático')); a.appendChild(ht);
        x.previa = elx('div', 'nf-previa'); x.previa.setAttribute('aria-live', 'polite'); a.appendChild(x.previa);
        var ac = elx('div', 'notes-actions' + (pequeno ? ' notes-actions--sm' : ''));
        ac.appendChild(botaoCopiar(null, function () { return TC.modelo(modeloAtual(), camposValores()).chat; }, 'Copiar automático'));
        x.tudo = botaoCopiar(null, function () { var l = chatLivre(), m = TC.modelo(modeloAtual(), camposValores()).chat; return [m, l].filter(Boolean).join('\n\n'); }, 'Copiar tudo');
        ac.appendChild(x.tudo);
        if (!pequeno) {
            x.edBtn = elx('button', 'btn btn--ghost btn--sm'); x.edBtn.type = 'button'; x.edBtn.appendChild(icon('pencil')); x.edBtn.appendChild(elx('span', null, 'Editar modelo')); x.edBtn.setAttribute('aria-expanded', 'false'); ac.appendChild(x.edBtn);
            var ed = elx('div', 'nf-ed'); ed.hidden = true;
            ed.appendChild(elx('p', 'nf-ed-ajuda', 'Escreva o texto que quer montar. Toque em um campo para inserir; ele é trocado pelo que você preencher em "Dados". Linhas com campos vazios não aparecem.'));
            x.chips = elx('div', 'nf-chips'); ed.appendChild(x.chips);
            x.edTa = elx('textarea', 'notes-area nf-ed-ta'); x.edTa.rows = 8; x.edTa.spellcheck = true; x.edTa.setAttribute('aria-label', 'Modelo do texto automático'); x.edTa.maxLength = 4000;
            ed.appendChild(barraFormato(x.edTa)); ed.appendChild(x.edTa);
            var rs = elx('button', 'btn btn--ghost btn--sm'); rs.type = 'button'; rs.appendChild(icon('rotate-ccw')); rs.appendChild(elx('span', null, 'Usar modelo padrão'));
            rs.addEventListener('click', function () { x.edTa.value = modeloPadrao(); gravarModelo(x.edTa.value); atualizarAuto(); });
            ed.appendChild(rs);
            x.edTa.addEventListener('input', function () { gravarModelo(x.edTa.value); atualizarAuto(); });
            x.edBtn.addEventListener('click', function () {
                if (!logadoPrefs()) return; var abrir = ed.hidden; ed.hidden = !abrir; x.edBtn.setAttribute('aria-expanded', String(abrir));
                if (abrir) { x.edTa.value = modeloAtual(); montarChips(x); }
            });
            x.edGrupo = ed; a.appendChild(ac); a.appendChild(ed);
        } else a.appendChild(ac);
        g.parentNode.insertBefore(a, g.nextSibling); x.autoGrupo = a;
        x.raiz = raiz; extras.push(x);
        ta.addEventListener('input', atualizarAuto);
    }
    function montarChips(x) {
        if (!x.chips) return; x.chips.textContent = '';
        base().concat(db.extras).forEach(function (c) {
            var b = elx('button', 'nf-chip', c.rot); b.type = 'button'; b.title = 'Inserir {' + c.rot + '}';
            b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { TC.inserir(x.edTa, '{' + c.rot + '}'); }); x.chips.appendChild(b);
        });
    }
    function aplicarLayout() {
        var l = layoutAtual(), ok = logadoPrefs();
        extras.forEach(function (x) {
            x.livreGrupo.hidden = l === 'auto'; x.autoGrupo.hidden = l === 'livre';
            if (x.tudo) x.tudo.hidden = l !== 'ambos';
            if (x.topo) {
                x.seg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.layout === l)); b.disabled = !ok; });
                x.segTxt.textContent = ok ? 'Escolha como mostrar o bloco de notas.' : 'Entre na sua conta para usar o texto automático e escolher o layout.';
            }
            if (x.edBtn) { x.edBtn.disabled = !ok; if (!ok && x.edGrupo) x.edGrupo.hidden = true; }
        });
        atualizarAuto();
    }
    function atualizarAuto() {
        if (!TC) return;
        var l = layoutAtual(), r = TC.modelo(modeloAtual(), camposValores()), lv = TC.livre(st.livre);
        extras.forEach(function (x) {
            if (!x.autoGrupo.hidden || l !== 'livre') {
                x.previa.innerHTML = r.vazio ? '' : r.html;
                if (r.vazio || !r.html.trim()) { x.previa.textContent = 'O texto automático aparece aqui conforme você preenche os dados.'; x.previa.classList.add('is-vazia'); } else x.previa.classList.remove('is-vazia');
            }
            var tem = /[*_~]\S|\{c:/.test(st.livre || '');
            x.previaLivre.hidden = !tem; if (tem) x.previaLivre.innerHTML = lv.html;
            if (x.chips && x.edGrupo && !x.edGrupo.hidden) montarChips(x);
        });
    }
    window.atualizarAutoNotas = atualizarAuto;
    if (TC) {
        montarExtras(document.querySelector('.notes-card[aria-labelledby="notasLivreTit"]') || document, false);
        var popLivre = pop.querySelector('[data-pop-pane="livre"]'); if (popLivre) montarExtras(popLivre, true);
        if (window.PortalPrefs) window.PortalPrefs.aoMudar(aplicarLayout);
        document.addEventListener('suporteLua:auth', function () { setTimeout(aplicarLayout, 0); });
        aplicarLayout();
    }

    renderTodos(); renderAbas(); contar(); aplicarPin();
    window.notasEstado = function () { return { modo: db.modo, abas: db.abas.length, ativo: db.ativo, livre: st.livre, v: st.v, extras: db.extras.length, fixado: pin.on, flutuante: !!pipWin }; };
})();
