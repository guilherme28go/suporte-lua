/* ==========================================================================
   FORMULÁRIOS E PLANILHAS — PARTE DE QUEM GERENCIA
   window.PortalFormsAdmin:
     respostas(host)   → respostas dos formulários (filtros, gráficos, status, exportação)  [administradores e desenvolvedores]
     planilhas(host, dev) → planilhas (grade editável, gráficos, importar/exportar)         [dev = pode mexer nas colunas]
     construtor(host)  → criar e editar formulários                                          [desenvolvedores]
   Quem pode ver/editar cada coisa é decidido pelo banco (RLS); a tela só esconde o que não vale a pena mostrar.
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore, G = window.PortalGraficos; if (!C || !G) return;
    var el = C.el;
    var STATUS = [['nova', 'Nova'], ['em_analise', 'Em análise'], ['concluida', 'Concluída'], ['bloqueada', 'Bloqueada'], ['descartada', 'Descartada']];
    var STATUS_COR = { nova: '#2563eb', em_analise: '#d97706', concluida: '#16a34a', bloqueada: '#dc2626', descartada: '#6b7280' };
    function stRot(v) { var s = STATUS.filter(function (x) { return x[0] === v; })[0]; return s ? s[1] : v; }
    function sb() { return C.sb(); }
    function um(d) { return Array.isArray(d) ? d[0] : d; }
    function msgBox(host) { var m = el('p', 'bk-msg'); m.hidden = true; m.setAttribute('role', 'status'); host.appendChild(m); return function (t, ok) { m.hidden = !t; m.textContent = t || ''; m.className = 'bk-msg ' + (ok ? 'bk-msg--ok' : 'bk-msg--err'); }; }
    function btn(txt, ic, fn, cls) { var b = el('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (ic) b.appendChild(C.icon(ic, true)); b.appendChild(el('span', null, txt)); b.addEventListener('click', fn); return b; }
    function erro(e) { return C.erroBanco ? C.erroBanco(e) : 'Erro: ' + ((e && e.message) || e); }
    function dataBr(s) { try { return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return s || ''; } }
    function baixar(nome, texto, mime) { var b = new Blob([texto], { type: mime || 'text/plain;charset=utf-8' }), a = el('a'); a.href = URL.createObjectURL(b); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
    function csvTexto(cab, linhas) {
        function q(v) { v = v == null ? '' : (Array.isArray(v) ? v.join(' | ') : String(v)); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
        return '﻿' + [cab.map(q).join(';')].concat(linhas.map(function (l) { return l.map(q).join(';'); })).join('\r\n');
    }
    function csvLer(t) {
        t = String(t).replace(/^﻿/, ''); var d = (t.split('\n')[0].match(/;/g) || []).length >= (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',', out = [], row = [], cur = '', q = false;
        if ((t.split('\n')[0].match(/\t/g) || []).length > 1) d = '\t';
        for (var i = 0; i < t.length; i++) { var ch = t[i];
            if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
            else if (ch === '"') q = true; else if (ch === d) { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
        if (cur !== '' || row.length) { row.push(cur); out.push(row); } return out.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
    }
    function slugar(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50); }
    function pedirArquivoTexto(aceita, cb) { var i = el('input'); i.type = 'file'; i.accept = aceita; i.addEventListener('change', function () { var f = i.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { cb(String(r.result), f.name); }; r.readAsText(f, 'utf-8'); }); i.click(); }
    function input(rot, val, cb, o) {
        o = o || {}; var d = el('div', 'lf' + (o.cheio ? ' lf--full' : '')), l = el('label', null, rot), i = o.longo ? el('textarea', 'login-input cm-area' + (o.mono ? ' dev-json' : '')) : el('input', 'login-input'), id = 'fa' + Math.random().toString(36).slice(2, 9);
        l.htmlFor = id; i.id = id; if (o.longo) i.rows = o.longo; else i.type = o.tipo || 'text'; if (o.ph) i.placeholder = o.ph; if (o.max) i.maxLength = o.max; if (val != null) i.value = val;
        i.addEventListener('input', function () { cb(i.value); }); d.appendChild(l); d.appendChild(i); return d;
    }
    function escolha(rot, ops, val, cb) {
        var d = el('div', 'lf'), l = el('label', null, rot), s = el('select', 'login-input'), id = 'fa' + Math.random().toString(36).slice(2, 9); l.htmlFor = id; s.id = id;
        ops.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === val) op.selected = true; s.appendChild(op); }); s.addEventListener('change', function () { cb(s.value); }); d.appendChild(l); d.appendChild(s); return d;
    }
    function marca(rot, val, cb) { var l = el('label', 'cm-check'), c = el('input'); c.type = 'checkbox'; c.checked = !!val; c.addEventListener('change', function () { cb(c.checked); }); l.appendChild(c); l.appendChild(el('span', null, rot)); return l; }

    /* ---------- bloco de análise: filtros + gráfico + visões salvas (serve para respostas e planilhas) ---------- */
    function analise(host, o) {
        var st = { filtros: { busca: '', itens: [] }, grafico: {}, visaoId: '' }, vis = [];
        var cats = o.campos.filter(function (c) { return c.tipo !== 'longo' && c.tipo !== 'link'; }); st.grafico = { tipo: 'barras', campo: cats[0] && cats[0].id, titulo: '' }; st.grafico.filtros = st.filtros;
        var barra = el('div', 'pf-visoes'), fHost = el('div'), gHost = el('div', 'pf-grafico'), eHost = el('details', 'pg-det'), eIn = el('div');
        eHost.appendChild(el('summary', null, 'Personalizar o gráfico')); eHost.appendChild(eIn);
        host.appendChild(barra); host.appendChild(fHost); host.appendChild(gHost); host.appendChild(eHost);
        var msg = msgBox(host);
        function linhasFiltradas() { return G.filtrar(o.getLinhas(), st.filtros, o.campos); }
        function pintar(cheio) {
            var ls = o.getLinhas(), fl = linhasFiltradas(); st.grafico.filtros = st.filtros; o.aoFiltrar(fl);
            G.desenhar(gHost, st.grafico, ls, o.campos);
            if (cheio) { G.editor(eIn, st.grafico, o.campos, ls, function (cfg, redesenhar) { st.grafico = cfg; st.grafico.filtros = st.filtros; if (redesenhar) G.editor(eIn, st.grafico, o.campos, o.getLinhas(), arguments.callee); pintar(false); }); }
        }
        function filtros(redesenhar) { G.filtrosUI(fHost, st.filtros, o.campos, o.getLinhas(), function (f, rebuild) { st.filtros = f; st.grafico.filtros = f; if (rebuild) filtros(); pintar(false); }); }
        function desenharBarra() {
            barra.textContent = ''; var s = el('select', 'login-input'), op0 = el('option', null, vis.length ? 'Visões salvas…' : 'Nenhuma visão salva'); op0.value = ''; s.appendChild(op0); s.setAttribute('aria-label', 'Visões salvas');
            vis.forEach(function (v) { var op = el('option', null, v.nome); op.value = v.id; if (v.id === st.visaoId) op.selected = true; s.appendChild(op); });
            s.addEventListener('change', function () { var v = vis.filter(function (x) { return x.id === s.value; })[0]; st.visaoId = s.value; if (!v) return; var cfg = JSON.parse(JSON.stringify(v.config || {})); st.filtros = G.normFiltros(cfg.filtros); cfg.filtros = st.filtros; st.grafico = cfg; filtros(); pintar(true); desenharBarra(); });
            barra.appendChild(s);
            var nome = el('input', 'login-input'); nome.type = 'text'; nome.maxLength = 120; nome.placeholder = 'Nome da visão'; nome.setAttribute('aria-label', 'Nome da visão'); var atual = vis.filter(function (x) { return x.id === st.visaoId; })[0]; if (atual) nome.value = atual.nome;
            barra.appendChild(nome);
            barra.appendChild(btn('Salvar visão', 'check', async function () {
                var n = nome.value.trim(); if (!n) return msg('Dê um nome para a visão.'); var cfg = JSON.parse(JSON.stringify(st.grafico)); cfg.filtros = JSON.parse(JSON.stringify(st.filtros)); msg('');
                var ex = vis.filter(function (x) { return x.nome === n; })[0], r = ex ? await sb().from('pf_visoes').update({ config: cfg }).eq('id', ex.id).select().single() : await sb().from('pf_visoes').insert({ escopo: o.escopo, ref_id: o.refId, nome: n, config: cfg }).select().single();
                if (r.error) return msg(erro(r.error)); await carregar(); st.visaoId = um(r.data).id; desenharBarra(); msg('Visão salva.', true);
            }, 'btn btn--primary btn--sm'));
            if (atual) barra.appendChild(btn('Excluir visão', 'trash-2', async function () { if (!confirm('Excluir a visão "' + atual.nome + '"?')) return; var r = await sb().from('pf_visoes').delete().eq('id', atual.id); if (r.error) return msg(erro(r.error)); st.visaoId = ''; await carregar(); desenharBarra(); }));
        }
        async function carregar() { var r = await sb().from('pf_visoes').select('id,nome,config').eq('escopo', o.escopo).eq('ref_id', o.refId).order('ordem').order('criado_em'); vis = r.data || []; }
        return carregar().then(function () { desenharBarra(); filtros(); pintar(true); return { atualizar: function () { filtros(); pintar(false); }, linhas: linhasFiltradas }; });
    }

    /* ---------- RESPOSTAS ---------- */
    function camposDoForm(def) {
        var out = []; ((def && def.secoes) || []).forEach(function (s) { s.campos.forEach(function (c) {
            if (c.tipo === 'nota') return; var t = c.tipo === 'lista' || c.tipo === 'escolha' || c.tipo === 'aceite' ? 'escolha' : (c.tipo === 'multipla' ? 'multipla' : (c.tipo === 'longo' || c.tipo === 'relatorio' ? 'longo' : (c.tipo === 'data' ? 'data' : (c.tipo === 'numero' ? 'numero' : (c.tipo === 'link' ? 'link' : 'texto')))));
            out.push({ id: c.id, rotulo: c.rotulo, tipo: t, orig: c.tipo, opcoes: (c.opcoes || []).map(function (x) { return { v: x.v }; }) }); }); });
        return out;
    }
    async function respostas(host) {
        host.textContent = ''; var msg = msgBox(host), nivel = C.nivel();
        var rf = await sb().from('pf_formularios').select('id,slug,titulo,definicao,papel_ver').order('ordem').order('titulo');
        if (rf.error) { host.appendChild(el('p', 'ger-msg', erro(rf.error))); return; }
        var forms = (rf.data || []).filter(function (f) { return nivel >= (f.papel_ver === 'desenvolvedor' ? 3 : 2); }); if (!forms.length) { host.appendChild(el('p', 'card-text', 'Ainda não há formulários que você possa ver.')); return; }
        var topo = el('div', 'pf-topo'), sel = el('select', 'login-input'); sel.setAttribute('aria-label', 'Formulário'); forms.forEach(function (f, i) { var o = el('option', null, f.titulo); o.value = f.id; sel.appendChild(o); }); topo.appendChild(sel); host.appendChild(topo);
        var corpo = el('div'); host.appendChild(corpo);
        sel.addEventListener('change', function () { abrir(forms.filter(function (f) { return f.id === sel.value; })[0]); });
        abrir(forms[0]);
        async function abrir(form) {
            corpo.textContent = ''; corpo.appendChild(el('p', 'card-text', 'Carregando respostas…'));
            var rr = await sb().from('pf_respostas').select('*').eq('form_id', form.id).order('criado_em', { ascending: false }).limit(3000), ra = await sb().from('pf_anexos').select('id,resposta_id,campo,nome,tipo,tamanho').in('resposta_id', (rr.data || []).map(function (x) { return x.id; }).slice(0, 500));
            corpo.textContent = ''; if (rr.error) { corpo.appendChild(el('p', 'ger-msg', erro(rr.error))); return; }
            var dados = rr.data || [], anexos = ra.data || [], campos = camposDoForm(form.definicao);
            var meta = [{ id: '__status', rotulo: 'Status', tipo: 'escolha', opcoes: STATUS.map(function (s) { return { v: s[1], cor: STATUS_COR[s[0]] }; }) }, { id: '__nome', rotulo: 'Quem enviou (nome)', tipo: 'texto' }, { id: '__bp', rotulo: 'Quem enviou (BP)', tipo: 'texto' }, { id: '__papel', rotulo: 'Papel de quem enviou', tipo: 'escolha' }, { id: '__atrib', rotulo: 'Atribuído a', tipo: 'texto' }, { id: '__criado', rotulo: 'Data do envio', tipo: 'data' }];
            var todos = meta.concat(campos);
            function linhaDe(r) { var l = Object.assign({}, r.dados); l.__status = stRot(r.status); l.__nome = r.nome || ''; l.__bp = r.bp || ''; l.__papel = r.papel || ''; l.__atrib = r.atribuido_a || ''; l.__criado = String(r.criado_em || '').slice(0, 10); l._r = r; return l; }
            var linhas = dados.map(linhaDe);
            var cab = el('div', 'pf-resumo'); STATUS.forEach(function (s) { var n = dados.filter(function (r) { return r.status === s[0]; }).length; var c = el('span', 'pf-pill'); c.style.setProperty('--c', STATUS_COR[s[0]]); c.textContent = s[1] + ': ' + n; cab.appendChild(c); }); corpo.appendChild(cab);
            var aHost = el('div'); corpo.appendChild(aHost); var tHost = el('div'); corpo.appendChild(tHost);
            var A = await analise(aHost, { campos: todos, getLinhas: function () { return linhas; }, escopo: 'form', refId: form.id, aoFiltrar: function (fl) { tabela(fl); } });
            function tabela(fl) {
                tHost.textContent = ''; var barra = el('div', 'pf-barra'); barra.appendChild(el('strong', null, fl.length + ' de ' + linhas.length + ' resposta(s)'));
                barra.appendChild(btn('Baixar CSV', 'download', function () { var cs = campos; baixar('respostas-' + form.slug + '.csv', csvTexto(['Data', 'Nome', 'BP', 'Papel', 'Status', 'Atribuído a', 'Nota'].concat(cs.map(function (c) { return c.rotulo; })), fl.map(function (l) { var r = l._r; return [dataBr(r.criado_em), r.nome, r.bp, r.papel, stRot(r.status), r.atribuido_a, r.nota].concat(cs.map(function (c) { return l[c.id]; })); })), 'text/csv;charset=utf-8'); }));
                barra.appendChild(btn('Baixar JSON', 'download', function () { baixar('respostas-' + form.slug + '.json', JSON.stringify(fl.map(function (l) { return l._r; }), null, 2), 'application/json'); })); tHost.appendChild(barra);
                var t = el('div', 'table-card dev-table'), tb = el('table', 'dir-table'), th = el('thead'), tr = el('tr'); ['Data', 'Quem', 'Status', 'Atribuído', 'Resumo', ''].forEach(function (x) { var h = el('th', null, x); h.scope = 'col'; tr.appendChild(h); }); th.appendChild(tr); tb.appendChild(th); var b = el('tbody');
                fl.slice(0, 300).forEach(function (l) { var r = l._r, row = el('tr'); [dataBr(r.criado_em), (r.nome || '—') + (r.bp ? ' (' + r.bp + ')' : ''), stRot(r.status), r.atribuido_a || '—'].forEach(function (x, i) { var td = el('td'); td.setAttribute('data-rot', ['Data', 'Quem', 'Status', 'Atribuído'][i]); if (i === 2) { var p = el('span', 'pf-pill', x); p.style.setProperty('--c', STATUS_COR[r.status]); td.appendChild(p); } else td.textContent = x; row.appendChild(td); });
                    var rs = el('td'); rs.setAttribute('data-rot', 'Resumo'); var txt = campos.filter(function (c) { return c.tipo !== 'longo' && l[c.id] != null; }).slice(0, 3).map(function (c) { return String(Array.isArray(l[c.id]) ? l[c.id].join(', ') : l[c.id]); }).join(' · '); rs.textContent = txt.length > 110 ? txt.slice(0, 107) + '…' : txt; row.appendChild(rs);
                    var ac = el('td'); ac.appendChild(btn('Abrir', 'search', function () { detalhe(l); })); row.appendChild(ac); b.appendChild(row); });
                tb.appendChild(b); t.appendChild(tb); tHost.appendChild(t); if (fl.length > 300) tHost.appendChild(el('p', 'ger-hint', 'Mostrando as 300 mais recentes. Use os filtros ou baixe o CSV para ver todas.'));
                if (!fl.length) tHost.appendChild(el('p', 'card-text', 'Nenhuma resposta com esses filtros.'));
            }
            function detalhe(l) {
                var r = l._r, box = el('div', 'pf-detalhe'), m = el('p', 'bk-msg'); m.hidden = true;
                box.appendChild(el('p', 'ger-hint', 'Enviado em ' + dataBr(r.criado_em) + ' por ' + (r.nome || '—') + (r.bp ? ' (BP ' + r.bp + ')' : '') + (r.papel ? ' · ' + r.papel : '')));
                var dl = el('dl', 'pf-dl'); campos.forEach(function (c) { var v = r.dados[c.id]; if (v == null || v === '') return; dl.appendChild(el('dt', null, c.rotulo)); var dd = el('dd');
                    if (c.orig === 'relatorio') { var pre = el('pre', 'pf-pre'); pre.textContent = v; dd.appendChild(pre); dd.appendChild(btn('Baixar .txt', 'download', function () { baixar(slugar(c.rotulo) + '-' + r.id.slice(0, 8) + '.txt', v); })); dd.appendChild(btn('Copiar', 'copy', function () { navigator.clipboard && navigator.clipboard.writeText(v); })); }
                    else if (c.tipo === 'link') { var a = el('a', null, v); a.href = /^https?:/i.test(v) ? v : '#'; a.target = '_blank'; a.rel = 'noopener noreferrer'; dd.appendChild(a); } else dd.textContent = Array.isArray(v) ? v.join(', ') : String(v);
                    dl.appendChild(dd); }); box.appendChild(dl);
                var an = anexos.filter(function (x) { return x.resposta_id === r.id; }); if (an.length) { box.appendChild(el('h4', null, 'Anexos')); an.forEach(function (x) { box.appendChild(btn(x.nome + ' (' + Math.max(1, Math.round(x.tamanho / 1024)) + ' KB)', 'download', async function () { var q = await sb().from('pf_anexos').select('conteudo').eq('id', x.id).single(); if (q.error) { m.textContent = erro(q.error); m.hidden = false; return; } var bin = atob(q.data.conteudo), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); var bl = new Blob([u], { type: x.tipo || 'application/octet-stream' }), a = el('a'); a.href = URL.createObjectURL(bl); a.download = x.nome; document.body.appendChild(a); a.click(); a.remove(); })); }); }
                var st = C.seletor('Status', STATUS, r.status), at = C.campo('Atribuído a (nome ou BP)', r.atribuido_a, 120, 'Quem vai cuidar disso'), nt = C.campo('Nota interna', r.nota, 3000, 'Visível só para quem gerencia', 4);
                box.appendChild(st.n); box.appendChild(at.n); box.appendChild(nt.n); box.appendChild(m);
                var ac = el('div', 'cm-acoes');
                ac.appendChild(btn('Salvar', 'check', async function () { var x = await sb().from('pf_respostas').update({ status: st.get(), atribuido_a: at.get(), nota: nt.get() }).eq('id', r.id).select().single(); if (x.error) { m.textContent = erro(x.error); m.hidden = false; return; } Object.assign(r, um(x.data)); dados.forEach(function (d, i) { if (d.id === r.id) dados[i] = r; }); linhas = dados.map(linhaDe); C.fecharModal(); A.atualizar(); C.toast('Resposta atualizada.'); }, 'btn btn--primary btn--sm'));
                var def = form.definicao || {};
                if (def.acao_promover && nivel >= 3 && r.bp) ac.appendChild(btn('Promover a administrador', 'key-round', async function () {
                    var digitado = r.dados.bp ? String(r.dados.bp) : ''; if (!confirm('Dar o papel de ADMINISTRADOR ao BP ' + r.bp + ' (' + (r.nome || '') + ')?' + (digitado && digitado !== r.bp ? '\n\nAtenção: o BP digitado no formulário (' + digitado + ') é diferente do BP da conta que enviou (' + r.bp + '). A promoção vale para a conta que enviou.' : ''))) return;
                    var x = await sb().rpc('definir_papel', { p_bp: r.bp, p_papel: 'administrador' }); if (x.error) { m.textContent = erro(x.error); m.hidden = false; return; }
                    await sb().from('pf_respostas').update({ status: 'concluida', nota: (nt.get() + '\nPromovido a administrador em ' + new Date().toLocaleDateString('pt-BR')).trim().slice(0, 3000) }).eq('id', r.id); C.fecharModal(); C.toast('BP ' + r.bp + ' agora é administrador.'); abrir(form);
                }));
                if (nivel >= 3) ac.appendChild(btn('Excluir resposta', 'trash-2', async function () { if (!confirm('Excluir esta resposta de forma definitiva?')) return; var x = await sb().from('pf_respostas').delete().eq('id', r.id); if (x.error) { m.textContent = erro(x.error); m.hidden = false; return; } C.fecharModal(); abrir(form); }));
                box.appendChild(ac); C.abrirModal('Resposta', 'list-checks', box, true);
            }
        }
    }

    /* ---------- PLANILHAS ---------- */
    var TIPOS_COL = [['texto', 'Texto'], ['longo', 'Texto longo'], ['numero', 'Número'], ['data', 'Data'], ['selecao', 'Seleção (com cores)'], ['link', 'Link'], ['caixa', 'Caixa (sim/não)']];
    function camposDaPlanilha(cols) { return cols.map(function (c) { return { id: c.id, rotulo: c.nome, tipo: c.tipo === 'caixa' ? 'escolha' : c.tipo, opcoes: c.opcoes || [] }; }); }
    function valorGrafico(cols, d) { var o = {}; cols.forEach(function (c) { var v = d[c.id]; o[c.id] = c.tipo === 'caixa' ? (v ? 'Sim' : 'Não') : v; }); return o; }
    async function planilhas(host, dev) {
        host.textContent = ''; var msg = msgBox(host), nivel = C.nivel(), ehDev = !!dev && nivel >= 3;
        var rp = await sb().from('pf_planilhas').select('*').order('ordem').order('nome'); if (rp.error) { host.appendChild(el('p', 'ger-msg', erro(rp.error))); return; }
        var lista = rp.data || [], topo = el('div', 'pf-topo'), sel = el('select', 'login-input'); sel.setAttribute('aria-label', 'Planilha');
        lista.forEach(function (p) { var o = el('option', null, p.nome); o.value = p.id; sel.appendChild(o); }); if (lista.length) topo.appendChild(sel);
        if (ehDev) topo.appendChild(btn('Nova planilha', 'plus', function () { novaPlanilha(); }, 'btn btn--primary btn--sm')); host.appendChild(topo);
        var corpo = el('div'); host.appendChild(corpo);
        if (!lista.length) { corpo.appendChild(el('p', 'card-text', ehDev ? 'Nenhuma planilha ainda. Crie a primeira.' : 'Nenhuma planilha disponível para o seu papel.')); }
        else { sel.addEventListener('change', function () { abrir(lista.filter(function (p) { return p.id === sel.value; })[0]); }); abrir(lista[0]); }
        function novaPlanilha() {
            var n = C.campo('Nome da planilha', '', 150, 'Ex.: Controle de bugs'), d = C.campo('Descrição', '', 1500, '', 3), m = el('p', 'bk-msg'), b = el('div'); m.hidden = true; b.appendChild(n.n); b.appendChild(d.n); b.appendChild(m);
            b.appendChild(btn('Criar planilha', 'plus', async function () { if (!n.get()) { m.textContent = 'Dê um nome.'; m.hidden = false; return; } var sl = slugar(n.get()) || 'planilha'; var x = await sb().from('pf_planilhas').insert({ slug: sl + '-' + Math.random().toString(36).slice(2, 5), nome: n.get(), descricao: d.get(), colunas: [{ id: 'titulo', nome: 'Título', tipo: 'texto' }, { id: 'status', nome: 'Status', tipo: 'selecao', opcoes: [{ v: 'A fazer', cor: '#6b7280' }, { v: 'Em andamento', cor: '#2563eb' }, { v: 'Feito', cor: '#16a34a' }] }] }).select().single(); if (x.error) { m.textContent = erro(x.error); m.hidden = false; return; } C.fecharModal(); planilhas(host, dev); }, 'btn btn--primary btn--sm'));
            C.abrirModal('Nova planilha', 'plus', b);
        }
        async function abrir(p) {
            corpo.textContent = ''; corpo.appendChild(el('p', 'card-text', 'Carregando…'));
            var rl = await sb().from('pf_planilha_linhas').select('id,dados,ordem').eq('planilha_id', p.id).order('ordem').limit(5000); corpo.textContent = ''; if (rl.error) { corpo.appendChild(el('p', 'ger-msg', erro(rl.error))); return; }
            var linhas = rl.data || [], cols = p.colunas || [], pode = nivel >= (p.papel_editar === 'desenvolvedor' ? 3 : 2), visiveis = linhas, limite = 100, m = msgBox(corpo);
            if (p.descricao) corpo.appendChild(el('p', 'card-text', p.descricao));
            var aHost = el('div'); corpo.appendChild(aHost); var gHost = el('div'); corpo.appendChild(gHost);
            var A = await analise(aHost, { campos: camposDaPlanilha(cols), getLinhas: function () { return linhas.map(function (l) { var o = valorGrafico(cols, l.dados); o._id = l.id; return o; }); }, escopo: 'planilha', refId: p.id, aoFiltrar: function (fl) { var ids = {}; fl.forEach(function (x) { ids[x._id] = 1; }); visiveis = linhas.filter(function (l) { return ids[l.id]; }); grade(); } });
            function grade() {
                gHost.textContent = ''; var barra = el('div', 'pf-barra'); barra.appendChild(el('strong', null, visiveis.length + ' de ' + linhas.length + ' linha(s)'));
                if (pode) barra.appendChild(btn('Adicionar linha', 'plus', async function () { var max = linhas.reduce(function (a, l) { return Math.max(a, Number(l.ordem) || 0); }, 0), x = await sb().from('pf_planilha_linhas').insert({ planilha_id: p.id, dados: {}, ordem: max + 1 }).select('id,dados,ordem').single(); if (x.error) return m(erro(x.error)); linhas.push(um(x.data)); A.atualizar(); }, 'btn btn--primary btn--sm'));
                barra.appendChild(btn('Baixar CSV', 'download', function () { baixar(p.slug + '.csv', csvTexto(cols.map(function (c) { return c.nome; }), visiveis.map(function (l) { return cols.map(function (c) { var v = l.dados[c.id]; return c.tipo === 'caixa' ? (v ? 'Sim' : 'Não') : v; }); })), 'text/csv;charset=utf-8'); }));
                if (pode) barra.appendChild(btn('Importar CSV', 'upload', function () { pedirArquivoTexto('.csv,.txt,.tsv', async function (t) { await importar(t); }); }));
                if (ehDev) { barra.appendChild(btn('Colunas', 'pencil', function () { editarColunas(); })); barra.appendChild(btn('Configurar', 'key-round', function () { configurar(); })); }
                gHost.appendChild(barra);
                var w = el('div', 'table-card dev-table pf-grade'), t = el('table', 'dir-table'), th = el('thead'), tr = el('tr'); cols.forEach(function (c) { var h = el('th', null, c.nome); h.scope = 'col'; tr.appendChild(h); }); if (pode) tr.appendChild(el('th')); th.appendChild(tr); t.appendChild(th); var tb = el('tbody');
                visiveis.slice(0, limite).forEach(function (l) { var row = el('tr'); cols.forEach(function (c) { var td = el('td'); td.setAttribute('data-rot', c.nome); td.appendChild(celula(l, c)); row.appendChild(td); });
                    if (pode) { var td = el('td'); var x = btn('', 'trash-2', async function () { if (!confirm('Excluir esta linha?')) return; var q = await sb().from('pf_planilha_linhas').delete().eq('id', l.id); if (q.error) return m(erro(q.error)); linhas = linhas.filter(function (z) { return z.id !== l.id; }); A.atualizar(); }, 'ger-ico-btn'); x.setAttribute('aria-label', 'Excluir linha'); x.title = 'Excluir linha'; td.appendChild(x); row.appendChild(td); }
                    tb.appendChild(row); });
                t.appendChild(tb); w.appendChild(t); gHost.appendChild(w); if (visiveis.length > limite) gHost.appendChild(btn('Mostrar mais 100', 'chevron-down', function () { limite += 100; grade(); }));
                if (!visiveis.length) gHost.appendChild(el('p', 'card-text', 'Nenhuma linha.'));
            }
            function pill(c, v) { var o = (c.opcoes || []).filter(function (x) { return x.v === v; })[0], s = el('span', 'pf-pill', v); s.style.setProperty('--c', (o && o.cor) || '#6b7280'); return s; }
            var filaSalvar = {};
            function salvar(l) { clearTimeout(filaSalvar[l.id]); filaSalvar[l.id] = setTimeout(async function () { var x = await sb().from('pf_planilha_linhas').update({ dados: l.dados }).eq('id', l.id); if (x.error) m(erro(x.error)); else m(''); A.atualizar && 0; }, 450); }
            function celula(l, c) {
                var v = l.dados[c.id];
                if (!pode) { if (c.tipo === 'selecao' && v) return pill(c, v); if (c.tipo === 'caixa') return document.createTextNode(v ? 'Sim' : 'Não'); if (c.tipo === 'link' && /^https?:/i.test(v || '')) { var a = el('a', null, v); a.href = v; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; } return document.createTextNode(v == null ? '' : String(v)); }
                var i; function set(nv) { if (nv === '' || nv == null || nv === false) delete l.dados[c.id]; else l.dados[c.id] = nv; salvar(l); }
                if (c.tipo === 'selecao') { i = el('select', 'login-input pf-cel'); var o0 = el('option', null, '—'); o0.value = ''; i.appendChild(o0); (c.opcoes || []).forEach(function (o) { var op = el('option', null, o.v); op.value = o.v; if (o.v === v) op.selected = true; i.appendChild(op); }); i.addEventListener('change', function () { set(i.value); A.atualizar(); }); }
                else if (c.tipo === 'caixa') { i = el('input'); i.type = 'checkbox'; i.checked = !!v; i.setAttribute('aria-label', c.nome); i.addEventListener('change', function () { set(i.checked); A.atualizar(); }); }
                else if (c.tipo === 'longo') { i = el('textarea', 'login-input pf-cel'); i.rows = 2; i.value = v || ''; i.addEventListener('input', function () { set(i.value); }); }
                else { i = el('input', 'login-input pf-cel'); i.type = c.tipo === 'numero' ? 'number' : (c.tipo === 'data' ? 'date' : (c.tipo === 'link' ? 'url' : 'text')); i.step = 'any'; i.value = v == null ? '' : v; i.addEventListener('input', function () { set(c.tipo === 'numero' && i.value !== '' ? Number(i.value) : i.value); }); i.addEventListener('change', function () { A.atualizar(); }); }
                if (c.tipo !== 'caixa') i.setAttribute('aria-label', c.nome); return i;
            }
            async function importar(texto) {
                var tab = csvLer(texto); if (tab.length < 2) return m('O arquivo não tem linhas de dados.'); var cab = tab[0].map(function (x) { return String(x).trim().toLowerCase(); }), mapa = cols.map(function (c) { return cab.indexOf(String(c.nome).toLowerCase()); });
                if (mapa.every(function (x) { return x < 0; })) return m('Nenhuma coluna do arquivo bate com as colunas da planilha (a primeira linha precisa ter os nomes das colunas).');
                var max = linhas.reduce(function (a, l) { return Math.max(a, Number(l.ordem) || 0); }, 0), novas = [], mudouCols = false;
                tab.slice(1).forEach(function (r, k) { var d = {}; cols.forEach(function (c, j) { var raw = mapa[j] >= 0 ? String(r[mapa[j]] == null ? '' : r[mapa[j]]).trim() : ''; if (raw === '') return;
                    if (c.tipo === 'numero') { var n = Number(raw.replace(/\./g, '').replace(',', '.')); if (isFinite(n)) d[c.id] = n; } else if (c.tipo === 'caixa') d[c.id] = /^(sim|s|true|1|x)$/i.test(raw); else if (c.tipo === 'data') { var mm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw); d[c.id] = mm ? mm[3] + '-' + ('0' + mm[2]).slice(-2) + '-' + ('0' + mm[1]).slice(-2) : raw.slice(0, 10); }
                    else { d[c.id] = raw; if (c.tipo === 'selecao' && ehDev && !(c.opcoes || []).some(function (o) { return o.v === raw; })) { (c.opcoes = c.opcoes || []).push({ v: raw, cor: '#6b7280' }); mudouCols = true; } } });
                    novas.push({ planilha_id: p.id, dados: d, ordem: max + k + 1 }); });
                if (!confirm('Importar ' + novas.length + ' linha(s) para "' + p.nome + '"?')) return;
                if (mudouCols) { var q = await sb().from('pf_planilhas').update({ colunas: cols }).eq('id', p.id); if (q.error) return m(erro(q.error)); }
                for (var i = 0; i < novas.length; i += 200) { var x = await sb().from('pf_planilha_linhas').insert(novas.slice(i, i + 200)).select('id,dados,ordem'); if (x.error) return m(erro(x.error)); linhas = linhas.concat(x.data); }
                m(novas.length + ' linha(s) importada(s).', true); A.atualizar();
            }
            function editarColunas() {
                var copia = JSON.parse(JSON.stringify(cols)), box = el('div'), lm = el('p', 'bk-msg'); lm.hidden = true;
                function pintar() { box.textContent = ''; copia.forEach(function (c, i) { var card = el('div', 'pf-col');
                    card.appendChild(input('Nome da coluna', c.nome, function (v) { c.nome = v; }, { max: 80 })); card.appendChild(escolha('Tipo', TIPOS_COL, c.tipo, function (v) { c.tipo = v; pintar(); }));
                    if (c.tipo === 'selecao') card.appendChild(input('Opções (uma por linha, no formato  texto | #cor)', (c.opcoes || []).map(function (o) { return o.v + (o.cor ? ' | ' + o.cor : ''); }).join('\n'), function (v) { c.opcoes = v.split('\n').map(function (s) { var a = s.split('|'); var t = a[0].trim(), cor = (a[1] || '').trim(); return t ? (/^#[0-9a-f]{6}$/i.test(cor) ? { v: t, cor: cor } : { v: t }) : null; }).filter(Boolean); }, { longo: 4, cheio: true, mono: true }));
                    var ac = el('div', 'cm-acoes'); if (i > 0) ac.appendChild(btn('Subir', 'chevron-up', function () { copia.splice(i - 1, 0, copia.splice(i, 1)[0]); pintar(); })); if (i < copia.length - 1) ac.appendChild(btn('Descer', 'chevron-down', function () { copia.splice(i + 1, 0, copia.splice(i, 1)[0]); pintar(); }));
                    ac.appendChild(btn('Remover coluna', 'trash-2', function () { if (confirm('Remover a coluna "' + c.nome + '"? Os dados dela continuam guardados nas linhas, mas deixam de aparecer.')) { copia.splice(i, 1); pintar(); } })); card.appendChild(ac); box.appendChild(card); });
                    box.appendChild(btn('Adicionar coluna', 'plus', function () { var n = 'col' + Date.now().toString(36); copia.push({ id: n, nome: 'Nova coluna', tipo: 'texto' }); pintar(); })); box.appendChild(lm);
                    box.appendChild(btn('Salvar colunas', 'check', async function () { if (copia.some(function (c) { return !String(c.nome || '').trim(); })) { lm.textContent = 'Toda coluna precisa de nome.'; lm.hidden = false; return; } var x = await sb().from('pf_planilhas').update({ colunas: copia }).eq('id', p.id).select().single(); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } Object.assign(p, um(x.data)); lista = lista.map(function (z) { return z.id === p.id ? p : z; }); C.fecharModal(); abrir(p); }, 'btn btn--primary btn--sm')); }
                pintar(); C.abrirModal('Colunas de "' + p.nome + '"', 'pencil', box, true);
            }
            function configurar() {
                var n = C.campo('Nome', p.nome, 150), d = C.campo('Descrição', p.descricao, 1500, '', 3), v = C.seletor('Quem pode VER', [['publico', 'Qualquer pessoa (inclusive sem login)'], ['agente', 'Agentes logados'], ['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], p.papel_ver), e = C.seletor('Quem pode EDITAR as linhas', [['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], p.papel_editar), lm = el('p', 'bk-msg'); lm.hidden = true;
                var b = el('div'); [n, d, v, e].forEach(function (x) { b.appendChild(x.n); }); b.appendChild(lm);
                b.appendChild(btn('Salvar', 'check', async function () { var x = await sb().from('pf_planilhas').update({ nome: n.get(), descricao: d.get(), papel_ver: v.get(), papel_editar: e.get() }).eq('id', p.id).select().single(); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } C.fecharModal(); planilhas(host, dev); }, 'btn btn--primary btn--sm'));
                b.appendChild(btn('Excluir planilha', 'trash-2', async function () { if (!confirm('Excluir a planilha "' + p.nome + '" com todas as linhas e visões?')) return; var x = await sb().from('pf_planilhas').delete().eq('id', p.id); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } await sb().from('pf_visoes').delete().eq('escopo', 'planilha').eq('ref_id', p.id); C.fecharModal(); planilhas(host, dev); }));
                C.abrirModal('Configurar planilha', 'key-round', b);
            }
        }
    }

    /* ---------- CONSTRUTOR DE FORMULÁRIOS (desenvolvedores) ---------- */
    var TIPOS_CAMPO = [['texto', 'Resposta curta'], ['longo', 'Parágrafo'], ['escolha', 'Múltipla escolha (uma)'], ['lista', 'Lista suspensa'], ['multipla', 'Caixas de seleção (várias)'], ['data', 'Data'], ['numero', 'Número'], ['link', 'Link (https)'], ['email', 'E-mail'], ['arquivo', 'Anexar arquivo'], ['relatorio', 'Relatório (texto técnico)'], ['aceite', 'Aceite (sim/não)'], ['nota', 'Só um texto explicativo']];
    var AUTOS = [['', 'Não preencher sozinho'], ['nome', 'Nome de quem está logado'], ['bp', 'BP de quem está logado'], ['epr', 'EPR de quem está logado']];
    function modelo() { return { secoes: [{ id: 's1', titulo: 'Seção 1', descricao: '', depois: null, campos: [{ id: 'c1', tipo: 'texto', rotulo: 'Nova pergunta', obrigatorio: false }] }] }; }
    function proxId(lista, p) { var n = lista.length + 1; while (lista.indexOf(p + n) >= 0) n++; return p + n; }
    async function construtor(host) {
        host.textContent = ''; var msg = msgBox(host);
        var r = await sb().from('pf_formularios').select('*').order('ordem').order('titulo'); if (r.error) { host.appendChild(el('p', 'ger-msg', erro(r.error))); return; }
        var forms = r.data || []; var topo = el('div', 'pf-topo'); topo.appendChild(btn('Novo formulário', 'plus', function () { editar(null); }, 'btn btn--primary btn--sm')); host.appendChild(topo);
        var t = el('div', 'table-card dev-table'), tb = el('table', 'dir-table'), th = el('thead'), tr = el('tr'); ['Formulário', 'Endereço interno', 'Quem vê as respostas', 'Estado', ''].forEach(function (x) { var h = el('th', null, x); h.scope = 'col'; tr.appendChild(h); }); th.appendChild(tr); tb.appendChild(th); var b = el('tbody');
        forms.forEach(function (f) { var row = el('tr'); [f.titulo, '#form/' + f.slug, f.papel_ver === 'desenvolvedor' ? 'Só desenvolvedores' : 'Administradores e desenvolvedores', (f.ativo ? 'Ativo' : 'Desativado') + (f.publico ? ' · sem login' : ' · só com login')].forEach(function (x, i) { var td = el('td', null, x); td.setAttribute('data-rot', ['Formulário', 'Endereço', 'Respostas', 'Estado'][i]); row.appendChild(td); });
            var ac = el('td'), w = el('div', 'cm-acoes'); w.appendChild(btn('Editar', 'pencil', function () { editar(f); })); w.appendChild(btn('Testar', 'search', function () { if (window.PortalForms) window.PortalForms.abrir(f.slug); })); w.appendChild(btn('Duplicar', 'copy', async function () { var c = Object.assign({}, f); delete c.id; delete c.criado_em; delete c.atualizado_em; delete c.atualizado_por; c.slug = (f.slug + '-copia').slice(0, 50) + '-' + Math.random().toString(36).slice(2, 4); c.titulo = (f.titulo + ' (cópia)').slice(0, 150); c.ativo = false; var x = await sb().from('pf_formularios').insert(c); if (x.error) return msg(erro(x.error)); construtor(host); }));
            w.appendChild(btn('Excluir', 'trash-2', async function () { if (!confirm('Excluir o formulário "' + f.titulo + '" e TODAS as respostas dele? Não dá para desfazer.')) return; var x = await sb().from('pf_formularios').delete().eq('id', f.id); if (x.error) return msg(erro(x.error)); construtor(host); })); ac.appendChild(w); row.appendChild(ac); b.appendChild(row); });
        tb.appendChild(b); t.appendChild(tb); host.appendChild(t); if (!forms.length) host.appendChild(el('p', 'card-text', 'Nenhum formulário criado.'));
        host.appendChild(el('p', 'ger-hint', 'Para colocar um formulário em qualquer botão ou card do portal, use o link  #form/endereço  (ex.: #form/compartilhar-ideias).'));

        function editar(f) {
            var novo = !f, w = f ? JSON.parse(JSON.stringify(f)) : { slug: '', titulo: '', descricao: '', definicao: modelo(), publico: false, ativo: true, papel_ver: 'administrador', msg_sucesso: 'Resposta enviada! Obrigado.', ordem: 100 };
            var def = w.definicao; if (!def.secoes) def = w.definicao = modelo(); var box = el('div', 'pf-builder'), lm = el('p', 'bk-msg'); lm.hidden = true;
            function pintar() {
                box.textContent = ''; var g = el('div', 'cm-grid');
                g.appendChild(input('Título do formulário', w.titulo, function (v) { w.titulo = v; if (novo && !w._slugEditado) { w.slug = slugar(v); } }, { max: 150, cheio: true }));
                if (novo) g.appendChild(input('Endereço (letras minúsculas, números e -)', w.slug, function (v) { w.slug = slugar(v); w._slugEditado = true; }, { max: 58, ph: 'ex.: pedido-de-equipamento' }));
                g.appendChild(input('Descrição (aparece no começo)', w.descricao, function (v) { w.descricao = v; }, { longo: 3, max: 1500, cheio: true }));
                g.appendChild(input('Mensagem depois de enviar', w.msg_sucesso, function (v) { w.msg_sucesso = v; }, { max: 600, cheio: true }));
                g.appendChild(escolha('Quem vê as respostas', [['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], w.papel_ver, function (v) { w.papel_ver = v; }));
                box.appendChild(g); var ck = el('div', 'cm-checks'); ck.appendChild(marca('Formulário ativo (aparece para responder)', w.ativo, function (v) { w.ativo = v; })); ck.appendChild(marca('Permitir resposta SEM login (não recomendado)', w.publico, function (v) { w.publico = v; })); ck.appendChild(marca('Mostrar o botão "Promover a administrador" nas respostas', !!def.acao_promover, function (v) { def.acao_promover = v ? true : undefined; })); box.appendChild(ck);
                var ids = def.secoes.map(function (s) { return s.id; });
                def.secoes.forEach(function (s, si) { var sc = el('fieldset', 'pf-sec-ed'); sc.appendChild(el('legend', null, 'Seção ' + (si + 1) + ' (' + s.id + ')'));
                    sc.appendChild(input('Título da seção', s.titulo, function (v) { s.titulo = v; }, { max: 150 })); sc.appendChild(input('Texto da seção', s.descricao, function (v) { s.descricao = v; }, { longo: 2, max: 1500, cheio: true }));
                    sc.appendChild(escolha('Depois desta seção ir para', [['', 'A próxima seção (ordem normal)'], ['fim', 'Enviar o formulário']].concat(def.secoes.filter(function (z) { return z.id !== s.id; }).map(function (z) { return [z.id, 'Seção: ' + z.titulo]; })), s.depois || '', function (v) { s.depois = v || null; }));
                    s.campos.forEach(function (c, ci) { var cd = el('div', 'pf-campo-ed'); cd.appendChild(input('Pergunta', c.rotulo, function (v) { c.rotulo = v; }, { max: 300, cheio: true })); cd.appendChild(escolha('Tipo', TIPOS_CAMPO, c.tipo, function (v) { c.tipo = v; if (/^(escolha|lista|multipla|aceite)$/.test(v) && !(c.opcoes || []).length) c.opcoes = v === 'aceite' ? [{ v: 'Sim, aceito' }] : [{ v: 'Opção 1' }, { v: 'Opção 2' }]; pintar(); }));
                        cd.appendChild(input('Ajuda (texto pequeno abaixo da pergunta)', c.ajuda || '', function (v) { c.ajuda = v || undefined; }, { max: 500, cheio: true }));
                        if (/^(escolha|lista|multipla|aceite)$/.test(c.tipo)) cd.appendChild(input('Opções (uma por linha' + (/^(escolha|lista)$/.test(c.tipo) ? '. Para pular de seção: Opção -> ' + ids.join(' / ') + ' / fim' : '') + ')', (c.opcoes || []).map(function (o) { return o.v + (o.ir ? ' -> ' + o.ir : ''); }).join('\n'), function (v) { c.opcoes = v.split('\n').map(function (l) { var a = l.split('->'); var t = a[0].trim(), ir = (a[1] || '').trim(); return t ? (ir ? { v: t, ir: ir } : { v: t }) : null; }).filter(Boolean); }, { longo: 4, cheio: true, mono: true }));
                        cd.appendChild(escolha('Preencher sozinho com os dados de quem está logado', AUTOS, c.auto || '', function (v) { c.auto = v || undefined; }));
                        cd.appendChild(escolha('Validação', [['', 'Nenhuma'], ['numeros', 'Só números (BP, SAG…)']], c.validacao || '', function (v) { c.validacao = v || undefined; }));
                        cd.appendChild(input('Grupo "preencha um OU outro" (mesmo nome nos campos do grupo)', c.ou || '', function (v) { c.ou = v.trim() || undefined; }, { max: 30 }));
                        cd.appendChild(marca('Resposta obrigatória', c.obrigatorio, function (v) { c.obrigatorio = !!v; }));
                        var ac = el('div', 'cm-acoes'); if (ci > 0) ac.appendChild(btn('Subir', 'chevron-up', function () { s.campos.splice(ci - 1, 0, s.campos.splice(ci, 1)[0]); pintar(); })); if (ci < s.campos.length - 1) ac.appendChild(btn('Descer', 'chevron-down', function () { s.campos.splice(ci + 1, 0, s.campos.splice(ci, 1)[0]); pintar(); }));
                        ac.appendChild(btn('Remover pergunta', 'trash-2', function () { s.campos.splice(ci, 1); pintar(); })); cd.appendChild(ac); sc.appendChild(cd); });
                    var ac2 = el('div', 'cm-acoes'); ac2.appendChild(btn('Adicionar pergunta', 'plus', function () { var todos = []; def.secoes.forEach(function (z) { z.campos.forEach(function (c) { todos.push(c.id); }); }); s.campos.push({ id: proxId(todos, 'c'), tipo: 'texto', rotulo: 'Nova pergunta', obrigatorio: false }); pintar(); }));
                    if (si > 0) ac2.appendChild(btn('Subir seção', 'chevron-up', function () { def.secoes.splice(si - 1, 0, def.secoes.splice(si, 1)[0]); pintar(); })); if (si < def.secoes.length - 1) ac2.appendChild(btn('Descer seção', 'chevron-down', function () { def.secoes.splice(si + 1, 0, def.secoes.splice(si, 1)[0]); pintar(); }));
                    if (def.secoes.length > 1) ac2.appendChild(btn('Remover seção', 'trash-2', function () { if (confirm('Remover esta seção com todas as perguntas?')) { def.secoes.splice(si, 1); pintar(); } })); sc.appendChild(ac2); box.appendChild(sc); });
                box.appendChild(btn('Adicionar seção', 'plus', function () { var n = proxId(def.secoes.map(function (s) { return s.id; }), 's'), todos = []; def.secoes.forEach(function (z) { z.campos.forEach(function (c) { todos.push(c.id); }); }); def.secoes.push({ id: n, titulo: 'Seção ' + (def.secoes.length + 1), descricao: '', depois: null, campos: [{ id: proxId(todos, 'c'), tipo: 'texto', rotulo: 'Nova pergunta', obrigatorio: false }] }); pintar(); }));
                box.appendChild(lm);
                box.appendChild(btn(novo ? 'Criar formulário' : 'Salvar formulário', 'check', async function () {
                    lm.hidden = true; var er = ''; if (!w.titulo.trim()) er = 'Dê um título ao formulário.'; else if (!/^[a-z0-9][a-z0-9-]{1,58}$/.test(w.slug || '')) er = 'O endereço precisa ter de 2 a 59 letras minúsculas, números ou "-".';
                    var ids2 = def.secoes.map(function (s) { return s.id; }), vistos = {};
                    def.secoes.forEach(function (s) { if (!s.campos.length) er = er || 'A seção "' + s.titulo + '" não tem perguntas.'; if (s.depois && s.depois !== 'fim' && ids2.indexOf(s.depois) < 0) er = er || 'Salto inválido em "' + s.titulo + '".'; s.campos.forEach(function (c) { if (!String(c.rotulo || '').trim()) er = er || 'Há uma pergunta sem texto.'; if (vistos[c.id]) er = er || 'Pergunta repetida (' + c.id + ').'; vistos[c.id] = 1; if (/^(escolha|lista|multipla)$/.test(c.tipo) && !(c.opcoes || []).length) er = er || 'A pergunta "' + c.rotulo + '" precisa de opções.'; (c.opcoes || []).forEach(function (o) { if (o.ir && o.ir !== 'fim' && ids2.indexOf(o.ir) < 0) er = er || 'Salto "' + o.ir + '" não existe (pergunta "' + c.rotulo + '").'; }); }); });
                    if (er) { lm.textContent = er; lm.hidden = false; return; }
                    var corpo = { titulo: w.titulo.trim(), descricao: w.descricao || '', definicao: JSON.parse(JSON.stringify(def)), publico: !!w.publico, ativo: !!w.ativo, papel_ver: w.papel_ver, msg_sucesso: w.msg_sucesso || 'Resposta enviada! Obrigado.' };
                    var x = novo ? await sb().from('pf_formularios').insert(Object.assign({ slug: w.slug }, corpo)).select().single() : await sb().from('pf_formularios').update(corpo).eq('id', f.id).select().single();
                    if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } C.fecharModal(); C.toast('Formulário salvo.'); construtor(host);
                }, 'btn btn--primary btn--sm'));
            }
            pintar(); C.abrirModal(novo ? 'Novo formulário' : 'Editar formulário', 'list-checks', box, true);
        }
    }

    /* ---------- Painel da Gerência (administradores e desenvolvedores) ---------- */
    function montarGerencia() {
        var raiz = document.getElementById('gerFormRoot'); if (!raiz) return; var nivel = C.nivel(); if (raiz.getAttribute('data-nivel') === String(nivel)) return; raiz.setAttribute('data-nivel', String(nivel)); raiz.textContent = '';
        if (nivel < 2) { raiz.hidden = true; return; } raiz.hidden = false;
        var tit = el('h3', 'ger-sub-titulo', 'Formulários e planilhas'); raiz.appendChild(tit);
        var nav = el('div', 'dev-nav dev-nav--sub'); nav.setAttribute('role', 'tablist'); var corpo = el('div', 'dev-body'); raiz.appendChild(nav); raiz.appendChild(corpo);
        var abas = [['resp', 'Respostas', 'list-checks', function () { return respostas(corpo); }], ['plan', 'Planilhas', 'layers', function () { return planilhas(corpo, false); }]], atual = 'resp';
        function pintar() { nav.textContent = ''; abas.forEach(function (a) { var b = el('button', 'dev-nav-btn' + (a[0] === atual ? ' is-on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', a[0] === atual ? 'true' : 'false'); b.appendChild(C.icon(a[2], true)); b.appendChild(el('span', null, a[1])); b.addEventListener('click', function () { atual = a[0]; pintar(); }); nav.appendChild(b); }); corpo.textContent = ''; abas.filter(function (a) { return a[0] === atual; })[0][3]().catch(function (e) { corpo.appendChild(el('p', 'ger-msg', erro(e))); }); }
        pintar();
    }
    document.addEventListener('portal:conteudo', montarGerencia); document.addEventListener('suporteLua:auth', function () { var r = document.getElementById('gerFormRoot'); if (r) r.removeAttribute('data-nivel'); setTimeout(montarGerencia, 600); }); setTimeout(montarGerencia, 800);

    window.PortalFormsAdmin = { respostas: respostas, planilhas: planilhas, construtor: construtor };
})();
