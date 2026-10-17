/* ==========================================================================
   PAINEL DO DESENVOLVEDOR (aba "Desenvolvedor", só para quem tem esse papel)
   Equipe e papéis · Permissões · Abas e portais · Aparência · Textos do site ·
   Fluxos · Backup · Histórico. O banco também confere o papel de quem chama.
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore; if (!C) return;
    var el = C.el, root = document.getElementById('devRoot'); if (!root) return;
    var secaoAtual = 'equipe', msgBox = null;
    var AREAS = { sistemas: 'Sistemas e Plataformas', forms: 'Formulários', slides: 'Slides Oficiais', avisos: 'Avisos Atuais', compartilhamentos: 'Compartilhamentos', textos: 'Títulos e textos das seções',
        abas: 'Nome, ícone, selo e ordem das abas', telefones: 'Diretório de Telefones', scripts: 'Scripts de Atendimento', futuras: 'Atualizações Futuras', cronologia: 'Cronologia do Site',
        portais: 'Conteúdo dos portais criados', site: 'Marca, topo, rodapé, relógio e avisos', tema: 'Cores e aparência', fluxos: 'Dados dos Fluxos de Atendimento' };
    var TEMA = [['--indigo-700', 'Cor principal (botões e destaques)'], ['--indigo-900', 'Cor principal escura (topo e títulos)'], ['--indigo-500', 'Cor principal clara'], ['--indigo-50', 'Fundo suave da cor principal'],
        ['--red-600', 'Cor de ação (vermelho)'], ['--red-500', 'Cor de ação clara'], ['--teal', 'Apoio verde-água'], ['--amber', 'Apoio laranja'], ['--violet', 'Apoio violeta'], ['--green', 'Apoio verde'],
        ['--ink', 'Texto principal'], ['--ink-2', 'Texto secundário'], ['--bg', 'Fundo da página'], ['--line', 'Linhas e bordas']];
    var SITE = [
        ['Marca e página', [['site.titulo_pagina', 'Título da aba do navegador'], ['site.marca_nome', 'Nome da marca (topo)'], ['site.marca_sub', 'Subtítulo da marca'], ['site.logo_url', 'Endereço (https) de uma imagem de logo (vazio = logo padrão)'], ['site.busca_placeholder', 'Texto do campo de busca']]],
        ['Faixa principal', [['site.hero_eyebrow', 'Texto pequeno acima do título'], ['site.hero_titulo', 'Título'], ['site.hero_lead', 'Frase de apoio', 1]]],
        ['Relógio', [['site.relogio_mostrar', 'Mostrar o relógio?', 'sn'], ['site.relogio_titulo', 'Título do relógio'], ['site.relogio1_rotulo', 'Relógio 1: nome'], ['site.relogio1_fuso', 'Relógio 1: fuso (ex.: America/Sao_Paulo)'], ['site.relogio2_rotulo', 'Relógio 2: nome'], ['site.relogio2_fuso', 'Relógio 2: fuso (ex.: America/Chicago)']]],
        ['Rodapé', [['site.rodape_1', 'Rodapé: texto em destaque'], ['site.rodape_2', 'Rodapé: segundo texto'], ['site.rodape_3', 'Rodapé: terceiro texto']]],
        ['Faixa de manutenção', [['site.manut_modo', 'Quando aparece', 'modo'], ['site.manut_dias', 'Dias (modo automático), ex.: sex  ou  seg,qua,sex'], ['site.manut_faixas', 'Horários (vazio = o dia todo), ex.: 08:00-12:00,14:00-18:00'], ['site.manut_titulo', 'Título'], ['site.manut_texto', 'Texto', 1]]],
        ['Aviso para todos (faixa no topo)', [['site.aviso_ativo', 'Mostrar o aviso?', 'sn'], ['site.aviso_tom', 'Cor do aviso', 'tom'], ['site.aviso_icone', 'Ícone', 'ico'], ['site.aviso_titulo', 'Título'], ['site.aviso_texto', 'Texto', 1]]]
    ];

    function msg(txt, ok) { if (!msgBox) return; msgBox.hidden = !txt; msgBox.textContent = txt || ''; msgBox.className = 'bk-msg ' + (ok ? 'bk-msg--ok' : 'bk-msg--err'); }
    function btn(txt, ic, fn, cls) { var b = el('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (ic) b.appendChild(C.icon(ic, true)); b.appendChild(el('span', null, txt)); b.addEventListener('click', fn); return b; }
    function erro(e) { return C.erroBanco(e); }
    function sb() { return C.sb(); }
    function titulo(t, sub) { var d = el('div', 'dev-head'); d.appendChild(el('h3', null, t)); if (sub) d.appendChild(el('p', 'ger-hint', sub)); return d; }
    function tabela(cab) { var w = el('div', 'table-card dev-table'), t = el('table', 'dir-table'), h = el('thead'), tr = el('tr'); cab.forEach(function (x) { var th = el('th', null, x); th.scope = 'col'; tr.appendChild(th); }); h.appendChild(tr); t.appendChild(h); var b = el('tbody'); t.appendChild(b); w.appendChild(t); return { n: w, corpo: b }; }
    function celula(tr, conteudo, rot) { var td = el('td'); if (rot) td.setAttribute('data-rot', rot); if (typeof conteudo === 'string') td.textContent = conteudo; else if (conteudo) td.appendChild(conteudo); tr.appendChild(td); return td; }
    function baixar(nome, texto) { var a = el('a'); a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
    function quando(s) { try { return new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch (e) { return s; } }

    /* ---------- 1. Equipe ---------- */
    async function equipe(c) {
        c.appendChild(titulo('Equipe e papéis', 'Agente usa o portal; administrador tem a Gerência e edita o que você liberar em "Permissões"; desenvolvedor altera o portal para todos. A pessoa precisa ter criado a conta no portal. Você não pode mudar o seu próprio papel.'));
        var r = await sb().rpc('listar_equipe'); if (r.error) { c.appendChild(el('p', 'ger-msg', erro(r.error))); return; }
        var t = tabela(['BP', 'Nome', 'Papel', 'Desde', '']); c.appendChild(t.n);
        var meuBp = (window.suporteLuaPerfil && window.suporteLuaPerfil.bp) || '';
        (r.data || []).forEach(function (p) {
            var tr = el('tr'), sel = el('select', 'login-input dev-sel');
            [['agente', 'Agente'], ['administrador', 'Administrador'], ['desenvolvedor', 'Desenvolvedor']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === p.role) op.selected = true; sel.appendChild(op); });
            celula(tr, p.bp, 'BP'); celula(tr, p.nome || '—', 'Nome'); celula(tr, sel, 'Papel'); celula(tr, quando(p.criado_em), 'Desde');
            var b = btn('Salvar', 'check', async function () {
                if (sel.value === p.role) return msg('Nada mudou para o BP ' + p.bp + '.', true);
                b.disabled = true; var x = await sb().rpc('definir_papel', { p_bp: p.bp, p_papel: sel.value });
                b.disabled = false; if (x.error) { msg(erro(x.error).replace('Sem permissão para esta alteração com o seu papel.', x.error.message), false); sel.value = p.role; return; }
                p.role = sel.value; msg('BP ' + p.bp + ' agora é ' + sel.value + '. Peça para a pessoa sair e entrar de novo.', true);
            });
            if (meuBp && String(meuBp) === String(p.bp)) { sel.disabled = true; b.disabled = true; sel.title = 'Seu próprio papel'; }
            celula(tr, b); t.corpo.appendChild(tr);
        });
        if (!(r.data || []).length) c.appendChild(el('p', 'ger-hint', 'Nenhuma conta ainda.'));
    }

    /* ---------- 2. Permissões ---------- */
    async function permissoes(c) {
        c.appendChild(titulo('O que o administrador pode editar', 'Para cada área, escolha quem pode criar, alterar e apagar. Desenvolvedores sempre podem tudo. Vale para o portal e para o banco.'));
        var r = await sb().from('portal_permissoes').select('area,papel_editar,descricao').order('area'); if (r.error) { c.appendChild(el('p', 'ger-msg', erro(r.error))); return; }
        var t = tabela(['Área', 'Quem edita']); c.appendChild(t.n);
        (r.data || []).sort(function (a, b) { return Object.keys(AREAS).indexOf(a.area) - Object.keys(AREAS).indexOf(b.area); }).forEach(function (p) {
            var tr = el('tr'), sel = el('select', 'login-input dev-sel');
            [['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === p.papel_editar) op.selected = true; sel.appendChild(op); });
            celula(tr, AREAS[p.area] || p.descricao || p.area, 'Área'); celula(tr, sel, 'Quem edita');
            sel.addEventListener('change', async function () {
                var x = await sb().from('portal_permissoes').update({ papel_editar: sel.value }).eq('area', p.area).select();
                if (x.error || !x.data || !x.data.length) { msg(x.error ? erro(x.error) : 'Não foi possível salvar.', false); sel.value = p.papel_editar; return; }
                p.papel_editar = sel.value; msg('Permissão de "' + (AREAS[p.area] || p.area) + '" atualizada.', true); await C.recarregar();
            });
            t.corpo.appendChild(tr);
        });
    }

    /* ---------- 3. Abas e portais ---------- */
    function ordenadas() { return C.estado.abas.slice().sort(function (a, b) { return a.ordem - b.ordem; }); }
    async function trocarOrdem(a, dir) {
        var l = ordenadas(), i = l.indexOf(a), j = i + dir; if (j < 0 || j >= l.length) return;
        var nova = l.slice(); nova.splice(i, 1); nova.splice(j, 0, a);
        var rs = await Promise.all(nova.map(function (x, k) { return x.ordem === (k + 1) * 10 ? null : sb().from('portal_abas').update({ ordem: (k + 1) * 10 }).eq('chave', x.chave).select(); }));
        var ruim = rs.filter(function (r) { return r && (r.error || !r.data || !r.data.length); })[0];
        if (ruim) msg(ruim.error ? erro(ruim.error) : 'Sem permissão.', false); await C.recarregar(); desenhar();
    }
    async function abas(c) {
        c.appendChild(titulo('Abas e portais', 'Reordene, renomeie, oculte ou apague abas e crie portais novos. O conteúdo de um portal novo é montado na própria aba, com a barra de edição.'));
        var t = tabela(['Aba', 'Quem vê', 'Mostrar', '', '']); c.appendChild(t.n);
        var VER = { publico: 'Todos', agente: 'Quem entrou', administrador: 'Administradores', desenvolvedor: 'Desenvolvedores' };
        var l = ordenadas();
        l.forEach(function (a, i) {
            var tr = el('tr'), nome = el('span', 'name-cell'); var ri = el('span', 'row-ico'); ri.appendChild(C.icon(a.icone || 'layers')); nome.appendChild(ri); nome.appendChild(el('span', null, a.rotulo + (a.selo ? ' · ' + a.selo : '') + (a.nativa ? '' : '  (portal criado)')));
            celula(tr, nome, 'Aba'); celula(tr, VER[a.papel_ver] || a.papel_ver, 'Quem vê'); celula(tr, a.visivel ? 'Sim' : 'Oculta', 'Mostrar');
            var ac = el('div', 'dev-acoes');
            [['chevron-up', 'Subir', function () { trocarOrdem(a, -1); }, i === 0], ['chevron-down', 'Descer', function () { trocarOrdem(a, 1); }, i === l.length - 1], ['pencil', 'Editar nome, ícone, selo e visibilidade', function () { C.editarAba(a.chave); }, false]].forEach(function (d) {
                var b = el('button', 'ger-ico-btn'); b.type = 'button'; b.title = d[1]; b.setAttribute('aria-label', d[1]); b.appendChild(C.icon(d[0])); b.disabled = d[3]; b.addEventListener('click', d[2]); ac.appendChild(b);
            });
            celula(tr, ac);
            var del = el('div', 'dev-acoes');
            if (!a.nativa) { var bx = el('button', 'ger-ico-btn ger-ico-btn--del'); bx.type = 'button'; bx.title = 'Apagar portal'; bx.setAttribute('aria-label', 'Apagar portal'); bx.appendChild(C.icon('trash-2'));
                bx.addEventListener('click', async function () {
                    if (!window.confirm('Apagar o portal "' + a.rotulo + '" e TODO o conteúdo dele? Não dá para desfazer.')) return;
                    var x = await sb().from('portal_abas').delete().eq('chave', a.chave).select(); if (x.error || !x.data || !x.data.length) return msg(x.error ? erro(x.error) : 'Sem permissão.', false);
                    msg('Portal apagado.', true); await C.recarregar(); desenhar();
                }); del.appendChild(bx); }
            celula(tr, del); t.corpo.appendChild(tr);
        });
        var f = el('form', 'ger-add-body cm-form dev-novo'); f.noValidate = true; f.appendChild(el('h4', 'cm-sub', 'Criar portal novo'));
        var nm = C.campo('Nome do portal (aparece na aba)', '', 40, 'Ex.: Treinamento'), ch = C.campo('Endereço curto (só letras minúsculas, números e _ ; vira #endereco)', '', 31, 'ex.: treinamento'), ic = C.seletorIcone('Ícone', 'layers');
        var ver = C.seletor('Quem enxerga', [['publico', 'Todos, inclusive quem não entrou'], ['agente', 'Só quem entrou'], ['administrador', 'Administradores e desenvolvedores'], ['desenvolvedor', 'Só desenvolvedores']], 'agente');
        [nm.n, ch.n, ic.n, ver.n].forEach(function (x) { f.appendChild(x); });
        nm.i.addEventListener('input', function () { if (!ch.i.dataset.tocou) ch.i.value = nm.get().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^([0-9])/, 'p$1').slice(0, 31); });
        ch.i.addEventListener('input', function () { ch.i.dataset.tocou = '1'; });
        var go = el('button', 'btn btn--primary btn--sm'); go.type = 'submit'; go.appendChild(C.icon('plus', true)); go.appendChild(el('span', null, 'Criar portal')); f.appendChild(go);
        f.addEventListener('submit', async function (e) {
            e.preventDefault(); var k = ch.get();
            if (!/^[a-z][a-z0-9_]{1,30}$/.test(k)) return msg('O endereço precisa começar com letra e ter de 2 a 31 letras minúsculas, números ou _.', false);
            if (!nm.get()) return msg('Dê um nome ao portal.', false);
            var ordem = ordenadas().reduce(function (m, a) { return Math.max(m, a.ordem); }, 0) + 10;
            go.disabled = true; var x = await sb().from('portal_abas').insert([{ chave: k, nativa: false, rotulo: nm.get(), icone: ic.get() || 'layers', ordem: ordem, papel_ver: ver.get() }]).select(); go.disabled = false;
            if (x.error) return msg(/duplicate|already|reservada|check/i.test(x.error.message) ? 'Já existe uma aba com esse endereço (ou o endereço é reservado). Escolha outro.' : erro(x.error), false);
            msg('Portal "' + nm.get() + '" criado! Abra a aba e adicione os blocos.', true); await C.recarregar(); desenhar();
        });
        c.appendChild(f);
    }

    /* ---------- 4. Aparência ---------- */
    function hex(v) { v = String(v || '').trim(); return /^#[0-9a-fA-F]{6}$/.test(v) ? v : ''; }
    async function aparencia(c) {
        c.appendChild(titulo('Aparência', 'Mude as cores do portal inteiro. A prévia é imediata; só vale para todos depois de "Salvar para todos".'));
        var atual = Object.assign({}, C.estado.dados.tema || {}), campos = {}, cs = getComputedStyle(document.documentElement), grade = el('div', 'cm-grid2 dev-cores');
        TEMA.forEach(function (d) {
            var padrao = hex(cs.getPropertyValue(d[0])) || '#000000', w = el('div', 'lf'), l = el('label', null, d[1]), i = el('input', 'dev-cor'); i.type = 'color'; i.value = hex(atual[d[0]]) || padrao; i.id = 'cor' + d[0].slice(2);
            l.htmlFor = i.id; i.addEventListener('input', function () { document.documentElement.style.setProperty(d[0], i.value); atual[d[0]] = i.value; });
            var r = el('button', 'btn btn--ghost btn--sm'); r.type = 'button'; r.appendChild(el('span', null, 'Padrão')); r.addEventListener('click', function () { document.documentElement.style.removeProperty(d[0]); delete atual[d[0]]; var st = document.getElementById('portalTema'); var s0 = st ? st.textContent : ''; if (st) st.textContent = ''; i.value = hex(getComputedStyle(document.documentElement).getPropertyValue(d[0])) || '#000000'; if (st) st.textContent = s0; });
            var lin = el('div', 'cm-ico-row'); lin.appendChild(i); lin.appendChild(r); w.appendChild(l); w.appendChild(lin); grade.appendChild(w); campos[d[0]] = i;
        });
        c.appendChild(grade);
        var rd = C.seletor('Cantos dos cartões', [['', 'Padrão'], ['6px', 'Quase retos'], ['12px', 'Suaves'], ['18px', 'Arredondados (padrão do portal)'], ['26px', 'Bem arredondados']], (atual['--radius'] || ''));
        rd.i.addEventListener('change', function () { if (rd.get()) { document.documentElement.style.setProperty('--radius', rd.get()); atual['--radius'] = rd.get(); } else { document.documentElement.style.removeProperty('--radius'); delete atual['--radius']; } });
        c.appendChild(rd.n);
        var acoes = el('div', 'dev-acoes dev-acoes--linha');
        acoes.appendChild(btn('Salvar para todos', 'check', async function () {
            var v = {}; Object.keys(atual).forEach(function (k) { if (atual[k]) v[k] = atual[k]; });
            var x = Object.keys(v).length ? await sb().from('portal_dados').upsert([{ chave: 'tema', valor: v }], { onConflict: 'chave' }).select() : await sb().from('portal_dados').delete().eq('chave', 'tema').select();
            if (x.error || (Object.keys(v).length && (!x.data || !x.data.length))) return msg(x.error ? erro(x.error) : 'Sem permissão.', false);
            document.documentElement.removeAttribute('style'); msg('Aparência salva para todos.', true); await C.recarregar();
        }, 'btn btn--primary btn--sm'));
        acoes.appendChild(btn('Voltar ao visual original', 'undo-2', async function () {
            if (!window.confirm('Voltar todas as cores ao visual original para todos?')) return;
            var x = await sb().from('portal_dados').delete().eq('chave', 'tema').select(); if (x.error) return msg(erro(x.error), false);
            document.documentElement.removeAttribute('style'); msg('Visual original restaurado.', true); await C.recarregar(); desenhar();
        }));
        c.appendChild(acoes);
    }

    /* ---------- 5. Textos do site ---------- */
    function campoSite(d) {
        var k = d[0], v = C.estado.textos[k] || '', tipo = d[2];
        if (tipo === 'sn') return C.seletor(d[1], [['sim', 'Sim'], ['nao', 'Não']], v || (k === 'site.aviso_ativo' ? 'nao' : 'sim'));
        if (tipo === 'modo') return C.seletor(d[1], [['auto', 'Automático (pelos dias e horários abaixo)'], ['sempre', 'Sempre'], ['nunca', 'Nunca']], v || 'auto');
        if (tipo === 'tom') return C.seletor(d[1], [['info', 'Azul (informação)'], ['alerta', 'Laranja (atenção)'], ['sucesso', 'Verde (boa notícia)'], ['perigo', 'Vermelho (urgente)']], v || 'info');
        if (tipo === 'ico') return C.seletorIcone(d[1], v || 'megaphone');
        return C.campo(d[1], v, 500, '', d[2] === 1 ? 3 : 0);
    }
    async function textos(c) {
        c.appendChild(titulo('Textos do site', 'Marca, faixa principal, relógio, rodapé, faixa de manutenção e aviso para todos. Campo vazio volta ao texto original.'));
        var form = el('form', 'ger-add-body cm-form'), lista = []; form.noValidate = true;
        SITE.forEach(function (g) { form.appendChild(el('h4', 'cm-sub', g[0])); g[1].forEach(function (d) { var f = campoSite(d); form.appendChild(f.n); lista.push([d[0], f, d[2]]); }); });
        var go = el('button', 'btn btn--primary btn--sm'); go.type = 'submit'; go.appendChild(C.icon('check', true)); go.appendChild(el('span', null, 'Salvar para todos')); form.appendChild(go);
        form.addEventListener('submit', async function (e) {
            e.preventDefault(); var up = [], del = [];
            for (var i = 0; i < lista.length; i++) {
                var k = lista[i][0], v = lista[i][1].get();
                if (k === 'site.logo_url' && v && !/^https:\/\//i.test(v)) return msg('O logo precisa de um endereço que comece com https://', false);
                if (k === 'site.manut_dias' && v && !/^(dom|seg|ter|qua|qui|sex|sab)(\s*,\s*(dom|seg|ter|qua|qui|sex|sab))*$/.test(v)) return msg('Dias da manutenção: use dom, seg, ter, qua, qui, sex, sab separados por vírgula.', false);
                if (k === 'site.manut_faixas' && v && !/^\d{1,2}:\d{2}-\d{1,2}:\d{2}(\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2})*$/.test(v)) return msg('Horários da manutenção: use 08:00-12:00 (separe vários por vírgula).', false);
                if (/fuso$/.test(k) && v) { try { new Intl.DateTimeFormat('pt-BR', { timeZone: v }); } catch (er) { return msg('Fuso horário inválido em "' + k + '". Exemplo: America/Sao_Paulo', false); } }
                if (/_icone$/.test(k) && v && !/^[a-z0-9-]{1,40}$/.test(v)) return msg('Nome de ícone inválido.', false);
                if (v !== '') up.push({ chave: k, valor: v }); else if (C.estado.textos[k] != null) del.push(k);
            }
            go.disabled = true;
            try {
                if (up.length) { var r = await sb().from('portal_textos').upsert(up, { onConflict: 'chave' }).select(); if (r.error) throw r.error; if (!r.data || r.data.length < up.length) throw new Error('nem todos os textos foram gravados (sem permissão)'); }
                if (del.length) { var d = await sb().from('portal_textos').delete().in('chave', del).select(); if (d.error) throw d.error; }
            } catch (err) { go.disabled = false; return msg(erro(err), false); }
            go.disabled = false; del.forEach(function (k) { delete C.estado.textos[k]; }); msg('Textos salvos para todos.', true); await C.recarregar();
        });
        c.appendChild(form);
    }

    /* ---------- 6. Fluxos ---------- */
    function fluxosValido(d) {
        if (!d || typeof d !== 'object' || !Array.isArray(d.sags) || !Array.isArray(d.mats) || !Array.isArray(d.itens)) return 'O JSON precisa ter as listas "sags", "mats" e "itens".';
        var sag = {}, mat = {}; d.sags.forEach(function (s) { sag[s && s.id] = 1; }); d.mats.forEach(function (m) { mat[m && m.id] = 1; });
        if (!d.sags.every(function (s) { return s && s.id && s.nome; })) return 'Todo item de "sags" precisa de "id" e "nome".';
        if (!d.mats.every(function (m) { return m && m.id && m.nome; })) return 'Todo item de "mats" precisa de "id" e "nome".';
        for (var i = 0; i < d.itens.length; i++) { var it = d.itens[i]; if (!it || !mat[it.m]) return 'O item ' + (i + 1) + ' usa a matriz "' + (it && it.m) + '" que não existe em "mats".'; if (!Array.isArray(it.l)) return 'O item ' + (i + 1) + ' precisa ter a lista "l".'; }
        return '';
    }
    async function fluxos(c) {
        c.appendChild(titulo('Fluxos de Atendimento', 'Os dados dos fluxos (SAGs, matrizes e tratativas) vêm do código. Aqui você edita como JSON e salva no banco; o banco passa a valer para todos. "Voltar ao padrão" apaga a versão do banco.'));
        var ta = el('textarea', 'login-input cm-area dev-json'); ta.rows = 18; ta.spellcheck = false; ta.value = window.fluxosDados ? JSON.stringify(window.fluxosDados(), null, 1) : '';
        c.appendChild(ta);
        var acoes = el('div', 'dev-acoes dev-acoes--linha');
        function ler() { var d; try { d = JSON.parse(ta.value); } catch (e) { msg('JSON inválido: ' + e.message, false); return null; } var er = fluxosValido(d); if (er) { msg(er, false); return null; } return d; }
        acoes.appendChild(btn('Testar nesta página', 'eye', function () { var d = ler(); if (!d) return; msg(window.fluxosDefinir(d) ? 'Aplicado só aqui para você testar (' + d.itens.length + ' tratativas). Abra a aba Fluxos para ver.' : 'Os dados não foram aceitos.', true); }));
        acoes.appendChild(btn('Salvar para todos', 'check', async function () {
            var d = ler(); if (!d) return; var x = await sb().from('portal_dados').upsert([{ chave: 'fluxos', valor: d }], { onConflict: 'chave' }).select();
            if (x.error || !x.data || !x.data.length) return msg(x.error ? erro(x.error) : 'Sem permissão.', false);
            msg('Fluxos salvos para todos (' + d.itens.length + ' tratativas).', true); if (C.fluxosAtualizar) C.fluxosAtualizar();
        }, 'btn btn--primary btn--sm'));
        acoes.appendChild(btn('Voltar ao padrão do código', 'undo-2', async function () {
            if (!window.confirm('Apagar a versão do banco e voltar aos fluxos que vêm no código? Quem já abriu o portal verá a mudança ao recarregar.')) return;
            var x = await sb().from('portal_dados').delete().eq('chave', 'fluxos').select(); if (x.error) return msg(erro(x.error), false);
            if (C.fluxosPadrao) C.fluxosPadrao(); msg('Versão do banco apagada. Recarregue a página para ver o padrão do código.', true);
        }));
        acoes.appendChild(btn('Baixar JSON', 'download', function () { baixar('fluxos.json', ta.value); }));
        c.appendChild(acoes);
    }

    /* ---------- 7. Backup ---------- */
    async function backup(c) {
        c.appendChild(titulo('Backup e restauração', 'Baixe tudo o que está no banco (cartões, textos, abas, permissões, aparência e fluxos) em um arquivo. A restauração substitui as seções que estiverem no arquivo.'));
        var acoes = el('div', 'dev-acoes dev-acoes--linha');
        acoes.appendChild(btn('Baixar backup completo', 'download', async function () {
            var s = sb(), rs = await Promise.all([s.from('portal_cards').select('*'), s.from('portal_textos').select('*'), s.from('portal_abas').select('*'), s.from('portal_permissoes').select('*'), s.from('portal_dados').select('chave,valor')]);
            var ruim = rs.filter(function (r) { return r.error; })[0]; if (ruim) return msg(erro(ruim.error), false);
            baixar('portal-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ versao: 2, em: new Date().toISOString(), cards: rs[0].data, textos: rs[1].data, abas: rs[2].data, permissoes: rs[3].data, dados: rs[4].data }, null, 1));
            msg('Backup baixado.', true);
        }));
        var inp = el('input'); inp.type = 'file'; inp.accept = 'application/json,.json'; inp.hidden = true;
        acoes.appendChild(btn('Restaurar de um arquivo', 'upload', function () { inp.click(); })); acoes.appendChild(inp); c.appendChild(acoes);
        inp.addEventListener('change', async function () {
            var f = inp.files && inp.files[0]; if (!f) return; inp.value = '';
            var d; try { d = JSON.parse(await f.text()); } catch (e) { return msg('Arquivo inválido: não é um JSON.', false); }
            if (!d || d.versao !== 2 || !Array.isArray(d.cards) || !Array.isArray(d.textos)) return msg('Este arquivo não é um backup do portal.', false);
            var secoes = {}; d.cards.forEach(function (x) { secoes[x.secao] = 1; });
            if (!window.confirm('Restaurar o backup de ' + new Date(d.em).toLocaleString('pt-BR') + '?\n\nSerão SUBSTITUÍDOS os cartões das seções: ' + Object.keys(secoes).join(', ') + ', mais textos, abas, permissões e aparência do arquivo. Dica: baixe um backup atual antes.')) return;
            try { await restaurar(d, secoes); await C.recarregar(); desenhar(); msg('Backup restaurado.', true); } catch (e) { msg('Falha ao restaurar: ' + (e.message || erro(e)), false); }
        });
    }
    async function restaurar(d, secoes) {
        var s = sb(), x;
        for (var k in secoes) {
            if (!Object.prototype.hasOwnProperty.call(secoes, k)) continue;
            x = await s.from('portal_cards').delete().eq('secao', k).select('id'); if (x.error) throw x.error;
            var linhas = d.cards.filter(function (c) { return c.secao === k; }).map(function (c) { var o = Object.assign({}, c); delete o.atualizado_em; return o; });
            var pais = linhas.filter(function (c) { return !c.pai; }), filhos = linhas.filter(function (c) { return c.pai; });
            if (pais.length) { x = await s.from('portal_cards').insert(pais); if (x.error) throw x.error; }
            if (filhos.length) { x = await s.from('portal_cards').insert(filhos); if (x.error) throw x.error; }
        }
        if (d.textos.length) { x = await s.from('portal_textos').upsert(d.textos.map(function (t) { return { chave: t.chave, valor: t.valor }; }), { onConflict: 'chave' }); if (x.error) throw x.error; }
        for (var i = 0; i < (d.abas || []).length; i++) {
            var a = d.abas[i], ex = C.estado.abas.some(function (y) { return y.chave === a.chave; });
            if (ex) x = await s.from('portal_abas').update({ rotulo: a.rotulo, icone: a.icone, selo: a.selo, ordem: a.ordem, visivel: a.visivel, papel_ver: a.papel_ver }).eq('chave', a.chave);
            else x = await s.from('portal_abas').insert([{ chave: a.chave, nativa: false, rotulo: a.rotulo, icone: a.icone, selo: a.selo, ordem: a.ordem, visivel: a.visivel, papel_ver: a.papel_ver }]);
            if (x.error) throw x.error;
        }
        for (var j = 0; j < (d.permissoes || []).length; j++) { x = await s.from('portal_permissoes').update({ papel_editar: d.permissoes[j].papel_editar }).eq('area', d.permissoes[j].area); if (x.error) throw x.error; }
        for (var m = 0; m < (d.dados || []).length; m++) { x = await s.from('portal_dados').upsert([{ chave: d.dados[m].chave, valor: d.dados[m].valor }], { onConflict: 'chave' }); if (x.error) throw x.error; }
    }

    /* ---------- 8. Histórico ---------- */
    async function historico(c) {
        c.appendChild(titulo('Histórico de alterações', 'Quem mudou o quê (últimas 150 alterações). Registros com mais de 180 dias são apagados sozinhos.'));
        var r = await sb().from('portal_auditoria').select('em,bp,papel,tabela,acao,registro,antes,depois').order('em', { ascending: false }).limit(150); if (r.error) { c.appendChild(el('p', 'ger-msg', erro(r.error))); return; }
        var NOME = { portal_cards: 'Conteúdo', portal_textos: 'Texto', portal_abas: 'Aba', portal_dados: 'Aparência / Fluxos', portal_permissoes: 'Permissão', perfis: 'Papel' }, ACAO = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Apagou', PAPEL: 'Mudou papel' };
        var t = tabela(['Quando', 'Quem', 'O quê', 'Ação', 'Detalhe']); c.appendChild(t.n);
        (r.data || []).forEach(function (x) {
            var tr = el('tr'), ref = x.depois || x.antes || {}, det = ref.titulo || ref.rotulo || ref.chave || ref.area || x.registro || '';
            if (x.tabela === 'perfis') det = 'BP ' + x.registro + ': ' + (x.antes && x.antes.role) + ' → ' + (x.depois && x.depois.role);
            celula(tr, quando(x.em), 'Quando'); celula(tr, (x.bp || '—') + (x.papel ? ' (' + x.papel + ')' : ''), 'Quem'); celula(tr, NOME[x.tabela] || x.tabela, 'O quê'); celula(tr, ACAO[x.acao] || x.acao, 'Ação'); celula(tr, String(det).slice(0, 120), 'Detalhe');
            t.corpo.appendChild(tr);
        });
        if (!(r.data || []).length) c.appendChild(el('p', 'ger-hint', 'Nenhuma alteração registrada ainda.'));
        var acoes = el('div', 'dev-acoes dev-acoes--linha');
        acoes.appendChild(btn('Apagar registros com mais de 90 dias', 'trash-2', async function () { var x = await sb().rpc('limpar_auditoria', { p_dias: 90 }); if (x.error) return msg(erro(x.error), false); msg(x.data + ' registro(s) apagado(s).', true); desenhar(); }));
        c.appendChild(acoes);
    }

    /* ---------- estrutura do painel ---------- */
    var SECOES = [['equipe', 'Equipe', 'users-round', equipe], ['permissoes', 'Permissões', 'key-round', permissoes], ['abas', 'Abas e portais', 'layers', abas], ['aparencia', 'Aparência', 'sparkles', aparencia],
        ['textos', 'Textos do site', 'pencil-line', textos], ['fluxos', 'Fluxos', 'workflow', fluxos], ['backup', 'Backup', 'vault', backup], ['historico', 'Histórico', 'history', historico]];
    async function desenhar() {
        root.textContent = '';
        if (C.nivel() < 3) { root.appendChild(el('p', 'card-text', 'Esta área é só para desenvolvedores.')); return; }
        var nav = el('div', 'dev-nav', null); nav.setAttribute('role', 'tablist');
        SECOES.forEach(function (s) {
            var b = el('button', 'dev-nav-btn' + (s[0] === secaoAtual ? ' is-on' : '')); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', s[0] === secaoAtual ? 'true' : 'false');
            b.appendChild(C.icon(s[2], true)); b.appendChild(el('span', null, s[1])); b.addEventListener('click', function () { secaoAtual = s[0]; desenhar(); }); nav.appendChild(b);
        });
        root.appendChild(nav);
        msgBox = el('p', 'bk-msg'); msgBox.hidden = true; msgBox.setAttribute('role', 'status'); root.appendChild(msgBox);
        var c = el('div', 'dev-body'); root.appendChild(c);
        var fn = SECOES.filter(function (s) { return s[0] === secaoAtual; })[0][3];
        try { await fn(c); } catch (e) { console.error('[dev]', e); c.appendChild(el('p', 'ger-msg', 'Erro ao abrir esta seção: ' + (e.message || e))); }
    }
    var ultimo = -1;
    document.addEventListener('portal:conteudo', function () {
        var n = C.nivel(); if (n === ultimo && document.getElementById('dev') && document.getElementById('dev').hidden) return;
        if (n !== ultimo) { ultimo = n; if (n >= 3) desenhar(); else root.textContent = ''; }
    });
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-tab="dev"]'); if (b && C.nivel() >= 3) desenhar(); });
})();
