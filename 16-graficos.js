/* ==========================================================================
   GRÁFICOS E FILTROS (usado nas respostas dos formulários e nas planilhas)
   window.PortalGraficos:
     filtrar(linhas, filtros, campos)   → linhas que passam nos filtros
     agregar(linhas, config, campos)    → {rotulos, series:[{nome, cor, valores}], total}
     desenhar(host, config, linhas, campos)  → desenha o gráfico (SVG) no elemento
     editor(host, config, campos, linhas, aoMudar) → controles para personalizar o gráfico
     filtrosUI(host, filtros, campos, linhas, aoMudar) → controles de filtro
   campos: [{id, rotulo, tipo: texto|longo|escolha|multipla|selecao|data|numero|caixa|link, opcoes:[{v,cor}]}]
   ========================================================================== */
(function () {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    var PALETAS = {
        padrao: ['#4338ca', '#e11d48', '#0d9488', '#d97706', '#7c3aed', '#16a34a', '#2563eb', '#db2777'],
        indigo: ['#312e81', '#4338ca', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#3730a3'],
        quente: ['#b91c1c', '#ea580c', '#d97706', '#ca8a04', '#e11d48', '#c2410c', '#f59e0b', '#9a3412'],
        frio: ['#0e7490', '#0d9488', '#2563eb', '#4f46e5', '#0891b2', '#059669', '#1d4ed8', '#115e59'],
        suave: ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#f9a8d4', '#5eead4', '#fdba74'],
        cinza: ['#374151', '#6b7280', '#9ca3af', '#4b5563', '#d1d5db', '#1f2937', '#78716c', '#a8a29e']
    };
    var PALETA_ROT = { padrao: 'Portal', indigo: 'Índigo', quente: 'Quente', frio: 'Frio', suave: 'Suave', cinza: 'Cinza' };
    var TIPOS = [['barras', 'Barras (horizontal)'], ['colunas', 'Colunas'], ['rosca', 'Rosca'], ['pizza', 'Pizza'], ['linha', 'Linha'], ['area', 'Área']];
    var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function sv(t, a, x) { var e = document.createElementNS(NS, t); for (var k in a) e.setAttribute(k, a[k]); if (x != null) e.textContent = x; return e; }
    function num(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
    function fmt(n) { return (Math.round(n * 100) / 100).toLocaleString('pt-BR'); }
    function campoDe(campos, id) { return (campos || []).filter(function (c) { return c.id === id; })[0] || null; }
    function ehData(c) { return c && c.tipo === 'data'; }

    /* ---------- filtros ---------- */
    function normFiltros(f) { if (Array.isArray(f)) return { busca: '', itens: f }; f = f || {}; return { busca: f.busca || '', itens: Array.isArray(f.itens) ? f.itens : [] }; }
    function valoresDe(l, c) { var v = l[c.id]; if (Array.isArray(v)) return v.map(String); return (v == null || v === '') ? [] : [String(v)]; }
    function filtrar(linhas, filtros, campos) {
        var f = normFiltros(filtros), q = f.busca.trim().toLowerCase();
        return linhas.filter(function (l) {
            if (q && JSON.stringify(l).toLowerCase().indexOf(q) < 0) return false;
            return f.itens.every(function (x) {
                var c = campoDe(campos, x.campo); if (!c) return true; var vs = valoresDe(l, c);
                if (x.op === 'em') return !x.valor || !x.valor.length || vs.some(function (v) { return x.valor.indexOf(v) >= 0; });
                if (x.op === 'contem') return !x.valor || vs.join(' ').toLowerCase().indexOf(String(x.valor).toLowerCase()) >= 0;
                if (x.op === 'entre') {
                    var v = vs[0]; if (v == null) return !(x.valor && (x.valor.de || x.valor.ate));
                    var de = x.valor && x.valor.de, ate = x.valor && x.valor.ate;
                    if (ehData(c)) { v = String(v).slice(0, 10); return (!de || v >= de) && (!ate || v <= ate); }
                    var n = num(v); return (de === '' || de == null || n >= num(de)) && (ate === '' || ate == null || n <= num(ate));
                }
                if (x.op === 'vazio') return !vs.length;
                if (x.op === 'preenchido') return vs.length > 0;
                return true;
            });
        });
    }

    /* ---------- agregação ---------- */
    function chaveData(s, modo) {
        s = String(s || '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
        if (modo === 'ano') return s.slice(0, 4);
        if (modo === 'mes') return s.slice(0, 7);
        if (modo === 'semana') { var d = new Date(s + 'T00:00:00Z'), dia = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dia); return d.toISOString().slice(0, 10); }
        return s;
    }
    function rotuloData(k, modo) {
        if (modo === 'ano') return k;
        if (modo === 'mes') return MES[+k.slice(5, 7) - 1] + '/' + k.slice(2, 4);
        return k.slice(8, 10) + '/' + k.slice(5, 7) + (modo === 'semana' ? ' (sem.)' : '');
    }
    function corOpcao(c, v) { var o = c && (c.opcoes || []).filter(function (x) { return x.v === v; })[0]; return o && o.cor ? o.cor : null; }
    function agregar(linhas, cfg, campos) {
        cfg = cfg || {}; var c1 = campoDe(campos, cfg.campo), c2 = campoDe(campos, cfg.campo2), cv = campoDe(campos, cfg.campo_valor);
        var modoData = cfg.agrupar_data || 'mes', metrica = cfg.metrica || 'contar';
        var cel = {}, ordemCat = [], serieNomes = [], tot = {};
        function k1(l) { if (!c1) return ['Total']; if (ehData(c1)) { var k = chaveData(l[c1.id], modoData); return k ? [k] : ['(sem data)']; } var v = valoresDe(l, c1); return v.length ? v : ['(vazio)']; }
        function k2(l) { if (!c2) return ['Total']; if (ehData(c2)) { var k = chaveData(l[c2.id], modoData); return k ? [k] : ['(sem data)']; } var v = valoresDe(l, c2); return v.length ? v : ['(vazio)']; }
        linhas.forEach(function (l) {
            var med = (metrica === 'contar' || !cv) ? 1 : num(l[cv.id]); if (med == null) return;
            k1(l).forEach(function (a) { k2(l).forEach(function (b) {
                if (ordemCat.indexOf(a) < 0) ordemCat.push(a); if (serieNomes.indexOf(b) < 0) serieNomes.push(b);
                var key = a + '\u0001' + b, o = cel[key] || (cel[key] = { s: 0, n: 0 }); o.s += med; o.n++;
            }); });
        });
        var val = function (a, b) { var o = cel[a + '\u0001' + b]; if (!o) return 0; return metrica === 'media' ? o.s / o.n : o.s; };
        ordemCat.forEach(function (a) { tot[a] = serieNomes.reduce(function (s, b) { return s + val(a, b); }, 0); });
        var cats = ordemCat.slice();
        if (c1 && ehData(c1)) cats.sort();
        else if (cfg.ordenar === 'rotulo') cats.sort(function (x, y) { return x.localeCompare(y, 'pt-BR'); });
        else if (cfg.ordenar === 'original' && c1 && c1.opcoes && c1.opcoes.length) { var ord = c1.opcoes.map(function (o) { return o.v; }); cats.sort(function (x, y) { var i = ord.indexOf(x), j = ord.indexOf(y); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j); }); }
        else cats.sort(function (x, y) { return tot[y] - tot[x]; });
        if (c2 && ehData(c2)) serieNomes.sort(); else serieNomes.sort(function (x, y) { var sx = cats.reduce(function (s, a) { return s + val(a, x); }, 0), sy = cats.reduce(function (s, a) { return s + val(a, y); }, 0); return sy - sx; });
        var lim = +cfg.limite || 0, extra = null;
        if (lim > 0 && cats.length > lim && !(c1 && ehData(c1))) { extra = cats.slice(lim); cats = cats.slice(0, lim); }
        var rotulos = cats.map(function (a) { return c1 && ehData(c1) ? rotuloData(a, modoData) : a; });
        var series = serieNomes.map(function (b, i) {
            var valores = cats.map(function (a) { return val(a, b); });
            if (extra) valores.push(extra.reduce(function (s, a) { return s + val(a, b); }, 0));
            return { nome: c2 && ehData(c2) ? rotuloData(b, modoData) : b, chave: b, valores: valores };
        });
        if (extra) rotulos.push('Outros (' + extra.length + ')');
        var pal = PALETAS[cfg.paleta] || PALETAS.padrao, cores = cfg.cores || {};
        series.forEach(function (s, i) { s.cor = (c2 ? (cores[s.nome] || corOpcao(c2, s.chave)) : null) || pal[i % pal.length]; });
        var catCores = rotulos.map(function (r, i) { return cores[r] || corOpcao(c1, (cats[i] != null ? cats[i] : r)) || pal[i % pal.length]; });
        var total = series.reduce(function (s, x) { return s + x.valores.reduce(function (a, b) { return a + b; }, 0); }, 0);
        return { rotulos: rotulos, series: series, catCores: catCores, total: total, c2: !!c2 };
    }

    /* ---------- desenho ---------- */
    function arco(cx, cy, r, r0, a0, a1) {
        var p = function (rr, a) { return (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2); }, g = a1 - a0 > Math.PI ? 1 : 0;
        if (a1 - a0 >= Math.PI * 2 - 0.0001) a1 = a0 + Math.PI * 2 - 0.0001;
        var d = 'M ' + p(r, a0) + ' A ' + r + ' ' + r + ' 0 ' + g + ' 1 ' + p(r, a1);
        d += r0 > 0 ? ' L ' + p(r0, a1) + ' A ' + r0 + ' ' + r0 + ' 0 ' + g + ' 0 ' + p(r0, a0) + ' Z' : ' L ' + cx + ' ' + cy + ' Z';
        return d;
    }
    function legenda(itens) {
        var ul = el('ul', 'pg-leg'); itens.forEach(function (i) { var li = el('li'), sw = el('span', 'pg-sw'); sw.style.background = i.cor; li.appendChild(sw); li.appendChild(el('span', null, i.txt)); ul.appendChild(li); }); return ul;
    }
    function desenhar(host, cfg, linhas, campos) {
        cfg = cfg || {}; host.textContent = ''; host.classList.add('pg-host');
        var tipo = cfg.tipo || 'barras', ag = agregar(linhas, cfg, campos), n = ag.rotulos.length;
        if (cfg.titulo) host.appendChild(el('h4', 'pg-titulo', cfg.titulo));
        if (!n || !ag.total) { host.appendChild(el('p', 'pg-vazio', 'Sem dados para este gráfico com os filtros atuais.')); return ag; }
        var W = 640, mostrar = cfg.mostrar_valores !== false, svg, max = 0, sT = [];
        ag.rotulos.forEach(function (r, i) { sT[i] = ag.series.reduce(function (s, x) { return s + x.valores[i]; }, 0); });
        var empilhado = tipo === 'barras' || tipo === 'colunas';
        max = Math.max.apply(null, empilhado ? sT : ag.series.map(function (s) { return Math.max.apply(null, s.valores); })) || 1;
        var corDe = function (s, i) { return ag.series.length === 1 && !ag.c2 ? ag.catCores[i] : s.cor; };
        var resumo = (cfg.titulo || 'Gráfico') + ': ' + ag.rotulos.map(function (r, i) { return r + ' ' + fmt(sT[i]); }).join(', ');
        if (tipo === 'barras') {
            var L = Math.min(230, Math.max(70, Math.max.apply(null, ag.rotulos.map(function (r) { return r.length; })) * 6.6)), H = 16 + n * 32;
            svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': resumo, class: 'pg-svg' });
            ag.rotulos.forEach(function (r, i) {
                var y = 8 + i * 32, x = L, rot = r.length > 34 ? r.slice(0, 33) + '…' : r;
                svg.appendChild(sv('text', { x: L - 8, y: y + 16, 'text-anchor': 'end', class: 'pg-t' }, rot));
                ag.series.forEach(function (s) { var w = (W - L - 60) * s.valores[i] / max; if (w <= 0) return; var rc = sv('rect', { x: x, y: y, width: Math.max(w, 1.5), height: 22, rx: 4, fill: corDe(s, i) }); rc.appendChild(sv('title', {}, r + (ag.c2 ? ' · ' + s.nome : '') + ': ' + fmt(s.valores[i]))); svg.appendChild(rc); x += w; });
                if (mostrar) svg.appendChild(sv('text', { x: x + 6, y: y + 16, class: 'pg-t pg-v' }, fmt(sT[i])));
            });
        } else if (tipo === 'colunas' || tipo === 'linha' || tipo === 'area') {
            var Lm = 44, B = 70, T = 16, H2 = 330, pw = W - Lm - 16, ph = H2 - B - T, passo = pw / n;
            svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H2, role: 'img', 'aria-label': resumo, class: 'pg-svg' });
            for (var g = 0; g <= 4; g++) { var gy = T + ph - ph * g / 4; svg.appendChild(sv('line', { x1: Lm, x2: W - 8, y1: gy, y2: gy, class: 'pg-grade' })); svg.appendChild(sv('text', { x: Lm - 6, y: gy + 4, 'text-anchor': 'end', class: 'pg-t pg-s' }, fmt(max * g / 4))); }
            var skip = Math.ceil(n / 14);
            ag.rotulos.forEach(function (r, i) {
                if (i % skip) return; var cx = Lm + passo * i + passo / 2, t = sv('text', { x: cx, y: T + ph + 14, 'text-anchor': n > 7 || r.length > 8 ? 'end' : 'middle', class: 'pg-t pg-s', transform: n > 7 || r.length > 8 ? 'rotate(-35 ' + cx + ' ' + (T + ph + 14) + ')' : '' }, r.length > 18 ? r.slice(0, 17) + '…' : r); svg.appendChild(t);
            });
            if (tipo === 'colunas') {
                ag.rotulos.forEach(function (r, i) {
                    var bw = Math.min(56, passo * 0.7), x = Lm + passo * i + (passo - bw) / 2, base = T + ph;
                    ag.series.forEach(function (s) { var h = ph * s.valores[i] / max; if (h <= 0) return; base -= h; var rc = sv('rect', { x: x, y: base, width: bw, height: h, rx: 3, fill: corDe(s, i) }); rc.appendChild(sv('title', {}, r + (ag.c2 ? ' · ' + s.nome : '') + ': ' + fmt(s.valores[i]))); svg.appendChild(rc); });
                    if (mostrar) svg.appendChild(sv('text', { x: x + bw / 2, y: base - 5, 'text-anchor': 'middle', class: 'pg-t pg-v' }, fmt(sT[i])));
                });
            } else {
                ag.series.forEach(function (s) {
                    var pts = s.valores.map(function (v, i) { return [Lm + passo * i + passo / 2, T + ph - ph * v / max]; });
                    if (tipo === 'area') svg.appendChild(sv('path', { d: 'M ' + pts[0][0] + ' ' + (T + ph) + ' L ' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L ') + ' L ' + pts[n - 1][0] + ' ' + (T + ph) + ' Z', fill: s.cor, 'fill-opacity': 0.18 }));
                    svg.appendChild(sv('polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), fill: 'none', stroke: s.cor, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
                    pts.forEach(function (p, i) { var c = sv('circle', { cx: p[0], cy: p[1], r: 4, fill: s.cor }); c.appendChild(sv('title', {}, ag.rotulos[i] + (ag.c2 ? ' · ' + s.nome : '') + ': ' + fmt(s.valores[i]))); svg.appendChild(c); if (mostrar && ag.series.length === 1) svg.appendChild(sv('text', { x: p[0], y: p[1] - 9, 'text-anchor': 'middle', class: 'pg-t pg-v' }, fmt(s.valores[i]))); });
                });
            }
        } else {
            var cx0 = 170, cy0 = 150, R = 120, r0 = tipo === 'rosca' ? 68 : 0, ang = -Math.PI / 2, tt = sT.reduce(function (a, b) { return a + b; }, 0);
            svg = sv('svg', { viewBox: '0 0 ' + W + ' 300', role: 'img', 'aria-label': resumo, class: 'pg-svg' });
            sT.forEach(function (v, i) {
                if (v <= 0) return; var a1 = ang + (v / tt) * Math.PI * 2, p = sv('path', { d: arco(cx0, cy0, R, r0, ang, a1), fill: ag.catCores[i], stroke: '#fff', 'stroke-width': 2 });
                p.appendChild(sv('title', {}, ag.rotulos[i] + ': ' + fmt(v) + ' (' + fmt(v * 100 / tt) + '%)')); svg.appendChild(p);
                if (mostrar && v / tt > 0.05) { var am = (ang + a1) / 2, rr = r0 ? (R + r0) / 2 : R * 0.65; svg.appendChild(sv('text', { x: cx0 + rr * Math.cos(am), y: cy0 + rr * Math.sin(am) + 4, 'text-anchor': 'middle', class: 'pg-t pg-b' }, fmt(v))); }
                ang = a1;
            });
            if (r0) { svg.appendChild(sv('text', { x: cx0, y: cy0 - 2, 'text-anchor': 'middle', class: 'pg-t pg-grande' }, fmt(tt))); svg.appendChild(sv('text', { x: cx0, y: cy0 + 18, 'text-anchor': 'middle', class: 'pg-t pg-s' }, cfg.metrica === 'somar' ? 'soma' : (cfg.metrica === 'media' ? 'média' : 'total'))); }
            var ly = 24; ag.rotulos.forEach(function (r, i) { if (sT[i] <= 0 || ly > 290) return; svg.appendChild(sv('rect', { x: 330, y: ly - 10, width: 12, height: 12, rx: 3, fill: ag.catCores[i] })); svg.appendChild(sv('text', { x: 350, y: ly, class: 'pg-t' }, (r.length > 26 ? r.slice(0, 25) + '…' : r) + ' — ' + fmt(sT[i]) + ' (' + fmt(sT[i] * 100 / tt) + '%)')); ly += 22; });
        }
        host.appendChild(svg);
        if (ag.c2 && tipo !== 'pizza' && tipo !== 'rosca') host.appendChild(legenda(ag.series.map(function (s) { return { cor: s.cor, txt: s.nome }; })));
        var det = el('details', 'pg-tab'); det.appendChild(el('summary', null, 'Ver os números'));
        var tb = el('table', 'dir-table'), hd = el('tr'); hd.appendChild(el('th', null, 'Grupo')); ag.series.forEach(function (s) { hd.appendChild(el('th', null, ag.c2 ? s.nome : 'Valor')); }); if (ag.series.length > 1) hd.appendChild(el('th', null, 'Total')); tb.appendChild(hd);
        ag.rotulos.forEach(function (r, i) { var tr = el('tr'); tr.appendChild(el('td', null, r)); ag.series.forEach(function (s) { tr.appendChild(el('td', null, fmt(s.valores[i]))); }); if (ag.series.length > 1) tr.appendChild(el('td', null, fmt(sT[i]))); tb.appendChild(tr); });
        var w = el('div', 'table-card'); w.appendChild(tb); det.appendChild(w); host.appendChild(det);
        return ag;
    }

    /* ---------- controles ---------- */
    function sel(rot, ops, valor, cb, vazio) {
        var d = el('div', 'lf'), l = el('label', null, rot), s = el('select', 'login-input'); var id = 'pg' + Math.random().toString(36).slice(2, 8); l.htmlFor = id; s.id = id;
        if (vazio) { var o0 = el('option', null, vazio); o0.value = ''; s.appendChild(o0); }
        ops.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === valor) op.selected = true; s.appendChild(op); });
        s.addEventListener('change', function () { cb(s.value); }); d.appendChild(l); d.appendChild(s); return d;
    }
    function inp(rot, valor, tipo, cb, ph) {
        var d = el('div', 'lf'), l = el('label', null, rot), i = el('input', 'login-input'); var id = 'pg' + Math.random().toString(36).slice(2, 8); l.htmlFor = id; i.id = id; i.type = tipo || 'text'; i.value = valor == null ? '' : valor; if (ph) i.placeholder = ph;
        i.addEventListener('input', function () { cb(i.value); }); d.appendChild(l); d.appendChild(i); return d;
    }
    function editor(host, cfg, campos, linhas, aoMudar) {
        host.textContent = ''; cfg = cfg || {}; var deb = null;
        function mud(k, v) { if (v === '' || v == null) delete cfg[k]; else cfg[k] = v; if (k === 'campo' || k === 'campo2' || k === 'metrica' || k === 'campo_valor' || k === 'agrupar_data') { aoMudar(cfg, true); } else { clearTimeout(deb); deb = setTimeout(function () { aoMudar(cfg, false); }, 160); } }
        var cats = campos.filter(function (c) { return c.tipo !== 'longo' && c.tipo !== 'link'; }).map(function (c) { return [c.id, c.rotulo]; });
        var nums = campos.filter(function (c) { return c.tipo === 'numero'; }).map(function (c) { return [c.id, c.rotulo]; });
        var g = el('div', 'pg-ed');
        g.appendChild(inp('Título do gráfico', cfg.titulo, 'text', function (v) { mud('titulo', v); }));
        g.appendChild(sel('Tipo de gráfico', TIPOS, cfg.tipo || 'barras', function (v) { mud('tipo', v); }));
        g.appendChild(sel('Agrupar por', cats, cfg.campo || (cats[0] && cats[0][0]), function (v) { mud('campo', v); }));
        g.appendChild(sel('Dividir em séries por (opcional)', cats, cfg.campo2, function (v) { mud('campo2', v); }, '— nenhuma —'));
        var c1 = campoDe(campos, cfg.campo || (cats[0] && cats[0][0])), c2 = campoDe(campos, cfg.campo2);
        if (ehData(c1) || ehData(c2)) g.appendChild(sel('Datas agrupadas por', [['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês'], ['ano', 'Ano']], cfg.agrupar_data || 'mes', function (v) { mud('agrupar_data', v); }));
        g.appendChild(sel('O que medir', [['contar', 'Quantidade de itens'], ['somar', 'Soma de um número'], ['media', 'Média de um número']], cfg.metrica || 'contar', function (v) { mud('metrica', v); }));
        if ((cfg.metrica === 'somar' || cfg.metrica === 'media')) g.appendChild(sel('Campo numérico', nums, cfg.campo_valor, function (v) { mud('campo_valor', v); }, '— escolha —'));
        g.appendChild(sel('Cores', Object.keys(PALETAS).map(function (k) { return [k, PALETA_ROT[k]]; }), cfg.paleta || 'padrao', function (v) { mud('paleta', v); }));
        g.appendChild(sel('Ordem', [['valor', 'Maior para menor'], ['rotulo', 'Ordem alfabética'], ['original', 'Ordem original das opções']], cfg.ordenar || 'valor', function (v) { mud('ordenar', v); }));
        g.appendChild(inp('Mostrar só os N maiores (0 = todos)', cfg.limite || '', 'number', function (v) { mud('limite', v ? +v : ''); }, '0'));
        var ck = el('label', 'cm-check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = cfg.mostrar_valores !== false; cb.addEventListener('change', function () { cfg.mostrar_valores = cb.checked; aoMudar(cfg, false); }); ck.appendChild(cb); ck.appendChild(el('span', null, 'Mostrar os valores no gráfico')); g.appendChild(ck);
        host.appendChild(g);
        /* cores individuais */
        var ag = agregar(filtrar(linhas, cfg.filtros, campos), cfg, campos), nomes = ag.c2 ? ag.series.map(function (s) { return [s.nome, s.cor]; }) : ag.rotulos.map(function (r, i) { return [r, ag.catCores[i]]; });
        if (nomes.length && nomes.length <= 30) {
            var box = el('details', 'pg-cores'); box.appendChild(el('summary', null, 'Escolher a cor de cada item')); var gr = el('div', 'pg-cores-grade');
            nomes.forEach(function (n) { var d = el('label', 'pg-cor'), c = el('input'); c.type = 'color'; c.value = /^#[0-9a-f]{6}$/i.test(n[1]) ? n[1] : '#4338ca'; c.addEventListener('input', function () { cfg.cores = cfg.cores || {}; cfg.cores[n[0]] = c.value; clearTimeout(deb); deb = setTimeout(function () { aoMudar(cfg, false); }, 160); }); d.appendChild(c); d.appendChild(el('span', null, n[0])); gr.appendChild(d); });
            var rs = el('button', 'btn btn--outline btn--sm', 'Voltar às cores automáticas'); rs.type = 'button'; rs.addEventListener('click', function () { delete cfg.cores; aoMudar(cfg, true); });
            box.appendChild(gr); box.appendChild(rs); host.appendChild(box);
        }
    }
    function filtrosUI(host, filtros, campos, linhas, aoMudar) {
        host.textContent = ''; var f = normFiltros(filtros); var deb = null;
        function mud() { clearTimeout(deb); deb = setTimeout(function () { aoMudar(f); }, 180); }
        var bar = el('div', 'pg-filtros');
        var busca = inp('Buscar em tudo', f.busca, 'search', function (v) { f.busca = v; mud(); }, 'Digite parte de qualquer resposta…'); bar.appendChild(busca);
        f.itens.forEach(function (x, idx) {
            var c = campoDe(campos, x.campo); if (!c) return; var box = el('div', 'pg-filtro');
            box.appendChild(el('strong', null, c.rotulo));
            var vals = []; linhas.forEach(function (l) { valoresDe(l, c).forEach(function (v) { if (vals.indexOf(v) < 0) vals.push(v); }); });
            if ((c.tipo === 'escolha' || c.tipo === 'selecao' || c.tipo === 'multipla' || c.tipo === 'aceite' || (c.id.charAt(0) === '_' && c.tipo === 'escolha')) && vals.length <= 60) {
                x.op = 'em'; x.valor = x.valor || []; vals.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
                var wrap = el('div', 'pg-chk'); vals.forEach(function (v) { var l = el('label', 'cm-check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = x.valor.indexOf(v) >= 0; cb.addEventListener('change', function () { var i = x.valor.indexOf(v); if (cb.checked && i < 0) x.valor.push(v); if (!cb.checked && i >= 0) x.valor.splice(i, 1); mud(); }); l.appendChild(cb); l.appendChild(el('span', null, v)); wrap.appendChild(l); }); box.appendChild(wrap);
            } else if (c.tipo === 'data' || c.tipo === 'numero') {
                x.op = 'entre'; x.valor = x.valor || { de: '', ate: '' }; var t = c.tipo === 'data' ? 'date' : 'number';
                box.appendChild(inp('De', x.valor.de, t, function (v) { x.valor.de = v; mud(); })); box.appendChild(inp('Até', x.valor.ate, t, function (v) { x.valor.ate = v; mud(); }));
            } else { x.op = 'contem'; box.appendChild(inp('Contém', x.valor || '', 'text', function (v) { x.valor = v; mud(); })); }
            var rm = el('button', 'btn btn--outline btn--sm', 'Remover'); rm.type = 'button'; rm.addEventListener('click', function () { f.itens.splice(idx, 1); aoMudar(f, true); }); box.appendChild(rm); bar.appendChild(box);
        });
        var usados = f.itens.map(function (x) { return x.campo; }), livres = campos.filter(function (c) { return usados.indexOf(c.id) < 0 && c.tipo !== 'longo' && c.tipo !== 'link'; });
        if (livres.length) { var add = sel('Adicionar filtro', livres.map(function (c) { return [c.id, c.rotulo]; }), '', function (v) { if (!v) return; f.itens.push({ campo: v, op: 'em', valor: [] }); aoMudar(f, true); }, '+ escolher campo'); bar.appendChild(add); }
        host.appendChild(bar);
    }
    window.PortalGraficos = { PALETAS: PALETAS, TIPOS: TIPOS, filtrar: filtrar, agregar: agregar, desenhar: desenhar, editor: editor, filtrosUI: filtrosUI, normFiltros: normFiltros, fmt: fmt };
})();
