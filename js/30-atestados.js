/* Validação de atestados médicos: o agente responde a um passo a passo e o painel indica se é EXCEÇÃO GRAVE, EXCEÇÃO GERAL ou se o atestado deve ser negado (e por quê).
   Nada é enviado nem salvo: as respostas existem só nesta tela. As regras estão nas constantes abaixo, fáceis de ajustar. */
(function () {
    'use strict';
    var raiz = document.getElementById('atestados-app'); if (!raiz) return;

    /* ---------- regras (ajuste aqui) ---------- */
    var JANELA_DIAS = 7;       /* exceção grave: contato e remarcação até 7 dias antes ou depois */
    var AFAST_LONGO = 60;      /* informativo: afastamento acima de N dias */
    var PARENTES = [['Pai', 'pai'], ['Mãe', 'mãe'], ['Tio', 'tio'], ['Tia', 'tia'], ['Irmão ou irmã', 'irmão(ã)'], ['Madrasta', 'madrasta'], ['Padrasto', 'padrasto'], ['Sogro', 'sogro'], ['Sogra', 'sogra'], ['Genro', 'genro'], ['Nora', 'nora']];
    var DADOS = [
        ['contato', 'O atestado traz algum dado para contato com a clínica?', 'telefone, e-mail ou endereço', 'não apresenta dados de contato da clínica, o que impede a confirmação de que o documento é verdadeiro'],
        ['crm', 'O atestado traz o CRM do médico?', '', 'não informa o CRM do médico'],
        ['pac', 'O atestado traz o nome completo do paciente?', '', 'não traz o nome completo do paciente'],
        ['doc', 'O atestado traz o CPF ou outro documento de identificação do paciente?', '', 'não traz o CPF ou outro documento de identificação do paciente'],
        ['med', 'O atestado traz o nome completo do médico?', '', 'não traz o nome completo do médico'],
        ['carimbo', 'O atestado está carimbado, de forma manual ou eletrônica?', '', 'não está carimbado (nem manual nem eletronicamente)'],
        ['inicio', 'O atestado informa a data de início do afastamento?', '', 'não apresenta a data de início do afastamento'],
        ['emissao', 'O atestado informa a data de emissão?', '', 'não apresenta a data de emissão'],
        ['motivo', 'O atestado informa o motivo do afastamento?', '', 'não apresenta o motivo do afastamento'],
        ['cid', 'O atestado possui o CID?', '', 'não possui o CID']
    ];
    var GRAVES = [
        ['terminal', 'É uma doença terminal?', 'doença terminal'],
        ['obito', 'É um falecimento?', 'falecimento'],
        ['internacao', 'É uma internação (hospitalização)?', 'internação'],
        ['bebe', 'É um nascimento de bebê?', 'nascimento de bebê'],
        ['gravidez', 'É uma gravidez de alto risco?', 'gravidez de alto risco']
    ];

    /* ---------- utilidades ---------- */
    function $(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
    function ic(n) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic ic--sm'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s; }
    function btn(txt, icone, fn, cls) { var b = $('button', cls || 'btn btn--outline'); b.type = 'button'; if (icone) b.appendChild(ic(icone)); b.appendChild($('span', null, txt)); b.addEventListener('click', fn); return b; }
    function p2(n) { return (n < 10 ? '0' : '') + n; }
    function deIso(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : null; }
    function br(d) { return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); }
    function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
    function somaDias(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
    function difDias(a, b) { return Math.round((a - b) / 86400000); }
    function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }
    function lista(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }

    /* ---------- estado ---------- */
    var S, hist, etapa;
    function zerar() { if (S && S.arqs) S.arqs.forEach(function (a) { if (a.url) URL.revokeObjectURL(a.url); }); S = { arqs: [], pax: null, par: null, dados: {}, atDate: '', voo: '', contato: iso(new Date()), dias: '', flags: {} }; hist = []; etapa = 'arq'; }
    zerar();
    var ROTULOS = { arq: 'Atestado', pax: 'Paciente', par: 'Paciente', dados: 'Dados do atestado', voo: 'Datas', tipo: 'Tipo de ocorrência', res: 'Resultado' };
    var ORDEM = ['arq', 'pax', 'dados', 'voo', 'tipo', 'res'];

    function ir(e) { hist.push(etapa); etapa = e; desenhar(); }
    function voltar() { if (hist.length) { etapa = hist.pop(); desenhar(); } }

    /* ---------- cálculo do resultado ---------- */
    function resultado() {
        var r = { motivos: [], docs: [], info: [] };
        if (S.pax === 'nao') {
            if (S.par === 'nenhum') { r.tipo = 'negado'; r.titulo = 'Atestado não aceito'; r.motivos.push('São aceitos atestados apenas de parentes (pai, mãe, tio, tia, irmão, madrasta, padrasto, sogro, sogra, genro ou nora).'); return r; }
            r.docs.push('Solicitar documentos que comprovem o parentesco entre o paciente e o passageiro (ex.: certidão de nascimento ou de casamento).');
        }
        var faltam = DADOS.filter(function (d) { return S.dados[d[0]] === false; });
        if (faltam.length) {
            r.tipo = 'negado'; r.titulo = 'Atestado não validado';
            r.motivos.push('O atestado não pode ser validado, pois ' + lista(faltam.map(function (d) { return d[3]; })) + '.');
            r.faltam = faltam; r.docs = []; return r;
        }
        var voo = deIso(S.voo), contato = deIso(S.contato), atd = deIso(S.atDate), dias = parseInt(S.dias, 10);
        var graves = GRAVES.filter(function (g) { return S.flags[g[0]] === true; });
        if (isFinite(dias) && dias > AFAST_LONGO) r.info.push('Afastamento de ' + plural(dias, 'dia', 'dias') + ' (acima de ' + AFAST_LONGO + ' dias).');
        if (graves.length) {
            r.tipo = 'grave'; r.titulo = 'Exceção grave'; r.graves = graves;
            r.motivos.push('Caso enquadrado como exceção grave: ' + lista(graves.map(function (g) { return g[2]; })) + '.');
            var dist = difDias(contato, voo), dentro = Math.abs(dist) <= JANELA_DIAS;
            r.reembolso = 'Reembolso integral.';
            var ini = somaDias(contato, -JANELA_DIAS), fim = somaDias(contato, JANELA_DIAS);
            if (dentro) {
                r.janela = true;
                r.remarcacao = 'Remarcação sem custo (sem multa e sem diferença tarifária), desde que a nova data fique entre ' + br(ini) + ' e ' + br(fim) + ' (' + JANELA_DIAS + ' dias antes ou depois da data do contato). Fora desse período: sem multa, mas com eventual diferença tarifária.';
                r.motivos.push('O contato (' + br(contato) + ') ' + (dist === 0 ? 'é no mesmo dia do voo' : 'ocorre ' + plural(Math.abs(dist), 'dia', 'dias') + (dist < 0 ? ' antes' : ' depois') + ' do voo') + ' (' + br(voo) + '), dentro da regra de ' + JANELA_DIAS + ' dias.');
            } else {
                r.janela = false;
                r.remarcacao = 'Remarcação sem multa, com eventual diferença tarifária (o contato está fora da regra de ' + JANELA_DIAS + ' dias antes ou depois do voo).';
                r.motivos.push('O contato (' + br(contato) + ') ocorre ' + plural(Math.abs(dist), 'dia', 'dias') + (dist < 0 ? ' antes' : ' depois') + ' do voo (' + br(voo) + '), fora da regra de ' + JANELA_DIAS + ' dias.');
            }
        } else {
            r.tipo = 'geral'; r.titulo = 'Exceção geral';
            r.motivos.push('Atestado válido, mas sem risco que se enquadre na exceção grave (doença terminal, falecimento, internação, nascimento de bebê ou gravidez de alto risco).');
            r.reembolso = 'Reembolso de acordo com as regras da tarifa.';
            r.remarcacao = 'Remarcação sem multa, com eventual diferença tarifária.';
        }
        return r;
    }
    function resumoTexto(r) {
        var L = ['VALIDAÇÃO DE ATESTADO — ' + r.titulo.toUpperCase()];
        L.push('Atestado do passageiro: ' + (S.pax === 'sim' ? 'sim' : 'não (parentesco: ' + (S.par === 'nenhum' ? 'não se aplica' : (PARENTES.filter(function (p) { return p[0] === S.par; })[0] || [0, S.par])[1]) + ')'));
        if (r.tipo !== 'negado' || r.faltam) { L.push('Dados do atestado: ' + (r.faltam ? 'incompletos' : 'completos')); }
        if (r.tipo !== 'negado') { L.push('Data do atestado: ' + br(deIso(S.atDate)) + ' | Data do voo: ' + br(deIso(S.voo)) + ' | Data do contato: ' + br(deIso(S.contato)) + ' | Afastamento: ' + plural(parseInt(S.dias, 10), 'dia', 'dias')); }
        r.motivos.forEach(function (m) { L.push(m); });
        if (r.reembolso) L.push('Reembolso: ' + r.reembolso.replace(/\.$/, '') + '.');
        if (r.remarcacao) L.push('Remarcação: ' + r.remarcacao);
        r.docs.forEach(function (d) { L.push(d); });
        r.info.forEach(function (d) { L.push('Obs.: ' + d); });
        return L.join('\n');
    }
    function copiar(t) {
        try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { return true; }, function () { return fb(); }); } catch (e) { }
        return Promise.resolve(fb());
        function fb() { try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); return ok; } catch (e) { return false; } }
    }

    /* ---------- telas ---------- */
    function sn(valor, aoEscolher, rotSim, rotNao) {
        var g = $('div', 'at-sn'); g.setAttribute('role', 'group');
        [['sim', rotSim || 'Sim', 'check'], ['nao', rotNao || 'Não', 'x']].forEach(function (o) {
            var b = $('button', 'at-sn-b at-sn-b--' + o[0]); b.type = 'button'; b.setAttribute('aria-pressed', String(valor === o[0])); b.appendChild(ic(o[2])); b.appendChild($('span', null, o[1]));
            b.addEventListener('click', function () { aoEscolher(o[0]); }); g.appendChild(b);
        });
        return g;
    }
    function cabecalho(card) {
        var i = ORDEM.indexOf(etapa === 'par' ? 'pax' : etapa), nav = $('ol', 'at-passos'); nav.setAttribute('aria-label', 'Etapas');
        ORDEM.forEach(function (e, n) { var li = $('li', 'at-passo' + (n < i ? ' is-ok' : n === i ? ' is-atual' : '')); li.appendChild($('span', 'at-passo-n', String(n + 1))); li.appendChild($('span', 'at-passo-t', ROTULOS[e])); if (n === i) li.setAttribute('aria-current', 'step'); nav.appendChild(li); });
        card.appendChild(nav);
    }
    function rodape(card, proximo) {
        var f = $('div', 'at-rodape');
        if (hist.length) f.appendChild(btn('Voltar', 'chevron-left', voltar, 'btn btn--ghost'));
        f.appendChild(btn('Recomeçar', 'rotate-ccw', function () { zerar(); desenhar(); }, 'btn btn--ghost'));
        if (proximo) { var b = btn(proximo.txt, 'chevron-right', proximo.fn, 'btn btn--primary'); b.disabled = !!proximo.off; f.appendChild(b); }
        card.appendChild(f);
    }
    function pergunta(card, num, txt, apoio) { var h = $('h3', 'at-perg'); if (num) h.appendChild($('span', 'at-perg-n', num)); h.appendChild($('span', null, txt)); card.appendChild(h); if (apoio) card.appendChild($('p', 'at-apoio', apoio)); }

    var MAX_MB = 10, TIPOS = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/i;
    function telaArq(card) {
        pergunta(card, '', 'Envie o atestado', 'Anexe o arquivo do atestado (foto ou PDF). Você pode enviar mais de um arquivo.');
        var area = $('div', 'at-up'), id = 'atArq', l = $('label', 'at-up-b'); l.htmlFor = id; l.appendChild(ic('plus')); l.appendChild($('span', null, 'Escolher arquivos'));
        var inp = $('input'); inp.type = 'file'; inp.id = id; inp.multiple = true; inp.accept = 'image/*,application/pdf,.pdf'; inp.className = 'sr-only';
        var erro = $('p', 'at-erro'); erro.setAttribute('role', 'alert');
        var lista = $('ul', 'at-arqs');
        function desenharLista() {
            lista.textContent = '';
            S.arqs.forEach(function (a, n) {
                var li = $('li', 'at-arq');
                if (a.url && /^image\//.test(a.tipo)) { var im = $('img'); im.src = a.url; im.alt = ''; li.appendChild(im); } else { var d = $('span', 'at-arq-ico'); d.appendChild(ic('file-text')); li.appendChild(d); }
                var t = $('span', 'at-arq-n', a.nome); li.appendChild(t); li.appendChild($('small', null, (a.tam / 1048576 < 0.1 ? Math.max(1, Math.round(a.tam / 1024)) + ' KB' : (a.tam / 1048576).toFixed(1) + ' MB')));
                var x = $('button', 'ger-ico-btn'); x.type = 'button'; x.title = 'Remover arquivo'; x.setAttribute('aria-label', 'Remover ' + a.nome); x.appendChild(ic('x'));
                x.addEventListener('click', function () { if (a.url) URL.revokeObjectURL(a.url); S.arqs.splice(n, 1); desenharLista(); atualizarBt(); }); li.appendChild(x); lista.appendChild(li);
            });
        }
        var bProx;
        function atualizarBt() { if (bProx) bProx.disabled = !S.arqs.length; }
        inp.addEventListener('change', function () {
            var msgs = [];
            [].slice.call(inp.files).forEach(function (f) {
                if (!(TIPOS.test(f.type) || /\.(pdf|png|jpe?g|webp|heic|heif)$/i.test(f.name))) return msgs.push(f.name + ': use foto (JPG, PNG) ou PDF.');
                if (f.size > MAX_MB * 1048576) return msgs.push(f.name + ': passa de ' + MAX_MB + ' MB.');
                if (S.arqs.length >= 6) return msgs.push('Limite de 6 arquivos.');
                S.arqs.push({ nome: f.name, tipo: f.type || '', tam: f.size, url: /^image\//.test(f.type) ? URL.createObjectURL(f) : '' });
            });
            inp.value = ''; erro.textContent = msgs.join(' '); desenharLista(); atualizarBt();
        });
        area.appendChild(l); area.appendChild(inp); card.appendChild(area); card.appendChild(erro); card.appendChild(lista);
        rodape(card, { txt: 'Continuar', off: !S.arqs.length, fn: function () { ir('pax'); } });
        bProx = card.querySelector('.at-rodape .btn--primary'); desenharLista();
    }
    function telaPax(card) {
        pergunta(card, '1', 'O atestado é do próprio passageiro?', 'Confira o nome do paciente no atestado e compare com o nome do passageiro da reserva.');
        card.appendChild(sn(S.pax, function (v) { S.pax = v; if (v === 'sim') { S.par = null; ir('dados'); } else ir('par'); }, 'Sim, é do passageiro', 'Não, é de outra pessoa'));
        rodape(card);
    }
    function telaPar(card) {
        pergunta(card, '1.1', 'Qual é o grau de parentesco entre o paciente e o passageiro?', 'Só são aceitos atestados de parentes da lista abaixo.');
        var g = $('div', 'at-par');
        PARENTES.forEach(function (p) { var b = $('button', 'at-chip', p[0]); b.type = 'button'; b.setAttribute('aria-pressed', String(S.par === p[0])); b.addEventListener('click', function () { S.par = p[0]; ir('dados'); }); g.appendChild(b); });
        var n = $('button', 'at-chip at-chip--nao', 'Outro parentesco / não se aplica'); n.type = 'button'; n.setAttribute('aria-pressed', String(S.par === 'nenhum')); n.addEventListener('click', function () { S.par = 'nenhum'; ir('res'); }); g.appendChild(n);
        card.appendChild(g); rodape(card);
    }
    function telaDados(card) {
        pergunta(card, '2', 'O atestado traz todos os dados abaixo?', 'Responda cada item olhando o documento. Se faltar algum, o atestado não é validado.');
        if (S.pax === 'nao' && S.par && S.par !== 'nenhum') { var av = $('p', 'at-aviso'); av.appendChild(ic('info')); av.appendChild($('span', null, 'Como o atestado é de um parente, será preciso pedir também os documentos que comprovem o parentesco.')); card.appendChild(av); }
        var ul = $('div', 'at-itens');
        DADOS.forEach(function (d, n) {
            var li = $('div', 'at-item'), tx = $('div', 'at-item-tx'); tx.appendChild($('span', 'at-item-n', '2.' + n)); tx.appendChild($('span', null, d[1])); if (d[2]) tx.appendChild($('small', null, d[2])); li.appendChild(tx);
            li.appendChild(sn(S.dados[d[0]] === true ? 'sim' : S.dados[d[0]] === false ? 'nao' : null, function (v) { S.dados[d[0]] = v === 'sim'; desenhar(); }));
            ul.appendChild(li);
        });
        card.appendChild(ul);
        var resp = DADOS.every(function (d) { return typeof S.dados[d[0]] === 'boolean'; });
        rodape(card, { txt: 'Continuar', off: !resp, fn: function () { if (DADOS.some(function (d) { return S.dados[d[0]] === false; })) ir('res'); else ir('voo'); } });
    }
    function telaVoo(card) {
        pergunta(card, '3', 'Datas do atestado e do voo', 'A data do contato é a de hoje; altere só se o contato foi em outro dia.');
        var f = $('div', 'at-form');
        function campo(id, rot, tipo, chave, extra) {
            var g = $('div', 'at-campo'), l = $('label', null, rot); l.htmlFor = id; var i = $('input', 'login-input'); i.id = id; i.type = tipo; i.value = S[chave] || '';
            if (extra) Object.keys(extra).forEach(function (k) { i[k] = extra[k]; });
            i.addEventListener('input', function () { S[chave] = i.value; validar(); }); g.appendChild(l); g.appendChild(i); f.appendChild(g); return i;
        }
        campo('atDt', '3. Qual é a data do atestado?', 'date', 'atDate'); campo('atVoo', '3.1 Qual é a data do voo?', 'date', 'voo'); campo('atCont', 'Data do contato', 'date', 'contato');
        campo('atDias', '3.2 Quantos dias de afastamento?', 'number', 'dias', { min: '1', max: '3650', step: '1', inputMode: 'numeric', placeholder: 'Ex.: 5' });
        card.appendChild(f);
        var erro = $('p', 'at-erro'); erro.setAttribute('role', 'alert'); card.appendChild(erro);
        var cont = { txt: 'Continuar', off: true, fn: function () { ir('tipo'); } };
        rodape(card, cont);
        var bProx = card.querySelector('.at-rodape .btn--primary');
        function validar() {
            var a = deIso(S.atDate), v = deIso(S.voo), c = deIso(S.contato), d = parseInt(S.dias, 10), msg = '';
            if (!a || !v || !c || !isFinite(d)) msg = '';
            else if (d < 1) msg = 'Informe pelo menos 1 dia de afastamento.';
            bProx.disabled = !(a && v && c && isFinite(d) && d >= 1); erro.textContent = msg;
        }
        validar();
    }
    function telaTipo(card) {
        pergunta(card, '3.3 a 3.8', 'Qual é o motivo do afastamento?', 'Marque “Sim” apenas para o que o atestado comprova. Tudo o que não estiver na lista é exceção geral.');
        var ul = $('div', 'at-itens');
        GRAVES.forEach(function (g, n) {
            var li = $('div', 'at-item'), tx = $('div', 'at-item-tx'); tx.appendChild($('span', 'at-item-n', '3.' + (n + 3))); tx.appendChild($('span', null, g[1])); li.appendChild(tx);
            li.appendChild(sn(S.flags[g[0]] === true ? 'sim' : S.flags[g[0]] === false ? 'nao' : null, function (v) { S.flags[g[0]] = v === 'sim'; desenhar(); })); ul.appendChild(li);
        });
        card.appendChild(ul);
        var d = parseInt(S.dias, 10); if (isFinite(d)) { var p = $('p', 'at-apoio', 'Afastamento informado: ' + plural(d, 'dia', 'dias') + (d > AFAST_LONGO ? ' — acima de ' + AFAST_LONGO + ' dias (anotado no resumo).' : '.')); card.appendChild(p); }
        rodape(card, { txt: 'Ver resultado', off: !GRAVES.every(function (g) { return typeof S.flags[g[0]] === 'boolean'; }), fn: function () { ir('res'); } });
    }
    function telaRes(card) {
        var r = resultado();
        var topo = $('div', 'at-res-topo at-res-topo--' + r.tipo); topo.appendChild(ic(r.tipo === 'negado' ? 'circle-x' : r.tipo === 'grave' ? 'shield-check' : 'circle-check'));
        var tt = $('div'); tt.appendChild($('small', null, 'Resultado')); tt.appendChild($('strong', null, r.titulo)); topo.appendChild(tt); card.appendChild(topo);
        var corpo = $('div', 'at-res-corpo');
        if (r.reembolso) { var a = $('div', 'at-res-bloco'); a.appendChild($('h4', null, 'Reembolso')); a.appendChild($('p', null, r.reembolso)); corpo.appendChild(a); }
        if (r.remarcacao) { var b = $('div', 'at-res-bloco'); b.appendChild($('h4', null, 'Remarcação')); b.appendChild($('p', null, r.remarcacao)); corpo.appendChild(b); }
        var c = $('div', 'at-res-bloco at-res-bloco--largo'); c.appendChild($('h4', null, r.tipo === 'negado' ? 'Motivo da negativa' : 'Por quê')); if (r.faltam) c.appendChild($('p', null, 'O atestado não pode ser validado pelos motivos abaixo:')); else r.motivos.forEach(function (m) { c.appendChild($('p', null, m)); });
        if (r.faltam) { var u = $('ul'); r.faltam.forEach(function (d) { u.appendChild($('li', null, d[3].charAt(0).toUpperCase() + d[3].slice(1))); }); c.appendChild(u); }
        corpo.appendChild(c);
        if (r.docs.length) { var dd = $('div', 'at-res-bloco at-res-bloco--largo at-res-bloco--atencao'); dd.appendChild($('h4', null, 'Documentos a solicitar')); r.docs.forEach(function (m) { dd.appendChild($('p', null, m)); }); corpo.appendChild(dd); }
        if (r.info.length) { var ii = $('div', 'at-res-bloco at-res-bloco--largo'); ii.appendChild($('h4', null, 'Observação')); r.info.forEach(function (m) { ii.appendChild($('p', null, m)); }); corpo.appendChild(ii); }
        card.appendChild(corpo);
        var ac = $('div', 'at-rodape'), st = $('span', 'at-copiado'); st.setAttribute('role', 'status');
        ac.appendChild(btn('Voltar', 'chevron-left', voltar, 'btn btn--ghost'));
        ac.appendChild(btn('Copiar resumo', 'copy', function () { copiar(resumoTexto(r)).then(function (ok) { st.textContent = ok ? 'Resumo copiado!' : 'Não consegui copiar.'; }); }, 'btn btn--outline'));
        ac.appendChild(btn('Novo atestado', 'rotate-ccw', function () { zerar(); desenhar(); }, 'btn btn--primary')); ac.appendChild(st); card.appendChild(ac);
    }
    function desenhar() {
        raiz.textContent = '';
        var card = $('section', 'at-card'); if (etapa !== 'res') cabecalho(card); else { var i = $('p', 'at-privado'); i.appendChild(ic('info')); i.appendChild($('span', null, 'As respostas não são salvas: ao recomeçar, tudo é apagado desta tela.')); card.appendChild(i); }
        ({ arq: telaArq, pax: telaPax, par: telaPar, dados: telaDados, voo: telaVoo, tipo: telaTipo, res: telaRes })[etapa](card);
        raiz.appendChild(card);
        var foco = card.querySelector('.at-perg, .at-res-topo'); if (foco) { foco.tabIndex = -1; }
    }
    desenhar();
})();
