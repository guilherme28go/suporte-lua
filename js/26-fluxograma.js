/* Fluxograma: desenha um passo a passo (início, passos, decisões e fim) como imagem SVG, e exporta em PNG/SVG.
   Modelo:  { titulo, passos: [ { tipo: 'inicio'|'passo'|'decisao'|'fim', t: 'texto', url: 'https://...' (opcional),
              nao: { t: 'se NÃO...', url: '...', fim: true|false } (só na decisão) } ] }
   Os links (ex.: Portal do conhecimento) viram texto clicável na tela; no PNG o link só aparece como texto sublinhado. */
(function () {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    var W = 700, CX = 210, LARG = 280, LADO_X = 410, LADO_L = 250, FONTE = 13, LH = 17, CHAR = 6.9, FOLGA = 34;
    var COR = { inicio: ['#e8f5e9', '#2e7d32'], passo: ['#ede9fe', '#1b0088'], decisao: ['#fff4e0', '#d35400'], fim: ['#ffebee', '#c62828'], lado: ['#f5f5f5', '#616161'] };
    function urlOk(u) { u = String(u || '').trim(); if (window.PortalCore && window.PortalCore.urlSegura) return window.PortalCore.urlSegura(u) || ''; return /^https?:\/\/[^\s]+$/i.test(u) ? u : ''; }
    function quebrar(txt, max) {
        var palavras = String(txt || '').replace(/\s+/g, ' ').trim().split(' '), linhas = [], at = '';
        palavras.forEach(function (p) {
            while (p.length > max) { if (at) { linhas.push(at); at = ''; } linhas.push(p.slice(0, max)); p = p.slice(max); }
            if ((at + ' ' + p).trim().length > max) { linhas.push(at); at = p; } else at = (at + ' ' + p).trim();
        });
        if (at) linhas.push(at); return linhas.length ? linhas : [''];
    }
    function mk(tag, attrs, pai) { var n = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); }); if (pai) pai.appendChild(n); return n; }
    function texto(pai, linhas, cx, cy, cor, link) {
        var t = mk('text', { 'text-anchor': 'middle', 'font-family': 'Figtree, Arial, sans-serif', 'font-size': FONTE, fill: cor, 'font-weight': '600' }, null);
        var y0 = cy - (linhas.length - 1) * LH / 2 + 4.5;
        linhas.forEach(function (l, i) { var s = mk('tspan', { x: cx, y: y0 + i * LH }, t); s.textContent = l; });
        if (link) { t.setAttribute('text-decoration', 'underline'); var a = mk('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, pai); a.appendChild(t); } else pai.appendChild(t);
    }
    function seta(pai, x, y1, y2, rot) {
        mk('line', { x1: x, y1: y1, x2: x, y2: y2 - 6, stroke: '#6b7280', 'stroke-width': 2 }, pai);
        mk('path', { d: 'M' + (x - 5) + ' ' + (y2 - 8) + ' L' + x + ' ' + y2 + ' L' + (x + 5) + ' ' + (y2 - 8) + ' Z', fill: '#6b7280' }, pai);
        if (rot) { var t = mk('text', { x: x + 8, y: y1 + 16, 'font-family': 'Figtree, Arial, sans-serif', 'font-size': 12, 'font-weight': '800', fill: '#374151' }, pai); t.textContent = rot; }
    }
    function desenhar(fc) {
        var passos = (fc && Array.isArray(fc.passos) ? fc.passos : []).filter(function (p) { return p && String(p.t || '').trim(); });
        var svg = mk('svg', { xmlns: NS, role: 'img', 'font-family': 'Figtree, Arial, sans-serif' });
        var y = 20, gap = 34, caixas = [], titulo = fc && fc.titulo ? String(fc.titulo).trim() : '';
        if (titulo) { var tt = mk('text', { x: 20, y: y + 14, 'font-size': 16, 'font-weight': '800', fill: '#1b0088', 'font-family': 'Figtree, Arial, sans-serif' }, svg); tt.textContent = titulo.slice(0, 90); y += 40; }
        var gArr = mk('g', {}, svg), gBox = mk('g', {}, svg), ant = null;
        passos.forEach(function (p, i) {
            var tipo = COR[p.tipo] && p.tipo !== 'lado' ? p.tipo : 'passo', max = tipo === 'decisao' ? 22 : 36, linhas = quebrar(p.t, max), h;
            var link = urlOk(p.url), cor = COR[tipo];
            if (tipo === 'decisao') h = Math.max(96, linhas.length * LH + 62); else h = Math.max(46, linhas.length * LH + 24);
            var topo = y, cy = y + h / 2;
            if (ant != null) seta(gArr, CX, ant.base, topo, ant.rotSim ? 'Sim' : '');
            var g = mk('g', {}, gBox);
            if (tipo === 'decisao') mk('polygon', { points: [CX, topo, CX + LARG / 2, cy, CX, topo + h, CX - LARG / 2, cy].join(' '), fill: cor[0], stroke: cor[1], 'stroke-width': 2 }, g);
            else mk('rect', { x: CX - LARG / 2, y: topo, width: LARG, height: h, rx: (tipo === 'inicio' || tipo === 'fim') ? h / 2 : 12, fill: cor[0], stroke: cor[1], 'stroke-width': 2 }, g);
            texto(g, linhas, CX, cy, cor[1], link);
            if (tipo === 'decisao' && p.nao && String(p.nao.t || '').trim()) {
                var ll = quebrar(p.nao.t, 34), hh = Math.max(46, ll.length * LH + 24), ty = cy - hh / 2, nlink = urlOk(p.nao.url), fimLado = !!p.nao.fim, cc = fimLado ? COR.fim : COR.lado;
                mk('line', { x1: CX + LARG / 2, y1: cy, x2: LADO_X - 6, y2: cy, stroke: '#6b7280', 'stroke-width': 2 }, gArr);
                mk('path', { d: 'M' + (LADO_X - 8) + ' ' + (cy - 5) + ' L' + LADO_X + ' ' + cy + ' L' + (LADO_X - 8) + ' ' + (cy + 5) + ' Z', fill: '#6b7280' }, gArr);
                var nl = mk('text', { x: CX + LARG / 2 + 8, y: cy - 8, 'font-size': 12, 'font-weight': '800', fill: '#374151', 'font-family': 'Figtree, Arial, sans-serif' }, gArr); nl.textContent = 'Não';
                var g2 = mk('g', {}, gBox);
                mk('rect', { x: LADO_X, y: ty, width: LADO_L, height: hh, rx: fimLado ? hh / 2 : 12, fill: cc[0], stroke: cc[1], 'stroke-width': 2 }, g2);
                texto(g2, ll, LADO_X + LADO_L / 2, cy, cc[1], nlink);
                h = Math.max(h, (ty + hh) - topo);
            }
            ant = { base: topo + (tipo === 'decisao' ? (cy - topo) * 2 : h), rotSim: tipo === 'decisao' };
            if (tipo === 'decisao') ant.base = topo + Math.max(96, linhas.length * LH + 62);
            y = Math.max(topo + (tipo === 'decisao' ? Math.max(96, linhas.length * LH + 62) : h), topo + h) + gap;
            if (i === passos.length - 1) y -= gap;
        });
        var alto = y + 20; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + alto); svg.setAttribute('width', W); svg.setAttribute('height', alto);
        svg.setAttribute('aria-label', titulo ? 'Fluxograma: ' + titulo : 'Fluxograma do passo a passo');
        if (!passos.length) { var vz = mk('text', { x: W / 2, y: 60, 'text-anchor': 'middle', 'font-size': 14, fill: '#6b7280' }, svg); vz.textContent = 'Adicione passos para montar o fluxograma.'; svg.setAttribute('viewBox', '0 0 ' + W + ' 120'); svg.setAttribute('height', 120); }
        return svg;
    }
    function svgTexto(fc) { var s = desenhar(fc), bg = document.createElementNS(NS, 'rect'); bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#ffffff'); s.insertBefore(bg, s.firstChild); return new XMLSerializer().serializeToString(s); }
    function png(fc) {
        return new Promise(function (ok, no) {
            var s = svgTexto(fc), blob = new Blob([s], { type: 'image/svg+xml;charset=utf-8' }), u = URL.createObjectURL(blob), img = new Image(), el = desenhar(fc);
            var w = +el.getAttribute('width'), h = +el.getAttribute('height');
            img.onload = function () { var c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(function (b) { b ? ok(b) : no(new Error('Não foi possível gerar a imagem.')); }, 'image/png'); };
            img.onerror = function () { URL.revokeObjectURL(u); no(new Error('Não foi possível gerar a imagem.')); }; img.src = u;
        });
    }
    function baixarBlob(blob, nome) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
    function nomeArq(fc) { var b = String((fc && fc.titulo) || 'fluxograma').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'fluxograma'; return b; }
    function limpo(fc) {
        var o = { titulo: '', passos: [] }; if (!fc || typeof fc !== 'object') return o; o.titulo = String(fc.titulo || '').slice(0, 90);
        (Array.isArray(fc.passos) ? fc.passos : []).slice(0, 40).forEach(function (p) {
            if (!p || typeof p !== 'object') return; var tipo = ['inicio', 'passo', 'decisao', 'fim'].indexOf(p.tipo) >= 0 ? p.tipo : 'passo', q = { tipo: tipo, t: String(p.t || '').slice(0, 220) };
            if (urlOk(p.url)) q.url = urlOk(p.url);
            if (tipo === 'decisao' && p.nao && typeof p.nao === 'object') { q.nao = { t: String(p.nao.t || '').slice(0, 220) }; if (urlOk(p.nao.url)) q.nao.url = urlOk(p.nao.url); if (p.nao.fim) q.nao.fim = true; }
            o.passos.push(q);
        }); return o;
    }
    window.PortalFluxograma = {
        desenhar: desenhar, limpo: limpo,
        baixarPng: function (fc) { return png(fc).then(function (b) { baixarBlob(b, nomeArq(fc) + '.png'); }); },
        baixarSvg: function (fc) { baixarBlob(new Blob([svgTexto(fc)], { type: 'image/svg+xml' }), nomeArq(fc) + '.svg'); }
    };
})();
