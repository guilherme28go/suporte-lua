/* Fluxos de atendimento */
(function () {
    'use strict';
    var root = document.getElementById('fluxos');
    var dataEl = document.getElementById('fluxosData');
    if (!root || !dataEl) return;
    var D = JSON.parse(dataEl.textContent);
    var KEY = 'suporteLuaSag';
    var sag = '';
    try { sag = localStorage.getItem(KEY) || ''; } catch (e) { sag = ''; }
    var $ = function (id) { return document.getElementById(id); };
    var sagDe = {}, matDe = {};
    function indexar() {
        sagDe = {}; matDe = {};
        D.sags.forEach(function (s) { sagDe[s.id] = s; });
        D.mats.forEach(function (m) { matDe[m.id] = m; });
        if (!sagDe[sag]) sag = '';
    }
    indexar();
    var REF = ['agencia', 'ato', 'info'];

    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function icon(n, small) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('class', small ? 'ic ic--sm' : 'ic'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
        var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n);
        s.appendChild(u); return s;
    }
    function norm(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
    function tipoDe(id) { return id && sagDe[id] ? sagDe[id].tipo : ''; }
    function matsDe(id) { return id && sagDe[id] ? (sagDe[id].mat || []) : []; }
    function temMatriz(id) { return matsDe(id).length > 0; }
    /* Suportes são exclusivos: LUA só escala ao Suporte LUA, HVC ao Suporte HVC e só a DT FFP escala ao Suporte FFP */
    function destinos(it, id) {
        var d = (id && it.p && it.p[id]) ? it.p[id] : it.to;
        if (id === 'lua') return d.map(function (x) { return x === 'shvc' ? 'slua' : x === 'sffp' ? 'dtffp' : x; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        if (id === 'hvc' && (it.k === 'tr' || it.k === 'nfcr')) return ['shvc'];
        if (id === 'hvc' && d.indexOf('slua') >= 0) return ['shvc'];
        if (id === 'hvc') return d.map(function (x) { return x === 'slua' ? 'shvc' : x === 'sffp' ? 'dtffp' : x; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        return d;
    }
    function nomes(ids) { return ids.map(function (x) { return sagDe[x].nome; }).join(' ou '); }
    function destinoTxt(it, id) { var d = destinos(it, id); return d.length ? nomes(d) : (it.tx || ''); }
    /* HVC não transfere para nenhum setor: o que seria transferência vira escalamento ao Suporte HVC */
    /* tipo de contato visto da perspectiva atual: alguns itens (Serviços Especiais e Necessidades Médicas) a LUA trata em linha (it.kl), sem escalar ao Suporte LUA */
    /* orientações específicas dos agentes LUA (it.ov.lua): só valem quando a SAG escolhida é a LUA */
    function ovL(it) { return sag === 'lua' && it.ov && it.ov.lua ? it.ov.lua : null; }
    function kp(it) { var o = ovL(it); if (o && o.k) return o.k; return it.kl && (sag === 'lua' || sag === 'slua') ? it.kl : it.k; }
    function kd(it) { return sag === 'hvc' && (it.k === 'tr' || it.k === 'nfcr') ? 'esc' : kp(it); }
    /* perspectiva: LUA e Suporte LUA enxergam só o lado LUA; HVC e Suporte HVC só o lado HVC */
    function persp() { return (sag === 'lua' || sag === 'slua') ? 'lua' : (sag === 'hvc' || sag === 'shvc') ? 'hvc' : ''; }
    function matNome(it) { var p = persp(); return it.m === 'lua' && p ? 'Matriz ' + p.toUpperCase() : matDe[it.m].nome; }
    function acaoPara(it, p) {
        if (p === 'lua' && it.ov && it.ov.lua && it.ov.lua.acao) return it.ov.lua.acao;
        var salva = sag; sag = p; var k = kd(it), d = destinoTxt(it, p); sag = salva;
        if (k === 'fcr' || k === 'own') return 'resolve em linha';
        if (k === 'esc') return 'resolve e escala' + (d ? ' para ' + d : '');
        if (k === 'tr') return 'transfere' + (d ? ' para ' + d : '');
        if (k === 'nfcr') return 'não resolve em linha' + (d ? ': encaminha para ' + d : '');
        if (k === 'mix') return 'depende do caso';
        return 'sem transferência na matriz';
    }
    function ladoDetalhe(it, rot, val) {
        var o = ovL(it);
        if (o) {
            if (/^Tipo de contato/i.test(rot) && o.c) return [rot, o.c];
            if (/^Para quem/i.test(rot) && o.para != null) return o.para === '' ? null : [rot, o.para];
        }
        var p = persp(); if (!p || it.m !== 'lua') return [rot, val];
        if (p === 'hvc') {
            val = val.replace(/Suporte LUA|Soporte LUA/g, 'Suporte HVC');
            if (it.k === 'tr' || it.k === 'nfcr') {
                if (/^Tipo de contato/i.test(rot)) val = 'Escalar ao Suporte HVC (a HVC não transfere)';
                if (/^Para quem/i.test(rot)) val = 'Suporte HVC';
            }
            rot = rot.replace('escala ou transfere', 'escala');
        } else {
            val = val.replace(/Suporte HVC|Soporte HVC/g, 'Suporte LUA');
            if (it.kl === 'fcr' && it.k !== 'fcr') {
                if (/^Tipo de contato/i.test(rot)) val = 'Resolução em linha (FCR)';
                if (/^Para quem/i.test(rot)) return null;
            }
        }
        val = val.replace(/BO LATAM ?PASS CC BR/ig, 'DT FFP');
        return [rot, val];
    }
    function ehRef(it) { return REF.indexOf(it.m) >= 0; }
    function daMinhaMatriz(it) { return matsDe(sag).indexOf(it.m) >= 0; }
    function meu(it) {
        if (!sag) return false;
        if (sag === 'slua') return it.m === 'lua' && destinos(it, 'lua').indexOf('slua') >= 0;
        if (sag === 'sffp') return it.m === 'dtffp' && destinos(it, 'dtffp').indexOf('sffp') >= 0;
        if (sag === 'shvc') return it.m === 'lua' && destinos(it, 'hvc').indexOf('shvc') >= 0;
        return destinos(it, sag).indexOf(sag) >= 0;
    }

    /* quais linhas esta SAG enxerga */
    function soHvc(it) { return /\(HVC\)/.test(it.s || ''); }
    function visiveis(id) {
        var v = visiveis0(id);
        return (id === 'lua' || id === 'slua') ? v.filter(function (i) { return !soHvc(i); }) : v;
    }
    function visiveis0(id) {
        if (!id) return D.itens;
        var t = tipoDe(id);
        if (t === 'info') return D.itens.filter(function (i) { return matsDe(id).indexOf(i.m) >= 0; });
        if (temMatriz(id)) return D.itens.filter(function (i) { return matsDe(id).indexOf(i.m) >= 0 || REF.indexOf(i.m) >= 0; });
        if (id === 'slua' || id === 'shvc') return D.itens.filter(function (i) { return i.m === 'lua'; });
        if (id === 'sffp') return D.itens.filter(function (i) { return i.m === 'dtffp'; });
        return D.itens.filter(function (i) { return !ehRef(i); });
    }

    /* ---- veredito ---- */
    function quemTrata(it) {
        if (kd(it) === 'fcr') return 'Quem trata: o agente, resolvendo em linha';
        var d = destinoTxt(it, persp());
        return d ? 'Quem trata: ' + d : 'Veja a matriz de origem para o caminho correto';
    }
    function vRef(it) {
        if (it.k === 'ag') {
            if (sag === 'agencias') return it.ag === 'enc' ? { cls: 'own', label: 'FAZ', ic: 'circle-check', texto: 'Isto fica com a agência de viagem', sub: 'O agente LATAM só encaminha o cliente' }
                : it.ag === 'ate' ? { cls: 'no', label: 'NÃO FAZ', ic: 'circle-x', texto: 'Isto a LATAM atende, não a agência', sub: 'Atender sempre, para qualquer tipo de passageiro' }
                : { cls: 'esc', label: 'EM PARTE', ic: 'info', texto: 'Depende do tipo de passageiro e do mercado', sub: 'Veja os detalhes abaixo' };
            return it.ag === 'ate' ? { cls: 'fcr', label: 'ATENDER', ic: 'circle-check', texto: 'Passagem de agência: a LATAM atende, para qualquer passageiro', sub: 'Matriz Passageiros da Agência' }
                : it.ag === 'enc' ? { cls: 'tr', label: 'ENCAMINHAR', ic: 'arrow-right-left', texto: 'Passagem de agência: encaminhe para a agência', sub: 'Matriz Passageiros da Agência' }
                : { cls: 'esc', label: 'DEPENDE', ic: 'info', texto: 'Passagem de agência: depende do tipo de passageiro e do mercado', sub: 'Veja os detalhes abaixo' };
        }
        if (it.k === 'ato') {
            var faz = it.ato === 'sim';
            if (sag === 'aero') return faz ? { cls: 'own', label: 'FAZ', ic: 'circle-check', texto: 'Este serviço é prestado no ATO / Counter Misto', sub: 'Veja as condições abaixo' } : { cls: 'no', label: 'NÃO FAZ', ic: 'circle-x', texto: 'Este serviço não é prestado no aeroporto', sub: 'É feito pelo Contact Center ou pelo LATAM.com' };
            return faz ? { cls: 'tr', label: 'DERIVAR AO ATO', ic: 'arrow-right-left', texto: 'O ATO presta este serviço. Antes, tente resolver pelo Contact Center ou LATAM.com', sub: 'Veja as condições abaixo' }
                : { cls: 'fcr', label: 'RESOLVER', ic: 'circle-check', texto: 'O aeroporto não presta este serviço: resolva pelo Contact Center ou LATAM.com', sub: 'Serviços ATO' };
        }
        return { cls: 'ref', label: 'INFORMAR', ic: 'info', texto: 'Verifique no PIC e oriente o cliente a verificar as informações no site LATAM.com', sub: 'Matriz de Informação de Viagem' };
    }
    function vMatriz(it) {
        if (!sag && it.m === 'lua') {
            var al = acaoPara(it, 'lua'), ah = acaoPara(it, 'hvc');
            if (al !== ah) return { cls: 'esc', label: 'MUDA POR SAG', ic: 'info', texto: 'LUA ' + al, sub: 'HVC ' + ah + ' · escolha a sua SAG para ver só o seu lado' };
        }
        var d = destinoTxt(it, sag), t = d ? d : '', origem = sag ? '' : (it.m === 'lua' ? 'LUA ' + acaoPara(it, 'lua') + ' · HVC ' + acaoPara(it, 'hvc') : 'Segundo a ' + matDe[it.m].nome);
        function sub(extra) { return [origem, extra].filter(Boolean).join(' · '); }
        if (it.k === 'own') return { cls: 'fcr', label: 'RESOLVER', ic: 'circle-check', texto: 'A equipe de bagagem conduz o caso até o fim, sem transferir', sub: sub(it.c ? 'Canal: ' + it.c : '') };
        if (kd(it) === 'fcr') return { cls: 'fcr', label: 'RESOLVER', ic: 'circle-check', texto: 'Resolva em linha, sem transferir', sub: sub(t ? 'A matriz cita: ' + t : '') };
        if (kd(it) === 'esc') return { cls: 'esc', label: 'RESOLVER E ESCALAR', ic: 'life-buoy', texto: 'Resolva em linha e escale' + (t ? ' para ' + t : '') + '; você segue com o passageiro', sub: sub() };
        if (kd(it) === 'tr') return { cls: 'tr', label: 'TRANSFERIR', ic: 'arrow-right-left', texto: 'Transferir com contexto' + (t ? ' para ' + t : ''), sub: sub() };
        if (kd(it) === 'nfcr') return { cls: 'tr', label: 'NÃO RESOLVE EM LINHA', ic: 'arrow-right-left', texto: t ? 'Não é FCR: encaminhe para ' + t : 'Não é FCR: veja o fluxo abaixo', sub: sub() };
        if (it.k === 'mix') return { cls: 'esc', label: 'DEPENDE DO CASO', ic: 'info', texto: it.c, sub: sub(t ? 'Destino: ' + t : '') };
        return { cls: 'ref', label: 'INFORMATIVO', ic: 'info', texto: 'A matriz não indica transferência nem escalamento', sub: sub() };
    }
    function vSemMatriz(it) {
        var t = tipoDe(sag), nome = sagDe[sag].nome, o = matNome(it);
        if (meu(it)) {
            if (t === 'esc') return { cls: 'esc', label: 'ESCALAMENTO', ic: 'life-buoy', texto: 'É escalamento seu: apoie o agente, que segue com o passageiro', sub: 'Vem da ' + o + ' · o ' + nome + ' nunca fica sozinho com o passageiro' };
            return { cls: 'own', label: 'É SEU', ic: 'circle-check', texto: 'Este caso chega até você pela matriz. Responda somente por e-mail', sub: 'Vem da ' + o };
        }
        return { cls: 'no', label: 'NÃO TRATA', ic: 'circle-x', texto: 'Não é um procedimento do ' + nome, sub: quemTrata(it) };
    }
    function veredito(it) {
        var o = ovL(it);
        if (o && o.v) return o.v;
        if (!sag && it.ov && it.ov.lua && it.ov.lua.v) {
            var v0 = ehRef(it) ? vRef(it) : vMatriz(it);
            return { cls: 'esc', label: 'MUDA POR SAG', ic: 'info', texto: 'LUA: ' + it.ov.lua.v.texto, sub: 'Outras SAGs: ' + v0.texto + ' · escolha a sua SAG para ver só o seu lado' };
        }
        if (ehRef(it) && !(sag && tipoDe(sag) !== 'info' && false)) return vRef(it);
        if (sag && !temMatriz(sag)) return vSemMatriz(it);
        return vMatriz(it);
    }

    /* ---- linhas de resultado ---- */
    function corpo(it) {
        var o = ovL(it);
        if ((!it.l || !it.l.length) && !(o && o.nota)) return null;
        var d = el('details', 'flow-more'); var sm = el('summary', null, 'Ver detalhes da matriz'); d.appendChild(sm);
        var dl = el('dl', 'flow-dl');
        if (o && o.nota) { dl.appendChild(el('dt', null, 'Orientação para agentes LUA')); dl.appendChild(el('dd', null, o.nota)); }
        (it.l || []).forEach(function (p) { var q = ladoDetalhe(it, p[0], p[1]); if (!q) return; dl.appendChild(el('dt', null, q[0])); dl.appendChild(el('dd', null, q[1])); });
        d.appendChild(dl); return d;
    }
    function linha(it) {
        var v = veredito(it);
        var li = el('li', 'flow-res flow-res--' + v.cls);
        var chip = el('span', 'flow-chip'); chip.appendChild(el('span', null, matNome(it) + (it.s ? ' · ' + it.s : ''))); li.appendChild(chip);
        li.appendChild(el('p', 'flow-res-text', it.t));
        var vb = el('div', 'flow-verdict flow-verdict--' + v.cls);
        var badge = el('span', 'flow-badge'); badge.appendChild(icon(v.ic, true)); badge.appendChild(el('span', null, v.label)); vb.appendChild(badge);
        vb.appendChild(el('strong', 'flow-verdict-text', v.texto));
        if (v.sub) vb.appendChild(el('span', 'flow-verdict-sub', v.sub));
        li.appendChild(vb);
        var c = corpo(it); if (c) li.appendChild(c);
        return li;
    }
    function regrasBox(ids) {
        var wrap = el('div');
        ids.forEach(function (id) {
            var m = matDe[id]; if (!m || !m.regras || !m.regras.length) return;
            var d = el('details', 'flow-rule'); d.appendChild(icon('info'));
            var p = persp(), nm = (p && m.id === 'lua') ? 'Matriz ' + p.toUpperCase() : m.nome;
            var sp = el('div'); var sm = el('summary', null, 'Regras da ' + nm); sp.appendChild(sm);
            if (p === 'hvc' && m.id === 'lua') sp.appendChild(el('p', null, 'Na HVC não há transferência para setor nenhum: o que na LUA é transferência, aqui vira escalamento ao Suporte HVC, e você segue com o passageiro.'));
            m.regras.forEach(function (r) { sp.appendChild(el('p', null, r)); });
            d.appendChild(sp); wrap.appendChild(d);
        });
        return wrap;
    }

    /* ---- passo 1: SAGs ---- */
    function renderSags() {
        var box = $('fluxoSags'); box.textContent = '';
        box.classList.toggle('is-compact', !!sag);
        D.sags.forEach(function (s) {
            var b = el('button', 'sag-btn' + (s.principal ? ' sag-btn--main' : '')); b.type = 'button'; b.dataset.sag = s.id;
            b.setAttribute('aria-pressed', s.id === sag ? 'true' : 'false');
            var ic = el('span', 'sag-icon'); ic.appendChild(icon(s.icone)); b.appendChild(ic);
            var tag = s.principal ? 'SAG PRINCIPAL' : s.tipo === 'esc' ? 'SÓ ESCALAMENTO' : s.tipo === 'info' ? 'INFORMATIVO' : '';
            if (tag) b.appendChild(el('span', 'sag-tag' + (s.principal ? '' : ' sag-tag--soft'), tag));
            b.appendChild(el('span', 'sag-name', s.nome));
            b.appendChild(el('span', 'sag-meta', s.meta));
            box.appendChild(b);
        });
    }
    function renderAreas() {
        var sel = $('fluxoArea');
        AREAS.forEach(function (a) { var o = el('option', null, a[1]); o.value = a[0]; sel.appendChild(o); });
    }
    /* áreas por tipo de solicitação */
    var AREAS = [['agencias', 'Agências de Viagens'], ['bagagem', 'Bagagem'], ['devolucoes', 'Devoluções, Cancelamentos e Reembolsos'], ['emissoes', 'Emissões, Remarcações e Operações LUA/HVC'], ['ssee', 'Serviços Especiais e Necessidades Médicas'], ['ffp', 'LATAM Pass (FFP)'], ['presencial', 'Atendimento Presencial']];
    function areaDe(it) {
        if (it.ar) return it.ar;
        var x = norm((it.s || '') + ' ' + (it.sec || '') + ' ' + it.t), r;
        if (it.m === 'agencia') r = 'agencias';
        else if (it.m === 'ato') r = 'presencial';
        else if (it.m === 'bagagem' || /bagagem|world tracer|found property|extravi/.test(x)) r = 'bagagem';
        else if (it.m === 'dtffp' || /latam pass|ffp|milha/.test(x)) r = 'ffp';
        else if (/servicos especiais|necessidades|menor|pnae|passageiros especiais|oxigenio|cadeira de rodas|assento|upg|ancillar/.test(x)) r = 'ssee';
        else if (it.m === 'dtdev' || /devolu|cancel|reembols|voucher|reclama|excec|cobranca|carta a seguradora/.test(x)) r = 'devolucoes';
        else if (/check.?in|embarque|documenta|presencial|aeroporto/.test(x)) r = 'presencial';
        else r = 'emissoes';
        it.ar = r; return r;
    }

    /* ---- modo 1: resultados da tratativa ---- */
    function renderResultados(q, area) {
        var out = $('fluxoOut'); out.textContent = '';
        var termos = norm(q).split(/\s+/).filter(Boolean);
        var lista = visiveis(sag).filter(function (it) {
            if (area && areaDe(it) !== area) return false;
            var alvo = norm([it.t, it.s, it.c, it.tx, matDe[it.m].nome, it.l.map(function (p) { return p[1]; }).join(' ')].join(' '));
            return termos.every(function (t) { return alvo.indexOf(t) >= 0; });
        });
        var st = $('fluxoStatus');
        st.textContent = lista.length ? plural(lista.length, 'tratativa encontrada', 'tratativas encontradas') + (sag ? ' · vendo como ' + sagDe[sag].nome : ' · escolha a sua SAG acima para ver o caminho da sua matriz') : 'Nenhuma tratativa encontrada.';
        if (sag) out.appendChild(regrasBox(matsDe(sag).concat(area && matsDe(sag).indexOf(area) < 0 ? [area] : [])));
        if (!lista.length) {
            var h = el('div', 'flow-hint'); h.appendChild(icon('search'));
            h.appendChild(el('p', null, 'Não encontramos nenhuma tratativa para "' + q.trim() + '"' + (sag ? ' na visão de ' + sagDe[sag].nome : '') + '. Tente uma palavra mais simples (ex.: "reembolso", "bagagem", "oxigênio").'));
            out.appendChild(h); return;
        }
        var ul = el('ul', 'flow-results'); ul.setAttribute('aria-label', 'Tratativas encontradas');
        lista.forEach(function (it) { ul.appendChild(linha(it)); });
        out.appendChild(ul);
    }

    /* ---- modo 2: perfil da SAG ---- */
    function porGrupo(itens, chave) {
        var m = {}, ordem = [];
        itens.forEach(function (i) { var k = chave(i); if (!m[k]) { m[k] = []; ordem.push(k); } m[k].push(i); });
        return ordem.map(function (k) { return { k: k, itens: m[k] }; });
    }
    function lista(itens) {
        var box = el('div');
        porGrupo(itens, function (i) { return i.s || matDe[i.m].nome; }).forEach(function (g) {
            box.appendChild(el('p', 'flow-sub-h', g.k));
            var ul = el('ul', 'flow-sub');
            g.itens.forEach(function (i) { ul.appendChild(el('li', null, i.t)); });
            box.appendChild(ul);
        });
        return box;
    }
    function detalhes(titulo, qtd, aberto, conteudo) {
        var d = el('details', 'flow-det'); if (aberto) d.open = true;
        var sm = el('summary'); sm.appendChild(el('span', null, titulo)); sm.appendChild(el('span', 'flow-count', String(qtd))); d.appendChild(sm);
        d.appendChild(conteudo); return d;
    }
    function coluna(cls, icone, titulo, desc, aria) {
        var c = el('section', 'flow-col flow-col--' + cls); c.setAttribute('aria-label', aria || titulo);
        var h = el('header', 'flow-col-head'); var h3 = el('h3'); h3.appendChild(icon(icone)); h3.appendChild(el('span', null, titulo)); h.appendChild(h3);
        h.appendChild(el('p', null, desc)); c.appendChild(h); return c;
    }
    function destRot(it) {
        var d = destinoTxt(it, sag);
        var base = kd(it) === 'esc' ? 'Resolve e escala para ' : kd(it) === 'nfcr' ? 'Não resolve em linha: encaminhar para ' : 'Transferir com contexto para ';
        return d ? base + d : (kd(it) === 'nfcr' ? 'Não resolve em linha (sem destino na matriz)' : 'Sem destino na matriz');
    }
    function renderPerfil() {
        var out = $('fluxoOut'); out.textContent = '';
        var s = sagDe[sag], t = s.tipo;
        var visto = visiveis(sag);
        var grid = el('div', 'flow-profile'); var sim, nao;
        $('fluxoStatus').textContent = t === 'info'
            ? 'Vendo o que a ' + s.nome + ' faz e não faz. É só para o agente saber: não há transferência nem FCR.'
            : 'Vendo o que a ' + (/^SAG/i.test(s.nome) ? '' : 'SAG ') + s.nome + ' trata e não trata. Digite a tratativa acima para ver o que fazer com um caso específico.';
        out.appendChild(regrasBox(matsDe(sag)));

        if (temMatriz(sag) && t !== 'info') {
            var meus = visto.filter(function (i) { return matsDe(sag).indexOf(i.m) >= 0 && !(ovL(i) && ovL(i).sp); });
            var esp = visto.filter(function (i) { var o = ovL(i); return o && o.grp && (o.sp || REF.indexOf(i.m) >= 0); });
            var fcr = meus.filter(function (i) { return kd(i) === 'fcr' || i.k === 'own'; });
            var esc = meus.filter(function (i) { return kd(i) === 'esc'; });
            var mix = meus.filter(function (i) { return i.k === 'mix'; });
            var inf = meus.filter(function (i) { return i.k === 'info'; });
            var trf = meus.filter(function (i) { return kd(i) === 'tr' || kd(i) === 'nfcr'; });
            sim = coluna('yes', 'circle-check', s.nome + ' trata', t === 'front' ? 'Primeiro contato: você resolve em linha o que está aqui.' : 'Casos que ficam com esta equipe, segundo a matriz.');
            sim.appendChild(detalhes('Resolve em linha (FCR)', fcr.length, true, lista(fcr)));
            if (esc.length) porGrupo(esc, destRot).forEach(function (g) { sim.appendChild(detalhes(g.k, g.itens.length, false, lista(g.itens))); });
            if (mix.length) sim.appendChild(detalhes('Depende do caso (veja os detalhes da linha)', mix.length, false, lista(mix)));
            if (inf.length) sim.appendChild(detalhes('Informativos (sem destino na matriz)', inf.length, false, lista(inf)));
            nao = coluna('no', 'arrow-right-left', s.nome + ' não trata', t === 'equipe' && s.id === 'bagagem' ? 'A equipe de bagagem não transfere: conduz o caso até o fim.' : 'Casos que esta SAG não resolve: o título diz para onde vão.');
            porGrupo(esp.filter(function (i) { return ovL(i).col === 'sim'; }), function (i) { return ovL(i).grp; }).forEach(function (g) { sim.appendChild(detalhes(g.k, g.itens.length, true, lista(g.itens))); });
            porGrupo(esp.filter(function (i) { return ovL(i).col !== 'sim'; }), function (i) { return ovL(i).grp; }).forEach(function (g) { nao.appendChild(detalhes(g.k, g.itens.length, false, lista(g.itens))); });
            if (!trf.length && !esp.length) nao.appendChild(el('p', 'flow-note', 'Esta matriz não prevê transferências.'));
            porGrupo(trf, destRot).forEach(function (g) { nao.appendChild(detalhes(g.k, g.itens.length, false, lista(g.itens))); });
        } else if (t === 'info') {
            var fazem = visto.filter(function (i) { return i.k === 'ag' ? i.ag !== 'ate' : i.ato === 'sim'; });
            var nfaz = visto.filter(function (i) { return i.k === 'ag' ? i.ag === 'ate' : i.ato !== 'sim'; });
            sim = coluna('yes', 'circle-check', s.nome + ' faz', 'Etapas que ficam com esta parte. O agente só encaminha o cliente.');
            sim.appendChild(detalhes(s.id === 'aero' ? 'Serviços prestados no aeroporto' : 'O que fica com a agência', fazem.length, true, lista(fazem)));
            nao = coluna('no', 'circle-x', s.nome + ' não faz', s.id === 'aero' ? 'Serviços indisponíveis ou não prestados no aeroporto vão pelo Contact Center ou LATAM.com.' : 'Casos que a LATAM atende, para qualquer tipo de passageiro.');
            if (nfaz.length) nao.appendChild(detalhes(s.id === 'aero' ? 'Não prestados / indisponíveis' : 'A LATAM atende sempre', nfaz.length, true, lista(nfaz)));
            else nao.appendChild(el('p', 'flow-note', 'Nada fica totalmente de fora segundo a matriz.'));
        } else {
            var recebe = visto.filter(function (i) { return meu(i); });
            sim = coluna('yes', t === 'esc' ? 'life-buoy' : 'circle-check', t === 'esc' ? s.nome + ': escalamentos' : s.nome + ' recebe', t === 'esc' ? 'Casos em que o agente escala para você. Ele segue com o passageiro: você nunca fica só com ele.' : 'Casos que chegam até esta equipe pelas matrizes. Ela responde somente por e-mail.');
            if (recebe.length) porGrupo(recebe, function (i) { return matNome(i); }).forEach(function (g) { sim.appendChild(detalhes('Vem da ' + g.k, g.itens.length, true, lista(g.itens))); });
            else sim.appendChild(el('p', 'flow-note', 'As matrizes enviadas não citam casos para esta SAG.'));
            nao = coluna('no', 'circle-x', s.nome + ' não trata', 'Procedimentos comuns do dia a dia não são desta SAG.');
            nao.appendChild(el('p', 'flow-note', t === 'esc' ? 'Fora dos escalamentos ao lado, o agente de primeiro contato resolve ou transfere, conforme a matriz dele.' : 'Fora do que está ao lado, o caso segue o fluxo da matriz de quem atende o cliente.'));
        }
        grid.appendChild(sim); grid.appendChild(nao); out.appendChild(grid);
        var acoes = el('div', 'flow-profile-actions');
        var b = el('button', 'btn btn--outline btn--sm'); b.type = 'button'; b.dataset.sag = sag; b.appendChild(icon('x', true)); b.appendChild(el('span', null, 'Escolher outra SAG')); acoes.appendChild(b);
        out.appendChild(acoes);
    }

    /* ---- modo 3: sem filtro ---- */
    function renderInicio() {
        var out = $('fluxoOut'); out.textContent = '';
        $('fluxoStatus').textContent = '';
        var h = el('div', 'flow-hint'); h.appendChild(icon('mouse-pointer-click'));
        h.appendChild(el('p', null, 'Clique em uma SAG acima para ver o que ela trata ou não, ou digite a tratativa do cliente para ver o que fazer segundo as matrizes.'));
        out.appendChild(h);
    }

    function atualizar() {
        var q = $('fluxoBusca').value, area = $('fluxoArea').value;
        renderSags();
        $('fluxoLimpar').hidden = !(q.trim() || area);
        if (q.trim() || area) renderResultados(q, area);
        else if (sag) renderPerfil();
        else renderInicio();
    }
    function escolherSag(id) {
        sag = sag === id ? '' : id;
        try { if (sag) localStorage.setItem(KEY, sag); else localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
        atualizar();
    }
    root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sag]');
        if (b) { var id = b.dataset.sag; var estavaCompacto = $('fluxoSags').classList.contains('is-compact'); escolherSag(id); if (!estavaCompacto && sag) { var o = $('fluxoStatus'); if (o && o.scrollIntoView) o.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    });
    $('fluxoBusca').addEventListener('input', atualizar);
    $('fluxoArea').addEventListener('change', atualizar);
    $('fluxoLimpar').addEventListener('click', function () { $('fluxoBusca').value = ''; $('fluxoArea').value = ''; atualizar(); $('fluxoBusca').focus(); });
    function contarFluxos() {
        var total = String(D.itens.length);
        document.querySelectorAll('[data-count-for="fluxos"]').forEach(function (n) { n.textContent = total; });
        var pill = root.querySelector('.count-pill'); if (pill) { pill.dataset.total = total; pill.querySelector('.count-now').textContent = total; }
    }
    renderAreas();
    contarFluxos();
    atualizar();
    /* o banco (portal_dados 'fluxos') pode trocar os dados que vêm no código */
    window.fluxosDados = function () { return D; };
    window.fluxosDefinir = function (d) {
        if (!d || !Array.isArray(d.sags) || !Array.isArray(d.mats) || !Array.isArray(d.itens)) return false;
        var ant = D;
        try { D = d; indexar(); renderAreas(); contarFluxos(); atualizar(); return true; }
        catch (e) { console.error('[fluxos] dados do banco recusados:', e); D = ant; indexar(); renderAreas(); contarFluxos(); atualizar(); return false; }
    };
    window.fluxosEstado = function () { return { sag: sag }; };
})();
