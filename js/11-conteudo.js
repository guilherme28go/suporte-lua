/* ==========================================================================
   CONTEÚDO DO PORTAL NO BANCO + EDIÇÃO POR PAPEL  (núcleo)
   Tudo o que aparece nas abas vem das tabelas do banco (SQL 4 e 7):
   portal_cards, portal_textos, portal_abas, portal_dados, portal_permissoes.
   Quem edita cada área é decidido pelo banco (RLS) e espelhado aqui:
     administrador -> o que a matriz de permissões liberar
     desenvolvedor -> tudo
   Os outros arquivos (12-portais.js e 13-desenvolvedor.js) usam window.PortalCore.
   ========================================================================== */
(function () {
    'use strict';
    var CACHE = 'suporteLuaConteudo2';
    var NS = 'http://www.w3.org/2000/svg';
    var LUCIDE = 'https://cdn.jsdelivr.net/npm/lucide-static@0.263.1/icons/'; /* ícones que ainda não estão no sprite */
    var $ = function (id) { return document.getElementById(id); };

    var estado = { cards: [], textos: {}, abas: [], perm: {}, dados: {}, pronto: false, semAbas: true };
    var sb = null, reqN = 0, ultimoJson = '', authOk = false;
    var NIV = { publico: 0, agente: 1, administrador: 2, desenvolvedor: 3 };
    /* usado só se a tabela portal_permissoes ainda não existir (SQL 6 não rodado) */
    var PERM_PADRAO = { sistemas: 'administrador', forms: 'administrador', slides: 'administrador', avisos: 'administrador', compartilhamentos: 'administrador', textos: 'administrador', abas: 'administrador' };
    var AREAS_FIXAS = ['sistemas', 'forms', 'slides', 'avisos', 'compartilhamentos', 'telefones', 'scripts', 'futuras', 'cronologia'];

    var CLASSE_CARD = { sistema: 'card--system', form: 'card--form', slide: 'card--slide', aviso: 'card--notice', compartilhar: 'card--share', pessoa: 'card--share' };
    var ESTILO_BTN = { primary: 'btn--primary', indigo: 'btn--indigo', outline: 'btn--outline' };
    var CORES_CARTAO = [['', 'Padrão (azul)'], ['violet', 'Violeta'], ['red', 'Vermelho'], ['green', 'Verde'], ['amber', 'Âmbar'], ['slate', 'Cinza']];

    /* ---------- papéis e permissões ---------- */
    function nivel() { return window.suporteLuaNivel | 0; }
    function areaDaSecao(s) { return AREAS_FIXAS.indexOf(s) >= 0 ? s : 'portais'; }
    function pode(area) {
        var n = nivel(); if (n < 2) return false;
        var p = estado.perm[area] || estado.perm.portais || 'desenvolvedor';
        return n >= Math.max(2, NIV[p] || 3);
    }
    function podeSecao(secao) { return pode(areaDaSecao(secao)); }
    function alguemEdita() { return nivel() >= 2; }

    /* ---------- DOM ---------- */
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function icon(nome, sm) {
        var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'ic' + (sm ? ' ic--sm' : '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
        var u = document.createElementNS(NS, 'use'); u.setAttribute('href', '#i-' + nomeIcone(nome)); s.appendChild(u); return s;
    }
    function toast(m) { if (typeof showToast === 'function') showToast(m); }
    function urlSegura(u) { u = String(u || '').trim(); if (/^#form\/[a-z0-9][a-z0-9-]{1,58}$/.test(u)) return u; /* formulário interno do portal */ try { var x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch (e) { return ''; } }
    function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, ''); }

    /* ---------- ícones: usa o sprite da página; os que faltam são buscados e acrescentados ---------- */
    var tentando = {};
    function nomeIcone(n) {
        n = String(n || '').trim().toLowerCase();
        if (!/^[a-z0-9-]{1,40}$/.test(n)) return 'link';
        if (!document.getElementById('i-' + n)) carregarIcone(n);
        return n;
    }
    function atualizarUsos(n, para) {
        document.querySelectorAll('use').forEach(function (u) {
            if (u.getAttribute('href') !== '#i-' + n) return;
            u.removeAttribute('href'); u.setAttribute('href', '#i-' + (para || n));
        });
    }
    function copiarSeguro(de, para) {
        var OK = { g: 1, path: 1, circle: 1, rect: 1, line: 1, polyline: 1, polygon: 1, ellipse: 1 };
        Array.prototype.forEach.call(de.childNodes, function (c) {
            if (c.nodeType !== 1 || !OK[c.nodeName.toLowerCase()]) return;
            var n = document.createElementNS(NS, c.nodeName.toLowerCase());
            Array.prototype.forEach.call(c.attributes, function (a) { if (/^(d|cx|cy|r|rx|ry|x|y|x1|x2|y1|y2|width|height|points|transform|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)$/.test(a.name)) n.setAttribute(a.name, a.value); });
            copiarSeguro(c, n); para.appendChild(n);
        });
    }
    function carregarIcone(n) {
        if (tentando[n] || !window.fetch) return; tentando[n] = 1;
        fetch(LUCIDE + n + '.svg').then(function (r) { if (!r.ok) throw new Error('x'); return r.text(); }).then(function (t) {
            var svg = new DOMParser().parseFromString(t, 'image/svg+xml').documentElement;
            if (!svg || svg.nodeName.toLowerCase() !== 'svg' || document.getElementById('i-' + n)) return;
            var sym = document.createElementNS(NS, 'symbol'); sym.id = 'i-' + n; sym.setAttribute('viewBox', '0 0 24 24');
            copiarSeguro(svg, sym);
            var sprite = document.querySelector('svg.sprite') || (document.querySelector('svg > symbol') || {}).parentNode;
            if (!sprite) throw new Error('sem sprite');
            sprite.appendChild(sym); atualizarUsos(n);
        }).catch(function () { atualizarUsos(n, 'link'); });
    }
    function nomesDeIcones() {
        return Array.prototype.map.call(document.querySelectorAll('symbol[id^="i-"]'), function (s) { return s.id.slice(2); }).sort();
    }

    /* ---------- textos ---------- */
    function abaDe(chave) { return estado.abas.filter(function (a) { return a.chave === chave; })[0] || null; }
    function T(k) {
        var m = /^aba\.([a-z0-9_]+)\.(rotulo|icone)$/.exec(k);
        if (m) { var a = abaDe(m[1]); if (a && a[m[2]]) return a[m[2]]; }
        var v = estado.textos[k]; return v != null && String(v).trim() !== '' ? String(v) : null;
    }
    function aplicarTextos() {
        document.querySelectorAll('[data-txt]').forEach(function (n) { var v = T(n.getAttribute('data-txt')); if (v != null) n.textContent = v; });
        document.querySelectorAll('[data-txt-ph]').forEach(function (n) {
            var v = T(n.getAttribute('data-txt-ph')); if (v == null) return;
            if (!n.disabled) n.setAttribute('placeholder', v); n.setAttribute('aria-label', v); n.setAttribute('data-ph', v);
        });
        document.querySelectorAll('[data-ico]').forEach(function (n) {
            var v = T(n.getAttribute('data-ico')), u = n.querySelector('use'); if (v != null && u) u.setAttribute('href', '#i-' + nomeIcone(v));
        });
    }

    /* ---------- mini-markdown seguro (**negrito**, *itálico*, [texto](https://link), "- " lista) ---------- */
    function inline(txt, pai) {
        var re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g, ult = 0, m;
        while ((m = re.exec(txt))) {
            if (m.index > ult) pai.appendChild(document.createTextNode(txt.slice(ult, m.index)));
            var t = m[0];
            if (t.indexOf('**') === 0) pai.appendChild(el('strong', null, t.slice(2, -2)));
            else if (t.charAt(0) === '*') pai.appendChild(el('em', null, t.slice(1, -1)));
            else {
                var k = t.indexOf(']('), u = urlSegura(t.slice(k + 2, -1)), a = el('a', null, t.slice(1, k));
                if (u) { a.href = u; if (u.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; } }
                pai.appendChild(a);
            }
            ult = m.index + t.length;
        }
        if (ult < txt.length) pai.appendChild(document.createTextNode(txt.slice(ult)));
    }
    function mdDom(txt, cls) {
        var raiz = el('div', cls || 'cm-md');
        String(txt || '').split(/\n{2,}/).forEach(function (bloco) {
            var linhas = bloco.split('\n').filter(function (l) { return l.trim(); }); if (!linhas.length) return;
            if (linhas.every(function (l) { return /^\s*[-•]\s+/.test(l); })) {
                var ul = el('ul', 'cm-md-list'); linhas.forEach(function (l) { var li = el('li'); inline(l.replace(/^\s*[-•]\s+/, ''), li); ul.appendChild(li); }); raiz.appendChild(ul);
            } else {
                var p = el('p', 'card-text'); linhas.forEach(function (l, i) { if (i) p.appendChild(el('br')); inline(l, p); }); raiz.appendChild(p);
            }
        });
        return raiz;
    }

    /* ---------- botões e cartões ---------- */
    function botaoDom(b) {
        var cls = 'btn ' + (ESTILO_BTN[b.estilo] || 'btn--outline') + ' btn--sm', n, rot = String(b.rotulo || '');
        if (b.tipo === 'link') {
            var u = urlSegura(b.url);
            n = el('a', cls); n.href = u || '#';
            if (u && u.charAt(0) !== '#') { n.target = '_blank'; n.rel = 'noopener noreferrer'; }
            else n.addEventListener('click', function (e) { e.preventDefault(); toast('Este botão ainda não tem link.'); });
            n.appendChild(el('span', null, rot)); n.appendChild(icon(b.icone || 'arrow-up-right'));
        } else if (b.tipo === 'acessos') {
            n = el('button', cls); n.type = 'button'; n.setAttribute('data-acessos', '');
            n.title = b.dica || 'Ver os acessos que você cadastrou para este sistema';
            n.appendChild(icon(b.icone || 'key-round', true)); n.appendChild(el('span', null, rot));
        } else if (b.tipo === 'copiar') {
            n = el('button', cls); n.type = 'button'; n.setAttribute('data-copy-link', urlSegura(b.url));
            n.title = b.dica || 'Copiar link';
            n.appendChild(icon(b.icone || 'link', true)); n.appendChild(el('span', null, rot));
        }
        return n;
    }
    function acoesDom(botoes) {
        var ac = el('div', 'card-actions');
        (botoes || []).forEach(function (b) { var n = b && botaoDom(b); if (n) ac.appendChild(n); });
        return ac.children.length ? ac : null;
    }
    function cabeca(c, h3) {
        var hd = el('div', 'card-head'), ci = el('span', 'card-icon'); ci.appendChild(icon(c.icone)); hd.appendChild(ci);
        if (h3) hd.appendChild(el('h3', null, c.titulo || '')); return hd;
    }
    function textoCorpo(pai, texto) {
        String(texto || '').split(/\n{2,}/).forEach(function (p) { if (p.trim()) pai.appendChild(el('p', 'card-text', p.trim())); });
    }
    function cartaoDom(c) {
        var a = el('article', 'card ' + (CLASSE_CARD[c.tipo] || 'card--system')); a.setAttribute('data-id', c.id);
        if (!c.ativo) a.classList.add('cm-off');
        var ac;
        if (c.tipo === 'sistema' || c.tipo === 'form' || c.tipo === 'slide') {
            a.appendChild(cabeca(c, true));
            if (c.texto) a.appendChild(el('p', 'card-text', c.texto));
            if (c.tipo === 'sistema' && ((c.chips || []).length || (c.auth || []).length)) {
                var au = el('div', 'auth'); au.setAttribute('data-auth', (c.auth || []).join(','));
                au.appendChild(el('p', 'auth-label', T('sistemas.como_entrar') || 'Como entrar'));
                var ul = el('ul', 'auth-list');
                (c.chips || []).forEach(function (x) {
                    var li = el('li', 'auth-chip auth-chip--' + slug(x.estilo || 'x'));
                    li.appendChild(icon(x.icone, true)); li.appendChild(el('span', null, x.texto || '')); ul.appendChild(li);
                });
                au.appendChild(ul); a.appendChild(au);
            }
            ac = acoesDom(c.botoes); if (ac) a.appendChild(ac);
        } else if (c.tipo === 'aviso') {
            var h = el('div', 'card-head'), ci = el('span', 'card-icon'); ci.appendChild(icon(c.icone)); h.appendChild(ci);
            var l = el('ul', 'notice-list'); (c.itens || []).forEach(function (t) { l.appendChild(el('li', null, String(t))); });
            h.appendChild(l); a.appendChild(h);
        } else if (c.tipo === 'compartilhar') {
            if (c.secao === 'slides') { a.classList.add('share-cta', 'share-cta--top'); a.id = 'slidesShare'; }
            var hd = el('div', 'card-head'), ic = el('span', 'card-icon'); ic.appendChild(icon(c.icone)); hd.appendChild(ic);
            var forte = el('p', 'card-text card-text--strong', c.titulo || '');
            if (c.texto) { var w = el('div'); w.appendChild(forte); textoCorpo(w, c.texto); hd.appendChild(w); } else hd.appendChild(forte);
            a.appendChild(hd); ac = acoesDom(c.botoes); if (ac) a.appendChild(ac);
        } else if (c.tipo === 'pessoa') {
            var hp = el('div', 'card-head'), ip = el('span', 'card-icon'); ip.appendChild(icon(c.icone)); hp.appendChild(ip);
            var wp = el('div'); wp.appendChild(el('p', 'card-text card-text--strong', c.titulo || '')); if (c.texto) wp.appendChild(el('p', 'card-text', c.texto));
            hp.appendChild(wp); a.appendChild(hp);
        }
        return a;
    }
    function legendaDom(c) {
        var li = el('li'); if (!c.ativo) li.classList.add('cm-off');
        li.setAttribute('data-id', c.id);
        var chip = el('span', 'auth-chip auth-chip--' + slug(c.estilo || 'x'));
        chip.appendChild(icon(c.icone, true)); chip.appendChild(el('span', null, c.titulo || ''));
        li.appendChild(chip); li.appendChild(el('p', null, c.texto || '')); return li;
    }
    /* cartão livre dos portais novos */
    function cartaoLivreDom(c) {
        var a = el('article', 'card card--livre' + (c.estilo ? ' card--cor-' + slug(c.estilo) : '')); a.setAttribute('data-id', c.id);
        if (!c.ativo) a.classList.add('cm-off');
        a.appendChild(cabeca(c, true));
        if (c.texto) a.appendChild(mdDom(c.texto));
        var ac = acoesDom(c.botoes); if (ac) a.appendChild(ac);
        return a;
    }
    function blocoTextoDom(c) {
        var a = el('article', 'card card--texto'); a.setAttribute('data-id', c.id);
        if (!c.ativo) a.classList.add('cm-off');
        if (c.titulo) { var h = el('h3', 'cm-texto-tit'); if (c.icone) h.appendChild(icon(c.icone)); h.appendChild(el('span', null, c.titulo)); a.appendChild(h); }
        a.appendChild(mdDom(c.texto)); return a;
    }
    /* linha do Diretório de Telefones */
    function telefoneDom(c) {
        var tr = el('tr'); tr.setAttribute('data-id', c.id); if (!c.ativo) tr.classList.add('cm-off');
        var td1 = el('td', 'td-name'), nc = el('div', 'name-cell'), ri = el('span', 'row-ico'); ri.appendChild(icon(c.icone || 'phone'));
        nc.appendChild(ri); nc.appendChild(el('span', null, c.titulo || '')); td1.appendChild(nc);
        var td2 = el('td', 'td-desc', c.texto || '');
        var td3 = el('td', 'td-phone'), ph = el('div', 'phones');
        (c.itens || []).forEach(function (t) {
            var b = el('button', 'phone-chip'); b.type = 'button'; b.setAttribute('data-copy', String(t)); b.title = 'Copiar número';
            b.appendChild(icon('phone', true)); b.appendChild(el('span', null, String(t))); ph.appendChild(b);
        });
        td3.appendChild(ph); tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); return tr;
    }
    /* script de atendimento (num = número mostrado) */
    function scriptDom(c, num) {
        var a = el('article', 'script-card'); a.setAttribute('data-id', c.id); if (!c.ativo) a.classList.add('cm-off');
        var hd = el('header', 'script-head'), si = el('span', 'script-ico'); si.appendChild(icon(c.icone || 'message-square-text'));
        var tt = el('div', 'script-title'), h4 = el('h4');
        h4.appendChild(el('span', 'script-num', num + '.')); h4.appendChild(document.createTextNode(' ' + (c.titulo || '')));
        tt.appendChild(h4);
        var tempo = c.dados && c.dados.tempo;
        if (tempo) {
            var pt = el('p', 'script-timing'); pt.appendChild(icon('clock', true));
            var sp = el('span'); sp.appendChild(el('strong', null, 'Tempo ideal:')); sp.appendChild(document.createTextNode(' ' + tempo)); pt.appendChild(sp); tt.appendChild(pt);
        }
        var id = 'script-' + c.id;
        var bc = el('button', 'btn btn--indigo btn--sm btn-copy'); bc.type = 'button'; bc.setAttribute('data-copy-target', id);
        bc.appendChild(icon('copy')); bc.appendChild(el('span', 'btn-copy-label', 'Copiar Texto'));
        hd.appendChild(si); hd.appendChild(tt); hd.appendChild(bc); a.appendChild(hd);
        var body = el('div', 'script-body'), tx = el('div', 'script-text'); tx.id = id; tx.setAttribute('data-template', c.texto || ''); tx.textContent = c.texto || '';
        body.appendChild(tx); a.appendChild(body); return a;
    }
    function marcoDom(c, primeiro) {
        var li = el('li', 'timeline-item' + (primeiro ? ' is-latest' : '')); li.setAttribute('data-id', c.id); if (!c.ativo) li.classList.add('cm-off');
        li.appendChild(el('h4', null, c.titulo || '')); if (c.texto) li.appendChild(el('p', null, c.texto)); return li;
    }

    /* ---------- desenho das áreas ---------- */
    function ordenar(l) { return l.sort(function (a, b) { return (a.ordem - b.ordem) || String(a.criado_em).localeCompare(String(b.criado_em)); }); }
    function doGrupo(secao, grupo) {
        return ordenar(estado.cards.filter(function (c) { return c.secao === secao && c.grupo === grupo && !c.pai; }));
    }
    function irmaos(c) {
        return ordenar(estado.cards.filter(function (x) {
            return x.secao === c.secao && x.grupo === c.grupo && (x.pai || null) === (c.pai || null) && (x.tipo === 'script_grupo') === (c.tipo === 'script_grupo');
        }));
    }
    function controles(c, lista) {
        var box = el('div', 'cm-ctl'), i = lista.indexOf(c);
        function b(ic, rot, fn, cls, off) {
            var x = el('button', 'ger-ico-btn' + (cls ? ' ' + cls : '')); x.type = 'button'; x.setAttribute('aria-label', rot); x.title = rot; x.appendChild(icon(ic));
            if (off) x.disabled = true; x.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }); box.appendChild(x);
        }
        b('chevron-up', 'Mover para cima', function () { mover(c, lista, -1); }, '', i <= 0);
        b('chevron-down', 'Mover para baixo', function () { mover(c, lista, 1); }, '', i >= lista.length - 1);
        b('pencil', 'Editar', function () { abrirEditor(c.tipo, c.secao, c.grupo, c); });
        b('trash-2', 'Excluir', function () { excluir(c); }, 'ger-ico-btn--del');
        return box;
    }
    function comControles(n, c, lista, tag) {
        if (!podeSecao(c.secao)) return n;
        var ctl = controles(c, lista);
        if (tag === 'tr') { var td = el('td', 'cm-td-ctl'); td.appendChild(ctl); n.appendChild(td); } else n.appendChild(ctl);
        return n;
    }
    function visiveis(secao, grupo) {
        var ed = podeSecao(secao);
        return doGrupo(secao, grupo).filter(function (c) { return c.ativo || ed; });
    }

    function montarTelefones(m, secao) {
        var lista = visiveis(secao, 'cards'), ed = podeSecao(secao);
        m.textContent = '';
        lista.forEach(function (c) { m.appendChild(comControles(telefoneDom(c), c, lista, 'tr')); });
        var tabela = m.closest('table'), th = tabela && tabela.querySelector('thead tr'), ex = th && th.querySelector('.cm-th-ctl');
        if (th) { if (ed && !ex) { var h = el('th', 'cm-th-ctl'); h.scope = 'col'; h.appendChild(el('span', 'sr-only', 'Ações')); th.appendChild(h); } else if (!ed && ex) ex.remove(); }
    }
    function montarScripts(m, secao) {
        var ed = podeSecao(secao), grupos = ordenar(estado.cards.filter(function (c) { return c.secao === secao && c.tipo === 'script_grupo'; })), n = 0;
        m.textContent = '';
        grupos.forEach(function (g) {
            if (!g.ativo && !ed) return;
            var sc = ordenar(estado.cards.filter(function (c) { return c.pai === g.id && c.tipo === 'script'; })).filter(function (c) { return c.ativo || ed; });
            if (!sc.length && !ed) return;
            var sec = el('section', 'script-group'); if (!g.ativo) sec.classList.add('cm-off'); sec.setAttribute('data-id', g.id);
            var h3 = el('h3', 'group-title'); h3.appendChild(icon(g.icone || 'folder')); h3.appendChild(el('span', null, g.titulo || '')); sec.appendChild(h3);
            if (ed) { var cg = controles(g, grupos); var bn = el('button', 'btn btn--outline btn--sm'); bn.type = 'button'; bn.appendChild(icon('plus', true)); bn.appendChild(el('span', null, 'Script neste grupo')); bn.addEventListener('click', function () { abrirEditor('script', secao, 'cards', null, g.id); }); cg.insertBefore(bn, cg.firstChild); sec.appendChild(cg); }
            var lst = el('div', 'script-list');
            sc.forEach(function (c) { var num = c.ativo ? ++n : '•'; lst.appendChild(comControles(scriptDom(c, num), c, sc)); });
            sec.appendChild(lst); m.appendChild(sec);
        });
        if (typeof updateScripts === 'function') { try { updateScripts(); } catch (e) { /* ignora */ } }
    }
    function montarCronologia(m, secao) {
        var lista = visiveis(secao, 'cards'); m.textContent = '';
        var primeiro = lista.filter(function (c) { return c.ativo; })[0];
        lista.forEach(function (c) { m.appendChild(comControles(marcoDom(c, c === primeiro), c, lista)); });
    }
    function montarPadrao(m, secao, grupo) {
        var lista = visiveis(secao, grupo); m.textContent = '';
        lista.forEach(function (c) {
            var n = c.tipo === 'legenda' ? legendaDom(c) : cartaoDom(c);
            m.appendChild(comControles(n, c, lista));
        });
    }
    /* portais criados pelos desenvolvedores: blocos na ordem em que foram posicionados */
    function montarPortal(m, secao) {
        var lista = visiveis(secao, 'cards'), ed = podeSecao(secao), tab = null, sc = null; m.textContent = '';
        function fechar() { tab = null; sc = null; }
        lista.forEach(function (c) {
            if (c.tipo === 'telefone') {
                if (!tab) {
                    var card = el('div', 'table-card cm-span'), t = el('table', 'dir-table'), th = el('thead'), tr = el('tr');
                    ['Setor / Companhia', 'Descrição', 'Telefones'].forEach(function (x) { var h = el('th', null, x); h.scope = 'col'; tr.appendChild(h); });
                    if (ed) { var hc = el('th', 'cm-th-ctl'); hc.scope = 'col'; hc.appendChild(el('span', 'sr-only', 'Ações')); tr.appendChild(hc); }
                    th.appendChild(tr); t.appendChild(th); tab = el('tbody'); t.appendChild(tab); card.appendChild(t); m.appendChild(card); sc = null;
                }
                tab.appendChild(comControles(telefoneDom(c), c, lista, 'tr'));
            } else if (c.tipo === 'script') {
                if (!sc) { var g = el('section', 'script-group cm-span'); sc = el('div', 'script-list'); g.appendChild(sc); m.appendChild(g); tab = null; }
                sc.appendChild(comControles(scriptDom(c, c.ativo ? lista.filter(function (x) { return x.tipo === 'script' && x.ativo; }).indexOf(c) + 1 : '•'), c, lista));
            } else {
                fechar();
                var n = c.tipo === 'aviso' ? cartaoDom(c) : c.tipo === 'texto' ? blocoTextoDom(c) : cartaoLivreDom(c);
                if (c.tipo === 'texto' || c.tipo === 'aviso') n.classList.add('cm-span');
                m.appendChild(comControles(n, c, lista));
            }
        });
        if (!lista.length) m.appendChild(el('p', 'card-text cm-status', ed ? 'Este portal ainda está vazio. Use a barra acima para adicionar o primeiro bloco.' : 'Este portal ainda não tem conteúdo.'));
        if (typeof updateScripts === 'function') { try { updateScripts(); } catch (e) { /* ignora */ } }
    }

    function render() {
        if (core.preparar) { try { core.preparar(); } catch (e) { console.error('[portal] preparar:', e); } }
        document.querySelectorAll('[data-mount]').forEach(function (m) {
            var chave = m.getAttribute('data-mount').split('.'), secao = chave[0], grupo = chave[1] || 'cards';
            if (secao === 'telefones') montarTelefones(m, secao);
            else if (secao === 'scripts') montarScripts(m, secao);
            else if (secao === 'cronologia') montarCronologia(m, secao);
            else montarPadrao(m, secao, grupo);
        });
        document.querySelectorAll('[data-portal]').forEach(function (m) { montarPortal(m, m.getAttribute('data-portal')); });
        aplicarTextos(); contar(); montarBarras();
        document.body.classList.toggle('cm-admin', alguemEdita());
        if (typeof filterAll === 'function') filterAll();
        if (window.suporteLuaShareRefresh) window.suporteLuaShareRefresh();
        document.dispatchEvent(new CustomEvent('portal:conteudo'));
    }
    function contar() {
        var alvo = { sistemas: '.card--system', forms: '.card--form', slides: '.card--slide', telefones: 'tbody tr:not([data-skel])', scripts: '.script-card:not([data-skel])' };
        Object.keys(alvo).forEach(function (id) {
            if (document.querySelector('#' + id + ' [data-skel]')) return;   /* carregando: mantém os números que já estavam na tela */
            var n = document.querySelectorAll('#' + id + ' ' + alvo[id] + ':not(.cm-off)').length;
            document.querySelectorAll('[data-count-for="' + id + '"]').forEach(function (b) { b.textContent = n; });
            var pill = document.querySelector('#' + id + ' .count-pill');
            if (pill) {
                pill.dataset.total = n;
                var a = pill.querySelector('.count-now'), o = pill.querySelector('.count-of');
                if (a) a.textContent = n; if (o) o.textContent = ' de ' + n;
            }
        });
    }
    function mensagem(txt, comRetry) {
        if (!comRetry && window.PortalSkeleton) { window.PortalSkeleton.todos(true); return; }
        document.querySelectorAll('[data-mount="sistemas"], [data-mount="forms"], [data-mount="slides"], [data-mount="avisos"]').forEach(function (m) {
            m.textContent = '';
            var p = el('p', 'card-text cm-status', txt);
            if (comRetry) { var b = el('button', 'btn btn--outline btn--sm'); b.type = 'button'; b.setAttribute('data-cm-retry', ''); b.appendChild(el('span', null, 'Tentar de novo')); p.appendChild(b); }
            m.appendChild(p);
        });
        if (comRetry && window.PortalSkeleton) window.PortalSkeleton.limpar();
    }

    /* ---------- carga (cache local só para visitantes + banco) ---------- */
    function aplicarDados(d) {
        var json = JSON.stringify([d, nivel()]);
        if (json === ultimoJson && estado.pronto) return;
        ultimoJson = json;
        estado.cards = d.cards; estado.textos = d.textos; estado.abas = d.abas || []; estado.perm = d.perm || {}; estado.dados = d.dados || {};
        estado.semAbas = !estado.abas.length; estado.pronto = true; render();
    }
    function lerCache() {
        try { var c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c && Array.isArray(c.cards) && c.textos && typeof c.textos === 'object') return c; } catch (e) { /* ignora */ }
        return null;
    }
    function gravarCache(d) {
        /* só o que um visitante sem conta já pode ver: nada restrito fica guardado no aparelho */
        try {
            if (authOk && nivel() === 0) localStorage.setItem(CACHE, JSON.stringify({ cards: d.cards.filter(function (c) { return c.ativo; }), textos: d.textos, abas: d.abas, dados: { tema: d.dados.tema } }));
            else localStorage.removeItem(CACHE);
        } catch (e) { /* ignora */ }
    }
    async function comRetry(fn, vezes) {
        var r;
        for (var i = 0; i <= vezes; i++) {
            try { r = await fn(); } catch (e) { r = { error: e }; }
            if (!r || !r.error) return r;
            var sc = r.status, passageiro = sc === 0 || sc === 429 || sc >= 500 || sc == null;
            if (!passageiro || i === vezes) return r;
            await new Promise(function (ok) { setTimeout(ok, 400 * Math.pow(2, i) + Math.random() * 400); });
        }
        return r;
    }
    async function carregar(manual) {
        sb = window.suporteLuaSb || sb;
        if (!sb) { if (!estado.pronto) mensagem('Não foi possível conectar ao servidor para carregar o conteúdo.', true); return false; }
        var meu = ++reqN;
        var rs = await Promise.all([
            comRetry(function () { return sb.from('portal_cards').select('*').order('ordem', { ascending: true }).order('criado_em', { ascending: true }); }, 2),
            comRetry(function () { return sb.from('portal_textos').select('chave,valor'); }, 2),
            comRetry(function () { return sb.from('portal_abas').select('*').order('ordem', { ascending: true }); }, 1),
            comRetry(function () { return sb.from('portal_permissoes').select('area,papel_editar'); }, 1),
            comRetry(function () { return sb.from('portal_dados').select('chave,valor,atualizado_em').neq('chave', 'fluxos'); }, 1)
        ]);
        if (meu !== reqN) return false;
        var r1 = rs[0], r2 = rs[1];
        if (r1.error || r2.error) {
            console.error('[portal] conteúdo:', (r1.error || r2.error));
            if (!estado.pronto) mensagem('Não foi possível carregar o conteúdo agora.', true); else if (manual) toast('Não foi possível atualizar o conteúdo.');
            return false;
        }
        var textos = {}; (r2.data || []).forEach(function (x) { textos[x.chave] = x.valor; });
        var cards = (r1.data || []).map(function (c) { c.itens = c.itens || []; c.auth = c.auth || []; c.chips = c.chips || []; c.botoes = c.botoes || []; c.dados = c.dados || {}; return c; });
        var perm = {}; if (rs[3].error) perm = Object.assign({}, PERM_PADRAO); else (rs[3].data || []).forEach(function (x) { perm[x.area] = x.papel_editar; });
        var dados = {}; (rs[4].data || []).forEach(function (x) { dados[x.chave] = x.valor; });
        var d = { cards: cards, textos: textos, abas: rs[2].error ? [] : (rs[2].data || []), perm: perm, dados: dados };
        gravarCache(d);
        if (manual) ultimoJson = '';
        aplicarDados(d); return true;
    }

    /* ======================================================================
       EDIÇÃO (o banco também recusa quem não tem o papel certo)
       ====================================================================== */
    var ENTRADAS = function (secao, tipo, grupo, rot, area) { return [rot, 'plus', function () { abrirEditor(tipo, secao, grupo || 'cards'); }, area || areaDaSecao(secao)]; };
    var TEXTOS_ABA = { /* campos de texto de cada aba nativa: [chave, rótulo, t=texto | i=ícone] */
        sistemas: [['sistemas.eyebrow', 'Texto pequeno acima do título', 't'], ['sistemas.titulo', 'Título da seção', 't'], ['sistemas.substantivo', 'Nome do contador (ex.: sistemas)', 't'],
            ['sistemas.legenda_titulo', 'Título da legenda', 't'], ['sistemas.legenda_icone', 'Ícone da legenda', 'i'], ['sistemas.como_entrar', 'Título dentro de cada cartão (ex.: Como entrar)', 't']],
        forms: [['forms.eyebrow', 'Texto pequeno acima do título', 't'], ['forms.titulo', 'Título da seção', 't'], ['forms.substantivo', 'Nome do contador (ex.: formulários)', 't']],
        slides: [['slides.eyebrow', 'Texto pequeno acima do título', 't'], ['slides.titulo', 'Título da seção', 't'], ['slides.substantivo', 'Nome do contador (ex.: slides)', 't']],
        telefones: [['telefones.eyebrow', 'Texto pequeno acima do título', 't'], ['telefones.titulo', 'Título da seção', 't'], ['telefones.substantivo', 'Nome do contador (ex.: contatos)', 't']],
        scripts: [['scripts.eyebrow', 'Texto pequeno acima do título', 't'], ['scripts.titulo', 'Título da seção', 't'], ['scripts.substantivo', 'Nome do contador (ex.: scripts)', 't']],
        fluxos: [['fluxos.eyebrow', 'Texto pequeno acima do título', 't'], ['fluxos.titulo', 'Título da seção', 't'], ['fluxos.substantivo', 'Nome do contador (ex.: tratativas)', 't']],
        sabre: [['sabre.eyebrow', 'Texto pequeno acima do título', 't'], ['sabre.titulo', 'Título da seção', 't']],
        tradutor: [['tradutor.eyebrow', 'Texto pequeno acima do título', 't'], ['tradutor.titulo', 'Título da seção', 't']],
        anotacoes: [['anotacoes.eyebrow', 'Texto pequeno acima do título', 't'], ['anotacoes.titulo', 'Título da seção', 't']],
        feedback: [['feedback.eyebrow', 'Texto pequeno acima do título', 't'], ['feedback.titulo', 'Título da seção', 't'],
            ['avisos.titulo', 'Título de "Avisos"', 't'], ['avisos.icone', 'Ícone de "Avisos"', 'i'], ['compartilhamentos.titulo', 'Título de "Compartilhamentos"', 't'], ['compartilhamentos.icone', 'Ícone de "Compartilhamentos"', 'i'],
            ['compartilhamentos.nota', 'Frase abaixo dos compartilhamentos', 't'], ['futuras.titulo', 'Título de "Atualizações Futuras"', 't'], ['futuras.icone', 'Ícone de "Atualizações Futuras"', 'i'],
            ['cronologia.titulo', 'Título da "Cronologia"', 't'], ['cronologia.icone', 'Ícone da "Cronologia"', 'i']],
        gerencia: [['gerencia.titulo', 'Título do painel de Gerência', 't'], ['transparencia.rotulo', 'Nome da aba para quem não é administrador', 't'], ['transparencia.icone', 'Ícone da aba para quem não é administrador', 'i'], ['transparencia.titulo', 'Título da página de transparência', 't']]
    };
    var BARRAS = {
        sistemas: [ENTRADAS('sistemas', 'sistema', 'cards', 'Adicionar sistema'), ENTRADAS('sistemas', 'legenda', 'legenda', 'Adicionar item da legenda')],
        forms: [ENTRADAS('forms', 'form', 'cards', 'Adicionar formulário')],
        slides: [ENTRADAS('slides', 'slide', 'cards', 'Adicionar slide'), ENTRADAS('slides', 'compartilhar', 'cta', 'Adicionar chamada para compartilhar')],
        telefones: [ENTRADAS('telefones', 'telefone', 'cards', 'Adicionar contato')],
        scripts: [ENTRADAS('scripts', 'script_grupo', 'cards', 'Adicionar grupo de scripts'), ENTRADAS('scripts', 'script', 'cards', 'Adicionar script')],
        feedback: [ENTRADAS('avisos', 'aviso', 'cards', 'Adicionar aviso'), ENTRADAS('compartilhamentos', 'compartilhar', 'cta', 'Adicionar chamada de compartilhamento'),
            ENTRADAS('compartilhamentos', 'pessoa', 'pessoas', 'Adicionar pessoa'), ENTRADAS('futuras', 'compartilhar', 'cards', 'Adicionar atualização futura'), ENTRADAS('cronologia', 'marco', 'cards', 'Adicionar versão na cronologia')]
    };
    function entradasPortal(chave) {
        return [ENTRADAS(chave, 'cartao', 'cards', 'Adicionar cartão', 'portais'), ENTRADAS(chave, 'texto', 'cards', 'Adicionar texto', 'portais'), ENTRADAS(chave, 'aviso', 'cards', 'Adicionar aviso', 'portais'),
            ENTRADAS(chave, 'telefone', 'cards', 'Adicionar contato', 'portais'), ENTRADAS(chave, 'script', 'cards', 'Adicionar script', 'portais')];
    }
    var ROTULO_TIPO = { sistema: 'sistema', form: 'formulário', slide: 'slide', aviso: 'aviso', compartilhar: 'chamada / recado', pessoa: 'pessoa', legenda: 'item da legenda', telefone: 'contato', script: 'script', script_grupo: 'grupo de scripts', marco: 'versão da cronologia', cartao: 'cartão', texto: 'texto' };
    var ESTILOS_CHIP = [['bp', 'Azul (usuário / BP)'], ['pw', 'Laranja (senha)'], ['epr', 'Vermelho (EPR / Sabre)'], ['none', 'Verde (sem senha)'], ['x', 'Cinza (outros)']];
    var ESTILOS_BTN = [['primary', 'Principal (vermelho)'], ['indigo', 'Azul'], ['outline', 'Contorno']];
    var TIPOS_BTN = [['link', 'Abrir link'], ['acessos', 'Meus acessos'], ['copiar', 'Copiar link']];
    var CODIGOS_AUTH = [['bp', 'Usuário (BP)'], ['pw', 'Senha da máquina'], ['mail', 'E-mail corporativo'], ['epr', 'EPR'], ['eprpw', 'Senha do Sabre (do EPR)'], ['sabrepw', 'Senha do Sabre'], ['rk', 'RK'],
        ['intuser', 'Usuário do Integrall'], ['intpw', 'Senha do Integrall'], ['track', 'Track ID (padrão)'], ['print', 'Impressora (padrão)'], ['none', 'Sem senha (só e-mail)']];

    function entradasDaBarra(nome) {
        if (nome.indexOf('portal:') === 0) {
            var ch = nome.slice(7), l = entradasPortal(ch).slice();
            l.push(['Nome, ícone e visibilidade da aba', 'pencil-line', function () { editarAba(ch); }, 'abas']);
            return l;
        }
        var l2 = (BARRAS[nome] || []).slice();
        l2.push(['Editar textos e nome da aba', 'pencil-line', function () { editarAba(nome); }, 'abas']);
        return l2;
    }
    function montarBarras() {
        document.querySelectorAll('[data-bar]').forEach(function (bar) {
            bar.textContent = '';
            var nome = bar.getAttribute('data-bar'), n = 0;
            entradasDaBarra(nome).forEach(function (d) {
                var ok = d[3] === 'abas' ? (pode('abas') || pode('textos')) : pode(d[3]);
                if (!ok) return;
                var b = el('button', 'btn btn--outline btn--sm'); b.type = 'button'; b.appendChild(icon(d[1], true)); b.appendChild(el('span', null, d[0])); b.addEventListener('click', d[2]); bar.appendChild(b); n++;
            });
            bar.hidden = !n;
        });
    }

    /* ---------- janela de edição ---------- */
    var focoAntes = null;
    function escM(e) { if (e.key === 'Escape') { e.stopPropagation(); fecharModal(); } }
    function fecharModal() {
        var m = $('cmModal'); if (!m) return;
        document.removeEventListener('keydown', escM, true); m.remove();
        if (focoAntes && focoAntes.focus) { try { focoAntes.focus(); } catch (e) { /* ignora */ } }
    }
    function abrirModal(titulo, ic, corpo, largo) {
        fecharModal(); focoAntes = document.activeElement;
        var ov = el('div', 'ger-modal cm-modal'), box = el('div', 'ger-modal-box cm-box' + (largo ? ' cm-box--wide' : '')), hd = el('div', 'ger-modal-head'), x = el('button', 'ger-ico-btn');
        ov.id = 'cmModal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', titulo);
        x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.title = 'Fechar'; x.appendChild(icon('x'));
        var ico = icon(ic); hd.appendChild(ico); hd.appendChild(el('h3', null, titulo)); hd.appendChild(x);
        box.appendChild(hd); box.appendChild(corpo); ov.appendChild(box); document.body.appendChild(ov);
        x.addEventListener('click', fecharModal);
        ov.addEventListener('mousedown', function (e) { if (e.target === ov) fecharModal(); });
        document.addEventListener('keydown', escM, true);
        var f = box.querySelector('input, textarea'); (f || x).focus();
    }
    function campo(rot, valor, max, ph, longo) {
        var d = el('div', 'lf'), l = el('label', null, rot), i = longo ? el('textarea', 'login-input cm-area') : el('input', 'login-input');
        var id = 'cm' + Math.random().toString(36).slice(2, 9); l.htmlFor = id; i.id = id;
        if (!longo) i.type = 'text'; else i.rows = longo; i.maxLength = max; i.placeholder = ph || ''; i.autocomplete = 'off'; if (valor) i.value = valor;
        d.appendChild(l); d.appendChild(i); return { n: d, i: i, get: function () { return i.value.trim(); } };
    }
    function seletor(rot, opcoes, valor) {
        var d = el('div', 'lf'), l = el('label', null, rot), s = el('select', 'login-input');
        var id = 'cm' + Math.random().toString(36).slice(2, 9); l.htmlFor = id; s.id = id;
        opcoes.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === valor) op.selected = true; s.appendChild(op); });
        d.appendChild(l); d.appendChild(s); return { n: d, i: s, get: function () { return s.value; } };
    }
    function caixa(rot, marcado) {
        var vis = el('label', 'cm-check'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!marcado;
        vis.appendChild(cb); vis.appendChild(el('span', null, rot)); return { n: vis, get: function () { return cb.checked; } };
    }
    function seletorIcone(rot, valor) {
        var d = el('div', 'lf cm-ico'), l = el('label', null, rot), lin = el('div', 'cm-ico-row'), prev = el('span', 'cm-ico-prev');
        var inp = el('input', 'login-input'), bt = el('button', 'btn btn--outline btn--sm'), pn = el('div', 'cm-ico-panel'), busca = el('input', 'login-input'), grade = el('div', 'cm-ico-grid');
        var id = 'cm' + Math.random().toString(36).slice(2, 9); l.htmlFor = id; inp.id = id;
        inp.type = 'text'; inp.maxLength = 40; inp.placeholder = 'ex.: plane'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.value = valor || '';
        bt.type = 'button'; bt.appendChild(el('span', null, 'Escolher')); pn.hidden = true;
        busca.type = 'text'; busca.placeholder = 'Filtrar ícones… ou digite qualquer nome da biblioteca Lucide acima'; busca.autocomplete = 'off';
        function previa() { prev.textContent = ''; var n = String(inp.value || '').trim().toLowerCase(); if (n) prev.appendChild(icon(n)); }
        function desenhar() {
            grade.textContent = ''; var f = busca.value.trim().toLowerCase();
            nomesDeIcones().filter(function (n) { return !f || n.indexOf(f) >= 0; }).forEach(function (n) {
                var b = el('button', 'cm-ico-opt'); b.type = 'button'; b.title = n; b.setAttribute('aria-label', n); b.appendChild(icon(n));
                b.addEventListener('click', function () { inp.value = n; previa(); pn.hidden = true; }); grade.appendChild(b);
            });
        }
        inp.addEventListener('input', previa); busca.addEventListener('input', desenhar);
        bt.addEventListener('click', function () { pn.hidden = !pn.hidden; if (!pn.hidden) { desenhar(); busca.focus(); } });
        lin.appendChild(prev); lin.appendChild(inp); lin.appendChild(bt); pn.appendChild(busca); pn.appendChild(grade);
        d.appendChild(l); d.appendChild(lin); d.appendChild(pn); previa();
        return { n: d, get: function () { return inp.value.trim().toLowerCase(); } };
    }
    function remover(fn) {
        var b = el('button', 'ger-ico-btn ger-ico-btn--del'); b.type = 'button'; b.setAttribute('aria-label', 'Remover'); b.title = 'Remover'; b.appendChild(icon('trash-2')); b.addEventListener('click', fn); return b;
    }
    function lista(titulo, textoAdd, novaLinha) {
        var box = el('fieldset', 'cm-list'), lg = el('legend', null, titulo), corpo = el('div', 'cm-rows'), add = el('button', 'btn btn--outline btn--sm'), linhas = [];
        add.type = 'button'; add.appendChild(icon('plus', true)); add.appendChild(el('span', null, textoAdd));
        function nova(dados) {
            var l = novaLinha(dados), w = el('div', 'cm-row'); w.appendChild(l.n); w.appendChild(remover(function () { w.remove(); linhas.splice(linhas.indexOf(l), 1); }));
            corpo.appendChild(w); linhas.push(l);
        }
        add.addEventListener('click', function () { nova(null); });
        box.appendChild(lg); box.appendChild(corpo); box.appendChild(add);
        return { n: box, add: nova, ler: function () { return linhas.map(function (l) { return l.get(); }).filter(Boolean); } };
    }
    function linhaBotao(d) {
        d = d || { tipo: 'link', estilo: 'primary', icone: 'arrow-up-right' };
        var tipo = seletor('O que o botão faz', TIPOS_BTN, d.tipo), rot = campo('Nome do botão', d.rotulo, 60, 'Ex.: Acessar'), url = campo('Link (https://…)', d.url === '#' ? '' : d.url, 800, 'https://…'),
            ic = seletorIcone('Ícone do botão', d.icone), est = seletor('Cor', ESTILOS_BTN, d.estilo || 'outline'), dica = campo('Dica ao passar o mouse (opcional)', d.dica, 120, '');
        var n = el('div', 'cm-grid2'); [tipo.n, rot.n, url.n, ic.n, est.n, dica.n].forEach(function (x) { n.appendChild(x); });
        function ajustar() { var t = tipo.get(); url.n.hidden = t === 'acessos'; dica.n.hidden = t === 'link'; if (t === 'acessos') url.i.value = ''; }
        tipo.i.addEventListener('change', ajustar); ajustar();
        return {
            n: n,
            get: function () {
                var t = tipo.get(), o = { tipo: t, rotulo: rot.get(), icone: ic.get(), estilo: est.get() }, u = url.get();
                if (u === '#') u = '';
                if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
                if (t !== 'acessos') o.url = u; if (t !== 'link' && dica.get()) o.dica = dica.get();
                if (!o.rotulo) return null; o._erro = (t !== 'acessos' && u && !urlSegura(u)) ? 'O link do botão "' + o.rotulo + '" não é válido.' : (t === 'copiar' && !u ? 'O botão "' + o.rotulo + '" precisa de um link para copiar.' : '');
                return o;
            }
        };
    }
    function linhaChip(d) {
        d = d || { estilo: 'bp', icone: 'user-round' };
        var est = seletor('Cor do selo', ESTILOS_CHIP, d.estilo), ic = seletorIcone('Ícone', d.icone), tx = campo('Texto do selo', d.texto, 120, 'Ex.: Usuário (BP)');
        var n = el('div', 'cm-grid2'); [est.n, ic.n, tx.n].forEach(function (x) { n.appendChild(x); });
        return { n: n, get: function () { var t = tx.get(); return t ? { estilo: est.get(), icone: ic.get(), texto: t } : null; } };
    }
    function linhaTelefone(d) {
        var tx = campo('Telefone / número', d, 60, 'Ex.: 0800 123 4567');
        return { n: tx.n, get: function () { return tx.get(); } };
    }

    function botoesPadrao(tipo) {
        return tipo === 'sistema' ? [{ tipo: 'link', rotulo: 'Acessar', estilo: 'primary', icone: 'arrow-up-right', url: '' }, { tipo: 'acessos', rotulo: 'Meus acessos', estilo: 'outline', icone: 'key-round' }]
            : tipo === 'form' ? [{ tipo: 'link', rotulo: 'Abrir', estilo: 'indigo', icone: 'arrow-up-right', url: '' }]
                : tipo === 'slide' ? [{ tipo: 'link', rotulo: 'Abrir Slide', estilo: 'primary', icone: 'arrow-up-right', url: '' }, { tipo: 'copiar', rotulo: 'Copiar Link', estilo: 'outline', icone: 'link', url: '' }]
                    : [{ tipo: 'link', rotulo: 'Abrir', estilo: 'primary', icone: 'arrow-up-right', url: '' }];
    }
    function abrirEditor(tipo, secao, grupo, card, paiId) {
        if (!podeSecao(secao)) return;
        var corpo = el('form', 'ger-add-body cm-form'), msg = el('p', 'ger-msg'); msg.hidden = true; corpo.noValidate = true;
        var rotTitulo = { sistema: 'Nome do sistema', form: 'Nome do formulário', slide: 'Nome do slide', compartilhar: 'Texto em destaque', pessoa: 'Nome da pessoa', legenda: 'Nome do selo',
            telefone: 'Setor / Companhia', script: 'Nome do script', script_grupo: 'Nome do grupo', marco: 'Versão (ex.: VERSÃO 17.1.0)', cartao: 'Título do cartão', texto: 'Título (opcional)' }[tipo];
        var rotTexto = { sistema: 'Descrição', form: 'Descrição', slide: 'Descrição', compartilhar: 'Texto complementar (opcional; linha em branco separa parágrafos)', pessoa: 'O que a pessoa fez', legenda: 'Descrição',
            telefone: 'Descrição do atendimento', script: 'Texto do script (use {AGENTE} e {PAX} para o nome do agente e do cliente)', marco: 'O que mudou', cartao: 'Texto (aceita **negrito**, *itálico*, [texto](https://link) e listas com "- ")', texto: 'Texto (aceita **negrito**, *itálico*, [texto](https://link) e listas com "- ")' }[tipo];
        var f = {}, longoTexto = { script: 12, texto: 10, cartao: 5 }[tipo] || 3, maxTexto = (tipo === 'script' || tipo === 'texto' || tipo === 'cartao') ? 6000 : 1500;
        var iconePadrao = { aviso: 'info', pessoa: 'award', compartilhar: 'lightbulb', telefone: 'phone', script: 'message-square-text', script_grupo: 'folder', cartao: 'sparkles', texto: '' }[tipo] || 'link';
        if (tipo !== 'marco') { f.icone = seletorIcone('Ícone', card ? card.icone : iconePadrao); corpo.appendChild(f.icone.n); }
        if (tipo === 'script') {
            var grupos = ordenar(estado.cards.filter(function (c) { return c.secao === secao && c.tipo === 'script_grupo'; }));
            if (grupos.length) { f.pai = seletor('Grupo', grupos.map(function (g) { return [g.id, g.titulo || '(sem nome)']; }), card ? card.pai : (paiId || grupos[0].id)); corpo.appendChild(f.pai.n); }
        }
        if (rotTitulo) { f.titulo = campo(rotTitulo, card && card.titulo, 200, '', tipo === 'compartilhar' ? 3 : 0); corpo.appendChild(f.titulo.n); }
        if (tipo === 'script') { f.tempo = campo('Tempo ideal (quando usar)', card && card.dados && card.dados.tempo, 300, 'Ex.: Logo após o cliente informar o nome'); corpo.appendChild(f.tempo.n); }
        if (rotTexto) { f.texto = campo(rotTexto, card && card.texto, maxTexto, '', longoTexto); corpo.appendChild(f.texto.n); }
        if (tipo === 'aviso') { f.itens = campo('Texto do aviso (uma linha por item da lista)', card ? (card.itens || []).join('\n') : '', 5000, '', 5); corpo.appendChild(f.itens.n); }
        if (tipo === 'legenda') { f.estilo = seletor('Cor do selo', ESTILOS_CHIP, card ? card.estilo : 'bp'); corpo.appendChild(f.estilo.n); }
        if (tipo === 'cartao') { f.estilo = seletor('Cor do cartão', CORES_CARTAO, card ? card.estilo || '' : ''); corpo.appendChild(f.estilo.n); }
        if (tipo === 'telefone') {
            f.itens = lista('Telefones (toque para copiar no portal)', 'Adicionar telefone', linhaTelefone);
            (card && card.itens && card.itens.length ? card.itens : ['']).forEach(function (t) { f.itens.add(t); }); corpo.appendChild(f.itens.n);
        }
        if (tipo === 'sistema') {
            var gr = el('fieldset', 'cm-list'), caixas = [], atuais = card ? (card.auth || []) : [];
            gr.appendChild(el('legend', null, 'Dados que aparecem em "Meus acessos" deste sistema'));
            var codigos = CODIGOS_AUTH.slice(); atuais.forEach(function (a) { if (!codigos.some(function (c) { return c[0] === a; })) codigos.push([a, a]); });
            var pick = el('div', 'ger-pick');
            codigos.forEach(function (c) {
                var lb = el('label'), cb = el('input'); cb.type = 'checkbox'; cb.value = c[0]; cb.checked = atuais.indexOf(c[0]) >= 0;
                lb.appendChild(cb); lb.appendChild(el('span', null, c[1])); pick.appendChild(lb); caixas.push(cb);
            });
            gr.appendChild(pick); corpo.appendChild(gr);
            f.auth = { get: function () { return caixas.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }); } };
            f.chips = lista('Selos de "Como entrar" (o que aparece no cartão)', 'Adicionar selo', linhaChip);
            (card ? card.chips || [] : []).forEach(function (c) { f.chips.add(c); }); corpo.appendChild(f.chips.n);
        }
        if (tipo === 'sistema' || tipo === 'form' || tipo === 'slide' || tipo === 'compartilhar' || tipo === 'cartao') {
            f.botoes = lista('Botões', 'Adicionar botão', linhaBotao);
            var bs = card ? card.botoes || [] : (tipo === 'cartao' ? [] : botoesPadrao(tipo));
            bs.forEach(function (b) { f.botoes.add(b); }); corpo.appendChild(f.botoes.n);
        }
        var vis = caixa('Visível para todos no portal (desmarque para esconder sem apagar)', card ? card.ativo : true); corpo.appendChild(vis.n);
        var salvar = el('button', 'btn btn--primary btn--sm'); salvar.type = 'submit'; salvar.appendChild(icon('check', true)); salvar.appendChild(el('span', null, card ? 'Salvar alterações' : 'Adicionar'));
        corpo.appendChild(msg); corpo.appendChild(salvar);

        corpo.addEventListener('submit', async function (e) {
            e.preventDefault(); msg.hidden = true;
            var row = { secao: secao, grupo: grupo, tipo: tipo, ativo: vis.get(), icone: f.icone ? f.icone.get() || null : null, titulo: f.titulo ? f.titulo.get() || null : null, texto: f.texto ? f.texto.get() || null : null, estilo: f.estilo ? f.estilo.get() || null : null, itens: [], auth: [], chips: [], botoes: [], dados: card && card.dados ? Object.assign({}, card.dados) : {}, pai: card ? card.pai || null : null };
            if (row.icone && !/^[a-z0-9-]{1,40}$/.test(row.icone)) return aviso(msg, 'O nome do ícone só pode ter letras minúsculas, números e hífen.');
            if (tipo !== 'aviso' && tipo !== 'texto' && !row.titulo) return aviso(msg, 'Preencha o nome / título.');
            if (tipo === 'texto' && !row.titulo && !row.texto) return aviso(msg, 'Escreva o título ou o texto.');
            if (tipo === 'script' && !row.texto) return aviso(msg, 'Escreva o texto do script.');
            if (tipo === 'aviso') { row.itens = f.itens.get().split('\n').map(function (t) { return t.trim(); }).filter(Boolean); if (!row.itens.length) return aviso(msg, 'Escreva pelo menos uma linha para o aviso.'); }
            if (tipo === 'telefone') { row.itens = f.itens.ler(); if (!row.itens.length) return aviso(msg, 'Informe pelo menos um telefone.'); }
            if (tipo === 'script') { row.pai = f.pai ? f.pai.get() : null; var tp = f.tempo.get(); if (tp) row.dados.tempo = tp; else delete row.dados.tempo; }
            if (f.auth) row.auth = f.auth.get();
            if (f.chips) row.chips = f.chips.ler();
            if (f.botoes) {
                row.botoes = f.botoes.ler();
                var principal = row.botoes.filter(function (b) { return b.tipo === 'link' && b.url; })[0];
                row.botoes.forEach(function (b) { if (b.tipo === 'copiar' && !b.url && principal) { b.url = principal.url; b._erro = ''; } });
                for (var i = 0; i < row.botoes.length; i++) { if (row.botoes[i]._erro) return aviso(msg, row.botoes[i]._erro); delete row.botoes[i]._erro; if (row.botoes[i].icone && !/^[a-z0-9-]{1,40}$/.test(row.botoes[i].icone)) return aviso(msg, 'Ícone de botão inválido.'); }
            }
            var irm = estado.cards.filter(function (c) { return c.secao === secao && c.grupo === grupo && (c.pai || null) === (row.pai || null) && (c.tipo === 'script_grupo') === (tipo === 'script_grupo'); });
            if (card && (card.pai || null) === (row.pai || null)) row.ordem = card.ordem;
            else if (tipo === 'marco') row.ordem = irm.reduce(function (m, c) { return Math.min(m, c.ordem); }, 10) - 10; /* versão nova entra no topo */
            else row.ordem = irm.reduce(function (m, c) { return Math.max(m, c.ordem); }, 0) + 10;
            salvar.disabled = true;
            var ok = await gravarCard(card, row, msg);
            if (ok) { fecharModal(); toast(card ? 'Alterações salvas!' : 'Adicionado com sucesso!'); } else salvar.disabled = false;
        });
        abrirModal((card ? 'Editar ' : 'Adicionar ') + ROTULO_TIPO[tipo], card ? 'pencil' : 'plus', corpo, tipo === 'script' || tipo === 'texto');
    }
    function aviso(msg, txt) { msg.textContent = txt; msg.hidden = false; return false; }
    function erroBanco(e) {
        var m = String((e && e.message) || '');
        if (/row-level security|permission denied|policy|Apenas desenvolvedores/i.test(m)) return 'Sem permissão para esta alteração com o seu papel.';
        return 'Não foi possível salvar: ' + (m || 'erro desconhecido') + '.';
    }
    async function gravarCard(card, row, msg) {
        if (!sb || !podeSecao(row.secao)) return aviso(msg, 'Você não tem permissão para alterar esta área.');
        try {
            var r = card ? await sb.from('portal_cards').update(row).eq('id', card.id).select() : await sb.from('portal_cards').insert([row]).select();
            if (r.error) throw r.error;
            if (!r.data || !r.data.length) throw new Error('nenhuma linha alterada (sem permissão)');
        } catch (e) { return aviso(msg, erroBanco(e)); }
        await carregar(true); return true;
    }
    async function excluir(c) {
        if (!sb || !podeSecao(c.secao)) return;
        var nome = c.titulo || (c.itens && c.itens[0]) || 'este item', extra = c.tipo === 'script_grupo' ? ' Os scripts deste grupo também serão excluídos.' : '';
        if (!window.confirm('Excluir "' + String(nome).slice(0, 80) + '"?' + extra + ' Não dá para desfazer.')) return;
        var r = await sb.from('portal_cards').delete().eq('id', c.id).select();
        if (r.error || !r.data || !r.data.length) { toast(r.error ? erroBanco(r.error) : 'Sem permissão para excluir.'); return; }
        await carregar(true); toast('Excluído.');
    }
    async function mover(c, lista, dir) {
        if (!sb || !podeSecao(c.secao)) return;
        var i = lista.indexOf(c), j = i + dir; if (i < 0 || j < 0 || j >= lista.length) return;
        var nova = lista.slice(); nova.splice(i, 1); nova.splice(j, 0, c);
        var muda = nova.map(function (x, k) { return { x: x, ordem: (k + 1) * 10 }; }).filter(function (p) { return p.x.ordem !== p.ordem; });
        var rs = await Promise.all(muda.map(function (p) { return sb.from('portal_cards').update({ ordem: p.ordem }).eq('id', p.x.id).select(); }));
        var ruim = rs.filter(function (r) { return r.error || !r.data || !r.data.length; })[0];
        if (ruim) toast(ruim.error ? erroBanco(ruim.error) : 'Sem permissão para reordenar.');
        await carregar(true);
    }

    /* Nome, ícone, selo, visibilidade da aba + textos da seção */
    function editarAba(chave) {
        var aba = abaDe(chave), podeAba = pode('abas') && !!aba, podeTxt = pode('textos'), dev = nivel() >= 3;
        if (!podeAba && !podeTxt) return;
        var corpo = el('form', 'ger-add-body cm-form'), msg = el('p', 'ger-msg'), campos = [], fa = {};
        msg.hidden = true; corpo.noValidate = true;
        if (podeAba) {
            corpo.appendChild(el('h4', 'cm-sub', 'A aba'));
            fa.rotulo = campo('Nome da aba', aba.rotulo, 40, ''); corpo.appendChild(fa.rotulo.n);
            fa.icone = seletorIcone('Ícone da aba', aba.icone); corpo.appendChild(fa.icone.n);
            fa.selo = campo('Selo ao lado do nome (ex.: BETA, NOVO; vazio = sem selo)', aba.selo, 12, ''); corpo.appendChild(fa.selo.n);
            fa.visivel = caixa('Mostrar esta aba na barra de abas', aba.visivel); corpo.appendChild(fa.visivel.n);
            if (dev) {
                fa.papel = seletor('Quem enxerga esta aba (e o conteúdo dela no banco)', [['publico', 'Todos, inclusive quem não entrou'], ['agente', 'Só quem entrou (agentes, administradores, desenvolvedores)'], ['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], aba.papel_ver);
                corpo.appendChild(fa.papel.n);
                if (aba.nativa) corpo.appendChild(el('p', 'ger-hint', 'Nas abas que já vêm no código (Sabre, Tradutor, Anotações…) a restrição só esconde a aba no portal; o conteúdo dos portais criados e das listas do banco é protegido pelo próprio banco.'));
            }
        }
        if (podeTxt && TEXTOS_ABA[chave]) {
            corpo.appendChild(el('h4', 'cm-sub', 'Textos da seção'));
            corpo.appendChild(el('p', 'ger-hint', 'Deixe um campo vazio para voltar ao texto original da página.'));
            TEXTOS_ABA[chave].forEach(function (d) {
                var v = estado.textos[d[0]] || '', c = d[2] === 'i' ? seletorIcone(d[1], v) : campo(d[1], v, 500, '');
                corpo.appendChild(c.n); campos.push([d[0], c]);
            });
        } else if (podeTxt && aba && !aba.nativa) {
            corpo.appendChild(el('h4', 'cm-sub', 'Textos da seção'));
            [[chave + '.eyebrow', 'Texto pequeno acima do título'], [chave + '.titulo', 'Título da seção']].forEach(function (d) {
                var c = campo(d[1], estado.textos[d[0]] || '', 500, ''); corpo.appendChild(c.n); campos.push([d[0], c]);
            });
        }
        var salvar = el('button', 'btn btn--primary btn--sm'); salvar.type = 'submit'; salvar.appendChild(icon('check', true)); salvar.appendChild(el('span', null, 'Salvar'));
        corpo.appendChild(msg); corpo.appendChild(salvar);
        corpo.addEventListener('submit', async function (e) {
            e.preventDefault(); msg.hidden = true; salvar.disabled = true;
            var up = [], del = [];
            for (var i = 0; i < campos.length; i++) {
                var k = campos[i][0], v = campos[i][1].get();
                if (/\.icone$|_icone$/.test(k) && v && !/^[a-z0-9-]{1,40}$/.test(v)) { salvar.disabled = false; return aviso(msg, 'Nome de ícone inválido em "' + k + '".'); }
                if (v) up.push({ chave: k, valor: v }); else if (estado.textos[k] != null) del.push(k);
            }
            try {
                if (podeAba) {
                    var ab = { rotulo: fa.rotulo.get(), icone: fa.icone.get() || null, selo: fa.selo.get() || null, visivel: fa.visivel.get() };
                    if (!ab.rotulo) throw new Error('o nome da aba não pode ficar vazio');
                    if (ab.icone && !/^[a-z0-9-]{1,40}$/.test(ab.icone)) throw new Error('nome de ícone inválido');
                    if (fa.papel) ab.papel_ver = fa.papel.get();
                    var ra = await sb.from('portal_abas').update(ab).eq('chave', chave).select(); if (ra.error) throw ra.error; if (!ra.data || !ra.data.length) throw new Error('nenhuma linha alterada (sem permissão)');
                }
                if (up.length) { var r = await sb.from('portal_textos').upsert(up, { onConflict: 'chave' }).select(); if (r.error) throw r.error; if (!r.data || r.data.length < up.length) throw new Error('nem todos os textos foram gravados (sem permissão)'); }
                if (del.length) { var d = await sb.from('portal_textos').delete().in('chave', del).select(); if (d.error) throw d.error; }
            } catch (err) { salvar.disabled = false; return aviso(msg, erroBanco(err)); }
            del.forEach(function (k) { delete estado.textos[k]; });
            await carregar(true); fecharModal(); toast('Salvo!');
        });
        abrirModal('Nome, ícone e textos', 'pencil-line', corpo);
    }

    /* ---------- início ---------- */
    document.addEventListener('click', function (e) { if (e.target.closest('[data-cm-retry]')) { mensagem('Carregando o conteúdo…', false); carregar(true); } });
    var nivelAntes = -1;
    document.addEventListener('suporteLua:auth', function () {
        authOk = true;
        var n = nivel(); if (n === nivelAntes) return;
        nivelAntes = n;
        if (n < 2) fecharModal();
        if (n > 0) { try { localStorage.removeItem(CACHE); } catch (e) { /* ignora */ } }
        if (estado.pronto) render(); else montarBarras();
        carregar(true);
    });

    var core = window.PortalCore = {
        estado: estado, T: T, pode: pode, podeSecao: podeSecao, nivel: nivel, el: el, icon: icon, nomeIcone: nomeIcone, toast: toast, urlSegura: urlSegura,
        campo: campo, seletor: seletor, caixa: caixa, seletorIcone: seletorIcone, lista: lista, abrirModal: abrirModal, fecharModal: fecharModal, aviso: aviso, erroBanco: erroBanco,
        recarregar: function () { return carregar(true); }, render: render, editarAba: editarAba, abrirEditor: abrirEditor, sb: function () { return sb || window.suporteLuaSb; },
        areaDaSecao: areaDaSecao, preparar: null, mdDom: mdDom
    };
    window.portalConteudo = { recarregar: function () { return carregar(true); } };

    try { localStorage.removeItem('suporteLuaConteudo1'); } catch (e) { /* ignora */ }
    var cache = lerCache();
    if (cache) aplicarDados({ cards: cache.cards, textos: cache.textos, abas: cache.abas || [], perm: {}, dados: cache.dados || {} }); else mensagem('Carregando o conteúdo…', false);
    function iniciar() {
        contar();
        carregar(false).then(function () { if (!sb) setTimeout(function () { if (!estado.pronto || !sb) carregar(false); }, 1200); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
