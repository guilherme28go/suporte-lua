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
    var BUCKET = 'spl-arquivos';
    function nomeSeguro(n) { var t = String(n || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+/, '').slice(-120); return t || 'arquivo'; }
    function novoUuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
    function salvarBlob(bl, nome) { var a = el('a'); a.href = URL.createObjectURL(bl); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
    /* Baixa um anexo: do bucket (link assinado de 60 s) ou, se ainda for antigo, do conteúdo salvo na tabela. */
    async function baixarAnexo(x, m) {
        function falha(t) { if (m) { m.textContent = t; m.hidden = false; } else C.toast(t); }
        if (x.caminho) {
            var u = await sb().storage.from(BUCKET).createSignedUrl(x.caminho, 60, { download: x.nome || true });
            if (u.error || !u.data || !u.data.signedUrl) { falha('Não consegui abrir o arquivo no bucket: ' + ((u.error && u.error.message) || 'sem permissão.')); return; }
            var a = el('a'); a.href = u.data.signedUrl; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); return;
        }
        var q = await sb().from('pf_anexos').select('conteudo').eq('id', x.id).single(); if (q.error) { falha(erro(q.error)); return; }
        var d = um(q.data), bin = atob(d.conteudo), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        salvarBlob(new Blob([u8], { type: x.tipo || 'application/octet-stream' }), x.nome);
    }
    /* Leva os anexos antigos (base64 na tabela) para o bucket, um por vez. Só desenvolvedor. */
    async function migrarAnexosAntigos(aviso) {
        var feitos = 0, falhas = 0, ignorar = [];
        for (;;) {
            var q = sb().from('pf_anexos').select('id,nome,tipo,conteudo').is('caminho', null).limit(1);
            ignorar.forEach(function (id) { q = q.neq('id', id); });
            var r = await q; if (r.error) { aviso('Parou: ' + erro(r.error)); return { feitos: feitos, falhas: falhas }; }
            var a = (r.data || [])[0]; if (!a || !a.conteudo) break;
            aviso('Migrando ' + (feitos + falhas + 1) + '… ' + a.nome);
            try {
                var bin = atob(a.conteudo), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
                var cam = 'anexos/' + novoUuid() + '/' + nomeSeguro(a.nome);
                var up = await sb().storage.from(BUCKET).upload(cam, new Blob([u8], { type: a.tipo || 'application/octet-stream' }), { contentType: a.tipo || 'application/octet-stream', upsert: false }); if (up.error) throw up.error;
                var ud = await sb().from('pf_anexos').update({ caminho: cam, conteudo: null }).eq('id', a.id).select('id'); if (ud.error || !(ud.data || []).length) { await sb().storage.from(BUCKET).remove([cam]); throw ud.error || new Error('sem permissão para atualizar'); }
                feitos++;
            } catch (e) { falhas++; ignorar.push(a.id); }
        }
        return { feitos: feitos, falhas: falhas };
    }
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
        if (nivel >= 3) sb().from('pf_anexos').select('id').is('caminho', null).limit(1).then(function (q) {
            if (q.error || !(q.data || []).length) return;
            var av = el('p', 'bk-msg'); av.hidden = true; av.setAttribute('role', 'status');
            var bm = btn('Migrar anexos antigos para o bucket', 'upload', async function () {
                if (!confirm('Existem anexos antigos guardados dentro do banco. Levar todos para o bucket "' + BUCKET + '"?\n\nIsso pode demorar um pouco. Não feche a página.')) return;
                bm.disabled = true; av.hidden = false; av.className = 'bk-msg bk-msg--ok';
                var r = await migrarAnexosAntigos(function (t) { av.textContent = t; });
                av.textContent = r.feitos + ' anexo(s) migrado(s)' + (r.falhas ? ' · ' + r.falhas + ' falharam (tente de novo)' : '.'); av.className = 'bk-msg ' + (r.falhas ? 'bk-msg--err' : 'bk-msg--ok'); bm.disabled = !!r.falhas ? false : true; if (!r.falhas) bm.hidden = true;
            }); topo.appendChild(bm); host.appendChild(av);
        });
        var corpo = el('div'); host.appendChild(corpo);
        sel.addEventListener('change', function () { abrir(forms.filter(function (f) { return f.id === sel.value; })[0]); });
        abrir(forms[0]);
        async function abrir(form) {
            corpo.textContent = ''; if (window.PortalSkeleton) { var SK = window.PortalSkeleton; corpo.appendChild(SK.resumo(5)); corpo.appendChild(SK.grafico()); corpo.appendChild(SK.barra(3)); corpo.appendChild(SK.tabela(5, 6)); } else corpo.appendChild(el('p', 'card-text', 'Carregando respostas…'));
            var rr = await sb().from('pf_respostas').select('*').eq('form_id', form.id).order('criado_em', { ascending: false }).limit(3000), ra = await sb().from('pf_anexos').select('id,resposta_id,campo,nome,tipo,tamanho,caminho').in('resposta_id', (rr.data || []).map(function (x) { return x.id; }).slice(0, 500));
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
                var r = l._r, box = el('div', 'pf-detalhe pf-corpo'), m = el('p', 'bk-msg'); m.hidden = true;
                box.appendChild(el('p', 'ger-hint', 'Enviado em ' + dataBr(r.criado_em) + ' por ' + (r.nome || '—') + (r.bp ? ' (BP ' + r.bp + ')' : '') + (r.papel ? ' · ' + r.papel : '')));
                var dl = el('dl', 'pf-dl'); campos.forEach(function (c) { var v = r.dados[c.id]; if (v == null || v === '') return; dl.appendChild(el('dt', null, c.rotulo)); var dd = el('dd');
                    if (c.orig === 'relatorio') { var pre = el('pre', 'pf-pre'); pre.textContent = v; dd.appendChild(pre); dd.appendChild(btn('Baixar .txt', 'download', function () { baixar(slugar(c.rotulo) + '-' + r.id.slice(0, 8) + '.txt', v); })); dd.appendChild(btn('Copiar', 'copy', function () { navigator.clipboard && navigator.clipboard.writeText(v); })); }
                    else if (c.tipo === 'link') { var a = el('a', null, v); a.href = /^https?:/i.test(v) ? v : '#'; a.target = '_blank'; a.rel = 'noopener noreferrer'; dd.appendChild(a); } else dd.textContent = Array.isArray(v) ? v.join(', ') : String(v);
                    dl.appendChild(dd); }); box.appendChild(dl);
                var an = anexos.filter(function (x) { return x.resposta_id === r.id; }); if (an.length) { box.appendChild(el('h4', null, 'Anexos')); an.forEach(function (x) { box.appendChild(btn(x.nome + ' (' + Math.max(1, Math.round(x.tamanho / 1024)) + ' KB)', 'download', async function () { await baixarAnexo(x, m); })); }); }
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
                if (nivel >= 3) ac.appendChild(btn('Excluir resposta', 'trash-2', async function () { if (!confirm('Excluir esta resposta de forma definitiva?' + (an.some(function (z) { return z.caminho; }) ? '\n\nOs arquivos anexados também serão apagados do bucket.' : ''))) return; var cams = an.filter(function (z) { return z.caminho; }).map(function (z) { return z.caminho; }); if (cams.length) { var rm = await sb().storage.from(BUCKET).remove(cams); if (rm.error) { m.textContent = 'Não consegui apagar os arquivos do bucket: ' + (rm.error.message || ''); m.hidden = false; return; } } var x = await sb().from('pf_respostas').delete().eq('id', r.id); if (x.error) { m.textContent = erro(x.error); m.hidden = false; return; } C.fecharModal(); abrir(form); }));
                box.appendChild(ac); C.abrirModal('Resposta', 'list-checks', box, true);
            }
        }
    }

    /* ---------- PLANILHAS ---------- */
    var TIPOS_COL = [['texto', 'Texto'], ['longo', 'Texto longo'], ['numero', 'Número'], ['moeda', 'Moeda'], ['percentual', 'Percentual'], ['data', 'Data'], ['selecao', 'Seleção (uma opção, com cores)'], ['multipla', 'Seleção múltipla (etiquetas)'], ['link', 'Link'], ['email', 'E-mail'], ['caixa', 'Caixa (sim/não)'], ['avaliacao', 'Avaliação (estrelas)'], ['progresso', 'Progresso (0 a 100%)']];
    var NUM = { numero: 1, moeda: 1, percentual: 1, avaliacao: 1, progresso: 1 };
    var OPS_REGRA = [['igual', 'é igual a'], ['diferente', 'é diferente de'], ['contem', 'contém'], ['maior', 'é maior que'], ['menor', 'é menor que'], ['vazio', 'está vazio'], ['preenchido', 'está preenchido'], ['passou', 'é uma data que já passou'], ['futuro', 'é uma data futura']];
    var CFG_PADRAO = { densidade: 'compacta', zebra: true, quebrar: false, congelar: false, numerar: false, linhas_pag: 100, cor_cabecalho: '', agrupar: '', ordenar: null, regras: [] };
    function tipoGraf(c) { return NUM[c.tipo] ? 'numero' : (c.tipo === 'caixa' ? 'escolha' : (c.tipo === 'email' ? 'texto' : c.tipo)); }
    function camposDaPlanilha(cols) { return cols.map(function (c) { return { id: c.id, rotulo: c.nome, tipo: tipoGraf(c), opcoes: c.opcoes || [] }; }); }
    function valorGrafico(cols, d) { var o = {}; cols.forEach(function (c) { var v = d[c.id]; o[c.id] = c.tipo === 'caixa' ? (v ? 'Sim' : 'Não') : v; }); return o; }
    function fmtNum(n, casas, milhar) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas, useGrouping: milhar !== false }); }
    function fmtData(v, f) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v); if (!m) return String(v); if (f === 'iso') return m[1] + '-' + m[2] + '-' + m[3];
        if (f === 'longo') return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
        return f === 'curto' ? m[3] + '/' + m[2] : m[3] + '/' + m[2] + '/' + m[1];
    }
    function fmtValor(c, v) {
        if (v == null || v === '') return '';
        switch (c.tipo) {
            case 'numero': return (c.prefixo || '') + fmtNum(v, c.casas != null && c.casas !== '' ? +c.casas : (Number.isInteger(+v) ? 0 : 2), c.milhar) + (c.sufixo || '');
            case 'moeda': try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: c.moeda || 'BRL' }).format(v); } catch (e) { return String(v); }
            case 'percentual': return fmtNum(v, c.casas != null && c.casas !== '' ? +c.casas : 0) + '%';
            case 'progresso': return fmtNum(v, 0) + '%';
            case 'avaliacao': var mx = +c.max || 5, k = Math.max(0, Math.min(mx, Math.round(v))); return '★'.repeat(k) + '☆'.repeat(mx - k);
            case 'data': return fmtData(v, c.formato);
            case 'caixa': return v ? 'Sim' : 'Não';
            case 'multipla': return Array.isArray(v) ? v.join(', ') : String(v);
            default: return String(v);
        }
    }
    function vazioV(v) { return v == null || v === '' || v === false || (Array.isArray(v) && !v.length); }
    function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function regraBate(r, v) {
        var s = vazioV(v) ? '' : (Array.isArray(v) ? v.join(' ') : String(v)).toLowerCase(), alvo = String(r.valor == null ? '' : r.valor).toLowerCase(), n = Number(String(v).replace(',', '.')), a = Number(String(r.valor).replace(',', '.'));
        switch (r.op) {
            case 'igual': return s === alvo; case 'diferente': return s !== alvo; case 'contem': return alvo !== '' && s.indexOf(alvo) >= 0;
            case 'maior': return s !== '' && isFinite(n) && isFinite(a) && n > a; case 'menor': return s !== '' && isFinite(n) && isFinite(a) && n < a;
            case 'vazio': return s === ''; case 'preenchido': return s !== '';
            case 'passou': return /^\d{4}-\d{2}-\d{2}/.test(s) && s.slice(0, 10) < hojeIso(); case 'futuro': return /^\d{4}-\d{2}-\d{2}/.test(s) && s.slice(0, 10) > hojeIso();
        } return false;
    }
    function chaveOrdem(c, v) { if (vazioV(v)) return null; if (NUM[c.tipo]) return Number(v); if (c.tipo === 'caixa') return v ? 1 : 0; if (Array.isArray(v)) return v.join(', ').toLowerCase(); return String(v).toLowerCase(); }
    function comparar(c, dir) { return function (x, y) { var a = chaveOrdem(c, x.dados[c.id]), b = chaveOrdem(c, y.dados[c.id]); if (a === null && b === null) return 0; if (a === null) return 1; if (b === null) return -1; var r = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR', { numeric: true }); return dir === 'desc' ? -r : r; }; }
    function totalDe(c, linhas) {
        var f = c.total; if (!f) return ''; var vs = linhas.map(function (l) { return l.dados[c.id]; }), pre = vs.filter(function (v) { return !vazioV(v); }), ns = pre.map(Number).filter(function (n) { return isFinite(n); });
        if (f === 'contar') return fmtNum(pre.length, 0); if (f === 'vazios') return fmtNum(vs.length - pre.length, 0); if (!ns.length) return '';
        var r = f === 'soma' ? ns.reduce(function (a, b) { return a + b; }, 0) : f === 'media' ? ns.reduce(function (a, b) { return a + b; }, 0) / ns.length : f === 'min' ? Math.min.apply(null, ns) : Math.max.apply(null, ns);
        var cc = NUM[c.tipo] ? c : { tipo: 'numero' }; return fmtValor(f === 'media' && cc.tipo === 'numero' ? Object.assign({}, c, { tipo: 'numero', casas: c.casas != null && c.casas !== '' ? c.casas : 2 }) : cc, r);
    }
    function prefsLer(slug) { try { return JSON.parse(localStorage.getItem('pfPlan_' + slug) || '{}') || {}; } catch (e) { return {}; } }
    function prefsGravar(slug, o) { try { localStorage.setItem('pfPlan_' + slug, JSON.stringify(o)); } catch (e) { /* sem armazenamento */ } }

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
            var n = C.campo('Nome da planilha', '', 150, 'Ex.: Controle de bugs'), d = C.campo('Descrição', '', 1500, '', 3), m = el('p', 'bk-msg'), b = el('div', 'pf-corpo'); m.hidden = true; b.appendChild(n.n); b.appendChild(d.n); b.appendChild(m);
            b.appendChild(btn('Criar planilha', 'plus', async function () { if (!n.get()) { m.textContent = 'Dê um nome.'; m.hidden = false; return; } var sl = slugar(n.get()) || 'planilha'; var x = await sb().from('pf_planilhas').insert({ slug: sl + '-' + Math.random().toString(36).slice(2, 5), nome: n.get(), descricao: d.get(), colunas: [{ id: 'titulo', nome: 'Título', tipo: 'texto' }, { id: 'status', nome: 'Status', tipo: 'selecao', opcoes: [{ v: 'A fazer', cor: '#6b7280' }, { v: 'Em andamento', cor: '#2563eb' }, { v: 'Feito', cor: '#16a34a' }] }] }).select().single(); if (x.error) { m.textContent = erro(x.error); m.hidden = false; return; } C.fecharModal(); planilhas(host, dev); }, 'btn btn--primary btn--sm'));
            C.abrirModal('Nova planilha', 'plus', b);
        }
        async function abrir(p) {
            corpo.textContent = ''; if (window.PortalSkeleton) { var SK2 = window.PortalSkeleton; corpo.appendChild(SK2.grafico()); corpo.appendChild(SK2.barra(5)); corpo.appendChild(SK2.tabela(6, 9)); } else corpo.appendChild(el('p', 'card-text', 'Carregando…'));
            var rl = await sb().from('pf_planilha_linhas').select('id,dados,ordem').eq('planilha_id', p.id).order('ordem').limit(5000); corpo.textContent = ''; if (rl.error) { corpo.appendChild(el('p', 'ger-msg', erro(rl.error))); return; }
            var linhas = rl.data || [], cols = p.colunas || [], pode = nivel >= (p.papel_editar === 'desenvolvedor' ? 3 : 2), visiveis = linhas, limite = 0, m = msgBox(corpo), cfg = Object.assign({}, CFG_PADRAO, p.config || {}), pref = prefsLer(p.slug), timer = null;
            if (p.descricao) corpo.appendChild(el('p', 'card-text', p.descricao));
            var aHost = el('div'); corpo.appendChild(aHost); var gHost = el('div', 'pf-planilha'); corpo.appendChild(gHost);
            var A = await analise(aHost, { campos: camposDaPlanilha(cols), getLinhas: function () { return linhas.map(function (l) { var o = valorGrafico(cols, l.dados); o._id = l.id; return o; }); }, escopo: 'planilha', refId: p.id, aoFiltrar: function (fl) { var ids = {}; fl.forEach(function (x) { ids[x._id] = 1; }); visiveis = linhas.filter(function (l) { return ids[l.id]; }); grade(); } });
            function depois() { clearTimeout(timer); timer = setTimeout(function () { A.atualizar(); }, 700); }
            function ocultas() { return pref.ocultas || cols.filter(function (c) { return c.oculta; }).map(function (c) { return c.id; }); }
            function ordemAtual() { return pref.ord !== undefined ? pref.ord : cfg.ordenar; }
            function grade() {
                var af = document.activeElement, chave = af && af.closest && gHost.contains(af) && af.closest('[data-k]') ? af.closest('[data-k]').getAttribute('data-k') : null;
                gHost.textContent = ''; if (!limite) limite = +cfg.linhas_pag || 100;
                var barra = el('div', 'pf-barra'); barra.appendChild(el('strong', null, visiveis.length + ' de ' + linhas.length + ' linha(s)'));
                if (pode) barra.appendChild(btn('Adicionar linha', 'plus', async function () { var max = linhas.reduce(function (a, l) { return Math.max(a, Number(l.ordem) || 0); }, 0), d = {}; cols.forEach(function (c) { if (c.padrao != null && c.padrao !== '') d[c.id] = c.tipo === 'caixa' ? /^(sim|true|1)$/i.test(String(c.padrao)) : (NUM[c.tipo] ? Number(c.padrao) : c.padrao); }); var x = await sb().from('pf_planilha_linhas').insert({ planilha_id: p.id, dados: d, ordem: max + 1 }).select('id,dados,ordem').single(); if (x.error) return m(erro(x.error)); linhas.push(um(x.data)); A.atualizar(); }, 'btn btn--primary btn--sm'));
                var oc = ocultas(), men = el('details', 'pf-menu'), sm = el('summary', 'btn btn--outline btn--sm'); sm.appendChild(C.icon('layers', true)); sm.appendChild(el('span', null, 'Exibir')); men.appendChild(sm);
                var pn = el('div', 'pf-menu-box'); pn.appendChild(el('strong', null, 'Colunas visíveis'));
                cols.forEach(function (c) { var l = el('label', 'cm-check'), k = el('input'); k.type = 'checkbox'; k.checked = oc.indexOf(c.id) < 0; k.addEventListener('change', function () { var o = ocultas().filter(function (x) { return x !== c.id; }); if (!k.checked) o.push(c.id); pref.ocultas = o; prefsGravar(p.slug, pref); grade(); men.open = true; }); l.appendChild(k); l.appendChild(el('span', null, c.nome)); pn.appendChild(l); });
                var ds = escolha('Tamanho das linhas', [['compacta', 'Compacta'], ['normal', 'Normal'], ['ampla', 'Ampla']], pref.dens || cfg.densidade, function (v) { pref.dens = v; prefsGravar(p.slug, pref); grade(); men.open = true; }); pn.appendChild(ds);
                pn.appendChild(btn('Voltar ao padrão da planilha', 'history', function () { pref = {}; prefsGravar(p.slug, pref); grade(); })); men.appendChild(pn); barra.appendChild(men);
                barra.appendChild(btn('Baixar CSV', 'download', function () { var cv = cols.filter(function (c) { return oc.indexOf(c.id) < 0; }); baixar(p.slug + '.csv', csvTexto(cv.map(function (c) { return c.nome; }), visiveis.map(function (l) { return cv.map(function (c) { var v = l.dados[c.id]; return c.tipo === 'caixa' ? (v ? 'Sim' : 'Não') : v; }); })), 'text/csv;charset=utf-8'); }));
                if (pode) barra.appendChild(btn('Importar CSV', 'upload', function () { pedirArquivoTexto('.csv,.txt,.tsv', async function (t) { await importar(t); }); }));
                if (ehDev) { barra.appendChild(btn('Colunas', 'pencil', function () { editarColunas(); })); barra.appendChild(btn('Aparência', 'sparkles', function () { aparencia(); })); barra.appendChild(btn('Configurar', 'key-round', function () { configurar(); })); }
                gHost.appendChild(barra);
                /* ordenação e agrupamento */
                var vc = cols.filter(function (c) { return oc.indexOf(c.id) < 0; }), ord = ordemAtual(), lista2 = visiveis.slice(), gcol = cols.filter(function (c) { return c.id === cfg.agrupar; })[0];
                var cmps = []; if (gcol) cmps.push(comparar(gcol, 'asc')); var oc2 = ord && cols.filter(function (c) { return c.id === ord.col; })[0]; if (oc2) cmps.push(comparar(oc2, ord.dir));
                if (cmps.length) lista2.sort(function (x, y) { for (var i = 0; i < cmps.length; i++) { var r = cmps[i](x, y); if (r) return r; } return 0; });
                var dens = pref.dens || cfg.densidade, w = el('div', 'table-card dev-table pf-grade pf-d-' + dens + (cfg.zebra ? ' pf-zebra' : '') + (cfg.quebrar ? ' pf-wrap' : '') + (cfg.congelar ? ' pf-frozen' : '')), t = el('table', 'dir-table');
                if (cfg.cor_cabecalho) w.style.setProperty('--pf-cab', cfg.cor_cabecalho);
                var th = el('thead'), tr = el('tr'); if (cfg.numerar) tr.appendChild(el('th', 'pf-num', '#'));
                vc.forEach(function (c) { var h = el('th'); h.scope = 'col'; if (c.largura) { h.style.width = c.largura + 'px'; h.style.minWidth = c.largura + 'px'; } if (c.alinhar) h.style.textAlign = c.alinhar === 'centro' ? 'center' : (c.alinhar === 'dir' ? 'right' : 'left'); if (c.ajuda) h.title = c.ajuda;
                    var b2 = el('button', 'pf-th'); b2.type = 'button'; b2.appendChild(el('span', null, c.nome)); var on = ord && ord.col === c.id; b2.appendChild(el('span', 'pf-seta', on ? (ord.dir === 'desc' ? '▼' : '▲') : '↕')); h.setAttribute('aria-sort', on ? (ord.dir === 'desc' ? 'descending' : 'ascending') : 'none'); b2.setAttribute('aria-label', 'Ordenar por ' + c.nome);
                    b2.addEventListener('click', function () { var nv = !on ? { col: c.id, dir: 'asc' } : (ord.dir === 'asc' ? { col: c.id, dir: 'desc' } : null); pref.ord = nv; prefsGravar(p.slug, pref); grade(); }); h.appendChild(b2); tr.appendChild(h); });
                if (pode) tr.appendChild(el('th')); th.appendChild(tr); t.appendChild(th); var tb = el('tbody'), ultimoGrupo = null, mostrados = 0;
                lista2.slice(0, limite).forEach(function (l, idx) {
                    if (gcol) { var gv = fmtValor(gcol, l.dados[gcol.id]) || '(vazio)'; if (gv !== ultimoGrupo) { ultimoGrupo = gv; var gr = el('tr', 'pf-grupo'), gd = el('td'); gd.colSpan = vc.length + (pode ? 1 : 0) + (cfg.numerar ? 1 : 0); gd.appendChild(el('strong', null, gcol.nome + ': ' + gv)); gd.appendChild(el('span', null, ' · ' + lista2.filter(function (z) { return (fmtValor(gcol, z.dados[gcol.id]) || '(vazio)') === gv; }).length + ' linha(s)')); gr.appendChild(gd); tb.appendChild(gr); } }
                    var row = el('tr'); mostrados++;
                    (cfg.regras || []).forEach(function (r) { var c = cols.filter(function (z) { return z.id === r.col; })[0]; if (c && r.alvo === 'linha' && regraBate(r, l.dados[c.id])) row.style.setProperty('--pf-linha', r.cor); });
                    if (cfg.numerar) row.appendChild(el('td', 'pf-num', String(idx + 1)));
                    vc.forEach(function (c) { var td = el('td'); td.setAttribute('data-rot', c.nome); td.setAttribute('data-k', l.id + ':' + c.id); if (c.alinhar) td.style.textAlign = c.alinhar === 'centro' ? 'center' : (c.alinhar === 'dir' ? 'right' : 'left');
                        (cfg.regras || []).forEach(function (r) { if (r.col === c.id && r.alvo !== 'linha' && regraBate(r, l.dados[c.id])) { td.style.background = 'color-mix(in srgb, ' + r.cor + ' 22%, #fff)'; td.style.boxShadow = 'inset 3px 0 0 ' + r.cor; } });
                        td.appendChild(celula(l, c)); row.appendChild(td); });
                    if (pode) { var td = el('td', 'pf-acao'); var x = btn('', 'trash-2', async function () { if (!confirm('Excluir esta linha?')) return; var q = await sb().from('pf_planilha_linhas').delete().eq('id', l.id); if (q.error) return m(erro(q.error)); linhas = linhas.filter(function (z) { return z.id !== l.id; }); A.atualizar(); }, 'ger-ico-btn'); x.setAttribute('aria-label', 'Excluir linha'); x.title = 'Excluir linha'; td.appendChild(x); row.appendChild(td); }
                    tb.appendChild(row); });
                t.appendChild(tb);
                if (vc.some(function (c) { return c.total; })) { var tf = el('tfoot'), fr = el('tr'); if (cfg.numerar) fr.appendChild(el('td')); vc.forEach(function (c) { var td = el('td', 'pf-total', totalDe(c, visiveis)); if (c.total) td.title = ({ soma: 'Soma', media: 'Média', contar: 'Preenchidos', min: 'Menor', max: 'Maior', vazios: 'Vazios' })[c.total]; fr.appendChild(td); }); if (pode) fr.appendChild(el('td')); tf.appendChild(fr); t.appendChild(tf); }
                w.appendChild(t); gHost.appendChild(w);
                if (lista2.length > limite) gHost.appendChild(btn('Mostrar mais ' + (+cfg.linhas_pag || 100), 'chevron-down', function () { limite += (+cfg.linhas_pag || 100); grade(); }));
                if (!visiveis.length) gHost.appendChild(el('p', 'card-text', 'Nenhuma linha.'));
                if (chave) { var alvo = gHost.querySelector('[data-k="' + chave.replace(/"/g, '') + '"] input, [data-k="' + chave.replace(/"/g, '') + '"] select, [data-k="' + chave.replace(/"/g, '') + '"] textarea'); if (alvo) { try { alvo.focus({ preventScroll: true }); } catch (e) { /* ignora */ } } }
            }
            function pill(c, v) { var o = (c.opcoes || []).filter(function (x) { return x.v === v; })[0], s = el('span', 'pf-pill', v); s.style.setProperty('--c', (o && o.cor) || '#6b7280'); return s; }
            var filaSalvar = {};
            function salvar(l) { clearTimeout(filaSalvar[l.id]); filaSalvar[l.id] = setTimeout(async function () { var x = await sb().from('pf_planilha_linhas').update({ dados: l.dados }).eq('id', l.id); if (x.error) m(erro(x.error)); else m(''); }, 450); }
            function celula(l, c) {
                var v = l.dados[c.id], edita = pode && !c.somente_leitura;
                if (!edita) {
                    if (c.tipo === 'selecao' && v) return pill(c, v);
                    if (c.tipo === 'multipla' && Array.isArray(v)) { var w = el('span', 'pf-tags'); v.forEach(function (x) { w.appendChild(pill(c, x)); }); return w; }
                    if (c.tipo === 'link' && /^https?:/i.test(v || '')) { var a = el('a', null, v); a.href = v; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
                    if (c.tipo === 'email' && v) { var ae = el('a', null, v); ae.href = 'mailto:' + v; return ae; }
                    if (c.tipo === 'progresso' && v != null) return barra(v);
                    if (c.tipo === 'avaliacao' && v) { var s = el('span', 'pf-estrelas', fmtValor(c, v)); s.title = v + ' de ' + (+c.max || 5); return s; }
                    return document.createTextNode(fmtValor(c, v));
                }
                var i; function set(nv) { if (vazioV(nv)) delete l.dados[c.id]; else l.dados[c.id] = nv; salvar(l); }
                if (c.tipo === 'selecao') { i = el('select', 'login-input pf-cel'); var o0 = el('option', null, '—'); o0.value = ''; i.appendChild(o0); (c.opcoes || []).forEach(function (o) { var op = el('option', null, o.v); op.value = o.v; if (o.v === v) op.selected = true; i.appendChild(op); }); i.addEventListener('change', function () { set(i.value); depois(); }); }
                else if (c.tipo === 'multipla') {
                    i = el('details', 'pf-multi'); var sm = el('summary'); function chips() { sm.textContent = ''; var a = l.dados[c.id] || []; if (!a.length) sm.appendChild(el('span', 'pf-vazio', '—')); a.forEach(function (x) { sm.appendChild(pill(c, x)); }); } chips(); i.appendChild(sm); var bx = el('div', 'pf-multi-op');
                    (c.opcoes || []).forEach(function (o) { var lb = el('label', 'cm-check'), k = el('input'); k.type = 'checkbox'; k.checked = Array.isArray(v) && v.indexOf(o.v) >= 0; k.addEventListener('change', function () { var a = (l.dados[c.id] || []).filter(function (x) { return x !== o.v; }); if (k.checked) a.push(o.v); a.sort(function (x, y) { return (c.opcoes || []).map(function (z) { return z.v; }).indexOf(x) - (c.opcoes || []).map(function (z) { return z.v; }).indexOf(y); }); set(a); chips(); depois(); }); lb.appendChild(k); lb.appendChild(el('span', null, o.v)); bx.appendChild(lb); }); i.appendChild(bx);
                }
                else if (c.tipo === 'caixa') { i = el('input'); i.type = 'checkbox'; i.checked = !!v; i.setAttribute('aria-label', c.nome); i.addEventListener('change', function () { set(i.checked); depois(); }); }
                else if (c.tipo === 'avaliacao') { i = el('span', 'pf-estrelas'); var mx = +c.max || 5; function est() { i.textContent = ''; var cur = +l.dados[c.id] || 0; for (var k = 1; k <= mx; k++) (function (k) { var b3 = el('button', 'pf-estrela' + (k <= cur ? ' on' : ''), k <= cur ? '★' : '☆'); b3.type = 'button'; b3.setAttribute('aria-label', k + ' de ' + mx); b3.addEventListener('click', function () { set(cur === k ? null : k); est(); depois(); }); i.appendChild(b3); })(k); } est(); }
                else if (c.tipo === 'longo') { i = el('textarea', 'login-input pf-cel'); i.rows = 2; i.value = v || ''; i.addEventListener('input', function () { set(i.value); }); }
                else if (c.tipo === 'progresso') { i = el('span', 'pf-prog-ed'); var n2 = el('input', 'login-input pf-cel'); n2.type = 'number'; n2.min = 0; n2.max = 100; n2.step = 'any'; n2.value = v == null ? '' : v; n2.setAttribute('aria-label', c.nome); var bar = barra(v || 0); n2.addEventListener('input', function () { var nv = n2.value === '' ? null : Math.max(0, Math.min(100, Number(n2.value))); set(nv); bar.firstChild.style.width = (nv || 0) + '%'; }); n2.addEventListener('change', depois); i.appendChild(n2); i.appendChild(bar); }
                else { i = el('input', 'login-input pf-cel'); i.type = NUM[c.tipo] ? 'number' : (c.tipo === 'data' ? 'date' : (c.tipo === 'link' ? 'url' : (c.tipo === 'email' ? 'email' : 'text'))); i.step = 'any'; i.value = v == null ? '' : v; i.addEventListener('input', function () { set(NUM[c.tipo] && i.value !== '' ? Number(i.value) : i.value); }); i.addEventListener('change', depois); }
                if (c.tipo !== 'caixa' && i.setAttribute && !/pf-prog-ed|pf-estrelas|pf-multi/.test(i.className || '')) i.setAttribute('aria-label', c.nome); return i;
            }
            function barra(v) { var b = el('span', 'pf-prog'), f = el('span', 'pf-prog-f'); f.style.width = Math.max(0, Math.min(100, +v || 0)) + '%'; b.appendChild(f); b.title = fmtNum(+v || 0, 0) + '%'; return b; }
            async function importar(texto) {
                var tab = csvLer(texto); if (tab.length < 2) return m('O arquivo não tem linhas de dados.'); var cab = tab[0].map(function (x) { return String(x).trim().toLowerCase(); }), mapa = cols.map(function (c) { return cab.indexOf(String(c.nome).toLowerCase()); });
                if (mapa.every(function (x) { return x < 0; })) return m('Nenhuma coluna do arquivo bate com as colunas da planilha (a primeira linha precisa ter os nomes das colunas).');
                var max = linhas.reduce(function (a, l) { return Math.max(a, Number(l.ordem) || 0); }, 0), novas = [], mudouCols = false;
                tab.slice(1).forEach(function (r, k) { var d = {}; cols.forEach(function (c, j) { var raw = mapa[j] >= 0 ? String(r[mapa[j]] == null ? '' : r[mapa[j]]).trim() : ''; if (raw === '') return;
                    if (NUM[c.tipo]) { var n = Number(raw.replace(/[^\d,.\-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); if (isFinite(n)) d[c.id] = n; } else if (c.tipo === 'caixa') d[c.id] = /^(sim|s|true|1|x)$/i.test(raw); else if (c.tipo === 'data') { var mm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw); d[c.id] = mm ? mm[3] + '-' + ('0' + mm[2]).slice(-2) + '-' + ('0' + mm[1]).slice(-2) : raw.slice(0, 10); }
                    else if (c.tipo === 'multipla') { var arr = raw.split(/\s*[|,]\s*/).filter(Boolean); d[c.id] = arr; arr.forEach(function (x) { if (ehDev && !(c.opcoes || []).some(function (o) { return o.v === x; })) { (c.opcoes = c.opcoes || []).push({ v: x, cor: '#6b7280' }); mudouCols = true; } }); }
                    else { d[c.id] = raw; if (c.tipo === 'selecao' && ehDev && !(c.opcoes || []).some(function (o) { return o.v === raw; })) { (c.opcoes = c.opcoes || []).push({ v: raw, cor: '#6b7280' }); mudouCols = true; } } });
                    novas.push({ planilha_id: p.id, dados: d, ordem: max + k + 1 }); });
                if (!confirm('Importar ' + novas.length + ' linha(s) para "' + p.nome + '"?')) return;
                if (mudouCols) { var q = await sb().from('pf_planilhas').update({ colunas: cols }).eq('id', p.id); if (q.error) return m(erro(q.error)); }
                for (var i = 0; i < novas.length; i += 200) { var x = await sb().from('pf_planilha_linhas').insert(novas.slice(i, i + 200)).select('id,dados,ordem'); if (x.error) return m(erro(x.error)); linhas = linhas.concat(x.data); }
                m(novas.length + ' linha(s) importada(s).', true); A.atualizar();
            }
            function editarColunas() {
                var copia = JSON.parse(JSON.stringify(cols)), box = el('div', 'pf-corpo'), lm = el('p', 'bk-msg'); lm.hidden = true;
                function opcoesTxt(c) { return (c.opcoes || []).map(function (o) { return o.v + (o.cor ? ' | ' + o.cor : ''); }).join('\n'); }
                function pintar() { box.textContent = ''; copia.forEach(function (c, i) { var card = el('fieldset', 'pf-col'); card.appendChild(el('legend', null, 'Coluna ' + (i + 1)));
                    var g = el('div', 'cm-grid'); g.appendChild(input('Nome da coluna', c.nome, function (v) { c.nome = v; }, { max: 80 })); g.appendChild(escolha('Tipo', TIPOS_COL, c.tipo, function (v) { c.tipo = v; pintar(); })); card.appendChild(g);
                    if (c.tipo === 'selecao' || c.tipo === 'multipla') card.appendChild(input('Opções (uma por linha, no formato  texto | #cor)', opcoesTxt(c), function (v) { c.opcoes = v.split('\n').map(function (s) { var a = s.split('|'); var t = a[0].trim(), cor = (a[1] || '').trim(); return t ? (/^#[0-9a-f]{6}$/i.test(cor) ? { v: t, cor: cor } : { v: t }) : null; }).filter(Boolean); }, { longo: 4, cheio: true, mono: true }));
                    var f = el('div', 'cm-grid');
                    if (c.tipo === 'numero') { f.appendChild(input('Casas decimais (vazio = automático)', c.casas, function (v) { c.casas = v === '' ? undefined : Math.max(0, Math.min(6, +v)); }, { tipo: 'number' })); f.appendChild(input('Texto antes (ex.: R$ )', c.prefixo, function (v) { c.prefixo = v || undefined; }, { max: 8 })); f.appendChild(input('Texto depois (ex.:  kg)', c.sufixo, function (v) { c.sufixo = v || undefined; }, { max: 8 })); f.appendChild(marca('Separar milhares', c.milhar !== false, function (v) { c.milhar = v ? undefined : false; })); }
                    if (c.tipo === 'moeda') f.appendChild(escolha('Moeda', [['BRL', 'Real (R$)'], ['USD', 'Dólar (US$)'], ['EUR', 'Euro (€)'], ['CLP', 'Peso chileno'], ['ARS', 'Peso argentino'], ['COP', 'Peso colombiano']], c.moeda || 'BRL', function (v) { c.moeda = v; }));
                    if (c.tipo === 'percentual') f.appendChild(input('Casas decimais', c.casas, function (v) { c.casas = v === '' ? undefined : Math.max(0, Math.min(4, +v)); }, { tipo: 'number' }));
                    if (c.tipo === 'data') f.appendChild(escolha('Formato da data', [['', '31/12/2026'], ['curto', '31/12'], ['longo', '31 de dezembro de 2026'], ['iso', '2026-12-31']], c.formato || '', function (v) { c.formato = v || undefined; }));
                    if (c.tipo === 'avaliacao') f.appendChild(input('Quantidade de estrelas', c.max || 5, function (v) { c.max = Math.max(3, Math.min(10, +v || 5)); }, { tipo: 'number' }));
                    f.appendChild(input('Largura em pixels (vazio = automática)', c.largura, function (v) { c.largura = v === '' ? undefined : Math.max(60, Math.min(800, +v)); }, { tipo: 'number' }));
                    f.appendChild(escolha('Alinhamento', [['', 'Padrão'], ['esq', 'Esquerda'], ['centro', 'Centro'], ['dir', 'Direita']], c.alinhar || '', function (v) { c.alinhar = v || undefined; }));
                    f.appendChild(input('Valor padrão em linhas novas', c.padrao, function (v) { c.padrao = v === '' ? undefined : v; }, { max: 120 }));
                    f.appendChild(escolha('Total no rodapé', [['', 'Nenhum'], ['soma', 'Soma'], ['media', 'Média'], ['contar', 'Quantidade preenchida'], ['vazios', 'Quantidade vazia'], ['min', 'Menor valor'], ['max', 'Maior valor']], c.total || '', function (v) { c.total = v || undefined; }));
                    card.appendChild(f); card.appendChild(input('Dica (aparece ao passar o mouse no título)', c.ajuda, function (v) { c.ajuda = v || undefined; }, { max: 200, cheio: true }));
                    var ck = el('div', 'cm-checks'); ck.appendChild(marca('Somente leitura (ninguém edita pela grade)', c.somente_leitura, function (v) { c.somente_leitura = v || undefined; })); ck.appendChild(marca('Começa escondida (cada pessoa pode mostrar em "Exibir")', c.oculta, function (v) { c.oculta = v || undefined; })); card.appendChild(ck);
                    var ac = el('div', 'cm-acoes'); if (i > 0) ac.appendChild(btn('Subir', 'chevron-up', function () { copia.splice(i - 1, 0, copia.splice(i, 1)[0]); pintar(); })); if (i < copia.length - 1) ac.appendChild(btn('Descer', 'chevron-down', function () { copia.splice(i + 1, 0, copia.splice(i, 1)[0]); pintar(); }));
                    ac.appendChild(btn('Duplicar', 'copy', function () { var n = JSON.parse(JSON.stringify(c)); n.id = 'col' + Date.now().toString(36); n.nome = (n.nome + ' (cópia)').slice(0, 80); copia.splice(i + 1, 0, n); pintar(); }));
                    ac.appendChild(btn('Remover coluna', 'trash-2', function () { if (confirm('Remover a coluna "' + c.nome + '"? Os dados dela continuam guardados nas linhas, mas deixam de aparecer.')) { copia.splice(i, 1); pintar(); } })); card.appendChild(ac); box.appendChild(card); });
                    box.appendChild(btn('Adicionar coluna', 'plus', function () { var n = 'col' + Date.now().toString(36); copia.push({ id: n, nome: 'Nova coluna', tipo: 'texto' }); pintar(); })); box.appendChild(lm);
                    box.appendChild(btn('Salvar colunas', 'check', async function () { if (copia.some(function (c) { return !String(c.nome || '').trim(); })) { lm.textContent = 'Toda coluna precisa de nome.'; lm.hidden = false; return; } var x = await sb().from('pf_planilhas').update({ colunas: copia }).eq('id', p.id).select().single(); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } Object.assign(p, um(x.data)); lista = lista.map(function (z) { return z.id === p.id ? p : z; }); C.fecharModal(); abrir(p); }, 'btn btn--primary btn--sm')); }
                pintar(); C.abrirModal('Colunas de "' + p.nome + '"', 'pencil', box, true);
            }
            function aparencia() {
                var c2 = JSON.parse(JSON.stringify(cfg)), box = el('div', 'pf-corpo'), lm = el('p', 'bk-msg'), colOps = [['', '— nenhuma —']].concat(cols.map(function (c) { return [c.id, c.nome]; }));
                lm.hidden = true;
                function pintar() { box.textContent = ''; var g = el('div', 'cm-grid');
                    g.appendChild(escolha('Tamanho das linhas', [['compacta', 'Compacta'], ['normal', 'Normal'], ['ampla', 'Ampla']], c2.densidade, function (v) { c2.densidade = v; }));
                    g.appendChild(escolha('Linhas por página', [['25', '25'], ['50', '50'], ['100', '100'], ['200', '200'], ['500', '500']], String(c2.linhas_pag), function (v) { c2.linhas_pag = +v; }));
                    g.appendChild(escolha('Agrupar linhas por', colOps, c2.agrupar || '', function (v) { c2.agrupar = v; }));
                    g.appendChild(escolha('Ordenar por (padrão)', colOps, (c2.ordenar && c2.ordenar.col) || '', function (v) { c2.ordenar = v ? { col: v, dir: (c2.ordenar && c2.ordenar.dir) || 'asc' } : null; }));
                    g.appendChild(escolha('Sentido da ordenação', [['asc', 'Crescente (A→Z, menor→maior)'], ['desc', 'Decrescente']], (c2.ordenar && c2.ordenar.dir) || 'asc', function (v) { if (c2.ordenar) c2.ordenar.dir = v; }));
                    var cor = el('div', 'lf'), l = el('label', null, 'Cor do cabeçalho'), ci = el('input'); ci.type = 'color'; ci.value = c2.cor_cabecalho || '#1e1b6b'; ci.addEventListener('input', function () { c2.cor_cabecalho = ci.value; }); cor.appendChild(l); cor.appendChild(ci); cor.appendChild(btn('Cor padrão', 'history', function () { c2.cor_cabecalho = ''; pintar(); })); g.appendChild(cor); box.appendChild(g);
                    var ck = el('div', 'cm-checks'); ck.appendChild(marca('Listras alternadas nas linhas', c2.zebra, function (v) { c2.zebra = v; })); ck.appendChild(marca('Quebrar textos longos em várias linhas', c2.quebrar, function (v) { c2.quebrar = v; })); ck.appendChild(marca('Fixar a primeira coluna ao rolar para o lado', c2.congelar, function (v) { c2.congelar = v; })); ck.appendChild(marca('Numerar as linhas (#)', c2.numerar, function (v) { c2.numerar = v; })); box.appendChild(ck);
                    var rg = el('fieldset', 'pf-col'); rg.appendChild(el('legend', null, 'Cores por condição')); rg.appendChild(el('p', 'ger-hint', 'Destaque células ou linhas inteiras quando uma regra for verdadeira. Ex.: Status é igual a Bloqueada → vermelho.'));
                    (c2.regras || []).forEach(function (r, i) { var ln = el('div', 'cm-grid pf-regra'); ln.appendChild(escolha('Coluna', colOps.slice(1), r.col, function (v) { r.col = v; })); ln.appendChild(escolha('Condição', OPS_REGRA, r.op, function (v) { r.op = v; pintar(); }));
                        if (!/^(vazio|preenchido|passou|futuro)$/.test(r.op)) ln.appendChild(input('Valor', r.valor, function (v) { r.valor = v; }, { max: 80 }));
                        ln.appendChild(escolha('Pintar', [['celula', 'Só a célula'], ['linha', 'A linha inteira']], r.alvo || 'celula', function (v) { r.alvo = v; }));
                        var cc = el('div', 'lf'), cl = el('label', null, 'Cor'), cin = el('input'); cin.type = 'color'; cin.value = r.cor || '#dc2626'; cin.addEventListener('input', function () { r.cor = cin.value; }); cc.appendChild(cl); cc.appendChild(cin); ln.appendChild(cc);
                        ln.appendChild(btn('Remover regra', 'trash-2', function () { c2.regras.splice(i, 1); pintar(); })); rg.appendChild(ln); });
                    rg.appendChild(btn('Adicionar regra', 'plus', function () { (c2.regras = c2.regras || []).push({ col: cols[0] ? cols[0].id : '', op: 'igual', valor: '', cor: '#dc2626', alvo: 'celula' }); pintar(); })); box.appendChild(rg); box.appendChild(lm);
                    box.appendChild(btn('Salvar aparência', 'check', async function () { var x = await sb().from('pf_planilhas').update({ config: c2 }).eq('id', p.id).select().single(); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } Object.assign(p, um(x.data)); C.fecharModal(); abrir(p); }, 'btn btn--primary btn--sm')); }
                pintar(); C.abrirModal('Aparência de "' + p.nome + '"', 'sparkles', box, true);
            }
            function configurar() {
                var n = C.campo('Nome', p.nome, 150), d = C.campo('Descrição', p.descricao, 1500, '', 3), v = C.seletor('Quem pode VER', [['publico', 'Qualquer pessoa (inclusive sem login)'], ['agente', 'Agentes logados'], ['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], p.papel_ver), e = C.seletor('Quem pode EDITAR as linhas', [['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], p.papel_editar), lm = el('p', 'bk-msg'); lm.hidden = true;
                var b = el('div', 'pf-corpo'); [n, d, v, e].forEach(function (x) { b.appendChild(x.n); }); b.appendChild(lm); var ac = el('div', 'cm-acoes'); b.appendChild(ac);
                ac.appendChild(btn('Salvar', 'check', async function () { var x = await sb().from('pf_planilhas').update({ nome: n.get(), descricao: d.get(), papel_ver: v.get(), papel_editar: e.get() }).eq('id', p.id).select().single(); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } C.fecharModal(); planilhas(host, dev); }, 'btn btn--primary btn--sm'));
                ac.appendChild(btn('Duplicar planilha', 'copy', async function () {
                    var comLinhas = confirm('Copiar também as ' + linhas.length + ' linha(s)?\n\nOK = estrutura e linhas   ·   Cancelar = só a estrutura'), nova = { slug: (p.slug.slice(0, 44) + '-copia-' + Math.random().toString(36).slice(2, 5)), nome: (p.nome + ' (cópia)').slice(0, 150), descricao: p.descricao, colunas: p.colunas, config: p.config || {}, papel_ver: p.papel_ver, papel_editar: p.papel_editar };
                    var x = await sb().from('pf_planilhas').insert(nova).select().single(); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } var np = um(x.data);
                    if (comLinhas) for (var i = 0; i < linhas.length; i += 200) { var y = await sb().from('pf_planilha_linhas').insert(linhas.slice(i, i + 200).map(function (l) { return { planilha_id: np.id, dados: l.dados, ordem: l.ordem }; })); if (y.error) { lm.textContent = erro(y.error); lm.hidden = false; return; } }
                    C.fecharModal(); planilhas(host, dev); }));
                ac.appendChild(btn('Excluir planilha', 'trash-2', async function () { if (!confirm('Excluir a planilha "' + p.nome + '" com todas as linhas e visões?')) return; var x = await sb().from('pf_planilhas').delete().eq('id', p.id); if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; } await sb().from('pf_visoes').delete().eq('escopo', 'planilha').eq('ref_id', p.id); C.fecharModal(); planilhas(host, dev); }));
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
            var def = w.definicao; if (!def.secoes) def = w.definicao = modelo(); var box = el('div', 'pf-builder pf-corpo'), lm = el('p', 'bk-msg'); lm.hidden = true;
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
        var tit = el('h3', 'ger-sub-titulo', 'Formulários, planilhas e mensagens'); raiz.appendChild(tit);
        var nav = el('div', 'dev-nav dev-nav--sub'); nav.setAttribute('role', 'tablist'); var corpo = el('div', 'dev-body'); raiz.appendChild(nav); raiz.appendChild(corpo);
        var abas = [['resp', 'Respostas', 'list-checks', function () { return respostas(corpo); }], ['plan', 'Planilhas', 'layers', function () { return planilhas(corpo, false); }], ['msg', 'Mensagens', 'megaphone', function () { if (!window.PortalMensagens) { corpo.appendChild(el('p', 'ger-msg', 'Módulo de mensagens não carregado.')); return Promise.resolve(); } return window.PortalMensagens.painel(corpo); }]], atual = 'resp';
        function pintar() { nav.textContent = ''; abas.forEach(function (a) { var b = el('button', 'dev-nav-btn' + (a[0] === atual ? ' is-on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', a[0] === atual ? 'true' : 'false'); b.appendChild(C.icon(a[2], true)); b.appendChild(el('span', null, a[1])); b.addEventListener('click', function () { atual = a[0]; pintar(); }); nav.appendChild(b); }); corpo.textContent = ''; abas.filter(function (a) { return a[0] === atual; })[0][3]().catch(function (e) { corpo.appendChild(el('p', 'ger-msg', erro(e))); }); }
        pintar();
    }
    document.addEventListener('portal:conteudo', montarGerencia); document.addEventListener('suporteLua:auth', function () { var r = document.getElementById('gerFormRoot'); if (r) r.removeAttribute('data-nivel'); setTimeout(montarGerencia, 600); }); setTimeout(montarGerencia, 800);

    window.PortalFormsAdmin = { respostas: respostas, planilhas: planilhas, construtor: construtor };
})();
