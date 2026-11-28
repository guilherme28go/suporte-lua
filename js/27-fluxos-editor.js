/* Editor dos Fluxos de Atendimento para desenvolvedores (sem JSON): tratativas, SAGs, matrizes e regras, fluxograma e links.
   Trabalha numa cópia (rascunho): nada vale para os outros até clicar em "Salvar para todos". Os campos avançados que não aparecem aqui são preservados. */
(function () {
    'use strict';
    var C = window.PortalCore; if (!C) return;
    var el = C.el, FC = function () { return window.PortalFluxograma; };
    var TIPOS = [['fcr', 'Resolução em linha (FCR)'], ['own', 'A equipe conduz o caso até o fim'], ['esc', 'Resolver e escalar'], ['tr', 'Transferir com contexto'], ['nfcr', 'Não resolve em linha (Não FCR)'], ['mix', 'Depende do caso'], ['info', 'Apenas informativo'], ['ag', 'Passagem de agência'], ['ato', 'Serviço do ATO / Counter']];
    var TIPO_ROT = {}; TIPOS.forEach(function (t) { TIPO_ROT[t[0]] = t[1]; });
    var TIPO_SAG = [['front', 'Primeiro contato (atende o cliente)'], ['esc', 'Só escalamento (suporte)'], ['equipe', 'Equipe / Dream Team'], ['info', 'Informativo (só orienta)']];
    var ROTULOS = ['Descrição', 'Tipo de contato', 'Para quem escala ou transfere', 'Fluxo', 'Canal', 'Observação', 'Passo a passo'];
    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function norm(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
    function slug(t, usados) { var b = norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'novo', s = b, n = 2; while (usados[s]) s = b + '-' + n++; return s; }
    function ic(n, p) { return C.icon(n, p); }
    function btn(txt, ico, fn, cls) { var b = el('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (ico) b.appendChild(ic(ico, true)); if (txt) b.appendChild(el('span', null, txt)); if (fn) b.addEventListener('click', fn); return b; }
    function ibtn(ico, rot, fn, off) { var b = el('button', 'ger-ico-btn'); b.type = 'button'; b.title = rot; b.setAttribute('aria-label', rot); b.disabled = !!off; b.appendChild(ic(ico)); b.addEventListener('click', fn); return b; }
    function mover(lista, i, d) { var j = i + d; if (j < 0 || j >= lista.length) return false; var t = lista[i]; lista[i] = lista[j]; lista[j] = t; return true; }
    function urlOk(u) { return C.urlSegura ? (C.urlSegura(String(u || '').trim()) || '') : (/^https?:\/\/\S+$/i.test(u || '') ? u : ''); }

    function montar(host, api) {
        var W = clone(window.fluxosDados()), salvo = JSON.stringify(W), aba = 'tratativas', busca = '', fMat = '', limite = 30, msgs;
        host.textContent = '';
        var barra = el('div', 'fx-barra'), pill = el('span', 'fx-pill'), acoes = el('div', 'fx-acoes');
        barra.appendChild(pill); barra.appendChild(acoes); host.appendChild(barra);
        var abas = el('div', 'fx-abas'); abas.setAttribute('role', 'tablist'); host.appendChild(abas);
        var corpo = el('div', 'fx-corpo'); host.appendChild(corpo);
        function sujo() { return JSON.stringify(W) !== salvo; }
        function status() {
            var s = sujo(); pill.className = 'fx-pill' + (s ? ' is-sujo' : ''); pill.textContent = s ? 'Alterações ainda não salvas' : 'Tudo salvo';
            acoes.querySelectorAll('[data-fx-dep]').forEach(function (b) { b.disabled = !s; });
        }
        function mudou() { status(); }
        /* ----- ações gerais ----- */
        acoes.appendChild(btn('Testar nesta página', 'eye', function () { var er = api.valido(W); if (er) return api.msg(er, false); api.msg(window.fluxosDefinir(clone(W)) ? 'Aplicado só aqui, para você testar. Ninguém mais vê até você salvar.' : 'Os fluxos foram recusados.', true); }));
        var bs = btn('Salvar para todos', 'check', async function () {
            var er = api.valido(W); if (er) return api.msg(er, false);
            var x = await api.sb().from('portal_dados').upsert([{ chave: 'fluxos', valor: W }], { onConflict: 'chave' }).select();
            if (x.error || !x.data || !x.data.length) return api.msg(x.error ? api.erro(x.error) : 'Sem permissão para salvar.', false);
            salvo = JSON.stringify(W); window.fluxosDefinir(clone(W)); if (C.fluxosAtualizar) C.fluxosAtualizar(); api.msg('Fluxos salvos para todos (' + W.itens.length + ' tratativas).', true); status();
        }, 'btn btn--primary btn--sm'); bs.setAttribute('data-fx-dep', ''); acoes.appendChild(bs);
        var bd = btn('Descartar alterações', 'undo-2', function () { if (!window.confirm('Descartar tudo o que você mudou desde o último salvamento?')) return; W = JSON.parse(salvo); desenhar(); }); bd.setAttribute('data-fx-dep', ''); acoes.appendChild(bd);
        acoes.appendChild(btn('Voltar ao padrão do código', 'rotate-ccw', async function () {
            if (!window.confirm('Apagar a versão do banco e voltar aos fluxos que vêm no código? Quem já abriu o portal verá a mudança ao recarregar.')) return;
            var x = await api.sb().from('portal_dados').delete().eq('chave', 'fluxos').select(); if (x.error) return api.msg(api.erro(x.error), false);
            if (C.fluxosPadrao) C.fluxosPadrao(); api.msg('Versão do banco apagada. Recarregue a página para ver o padrão do código.', true);
        }));
        /* ----- abas ----- */
        var ABAS = [['tratativas', 'Tratativas', 'list-checks'], ['sags', 'SAGs', 'users'], ['matrizes', 'Matrizes e regras', 'book-open'], ['backup', 'Backup', 'download']];
        function desenharAbas() {
            abas.textContent = '';
            ABAS.forEach(function (a) { var b = el('button', 'fx-aba'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(a[0] === aba)); b.appendChild(ic(a[2], true)); b.appendChild(el('span', null, a[1])); b.addEventListener('click', function () { aba = a[0]; desenhar(); }); abas.appendChild(b); });
        }
        function desenhar() { desenharAbas(); corpo.textContent = ''; ({ tratativas: abaTratativas, sags: abaSags, matrizes: abaMatrizes, backup: abaBackup })[aba](); status(); }

        /* ================= TRATATIVAS ================= */
        function matNome(id) { var m = W.mats.filter(function (x) { return x.id === id; })[0]; return m ? m.nome : id; }
        function abaTratativas() {
            var tb = el('div', 'fx-tool'), bi = el('input', 'login-input'); bi.type = 'search'; bi.placeholder = 'Buscar tratativa…'; bi.value = busca; bi.setAttribute('aria-label', 'Buscar tratativa');
            var sm = el('select', 'login-input'); sm.setAttribute('aria-label', 'Filtrar por matriz'); var o0 = el('option', null, 'Todas as matrizes'); o0.value = ''; sm.appendChild(o0);
            W.mats.forEach(function (m) { var o = el('option', null, m.nome); o.value = m.id; if (m.id === fMat) o.selected = true; sm.appendChild(o); });
            tb.appendChild(bi); tb.appendChild(sm); tb.appendChild(btn('Nova tratativa', 'plus', function () { formItem(null, -1); }, 'btn btn--primary btn--sm')); corpo.appendChild(tb);
            var lista = el('div', 'fx-lista'); corpo.appendChild(lista);
            function pintar() {
                lista.textContent = ''; var q = norm(busca).split(/\s+/).filter(Boolean);
                var ach = []; W.itens.forEach(function (it, i) { if (fMat && it.m !== fMat) return; var alvo = norm([it.t, it.s, it.tx, matNome(it.m)].join(' ')); if (q.every(function (t) { return alvo.indexOf(t) >= 0; })) ach.push(i); });
                lista.appendChild(el('p', 'fx-cont', ach.length + ' de ' + W.itens.length + ' tratativas'));
                ach.slice(0, limite).forEach(function (i) {
                    var it = W.itens[i], row = el('div', 'fx-row'), info = el('div', 'fx-info'); info.appendChild(el('strong', null, it.t));
                    var sub = el('span', 'fx-sub'); sub.appendChild(document.createTextNode(matNome(it.m) + (it.s ? ' · ' + it.s : ''))); info.appendChild(sub);
                    var tags = el('span', 'fx-tags'); tags.appendChild(el('span', 'fx-tag', TIPO_ROT[it.k] || it.k));
                    if (it.fc && it.fc.passos && it.fc.passos.length) { var t1 = el('span', 'fx-tag fx-tag--ok'); t1.appendChild(ic('workflow', true)); t1.appendChild(el('span', null, 'Fluxograma')); tags.appendChild(t1); }
                    if (it.kb) { var t2 = el('span', 'fx-tag fx-tag--ok'); t2.appendChild(ic('book-open', true)); t2.appendChild(el('span', null, 'Portal do conhecimento')); tags.appendChild(t2); }
                    info.appendChild(tags); row.appendChild(info);
                    var ac = el('span', 'fx-row-ac');
                    ac.appendChild(ibtn('pencil', 'Editar', function () { formItem(clone(it), i); }));
                    ac.appendChild(ibtn('copy', 'Duplicar', function () { var c = clone(it); c.t = c.t + ' (cópia)'; c.i = W.itens.reduce(function (a, x) { return Math.max(a, +x.i || 0); }, 0) + 1; W.itens.splice(i + 1, 0, c); mudou(); pintar(); }));
                    ac.appendChild(ibtn('trash-2', 'Excluir', function () { if (!window.confirm('Excluir a tratativa "' + it.t + '"?')) return; W.itens.splice(i, 1); mudou(); pintar(); }));
                    row.appendChild(ac); lista.appendChild(row);
                });
                if (ach.length > limite) lista.appendChild(btn('Mostrar mais ' + Math.min(30, ach.length - limite), 'chevron-down', function () { limite += 30; pintar(); }));
            }
            bi.addEventListener('input', function () { busca = bi.value; limite = 30; pintar(); }); sm.addEventListener('change', function () { fMat = sm.value; limite = 30; pintar(); }); pintar();
        }
        /* formulário de uma tratativa (rascunho x; idx = -1 para nova) */
        function formItem(x, idx) {
            var novo = !x; if (novo) x = { m: fMat || (W.mats[0] && W.mats[0].id) || '', s: '', t: '', c: 'Resolução em linha (FCR)', k: 'fcr', tx: '', to: [], l: [['Descrição', ''], ['Tipo de contato', 'Resolução em linha (FCR)']], i: W.itens.reduce(function (a, y) { return Math.max(a, +y.i || 0); }, 0) + 1 };
            var f = el('div', 'cm-form fx-form');
            var m = C.seletor('Matriz (de onde vem esta regra)', W.mats.map(function (y) { return [y.id, y.nome]; }), x.m);
            var s = C.campo('Assunto (agrupa tratativas parecidas)', x.s, 60, 'Ex.: Bagagem'), t = C.campo('Título da tratativa', x.t, 200, 'Ex.: Bagagem violada em voos LATAM');
            var k = C.seletor('Tipo de contato', TIPOS, x.k), c = C.campo('Texto curto do tipo de contato', x.c, 80, 'Ex.: Transferir com contexto');
            f.appendChild(m.n); f.appendChild(s.n); f.appendChild(t.n); f.appendChild(k.n); f.appendChild(c.n);
            var ag = C.seletor('Agência: quem faz?', [['enc', 'Fica com a agência (LATAM só encaminha)'], ['ate', 'A LATAM atende'], ['dep', 'Depende do tipo de passageiro']], x.ag || 'enc'), at = C.seletor('ATO: o aeroporto presta este serviço?', [['sim', 'Sim, presta'], ['nao', 'Não presta']], x.ato || 'sim');
            f.appendChild(ag.n); f.appendChild(at.n);
            function ajustarTipo() { var v = k.get(); ag.n.hidden = v !== 'ag'; at.n.hidden = v !== 'ato'; if (!c.i.value.trim() || TIPOS.some(function (z) { return z[1] === c.i.value; })) c.i.value = TIPO_ROT[v] || ''; }
            k.i.addEventListener('change', ajustarTipo); ag.n.hidden = x.k !== 'ag'; at.n.hidden = x.k !== 'ato';
            /* destinos */
            var dg = el('fieldset', 'fx-fs'); dg.appendChild(el('legend', null, 'Para quem escala ou transfere (se houver)'));
            var dcks = []; W.sags.forEach(function (z) { var cb = C.caixa(z.nome, (x.to || []).indexOf(z.id) >= 0); dcks.push([z.id, cb]); dg.appendChild(cb.n); }); f.appendChild(dg);
            var tx = C.campo('Texto do destino (opcional: se vazio usa os nomes marcados acima)', x.tx, 80, 'Ex.: Bagagem'); f.appendChild(tx.n);
            /* linhas de detalhes */
            var lg = el('fieldset', 'fx-fs'); lg.appendChild(el('legend', null, 'Detalhes que o agente vê')); lg.appendChild(el('p', 'ger-hint', 'Para colocar um link (por exemplo do Portal do conhecimento) dentro do texto, use o botão "Inserir link".'));
            var linhas = el('div', 'fx-linhas'), dl = el('datalist'); dl.id = 'fxRotulos'; ROTULOS.forEach(function (r) { var o = el('option'); o.value = r; dl.appendChild(o); }); lg.appendChild(dl); lg.appendChild(linhas);
            var L = (x.l || []).map(function (p) { return [p[0], p[1]]; });
            function linhasPintar() {
                linhas.textContent = '';
                L.forEach(function (p, i) {
                    var r = el('div', 'fx-linha'), rot = el('input', 'login-input'), val = el('textarea', 'login-input cm-area'); rot.type = 'text'; rot.maxLength = 60; rot.value = p[0]; rot.placeholder = 'Rótulo'; rot.setAttribute('list', 'fxRotulos'); rot.setAttribute('aria-label', 'Rótulo');
                    val.rows = 2; val.maxLength = 1500; val.value = p[1]; val.setAttribute('aria-label', 'Texto de ' + (p[0] || 'detalhe'));
                    rot.addEventListener('input', function () { p[0] = rot.value; }); val.addEventListener('input', function () { p[1] = val.value; });
                    var ac = el('div', 'fx-linha-ac');
                    ac.appendChild(ibtn('link', 'Inserir link no texto', function () { inserirLink(val, p); }));
                    ac.appendChild(ibtn('arrow-up', 'Subir', function () { if (mover(L, i, -1)) linhasPintar(); }, i === 0)); ac.appendChild(ibtn('arrow-down', 'Descer', function () { if (mover(L, i, 1)) linhasPintar(); }, i === L.length - 1));
                    ac.appendChild(ibtn('trash-2', 'Remover linha', function () { L.splice(i, 1); linhasPintar(); }));
                    var cima = el('div', 'fx-linha-in'); cima.appendChild(rot); cima.appendChild(ac); r.appendChild(cima); r.appendChild(val); linhas.appendChild(r);
                });
            }
            function inserirLink(val, p) {
                var a = val.selectionStart, b = val.selectionEnd, sel = val.value.slice(a, b) || 'Portal do conhecimento';
                var txt = window.prompt('Texto que vai aparecer como link:', sel); if (txt == null || !txt.trim()) return;
                var url = window.prompt('Endereço do link (começa com https://):', 'https://'); if (url == null) return; url = urlOk(url); if (!url) return window.alert('Endereço inválido. Use um link que comece com https://');
                var ins = '[' + txt.trim().replace(/[\[\]]/g, '') + '](' + url + ')'; val.value = val.value.slice(0, a) + ins + val.value.slice(b); p[1] = val.value; val.focus();
            }
            lg.appendChild(btn('Adicionar linha', 'plus', function () { L.push(['', '']); linhasPintar(); })); linhasPintar(); f.appendChild(lg);
            /* portal do conhecimento */
            var kb = C.campo('Link do Portal do conhecimento (botão em cada tratativa)', x.kb || '', 300, 'https://…'), kbl = C.campo('Texto do botão (opcional)', x.kbl || '', 60, 'Abrir no Portal do conhecimento'); f.appendChild(kb.n); f.appendChild(kbl.n);
            /* orientação LUA */
            var nota = C.campo('Orientação extra para agentes LUA (opcional)', (x.ov && x.ov.lua && x.ov.lua.nota) || '', 600, 'Aparece só para quem escolheu a SAG LUA', 3); f.appendChild(nota.n);
            if (x.ov && x.ov.lua && Object.keys(x.ov.lua).some(function (q) { return q !== 'nota'; })) f.appendChild(el('p', 'ger-hint', 'Esta tratativa tem regras específicas da LUA (tipo de contato, destino…) que são mantidas como estão.'));
            /* fluxograma */
            var fg = el('fieldset', 'fx-fs'); fg.appendChild(el('legend', null, 'Fluxograma (imagem do passo a passo)'));
            var prev = el('div', 'fx-fc-prev'); fg.appendChild(prev);
            function prevPintar() { prev.textContent = ''; if (x.fc && x.fc.passos && x.fc.passos.length && FC()) { prev.appendChild(FC().desenhar(x.fc)); } else prev.appendChild(el('p', 'ger-hint', 'Sem fluxograma. Crie um para explicar o passo a passo visualmente.')); }
            prevPintar();
            var fa = el('div', 'dev-acoes dev-acoes--linha');
            fa.appendChild(btn(x.fc && x.fc.passos && x.fc.passos.length ? 'Editar fluxograma' : 'Criar fluxograma', 'workflow', function () { coletar(); formFluxograma(x, function () { formItem(x, idx); }); }));
            if (x.fc) fa.appendChild(btn('Remover', 'trash-2', function () { delete x.fc; prevPintar(); }));
            fg.appendChild(fa); f.appendChild(fg);
            function coletar() {
                x.m = m.get(); x.s = s.get(); x.t = t.get(); x.k = k.get(); x.c = c.get(); x.to = dcks.filter(function (d) { return d[1].get(); }).map(function (d) { return d[0]; }); x.tx = tx.get();
                if (x.k === 'ag') x.ag = ag.get(); else delete x.ag; if (x.k === 'ato') x.ato = at.get(); else delete x.ato;
                x.l = L.filter(function (p) { return String(p[1]).trim() || String(p[0]).trim(); }).map(function (p) { return [String(p[0]).trim(), String(p[1]).trim()]; });
                var u = kb.get(); if (u && urlOk(u)) x.kb = urlOk(u); else delete x.kb; if (kbl.get()) x.kbl = kbl.get(); else delete x.kbl;
                var nt = nota.get(); if (nt) { x.ov = x.ov || {}; x.ov.lua = x.ov.lua || {}; x.ov.lua.nota = nt; } else if (x.ov && x.ov.lua) { delete x.ov.lua.nota; if (!Object.keys(x.ov.lua).length) delete x.ov.lua; if (!Object.keys(x.ov).length) delete x.ov; }
            }
            var erro = el('p', 'ger-status ger-status--erro'); erro.hidden = true; f.appendChild(erro);
            var rod = el('div', 'dev-acoes dev-acoes--linha');
            rod.appendChild(btn('Salvar tratativa', 'check', function () {
                coletar(); if (!x.t) { erro.textContent = 'Dê um título para a tratativa.'; erro.hidden = false; return; }
                if (kb.get() && !urlOk(kb.get())) { erro.textContent = 'O link do Portal do conhecimento precisa começar com https://'; erro.hidden = false; return; }
                x.l = x.l.map(function (p) { if (/^Tipo de contato/i.test(p[0])) return [p[0], x.c || p[1]]; if (/^Para quem/i.test(p[0]) && x.tx) return [p[0], x.tx]; return p; });
                if (!x.sec) x.sec = x.s; if (idx < 0) W.itens.push(x); else W.itens[idx] = x; delete x.ar;
                C.fecharModal(); mudou(); desenhar();
            }, 'btn btn--primary btn--sm'));
            rod.appendChild(btn('Cancelar', 'x', function () { C.fecharModal(); })); f.appendChild(rod);
            C.abrirModal(novo || idx < 0 ? 'Nova tratativa' : 'Editar tratativa', 'pencil', f, true);
        }

        /* ================= FLUXOGRAMA ================= */
        function formFluxograma(x, voltar) {
            var d = FC() ? FC().limpo(x.fc) : { titulo: '', passos: [] };
            if (!d.passos.length) { d.titulo = d.titulo || x.t || ''; d.passos = [{ tipo: 'inicio', t: 'Início do atendimento' }, { tipo: 'passo', t: '' }, { tipo: 'fim', t: 'Fim' }]; }
            var f = el('div', 'cm-form fx-form'), tt = C.campo('Título do fluxograma', d.titulo, 90, 'Ex.: Bagagem danificada'); f.appendChild(tt.n); tt.i.addEventListener('input', function () { d.titulo = tt.i.value; prev(); });
            f.appendChild(el('p', 'ger-hint', 'Monte o passo a passo de cima para baixo. Em uma decisão, o "Sim" segue para o próximo passo e o "Não" aparece como uma caixa ao lado. Qualquer texto pode ter um link (por exemplo, para o Portal do conhecimento).'));
            var lista = el('div', 'fx-passos'), pv = el('div', 'fx-fc-prev'); f.appendChild(lista); 
            var TIPOS_FC = [['inicio', 'Início'], ['passo', 'Passo'], ['decisao', 'Decisão (Sim / Não)'], ['fim', 'Fim']];
            function prev() { pv.textContent = ''; pv.appendChild(FC().desenhar(d)); }
            function pintar() {
                lista.textContent = '';
                d.passos.forEach(function (p, i) {
                    var r = el('div', 'fx-passo fx-passo--' + p.tipo), cab = el('div', 'fx-passo-cab'), sel = el('select', 'login-input'); sel.setAttribute('aria-label', 'Tipo do passo ' + (i + 1));
                    TIPOS_FC.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === p.tipo) op.selected = true; sel.appendChild(op); });
                    sel.addEventListener('change', function () { p.tipo = sel.value; if (p.tipo !== 'decisao') delete p.nao; else p.nao = p.nao || { t: '' }; pintar(); prev(); });
                    cab.appendChild(el('span', 'fx-passo-n', String(i + 1))); cab.appendChild(sel);
                    var ac = el('span', 'fx-linha-ac'); ac.appendChild(ibtn('arrow-up', 'Subir', function () { if (mover(d.passos, i, -1)) { pintar(); prev(); } }, i === 0)); ac.appendChild(ibtn('arrow-down', 'Descer', function () { if (mover(d.passos, i, 1)) { pintar(); prev(); } }, i === d.passos.length - 1)); ac.appendChild(ibtn('trash-2', 'Remover passo', function () { d.passos.splice(i, 1); pintar(); prev(); })); cab.appendChild(ac); r.appendChild(cab);
                    var tx = el('textarea', 'login-input cm-area'); tx.rows = 2; tx.maxLength = 220; tx.placeholder = p.tipo === 'decisao' ? 'Pergunta (ex.: O voo foi doméstico?)' : 'O que o agente faz neste passo'; tx.value = p.t || ''; tx.setAttribute('aria-label', 'Texto do passo ' + (i + 1)); tx.addEventListener('input', function () { p.t = tx.value; prev(); }); r.appendChild(tx);
                    var ur = el('input', 'login-input'); ur.type = 'url'; ur.placeholder = 'Link (opcional), ex.: Portal do conhecimento'; ur.value = p.url || ''; ur.setAttribute('aria-label', 'Link do passo ' + (i + 1)); ur.addEventListener('input', function () { if (ur.value.trim()) p.url = ur.value.trim(); else delete p.url; prev(); }); r.appendChild(ur);
                    if (p.tipo === 'decisao') {
                        p.nao = p.nao || { t: '' }; var bx = el('div', 'fx-nao'); bx.appendChild(el('strong', null, 'Se a resposta for NÃO:'));
                        var nt = el('textarea', 'login-input cm-area'); nt.rows = 2; nt.maxLength = 220; nt.placeholder = 'O que fazer (ex.: Orientar a abrir reclamação pelo site)'; nt.value = p.nao.t || ''; nt.addEventListener('input', function () { p.nao.t = nt.value; prev(); }); bx.appendChild(nt);
                        var nu = el('input', 'login-input'); nu.type = 'url'; nu.placeholder = 'Link (opcional)'; nu.value = p.nao.url || ''; nu.addEventListener('input', function () { if (nu.value.trim()) p.nao.url = nu.value.trim(); else delete p.nao.url; prev(); }); bx.appendChild(nu);
                        var nf = C.caixa('Termina aqui (caixa de fim)', p.nao.fim); nf.n.querySelector('input').addEventListener('change', function (e) { p.nao.fim = e.target.checked; prev(); }); bx.appendChild(nf.n); r.appendChild(bx);
                    }
                    lista.appendChild(r);
                });
            }
            f.appendChild(btn('Adicionar passo', 'plus', function () { d.passos.push({ tipo: 'passo', t: '' }); pintar(); prev(); }));
            f.appendChild(el('h4', 'fx-prev-tit', 'Como vai ficar')); f.appendChild(pv); pintar(); prev();
            var rod = el('div', 'dev-acoes dev-acoes--linha');
            rod.appendChild(btn('Baixar imagem (PNG)', 'download', function () { FC().baixarPng(FC().limpo(d)).catch(function () { window.alert('Não foi possível gerar a imagem.'); }); }));
            rod.appendChild(btn('Usar este fluxograma', 'check', function () { var l = FC().limpo(d); if (l.passos.length) x.fc = l; else delete x.fc; voltar(); }, 'btn btn--primary btn--sm'));
            rod.appendChild(btn('Cancelar', 'x', function () { voltar(); })); f.appendChild(rod);
            C.abrirModal('Fluxograma do passo a passo', 'workflow', f, true);
        }

        /* ================= SAGs ================= */
        function abaSags() {
            var tb = el('div', 'fx-tool'); tb.appendChild(el('p', 'ger-hint fx-grow', 'SAGs são as equipes que aparecem no passo 1 do fluxo (LUA, HVC, Suporte, Dream Teams…).')); tb.appendChild(btn('Nova SAG', 'plus', function () { formSag(null, -1); }, 'btn btn--primary btn--sm')); corpo.appendChild(tb);
            var lista = el('div', 'fx-lista');
            W.sags.forEach(function (s, i) {
                var row = el('div', 'fx-row'), info = el('div', 'fx-info'), t = el('strong'); t.appendChild(ic(s.icone || 'users', true)); t.appendChild(document.createTextNode(' ' + s.nome)); info.appendChild(t);
                var tags = el('span', 'fx-tags'); tags.appendChild(el('span', 'fx-tag', (TIPO_SAG.filter(function (z) { return z[0] === s.tipo; })[0] || ['', s.tipo || ''])[1])); if (s.principal) tags.appendChild(el('span', 'fx-tag fx-tag--ok', 'Principal')); info.appendChild(tags); row.appendChild(info);
                var ac = el('span', 'fx-row-ac'); ac.appendChild(ibtn('arrow-up', 'Subir', function () { if (mover(W.sags, i, -1)) { mudou(); desenhar(); } }, i === 0)); ac.appendChild(ibtn('arrow-down', 'Descer', function () { if (mover(W.sags, i, 1)) { mudou(); desenhar(); } }, i === W.sags.length - 1));
                ac.appendChild(ibtn('pencil', 'Editar', function () { formSag(clone(s), i); }));
                ac.appendChild(ibtn('trash-2', 'Excluir', function () {
                    var uso = W.itens.filter(function (it) { return (it.to || []).indexOf(s.id) >= 0; }).length;
                    if (!window.confirm('Excluir a SAG "' + s.nome + '"?' + (uso ? ' Ela será retirada de ' + uso + ' tratativa(s) que a usam como destino.' : ''))) return;
                    W.itens.forEach(function (it) { it.to = (it.to || []).filter(function (z) { return z !== s.id; }); }); W.sags.splice(i, 1); mudou(); desenhar();
                }));
                row.appendChild(ac); lista.appendChild(row);
            }); corpo.appendChild(lista);
        }
        function formSag(x, idx) {
            var novo = !x; if (novo) x = { id: '', nome: '', icone: 'users', tipo: 'equipe', meta: '', mat: [] };
            var f = el('div', 'cm-form fx-form'), nm = C.campo('Nome da SAG', x.nome, 60, 'Ex.: DT Reembolsos'), ico = C.seletorIcone('Ícone', x.icone || 'users'), tp = C.seletor('Tipo', TIPO_SAG, x.tipo || 'equipe'), pr = C.caixa('SAG principal (destaque no passo 1)', x.principal);
            var meta = C.campo('Descrição curta (aparece no botão)', x.meta, 200, 'O que esta equipe faz', 3);
            f.appendChild(nm.n); f.appendChild(ico.n); f.appendChild(tp.n); f.appendChild(pr.n); f.appendChild(meta.n);
            var fs = el('fieldset', 'fx-fs'); fs.appendChild(el('legend', null, 'Matrizes que esta SAG trata')); var cks = W.mats.map(function (m) { var cb = C.caixa(m.nome, (x.mat || []).indexOf(m.id) >= 0); fs.appendChild(cb.n); return [m.id, cb]; }); f.appendChild(fs);
            var erro = el('p', 'ger-status ger-status--erro'); erro.hidden = true; f.appendChild(erro);
            var rod = el('div', 'dev-acoes dev-acoes--linha');
            rod.appendChild(btn('Salvar SAG', 'check', function () {
                if (!nm.get()) { erro.textContent = 'Dê um nome para a SAG.'; erro.hidden = false; return; }
                var usados = {}; W.sags.forEach(function (z) { usados[z.id] = 1; }); if (novo) x.id = slug(nm.get(), usados);
                x.nome = nm.get(); x.icone = (ico.get ? ico.get() : '') || 'users'; x.tipo = tp.get(); x.meta = meta.get(); if (pr.get()) x.principal = true; else delete x.principal;
                x.mat = cks.filter(function (c) { return c[1].get(); }).map(function (c) { return c[0]; }); if (!x.mat.length) delete x.mat;
                if (idx < 0) W.sags.push(x); else W.sags[idx] = x; C.fecharModal(); mudou(); desenhar();
            }, 'btn btn--primary btn--sm')); rod.appendChild(btn('Cancelar', 'x', function () { C.fecharModal(); })); f.appendChild(rod);
            C.abrirModal(novo ? 'Nova SAG' : 'Editar SAG', 'users', f, true);
        }

        /* ================= MATRIZES E REGRAS ================= */
        function abaMatrizes() {
            var tb = el('div', 'fx-tool'); tb.appendChild(el('p', 'ger-hint fx-grow', 'Matrizes são os conjuntos de regras. Cada uma tem um nome e as regras que aparecem em "Regras da matriz".')); tb.appendChild(btn('Nova matriz', 'plus', function () { formMatriz(null, -1); }, 'btn btn--primary btn--sm')); corpo.appendChild(tb);
            var lista = el('div', 'fx-lista');
            W.mats.forEach(function (m, i) {
                var uso = W.itens.filter(function (it) { return it.m === m.id; }).length, row = el('div', 'fx-row'), info = el('div', 'fx-info'); info.appendChild(el('strong', null, m.nome)); info.appendChild(el('span', 'fx-sub', uso + ' tratativa(s) · ' + (m.regras || []).length + ' regra(s)')); row.appendChild(info);
                var ac = el('span', 'fx-row-ac'); ac.appendChild(ibtn('pencil', 'Editar nome e regras', function () { formMatriz(clone(m), i); }));
                ac.appendChild(ibtn('trash-2', 'Excluir', function () { if (uso) return window.alert('Esta matriz ainda tem ' + uso + ' tratativa(s). Mova ou exclua essas tratativas antes.'); if (!window.confirm('Excluir a matriz "' + m.nome + '"?')) return; W.sags.forEach(function (s) { if (s.mat) s.mat = s.mat.filter(function (z) { return z !== m.id; }); }); W.mats.splice(i, 1); mudou(); desenhar(); }));
                row.appendChild(ac); lista.appendChild(row);
            }); corpo.appendChild(lista);
        }
        function formMatriz(x, idx) {
            var novo = !x; if (novo) x = { id: '', nome: '', regras: [] };
            var f = el('div', 'cm-form fx-form'), nm = C.campo('Nome da matriz', x.nome, 80, 'Ex.: Matriz DT Reembolsos'); f.appendChild(nm.n);
            var R = (x.regras || []).slice(), box = el('div', 'fx-linhas'); f.appendChild(el('p', 'ger-hint', 'Regras (uma por caixa). Use [texto](https://…) para colocar um link.'));
            function pintar() {
                box.textContent = ''; R.forEach(function (r, i) {
                    var l = el('div', 'fx-linha'), ta = el('textarea', 'login-input cm-area'); ta.rows = 2; ta.maxLength = 800; ta.value = r; ta.setAttribute('aria-label', 'Regra ' + (i + 1)); ta.addEventListener('input', function () { R[i] = ta.value; });
                    var ac = el('div', 'fx-linha-ac'); ac.appendChild(ibtn('arrow-up', 'Subir', function () { if (mover(R, i, -1)) pintar(); }, i === 0)); ac.appendChild(ibtn('arrow-down', 'Descer', function () { if (mover(R, i, 1)) pintar(); }, i === R.length - 1)); ac.appendChild(ibtn('trash-2', 'Remover regra', function () { R.splice(i, 1); pintar(); }));
                    l.appendChild(ta); l.appendChild(ac); box.appendChild(l);
                });
            }
            f.appendChild(box); f.appendChild(btn('Adicionar regra', 'plus', function () { R.push(''); pintar(); })); pintar();
            var erro = el('p', 'ger-status ger-status--erro'); erro.hidden = true; f.appendChild(erro);
            var rod = el('div', 'dev-acoes dev-acoes--linha');
            rod.appendChild(btn('Salvar matriz', 'check', function () {
                if (!nm.get()) { erro.textContent = 'Dê um nome para a matriz.'; erro.hidden = false; return; }
                var usados = {}; W.mats.forEach(function (z) { usados[z.id] = 1; }); if (novo) x.id = slug(nm.get(), usados);
                x.nome = nm.get(); x.regras = R.map(function (r) { return String(r).trim(); }).filter(Boolean); if (idx < 0) W.mats.push(x); else W.mats[idx] = x; C.fecharModal(); mudou(); desenhar();
            }, 'btn btn--primary btn--sm')); rod.appendChild(btn('Cancelar', 'x', function () { C.fecharModal(); })); f.appendChild(rod);
            C.abrirModal(novo ? 'Nova matriz' : 'Editar matriz e regras', 'book-open', f, true);
        }

        /* ================= BACKUP ================= */
        function abaBackup() {
            corpo.appendChild(el('p', 'ger-hint', 'Cópia de segurança dos fluxos em arquivo. Serve para guardar uma versão ou levar para outro portal; no dia a dia, use as outras abas.'));
            var ac = el('div', 'dev-acoes dev-acoes--linha');
            ac.appendChild(btn('Baixar cópia dos fluxos', 'download', function () { api.baixar(api.nomeData('fluxos'), JSON.stringify(W, null, 1)); api.msg('Arquivo baixado.', true); }));
            var inp = el('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.hidden = true;
            inp.addEventListener('change', function () {
                var a = inp.files && inp.files[0]; if (!a) return; var r = new FileReader();
                r.onload = function () { var d; try { d = JSON.parse(String(r.result)); } catch (e) { return api.msg('O arquivo não é uma cópia de fluxos válida.', false); } var er = api.valido(d); if (er) return api.msg('Importação cancelada: ' + er, false); if (!window.confirm('Carregar este arquivo no editor? Ele substitui o rascunho atual (nada vale para os outros até você salvar).')) return; W = d; desenhar(); api.msg('Arquivo carregado no editor. Revise e use "Salvar para todos".', true); };
                r.readAsText(a); inp.value = '';
            });
            ac.appendChild(btn('Carregar de um arquivo', 'upload', function () { inp.click(); })); ac.appendChild(inp); corpo.appendChild(ac);
        }
        desenhar();
    }
    window.PortalFluxosEditor = { montar: montar };
})();
