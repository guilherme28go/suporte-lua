/* ==========================================================================
   ABAS, PORTAIS NOVOS, APARÊNCIA E TEXTOS DO SITE (tudo vem do banco)
   * portal_abas  : ordem, nome, ícone, selo, quem vê; cria/remove abas e portais
   * portal_dados : tema (cores) e dados dos Fluxos
   * portal_textos (site.*): marca, topo, relógio, rodapé, aviso global
   Usa window.PortalCore (11-conteudo.js). Sem as tabelas do SQL 7 a página
   continua igual à original.
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore; if (!C) return;
    var el = C.el, NIV = { publico: 0, agente: 1, administrador: 2, desenvolvedor: 3 };
    var reg = {}; /* chave -> { tile, mini, panel } (peças da página, também as que estão fora dela) */
    var DIAS_LUA = { Sun: 'dom', Mon: 'seg', Tue: 'ter', Wed: 'qua', Thu: 'qui', Fri: 'sex', Sat: 'sab' };

    /* guarda as peças que já vêm no HTML */
    document.querySelectorAll('.dock-tile:not(.boot-sk *)').forEach(function (t) { var k = t.dataset.tab; (reg[k] = reg[k] || {}).tile = t; });
    document.querySelectorAll('.mini-tab:not(.boot-sk *)').forEach(function (t) { var k = t.dataset.tab; (reg[k] = reg[k] || {}).mini = t; });
    document.querySelectorAll('main .panel').forEach(function (p) { (reg[p.id] = reg[p.id] || {}).panel = p; });
    Object.keys(reg).forEach(function (k) { reg[k].nativa = true; });

    function nivel() { return C.nivel(); }
    function mostrar(a) {
        if (nivel() < (NIV[a.papel_ver] || 0)) return false;
        return a.visivel || C.pode('abas');
    }
    function rotuloDe(a) {
        if (a.chave === 'gerencia' && nivel() < 2) return C.T('transparencia.rotulo') || 'Transparência';
        return a.rotulo;
    }
    function iconeDe(a) {
        if (a.chave === 'gerencia' && nivel() < 2) return C.T('transparencia.icone') || 'eye';
        return a.icone || 'layers';
    }

    /* ---------- peças de uma aba nova ---------- */
    function criarTile(a) {
        var b = el('button', 'dock-tile'); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'tab-' + a.chave; b.setAttribute('aria-controls', a.chave);
        b.setAttribute('aria-selected', 'false'); b.tabIndex = -1; b.dataset.tab = a.chave;
        var ic = el('span', 'dock-icon'); ic.appendChild(C.icon('link')); b.appendChild(ic); b.appendChild(el('span', 'dock-label')); return b;
    }
    function criarMini(a) {
        var b = el('button', 'mini-tab'); b.type = 'button'; b.dataset.tab = a.chave; b.appendChild(C.icon('link')); b.appendChild(el('span', 'mini-label')); return b;
    }
    function criarPainel(a) {
        var p = el('section', 'panel'); p.id = a.chave; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab-' + a.chave); p.setAttribute('data-noun', ''); p.tabIndex = -1; p.hidden = true;
        var h = el('header', 'section-head'), t = el('div', 'section-title'), e = el('p', 'eyebrow eyebrow--accent'), h2 = el('h2');
        e.setAttribute('data-txt', a.chave + '.eyebrow'); h2.setAttribute('data-txt', a.chave + '.titulo');
        t.appendChild(e); t.appendChild(h2); h.appendChild(t); p.appendChild(h);
        var bar = el('div', 'cm-bar'); bar.setAttribute('data-bar', 'portal:' + a.chave); bar.hidden = true; p.appendChild(bar);
        var g = el('div', 'grid search-scope cm-portal-grid'); g.setAttribute('data-portal', a.chave); p.appendChild(g); if (window.PortalSkeleton) window.PortalSkeleton.preencher(g);
        var em = el('div', 'empty'); em.hidden = true;
        var ei = el('span', 'empty-ico'); ei.appendChild(C.icon('search-x')); em.appendChild(ei); em.appendChild(el('h3', null, 'Nenhum resultado encontrado'));
        var ep = el('p', null, 'Não encontramos nada para '); ep.appendChild(el('strong', 'empty-query')); ep.appendChild(document.createTextNode(' nesta aba.')); em.appendChild(ep);
        var lb = el('button', 'btn btn--outline btn--sm'); lb.type = 'button'; lb.setAttribute('data-clear-search', ''); lb.appendChild(el('span', null, 'Limpar busca')); em.appendChild(lb); p.appendChild(em);
        return p;
    }
    function pintarAba(r, a) {
        var rot = rotuloDe(a), ic = iconeDe(a), oculta = !a.visivel;
        [r.tile, r.mini].forEach(function (b) {
            if (!b) return;
            var l = b.querySelector('.dock-label, .mini-label'); if (l && l.textContent !== rot) l.textContent = rot;
            if (b.classList.contains('mini-tab')) { b.setAttribute('aria-label', rot); b.title = rot; }
            var u = b.querySelector('use'); if (u) u.setAttribute('href', '#i-' + C.nomeIcone(ic));
            b.classList.toggle('is-oculta', oculta);
            if (oculta) b.title = rot + ' (oculta para os agentes)';
        });
        if (r.tile) {
            var selo = r.tile.querySelector('.dock-count--selo, .dock-count--beta'), cont = r.tile.querySelector('[data-count-for]');
            if (a.selo) {
                if (!selo) { selo = el('span', 'dock-count dock-count--selo'); r.tile.appendChild(selo); }
                selo.textContent = a.selo; if (cont) cont.hidden = true;
            } else { if (selo && selo.classList.contains('dock-count--selo')) selo.remove(); else if (selo && a.chave === 'sabre') selo.remove(); if (cont) cont.hidden = false; }
        }
        if (r.panel && !r.nativa) {
            var e = r.panel.querySelector('[data-txt$=".eyebrow"]'), t = r.panel.querySelector('[data-txt$=".titulo"]');
            if (e && C.T(a.chave + '.eyebrow') == null) e.textContent = rot;
            if (t && C.T(a.chave + '.titulo') == null) t.textContent = rot;
            r.panel.setAttribute('data-noun', '');
        }
        if (a.chave === 'gerencia' && r.panel) { r.panel.dataset.noun = rot.toLowerCase(); }
    }

    /* ---------- sincroniza a barra de abas com o banco ---------- */
    function sincronizar() {
        var st = C.estado, dock = document.querySelector('.dock:not(.boot-sk *)'), mini = document.querySelector('.mini-nav:not(.boot-sk *)'), main = document.getElementById('conteudo');
        if (!dock || !mini || !main) return;
        var abas = st.abas.slice().sort(function (a, b) { return (a.ordem - b.ordem) || a.chave.localeCompare(b.chave); }), existem = {};
        if (st.semAbas) {
            /* banco antigo (SQL 7 ainda não rodou): tudo como no HTML; só a aba do desenvolvedor fica de fora */
            var rd = reg.dev; if (rd) { [rd.tile, rd.mini].forEach(function (b) { if (b && b.parentNode) b.remove(); }); }
            tema(); site(); return;
        }
        abas.forEach(function (a) {
            existem[a.chave] = 1;
            var r = reg[a.chave];
            if (!r) { r = reg[a.chave] = { nativa: false }; }
            if (!r.nativa) {
                if (!r.tile) r.tile = criarTile(a);
                if (!r.mini) r.mini = criarMini(a);
                if (!r.panel) { r.panel = criarPainel(a); main.appendChild(r.panel); }
            }
            pintarAba(r, a);
            var vai = mostrar(a);
            [[r.tile, dock], [r.mini, mini]].forEach(function (p) {
                var b = p[0], pai = p[1]; if (!b) return;
                if (vai) pai.appendChild(b); else if (b.parentNode) b.remove();
            });
        });
        /* abas que sumiram do banco (portal apagado) */
        Object.keys(reg).forEach(function (k) {
            if (existem[k] || reg[k].nativa) return;
            [reg[k].tile, reg[k].mini, reg[k].panel].forEach(function (n) { if (n && n.parentNode) n.remove(); });
            delete reg[k];
        });
        /* nativas sem linha no banco ficam como no HTML */
        Object.keys(reg).forEach(function (k) { if (!existem[k] && reg[k].nativa && k !== 'dev') { var r = reg[k]; if (r.tile && !r.tile.parentNode) dock.appendChild(r.tile); if (r.mini && !r.mini.parentNode) mini.appendChild(r.mini); } });
        if (!existem.dev && reg.dev) [reg.dev.tile, reg.dev.mini].forEach(function (b) { if (b && b.parentNode) b.remove(); });
        if (typeof gerenciaLiberada === 'function' && gerenciaLiberada() && typeof gerenciaPrimeiro === 'function') gerenciaPrimeiro(true);

        /* a aba aberta ainda existe? o endereço (#portal-novo) já pode ser aberto? */
        if (typeof tabIds === 'function' && typeof openTab === 'function') {
            var ids = tabIds(), hash = ''; try { hash = decodeURIComponent(location.hash.replace('#', '')); } catch (e) { hash = ''; }
            if (hash && ids.indexOf(hash) >= 0 && hash !== currentTab && !abriuHash) { abriuHash = true; openTab(hash, { initial: true }); }
            else if (ids.indexOf(currentTab) < 0) openTab(ids[0] || 'sistemas', { keepScroll: true });
        }
        tema(); site();
    }
    var abriuHash = false;

    /* ---------- tema (cores e cantos) ---------- */
    var REG_VAR = /^--[a-z0-9-]{1,30}$/, REG_COR = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., %]{3,40}\))$/, REG_MED = /^[0-9]{1,3}(px|rem)$/;
    function tema() {
        var t = C.estado.dados.tema, css = '';
        if (t && typeof t === 'object') Object.keys(t).forEach(function (k) {
            var v = String(t[k]).trim();
            if (REG_VAR.test(k) && (REG_COR.test(v) || (/^--(radius|radius-lg)$/.test(k) && REG_MED.test(v)))) css += k + ':' + v + ';';
        });
        var s = document.getElementById('portalTema');
        if (!css) { if (s) s.remove(); return; }
        if (!s) { s = document.createElement('style'); s.id = 'portalTema'; document.head.appendChild(s); }
        var novo = ':root{' + css + '}'; if (s.textContent !== novo) s.textContent = novo;
    }

    /* ---------- textos do site ---------- */
    var fusoOk = {};
    function fuso(z, padrao) {
        z = String(z || '').trim(); if (!z) return padrao;
        if (fusoOk[z] == null) { try { new Intl.DateTimeFormat('pt-BR', { timeZone: z }); fusoOk[z] = 1; } catch (e) { fusoOk[z] = 0; } }
        return fusoOk[z] ? z : padrao;
    }
    var fmtCache = {};
    function fmt(z, op) { var k = z + JSON.stringify(op); if (!fmtCache[k]) fmtCache[k] = new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: z }, op)); return fmtCache[k]; }
    function relogio() {
        var T = C.T, z1 = fuso(T('site.relogio1_fuso'), 'America/Sao_Paulo'), z2 = fuso(T('site.relogio2_fuso'), 'America/Chicago'), agora = new Date();
        var a = document.getElementById('clockBRT'), b = document.getElementById('clockTulsa'), d = document.getElementById('clockDate');
        var h = { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' };
        if (a) a.textContent = fmt(z1, h).format(agora);
        if (b) b.textContent = fmt(z2, h).format(agora);
        if (d) d.textContent = fmt(z1, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(agora);
    }
    window.tickClock = relogio; /* o 02-app.js chama tickClock() pelo nome, então passa a usar os fusos do banco */
    function site() {
        var T = C.T, v;
        if ((v = T('site.titulo_pagina'))) document.title = v;
        var rel = document.querySelector('.hero-clock'); if (rel) rel.hidden = (T('site.relogio_mostrar') || 'sim') === 'nao';
        var logo = C.urlSegura(T('site.logo_url') || ''), marcas = document.querySelectorAll('.brand-mark');
        marcas.forEach(function (m) {
            var img = m.nextElementSibling && m.nextElementSibling.classList && m.nextElementSibling.classList.contains('brand-img') ? m.nextElementSibling : null;
            if (logo && /^https:/.test(logo)) {
                if (!img) { img = document.createElement('img'); img.className = 'brand-img ' + (m.classList.contains('brand-mark--sm') ? 'brand-img--sm' : ''); img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; m.parentNode.insertBefore(img, m.nextSibling); }
                if (img.getAttribute('src') !== logo) img.src = logo;
                m.style.display = 'none';
            } else { if (img) img.remove(); m.style.display = ''; }
        });
        var brand = document.querySelector('.brand'); if (brand) brand.setAttribute('aria-label', (T('site.marca_nome') || 'Suporte Lua') + ' - ' + (T('site.marca_sub') || 'Hub Operacional Latam'));
        avisoGlobal(); relogio();
    }
    function avisoGlobal() {
        var T = C.T, b = document.getElementById('avisoGlobal'); if (!b) return;
        var txt = T('site.aviso_texto'), tit = T('site.aviso_titulo'), on = (T('site.aviso_ativo') || 'nao') === 'sim' && (txt || tit);
        b.hidden = !on; if (!on) return;
        var tom = /^(info|alerta|sucesso|perigo)$/.test(T('site.aviso_tom') || '') ? T('site.aviso_tom') : 'info';
        b.className = 'maint-banner aviso-global aviso-global--' + tom;
        var ic = b.querySelector('use'); if (ic) ic.setAttribute('href', '#i-' + C.nomeIcone(T('site.aviso_icone') || 'megaphone'));
        var s = b.querySelector('strong'), p = b.querySelector('.aviso-global-txt');
        if (s) { s.textContent = tit || ''; s.hidden = !tit; } if (p) p.textContent = txt || '';
    }

    /* ---------- Fluxos de Atendimento: o banco pode substituir os dados que vêm no código ---------- */
    var FLX = 'suporteLuaFluxos1', flxVisto = false;
    async function fluxos(forcar) {
        var sb = C.sb(); if (!sb || !window.fluxosDefinir || (flxVisto && !forcar)) return; flxVisto = true;
        try {
            var m = await sb.from('portal_dados').select('atualizado_em').eq('chave', 'fluxos').maybeSingle();
            if (m.error || !m.data) return; /* sem linha: vale o que está no código */
            var c = null; try { c = JSON.parse(localStorage.getItem(FLX) || 'null'); } catch (e) { c = null; }
            if (c && c.em === m.data.atualizado_em && !forcar) { window.fluxosDefinir(c.valor); return; }
            var r = await sb.from('portal_dados').select('valor,atualizado_em').eq('chave', 'fluxos').maybeSingle();
            if (r.error || !r.data) return;
            if (window.fluxosDefinir(r.data.valor)) { try { localStorage.setItem(FLX, JSON.stringify({ em: r.data.atualizado_em, valor: r.data.valor })); } catch (e) { /* ignora */ } }
        } catch (e) { console.error('[portal] fluxos:', e); }
    }
    document.addEventListener('portal:conteudo', function () { fluxos(false); });

    C.preparar = sincronizar;
    C.fluxosAtualizar = function () { try { localStorage.removeItem(FLX); } catch (e) { /* ignora */ } flxVisto = false; return fluxos(true); };
    C.fluxosPadrao = function () { try { localStorage.removeItem(FLX); } catch (e) { /* ignora */ } };
    C.abaReg = reg;
    C.diaLua = function (d) { return DIAS_LUA[new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(d || new Date())] || ''; };
    /* se o conteúdo já foi desenhado antes deste arquivo carregar */
    if (C.estado.pronto) { try { sincronizar(); } catch (e) { console.error(e); } }
})();
