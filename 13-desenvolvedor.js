/* ==========================================================================
   PAINEL DO DESENVOLVEDOR (aba "Desenvolvedor", só para quem tem esse papel)
   Equipe e papéis · Permissões · Abas e portais · Aparência · Textos do site ·
   Fluxos · Agente Sabre (regras) · Backup · Histórico. O banco também confere o papel de quem chama.
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore; if (!C) return;
    var el = C.el, root = document.getElementById('devRoot'); if (!root) return;
    var secaoAtual = 'equipe', msgBox = null;
    var AREAS = { sistemas: 'Sistemas e Plataformas', forms: 'Formulários', slides: 'Slides Oficiais', avisos: 'Avisos Atuais', compartilhamentos: 'Compartilhamentos', textos: 'Títulos e textos das seções',
        abas: 'Nome, ícone, selo e ordem das abas', telefones: 'Diretório de Telefones', scripts: 'Scripts de Atendimento', futuras: 'Atualizações Futuras', cronologia: 'Cronologia do Site',
        portais: 'Conteúdo dos portais criados', site: 'Marca, topo, rodapé, relógio e avisos', tema: 'Cores e aparência', fluxos: 'Dados dos Fluxos de Atendimento', transparencia: 'Portal da Transparência' };
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
        var NOME = { portal_cards: 'Conteúdo', portal_textos: 'Texto', portal_abas: 'Aba', portal_dados: 'Aparência / Fluxos / Transparência', portal_permissoes: 'Permissão', perfis: 'Papel', sabre_regras: 'Regra do Sabre', sabre_modulos: 'Módulo do Sabre', pf_formularios: 'Formulário', pf_respostas: 'Resposta de formulário', pf_planilhas: 'Planilha', pf_planilha_linhas: 'Linha de planilha' }, ACAO = { INSERT: 'Criou', UPDATE: 'Alterou', DELETE: 'Apagou', PAPEL: 'Mudou papel' };
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

    /* ---------- Agente Sabre: regras no banco ---------- */
    var BADGE = [['b-ok', 'Verde (ok)'], ['b-err', 'Vermelho (erro/cancelado)'], ['b-warn', 'Amarelo (atenção)'], ['b-blue', 'Azul (informação)'], ['b-gray', 'Cinza'], ['b-teal', 'Verde-água'], ['b-purple', 'Roxo']];
    var ALERTA = [['alert-yellow', 'Amarelo (atenção)'], ['alert-blue', 'Azul (informação)'], ['alert-red', 'Vermelho (grave)'], ['alert-green', 'Verde (positivo)']];
    var MODOS = [['comeca', 'Começa com'], ['contem', 'Contém'], ['igual', 'É exatamente'], ['regex', 'Avançado (expressão regular)']];
    var ICO_SB = [['info', 'Informação'], ['warn', 'Alerta'], ['bot', 'Robô'], ['ticket', 'Bilhete'], ['doc', 'Documento'], ['user', 'Pessoa'], ['msg', 'Mensagem'], ['seat', 'Assento'], ['plane', 'Avião'], ['service', 'Serviço'], ['star', 'Estrela'], ['wheelchair', 'Cadeira de rodas'], ['pet', 'Pet'], ['meal', 'Refeição']];
    var CATS = [['cat-pay', 'Pagamento'], ['cat-sys', 'Sistema / robô'], ['cat-remark', 'Remark / observação'], ['cat-osi', 'Informação (OSI)'], ['cat-ticket', 'Bilhete'], ['cat-ssr', 'Serviço (SSR)']];
    var SB_ORDENADO = { ator: 1, osi: 1, remark: 1, ssr: 1, traducao_pax: 1, traducao_remark: 1, alerta: 1, indicio: 1 };
    var SB_TIPOS = [
        { t: 'status', rot: 'Status de segmento', ajuda: 'Códigos de status do voo (HK, HX, WK…) com o nome curto, a cor do selo e a explicação mostrada na ferramenta.',
          cols: [['chave', 'Código'], ['titulo', 'Nome'], ['cor', 'Cor'], ['descricao', 'Explicação']],
          campos: [{ n: 'chave', rot: 'Código (2 letras, ex.: HK)', max: 8, up: 1 }, { n: 'titulo', rot: 'Nome curto (aparece no selo)', max: 60 }, { n: 'cor', rot: 'Cor do selo', op: BADGE }, { n: 'descricao', rot: 'Explicação', max: 600, longo: 3 }] },
        { t: 'aeroporto', rot: 'Aeroportos', ajuda: 'Código IATA de 3 letras e o nome da cidade/aeroporto (aparece ao passar o mouse na rota).',
          cols: [['chave', 'Código'], ['titulo', 'Cidade / aeroporto']],
          campos: [{ n: 'chave', rot: 'Código IATA (3 letras)', max: 3, up: 1 }, { n: 'titulo', rot: 'Nome da cidade / aeroporto', max: 80 }] },
        { t: 'acao', rot: 'Códigos de ação', ajuda: 'Como cada código do histórico (AS, XS, X4S…) é escrito na linha do tempo.',
          cols: [['chave', 'Código'], ['titulo', 'Como aparece']],
          campos: [{ n: 'chave', rot: 'Código da ação (ex.: AS, X4S)', max: 8, up: 1 }, { n: 'titulo', rot: 'Texto exibido', max: 80 }] },
        { t: 'ator', rot: 'Quem alterou', ajuda: 'Reconhece quem fez a alteração pela assinatura (ou pelo texto do R-). A primeira regra que combinar vale: use ▲▼ para mudar a ordem. Sem combinar com nenhuma, aparece "Agente / Agência".', teste: 'ator',
          cols: [['titulo', 'Nome'], ['padrao', 'Assinatura começa com'], ['padrao2', 'Ou texto contém'], ['cor', 'Cor'], ['x.k', 'Tipo']],
          campos: [{ n: 'titulo', rot: 'Nome que aparece', max: 80 }, { n: 'x.k', rot: 'Tipo interno (letras minúsculas, sem espaço — liga com os "Indícios")', max: 30, ph: 'ex.: cpc' },
              { n: 'padrao', rot: 'Assinatura começa com (separe várias por vírgula)', max: 200, ph: 'ex.: QOC,JDO' }, { n: 'padrao2', rot: 'OU o texto do R- contém (separe por vírgula)', max: 200 },
              { n: 'cor', rot: 'Cor do selo', op: BADGE }, { n: 'x.grupo', rot: 'Grupo (filtro)', op: [['auto', 'Automático / sistema'], ['agente', 'Agente / agência'], ['cc', 'Call Center'], ['cpc', 'CPC'], ['site', 'Site']] },
              { n: 'x.robo', rot: 'É um sistema/robô (não é uma pessoa)', sn: 1 }, { n: 'x.sem_assinatura', rot: 'Só vale quando o bloco não tem assinatura', sn: 1 }, { n: 'descricao', rot: 'Explicação mostrada ao atendente', max: 800, longo: 4 }] },
        { t: 'robo', rot: 'Robôs / sistemas', ajuda: 'Textos que, se aparecerem no campo R-, indicam que foi um sistema e não uma pessoa.',
          cols: [['chave', 'Texto que identifica um robô']], campos: [{ n: 'chave', rot: 'Texto (em maiúsculas)', max: 60, up: 1 }] },
        { t: 'remark', rot: 'Remarks', ajuda: 'Dá nome e significado a linhas de remark (A5H, H-…). No modo "Avançado", use ( ) para capturar partes do texto e $1, $2… nos campos. Regras mais complexas (pagamento, tarifa) continuam no código.', teste: 'remark',
          cols: [['modo', 'Modo'], ['padrao', 'Texto'], ['titulo', 'Título'], ['x.cat', 'Categoria']],
          campos: [{ n: 'modo', rot: 'Como procurar', op: MODOS }, { n: 'padrao', rot: 'Texto procurado ($ = linha do remark)', max: 300 }, { n: 'titulo', rot: 'Título exibido', max: 200 },
              { n: 'x.cat', rot: 'Categoria (cor do cartão)', op: CATS }, { n: 'x.icone', rot: 'Ícone', op: ICO_SB },
              { n: 'x.flag', rot: 'Sinal para os alertas do topo', op: [['', 'Nenhum'], ['aviso48', 'Aviso das 48h'], ['hdExpirado', 'HD expirado']] },
              { n: 'x.campos', rot: 'Campos mostrados (um por linha: Rótulo | Valor | ok/erro/atencao). Use $0 para o texto todo e $1… para trechos capturados', max: 1500, longo: 4 }] },
        { t: 'osi', rot: 'OSI', ajuda: 'Dá significado a linhas OSI (A3O/A4O).', teste: 'osi',
          cols: [['modo', 'Modo'], ['padrao', 'Texto'], ['titulo', 'Título']],
          campos: [{ n: 'modo', rot: 'Como procurar', op: MODOS }, { n: 'padrao', rot: 'Texto procurado', max: 300 }, { n: 'titulo', rot: 'Título exibido', max: 200 }, { n: 'descricao', rot: 'Significado', max: 800, longo: 3 },
              { n: 'x.screac', rot: 'Indica alteração de malha (conta como involuntária)', sn: 1 }] },
        { t: 'ssr', rot: 'Tipos de SSR', ajuda: 'Acrescenta um rótulo e um ícone a certos tipos de SSR (ex.: WCHR → Cadeira de rodas).', teste: 'ssr',
          cols: [['modo', 'Modo'], ['padrao', 'Tipo SSR'], ['titulo', 'Rótulo']],
          campos: [{ n: 'modo', rot: 'Como procurar', op: MODOS }, { n: 'padrao', rot: 'Tipo do SSR (ex.: WC, PETC)', max: 40, up: 1 }, { n: 'titulo', rot: 'Rótulo que aparece entre parênteses', max: 80 }, { n: 'x.icone', rot: 'Ícone', op: ICO_SB }] },
        { t: 'tarifa', rot: 'Marcas de tarifa', ajuda: 'Código da marca (BRND) e o nome da tarifa (Basic, Light…).',
          cols: [['chave', 'Código'], ['titulo', 'Tarifa']], campos: [{ n: 'chave', rot: 'Código (2 letras)', max: 4, up: 1 }, { n: 'titulo', rot: 'Nome da tarifa', max: 60 }] },
        { t: 'assento_attr', rot: 'Posição do assento', ajuda: 'Letras que descrevem o assento (NW = janela…).',
          cols: [['chave', 'Código'], ['titulo', 'Posição']], campos: [{ n: 'chave', rot: 'Código', max: 4, up: 1 }, { n: 'titulo', rot: 'Texto', max: 60 }] },
        { t: 'ax_status', rot: 'Status de serviço pago', ajuda: 'Status dos serviços pagos (HD, HI, HK…).',
          cols: [['chave', 'Código'], ['titulo', 'Texto']], campos: [{ n: 'chave', rot: 'Código', max: 4, up: 1 }, { n: 'titulo', rot: 'Texto', max: 80 }] },
        { t: 'traducao_pax', rot: 'Siglas de passageiro', ajuda: 'Troca siglas por palavras (ADT → Adulto).', teste: 'traducao_pax',
          cols: [['padrao', 'Siglas'], ['titulo', 'Vira']], campos: [{ n: 'padrao', rot: 'Siglas (separe por vírgula)', max: 100, up: 1 }, { n: 'titulo', rot: 'Texto novo', max: 60 }] },
        { t: 'traducao_remark', rot: 'Traduções de remark', ajuda: 'Troca textos de remarks genéricos por frases mais claras.', teste: 'traducao_remark',
          cols: [['modo', 'Modo'], ['padrao', 'Texto'], ['titulo', 'Vira']],
          campos: [{ n: 'modo', rot: 'Como procurar', op: [['contem', 'Contém'], ['regex', 'Avançado (expressão regular)']] }, { n: 'padrao', rot: 'Texto procurado', max: 200 }, { n: 'titulo', rot: 'Substituir por', max: 200 }] },
        { t: 'alerta', rot: 'Alertas do topo', ajuda: 'Caixas coloridas no começo do resultado. "Sinal" é o nome interno; os sinais noshow, ndc, elite, protecao, codeshare_lx, hdExpirado e reemissao são acionados pelo sistema. Para criar um alerta novo, escolha um sinal novo e preencha "Disparar quando a linha…". Use {valor} para o dado do sinal.', teste: 'alerta',
          cols: [['chave', 'Sinal'], ['titulo', 'Título'], ['cor', 'Cor'], ['padrao', 'Dispara com']],
          campos: [{ n: 'chave', rot: 'Sinal (sem espaço, ex.: meu_alerta)', max: 40 }, { n: 'titulo', rot: 'Título', max: 120 }, { n: 'descricao', rot: 'Texto do alerta', max: 600, longo: 3 }, { n: 'cor', rot: 'Cor', op: ALERTA }, { n: 'x.icone', rot: 'Ícone', op: ICO_SB },
              { n: 'modo', rot: 'Disparar quando a linha do histórico…', op: MODOS }, { n: 'padrao', rot: '…este texto (deixe vazio se o sistema aciona sozinho)', max: 300, opc: 1 }] },
        { t: 'indicio', rot: 'Indícios', ajuda: 'Avisos de leitura assistida que aparecem quando alguém de certo tipo mexeu na reserva. Use {sig} para a assinatura e {dt} para a data.',
          cols: [['chave', 'Quando atuou'], ['titulo', 'Título'], ['cor', 'Cor']],
          campos: [{ n: 'chave', rot: 'Tipo de quem alterou (o "Tipo interno" em Quem alterou, ex.: cpc)', max: 40 }, { n: 'titulo', rot: 'Título', max: 150 }, { n: 'descricao', rot: 'Texto ({sig}, {dt})', max: 700, longo: 4 }, { n: 'cor', rot: 'Cor', op: ALERTA }, { n: 'x.icone', rot: 'Ícone', op: ICO_SB },
              { n: 'x.se_ausente', rot: 'Não mostrar se este outro tipo também atuou (opcional)', max: 40, opc: 1 }, { n: 'x.sig_padrao', rot: 'Texto quando não há assinatura (opcional)', max: 40, opc: 1 }] }
    ];
    var sbTipo = 'status', sbBusca = '';
    function sbGet(r, n) { if (n.indexOf('x.') === 0) { var v = (r.extra || {})[n.slice(2)]; return v == null ? '' : v; } return r[n] == null ? '' : r[n]; }
    function sbRot(cfg, n, v) { var c = cfg.campos.filter(function (x) { return x.n === n; })[0]; var op = c && c.op; if (op) { var o = op.filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : v; } return v; }
    function camposParaTexto(a) { return (Array.isArray(a) ? a : []).map(function (c) { return [c.l, c.v, ({ 'v-ok': 'ok', 'v-err': 'erro', 'v-warn': 'atencao' })[c.vcls] || ''].join(' | ').replace(/ \| $/, ''); }).join('\n'); }
    function textoParaCampos(t) { return String(t || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) { var p = l.split('|').map(function (x) { return x.trim(); }); var o = { l: p[0], v: p[1] || '' }; var k = ({ ok: 'v-ok', erro: 'v-err', atencao: 'v-warn' })[p[2]]; if (k) o.vcls = k; return o; }); }
    function sbAtualizarSite() { return window.SabreRegrasCarregar ? window.SabreRegrasCarregar() : Promise.resolve(); }
    function sbErro(e) { if (e && e.code === '23505') return 'Já existe uma regra com este código neste tipo.'; return erro(e); }

    function sbForm(cfg, r, aoSalvar) {
        var corpo = el('form', 'cm-form'), campos = {}, aviso = el('p', 'ger-msg'); aviso.hidden = true;
        corpo.appendChild(el('p', 'ger-hint', cfg.ajuda));
        cfg.campos.forEach(function (c) {
            var v = r ? sbGet(r, c.n) : (c.op ? c.op[0][0] : ''); var f;
            if (c.sn) f = C.caixa(c.rot, r ? !!v : false);
            else if (c.op) f = C.seletor(c.rot, c.op, r ? v : c.op[0][0]);
            else { if (c.n === 'x.campos') v = r ? camposParaTexto(v) : ''; f = C.campo(c.rot, String(v), c.max || 200, c.ph || '', c.longo || 0); }
            campos[c.n] = f; corpo.appendChild(f.n);
        });
        var ordemF = null; if (SB_ORDENADO[cfg.t]) { ordemF = C.campo('Ordem (número menor aparece/vale primeiro)', r ? String(r.ordem) : '', 6, 'ex.: 55'); corpo.appendChild(ordemF.n); }
        var ativa = C.caixa('Regra ativa (desmarque para desligar sem apagar)', r ? r.ativo : true); corpo.appendChild(ativa.n);
        var ok = el('button', 'btn btn--primary btn--sm'); ok.type = 'submit'; ok.appendChild(C.icon('check', true)); ok.appendChild(el('span', null, r ? 'Salvar alterações' : 'Adicionar regra'));
        corpo.appendChild(aviso); corpo.appendChild(ok);
        corpo.addEventListener('submit', async function (e) {
            e.preventDefault(); aviso.hidden = true;
            var row = { tipo: cfg.t, chave: '', titulo: '', descricao: '', cor: '', modo: 'contem', padrao: '', padrao2: '', extra: Object.assign({}, r && r.extra), ativo: ativa.get() };
            for (var i = 0; i < cfg.campos.length; i++) {
                var c = cfg.campos[i], f = campos[c.n], v = c.sn ? f.get() : f.get();
                if (typeof v === 'string') { v = v.trim(); if (c.up) v = v.toUpperCase(); }
                if (c.n.indexOf('x.') === 0) {
                    var k = c.n.slice(2);
                    if (c.n === 'x.campos') v = textoParaCampos(v);
                    if (v === '' || v === false || (Array.isArray(v) && !v.length)) delete row.extra[k]; else row.extra[k] = v;
                } else row[c.n] = v;
            }
            if (row.extra.k && !/^[a-z0-9_]{1,30}$/.test(row.extra.k)) return C.aviso(aviso, 'O "Tipo interno" só pode ter letras minúsculas, números e _ (sem espaço).');
            if (cfg.t === 'alerta' || cfg.t === 'indicio') { if (!/^[A-Za-z0-9_]{1,40}$/.test(row.chave)) return C.aviso(aviso, 'O sinal/tipo só pode ter letras, números e _ (sem espaço).'); }
            if (row.modo === 'regex' && row.padrao) { try { new RegExp(row.padrao, 'i'); } catch (x) { return C.aviso(aviso, 'Expressão avançada inválida: ' + x.message); } }
            if (cfg.t === 'traducao_remark' && row.modo === 'regex') { try { new RegExp(row.padrao); } catch (x2) { return C.aviso(aviso, 'Expressão inválida: ' + x2.message); } }
            if (cfg.t === 'traducao_pax') row.modo = 'palavra';
            if (cfg.t === 'status' && !row.cor) row.cor = 'b-gray';
            if (ordemF) { var o = ordemF.get(); if (o !== '' && !/^\d{1,5}$/.test(o)) return C.aviso(aviso, 'A ordem deve ser um número inteiro.'); row.ordem = o === '' ? (r ? r.ordem : 0) : +o; if (o === '' && !r) row.ordem = (aoSalvar.maxOrdem || 0) + 10; }
            else row.ordem = r ? r.ordem : (aoSalvar.maxOrdem || 0) + 10;
            ok.disabled = true;
            var x = r ? await sb().from('sabre_regras').update(row).eq('id', r.id) : await sb().from('sabre_regras').insert(row);
            ok.disabled = false;
            if (x.error) return C.aviso(aviso, sbErro(x.error));
            C.fecharModal(); await sbAtualizarSite(); aoSalvar.fn(r ? 'Regra salva.' : 'Regra adicionada.');
        });
        C.abrirModal((r ? 'Editar' : 'Adicionar') + ' · ' + cfg.rot, r ? 'pencil' : 'plus', corpo, true);
    }

    /* ---------- Agente Sabre: pacote completo (regras + código + estilo + ajustes) ---------- */
    var TIPOS_VALIDOS = SB_TIPOS.map(function (x) { return x.t; });
    var KV_TIPOS = ['status', 'aeroporto', 'acao', 'ax_status', 'assento_attr', 'tarifa', 'robo'];
    var COLS_REGRA = ['tipo', 'chave', 'titulo', 'descricao', 'cor', 'modo', 'padrao', 'padrao2', 'extra', 'ordem', 'ativo'];
    var COLS_MOD = ['nome', 'tipo', 'descricao', 'codigo', 'ordem', 'ativo'];
    var EXEMPLO_JS = '/* Exemplo de módulo do Agente Sabre. Apague o que não usar.\n   Ganchos disponíveis: ' + (window.SabreCore ? window.SabreCore.ganchos.join(', ') : '') + ' */\n\n' +
        '// 1) Texto colado: ajusta antes de analisar (devolva o texto novo)\nSabre.hook(\'antes\', function (texto) { return texto; });\n\n' +
        '// 2) Linha do histórico: devolva um evento para criar um tipo de linha novo, {ignorar:true} para descartar, ou nada para seguir o normal\nSabre.hook(\'linha\', function (l) {\n  if (/^ZZZ\\s/.test(l)) return { cat: \'cat-remark\', icone: \'info\', titulo: \'Linha ZZZ\', sub: l.slice(4, 80), selo: \'ZZZ\', corSelo: \'b-blue\', campos: [{ l: \'Conteúdo\', v: l.slice(4) }] };\n});\n\n' +
        '// 3) Quem alterou: devolva {k, rot, grupo, cls, robo, desc} ou nada\n// Sabre.hook(\'ator\', function (assinatura, textoR, escritorio) { });\n\n' +
        '// 4) Remark: devolva {titulo, cat, icone, campos:[{l,v}], flag} ou nada\n// Sabre.hook(\'remark\', function (texto) { });\n\n' +
        '// 5) Depois de ler tudo: acrescente indícios aos fatos\n// Sabre.hook(\'fatos\', function (f) { f.indicios.push({ cls: \'alert-blue\', ico: \'info\', t: \'Título\', d: \'Texto\' }); });\n\n' +
        '// 6) Alertas do topo: devolva uma lista [{cls, icone, titulo, desc}]\n// Sabre.hook(\'alertas\', function (flags, fatos) { return []; });\n\n' +
        '// 7) Depois de desenhar o resultado na tela (pode mexer no DOM)\n// Sabre.hook(\'depois\', function (dados) { });\n\n' +
        '// Ajustes rápidos: Sabre.configurar({ larguraSabre: 56, maxIgnoradas: 300, rotuloFuso: \'Tulsa\' });\n';
    var MOD_ROT = { js: 'Código (JavaScript)', css: 'Estilo (CSS)', config: 'Ajustes (JSON)' };
    function compilaJs(cod) { try { new Function('Sabre', '"use strict";\n' + cod); return ''; } catch (e) { return e.message; } }
    function validaModulo(m) {
        if (!m || typeof m.nome !== 'string' || !m.nome.trim() || m.nome.length > 80) return 'nome inválido';
        if (['js', 'css', 'config'].indexOf(m.tipo) < 0) return 'tipo inválido em "' + m.nome + '"';
        if (typeof m.codigo !== 'string' || m.codigo.length > 200000) return 'código ausente ou grande demais em "' + m.nome + '"';
        if (m.tipo === 'js') { var e = compilaJs(m.codigo); if (e) return 'erro de sintaxe em "' + m.nome + '": ' + e; }
        if (m.tipo === 'config') { try { var o = JSON.parse(m.codigo); if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('precisa ser um objeto'); } catch (x) { return 'ajustes inválidos em "' + m.nome + '": ' + x.message; } }
        return '';
    }
    function validaRegra(r) {
        if (!r || TIPOS_VALIDOS.indexOf(r.tipo) < 0) return 'tipo de regra desconhecido: ' + (r && r.tipo);
        if (r.modo === 'regex' && r.padrao) { try { new RegExp(r.padrao, 'i'); } catch (e) { return 'expressão inválida em "' + (r.titulo || r.padrao) + '"'; } }
        return '';
    }
    async function pacoteBaixar() {
        var a = await sb().from('sabre_regras').select(COLS_REGRA.join(',')).order('tipo').order('ordem').limit(5000); if (a.error) return msg(sbErro(a.error), false);
        var m = await sb().from('sabre_modulos').select(COLS_MOD.join(',')).order('ordem').order('nome').limit(500);
        var mods = m.error ? [] : m.data;
        baixar('pacote-agente-sabre-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ formato: 'agente-sabre-pacote', versao: 2, gerado_em: new Date().toISOString(), regras: a.data, modulos: mods }, null, 1));
        msg('Pacote baixado: ' + a.data.length + ' regra(s) e ' + mods.length + ' módulo(s).' + (m.error ? ' (A tabela de módulos não existe: rode o SQL 10.)' : ''), true);
    }
    async function lerArquivoJson(arq) { try { return JSON.parse(await arq.text()); } catch (e) { return null; } }
    function pacoteImportar(pacote) {
        var regras = Array.isArray(pacote) ? pacote : (pacote && Array.isArray(pacote.regras) ? pacote.regras : []);
        var mods = (!Array.isArray(pacote) && pacote && Array.isArray(pacote.modulos)) ? pacote.modulos : [];
        if (!regras.length && !mods.length) return msg('Arquivo inválido: use um pacote baixado por este painel.', false);
        var problemas = []; regras.forEach(function (r) { var e = validaRegra(r); if (e) problemas.push(e); }); mods.forEach(function (m) { var e = validaModulo(m); if (e) problemas.push(e); });
        if (problemas.length) return msg('Importação cancelada, nada foi alterado. Problemas: ' + problemas.slice(0, 5).join('; ') + (problemas.length > 5 ? ' (+' + (problemas.length - 5) + ')' : ''), false);
        var nJs = mods.filter(function (m) { return m.tipo === 'js'; }).length, nCss = mods.filter(function (m) { return m.tipo === 'css'; }).length, nCfg = mods.filter(function (m) { return m.tipo === 'config'; }).length;
        var corpo = el('form', 'cm-form');
        corpo.appendChild(el('p', 'ger-hint', 'O arquivo tem ' + regras.length + ' regra(s), ' + nJs + ' módulo(s) de código, ' + nCss + ' de estilo e ' + nCfg + ' de ajustes. Tudo foi conferido (sintaxe e expressões) antes de mostrar esta janela.'));
        var oque = C.seletor('O que importar', [['tudo', 'Tudo (regras + código + estilo + ajustes)'], ['regras', 'Só as regras'], ['modulos', 'Só código, estilo e ajustes']], 'tudo');
        var como = C.seletor('Como importar', [['substituir', 'Substituir: apaga o que existe e coloca o do arquivo'], ['somar', 'Somar: mantém o que existe; regras de código/chave iguais e módulos de mesmo nome são atualizados']], 'substituir');
        corpo.appendChild(oque.n); corpo.appendChild(como.n);
        var ciente = null;
        if (nJs) { ciente = C.caixa('Entendo que o código JavaScript do arquivo vai rodar no navegador de TODAS as pessoas que abrirem o site, e que li o código.', false); corpo.appendChild(ciente.n); }
        var av = el('p', 'ger-msg'); av.hidden = true; var ok = el('button', 'btn btn--primary btn--sm'); ok.type = 'submit'; ok.appendChild(C.icon('upload', true)); ok.appendChild(el('span', null, 'Importar'));
        corpo.appendChild(av); corpo.appendChild(ok);
        corpo.addEventListener('submit', async function (e) {
            e.preventDefault(); av.hidden = true;
            var fazR = oque.get() !== 'modulos', fazM = oque.get() !== 'regras', subst = como.get() === 'substituir';
            if (fazM && nJs && !ciente.get()) return C.aviso(av, 'Marque a confirmação sobre o código antes de importar.');
            if (subst && !window.confirm('Substituir significa APAGAR o que existe hoje nas partes escolhidas. Baixe um pacote antes se quiser guardar a versão atual. Continuar?')) return;
            ok.disabled = true;
            try {
                if (fazR && regras.length) {
                    var rows = regras.map(function (x) { var o = {}; COLS_REGRA.forEach(function (k) { if (x[k] !== undefined) o[k] = x[k]; }); return o; });
                    if (subst) { var d = await sb().from('sabre_regras').delete().not('id', 'is', null); if (d.error) throw d.error; }
                    if (!subst) {
                        var porTipo = {}; rows.forEach(function (x) { if (KV_TIPOS.indexOf(x.tipo) >= 0) (porTipo[x.tipo] = porTipo[x.tipo] || []).push(x.chave); });
                        for (var t in porTipo) { var d2 = await sb().from('sabre_regras').delete().eq('tipo', t).in('chave', porTipo[t]); if (d2.error) throw d2.error; }
                    }
                    for (var i = 0; i < rows.length; i += 200) { var x = await sb().from('sabre_regras').insert(rows.slice(i, i + 200)); if (x.error) throw x.error; }
                }
                if (fazM) {
                    var ms = mods.map(function (x) { var o = {}; COLS_MOD.forEach(function (k) { if (x[k] !== undefined) o[k] = x[k]; }); return o; });
                    if (subst) { var d3 = await sb().from('sabre_modulos').delete().not('id', 'is', null); if (d3.error) throw d3.error; }
                    else if (ms.length) { var d4 = await sb().from('sabre_modulos').delete().in('nome', ms.map(function (m) { return m.nome; })); if (d4.error) throw d4.error; }
                    if (ms.length) { var y = await sb().from('sabre_modulos').insert(ms); if (y.error) throw y.error; }
                }
            } catch (err) { ok.disabled = false; return C.aviso(av, 'Falha na importação (pode ter ficado parcial — importe o arquivo de novo): ' + sbErro(err)); }
            C.fecharModal(); await sbAtualizarSite(); desenhar().then(function () { msg('Pacote importado e aplicado.', true); });
        });
        C.abrirModal('Importar pacote do Agente Sabre', 'upload', corpo, true);
    }
    function botoesPacote(barra) {
        barra.appendChild(btn('Baixar pacote completo', 'download', pacoteBaixar));
        var arq = el('input'); arq.type = 'file'; arq.accept = 'application/json,.json'; arq.hidden = true;
        arq.addEventListener('change', async function () { var f = arq.files[0]; arq.value = ''; if (!f) return; var j = await lerArquivoJson(f); if (!j) return msg('Arquivo inválido: não é um JSON.', false); pacoteImportar(j); });
        barra.appendChild(btn('Importar pacote', 'upload', function () { arq.click(); })); barra.appendChild(arq);
    }

    function moduloForm(m, depois) {
        var corpo = el('form', 'cm-form'), av = el('p', 'ger-msg'); av.hidden = true;
        var nome = C.campo('Nome do módulo (único)', m ? m.nome : '', 80, 'ex.: ajustes-de-cor');
        var tipo = C.seletor('Tipo', [['js', MOD_ROT.js + ' — muda o raciocínio'], ['css', MOD_ROT.css + ' — muda o visual'], ['config', MOD_ROT.config + ' — largura de linha, rótulo do fuso…']], m ? m.tipo : 'js');
        if (m) tipo.i.disabled = true;
        var desc = C.campo('Descrição (para a equipe)', m ? m.descricao : '', 600, '', 2);
        var ordem = C.campo('Ordem de execução (menor roda primeiro)', m ? String(m.ordem) : '', 6, 'ex.: 100');
        var cod = C.campo('Código', m ? m.codigo : EXEMPLO_JS, 200000, '', 18); cod.i.classList.add('dev-json'); cod.i.spellcheck = false;
        tipo.i.addEventListener('change', function () { if (m) return; var v = tipo.get(); if (cod.i.value === EXEMPLO_JS || cod.i.value === '{\n "larguraSabre": 56,\n "maxIgnoradas": 300,\n "rotuloFuso": "Tulsa"\n}' || !cod.i.value) cod.i.value = v === 'js' ? EXEMPLO_JS : (v === 'config' ? '{\n "larguraSabre": 56,\n "maxIgnoradas": 300,\n "rotuloFuso": "Tulsa"\n}' : '/* Estilo extra do Agente Sabre */\n.sb-tbl th { letter-spacing: 0.04em; }\n'); });
        var ativo = C.caixa('Módulo ativo (desmarque para desligar sem apagar)', m ? m.ativo : true);
        [nome.n, tipo.n, desc.n, ordem.n, cod.n, ativo.n].forEach(function (n) { corpo.appendChild(n); });
        corpo.appendChild(el('p', 'ger-hint', 'Código JavaScript roda no navegador de todos que abrirem o site. Em caso de problema, abra o site com ?sabre=padrao no final do endereço para ignorar tudo isto.'));
        var ok = el('button', 'btn btn--primary btn--sm'); ok.type = 'submit'; ok.appendChild(C.icon('check', true)); ok.appendChild(el('span', null, m ? 'Salvar módulo' : 'Adicionar módulo'));
        corpo.appendChild(av); corpo.appendChild(ok);
        corpo.addEventListener('submit', async function (e) {
            e.preventDefault(); av.hidden = true;
            var row = { nome: nome.get(), tipo: tipo.get(), descricao: desc.get(), codigo: cod.i.value, ativo: ativo.get() };
            var o = ordem.get(); if (o !== '' && !/^\d{1,5}$/.test(o)) return C.aviso(av, 'A ordem deve ser um número inteiro.'); row.ordem = o === '' ? (m ? m.ordem : 100) : +o;
            var er = validaModulo(row); if (er) return C.aviso(av, 'Não salvei: ' + er + '.');
            ok.disabled = true;
            var x = m ? await sb().from('sabre_modulos').update(row).eq('id', m.id) : await sb().from('sabre_modulos').insert(row);
            ok.disabled = false; if (x.error) return C.aviso(av, x.error.code === '23505' ? 'Já existe um módulo com este nome.' : sbErro(x.error));
            C.fecharModal(); await sbAtualizarSite(); depois(m ? 'Módulo salvo e aplicado.' : 'Módulo adicionado e aplicado.');
        });
        C.abrirModal((m ? 'Editar' : 'Novo') + ' módulo', m ? 'pencil' : 'plus', corpo, true);
    }
    async function sabreCodigo(c) {
        c.appendChild(el('p', 'ger-hint', 'Aqui ficam o raciocínio (JavaScript), o estilo (CSS) e os ajustes (JSON) do Agente Sabre. Módulos ativos rodam para todos na próxima vez que a página abrir. Salvar aplica na hora nesta página.'));
        var det = el('details', 'dev-novo'); det.appendChild(el('summary', null, 'Como escrever um módulo de código (ganchos)'));
        var pre = el('pre', 'dev-json'); pre.textContent = EXEMPLO_JS + '\n// Também disponíveis em Sabre: esc, fmtMoeda, fmtCpf, routeHtml, iataFull, stInfo, transPax, cleanRemark, parseDtSabre,\n// regras, dicionarios, classificarAtor, classificarRemark, classificarOsi, icones, config, erros.\n// Ícones aceitos: ' + (window.SabreCore ? window.SabreCore.icones.join(', ') : '') + '.';
        pre.style.minHeight = '0'; pre.style.maxHeight = '320px'; pre.style.overflow = 'auto'; det.appendChild(pre); c.appendChild(det);
        var r = await sb().from('sabre_modulos').select('*').order('ordem').order('nome').limit(500);
        if (r.error) { c.appendChild(el('p', 'ger-msg', /sabre_modulos/.test(r.error.message || '') ? 'A tabela sabre_modulos ainda não existe: rode o arquivo 10-agente-sabre-modulos.sql no Supabase.' : erro(r.error))); return; }
        var depois = function (m) { desenhar().then(function () { msg(m, true); }); };
        var barra = el('div', 'dev-acoes dev-acoes--linha'); barra.appendChild(btn('Novo módulo', 'plus', function () { moduloForm(null, depois); }, 'btn btn--primary btn--sm')); botoesPacote(barra); c.appendChild(barra);
        var errs = window.SabreCore ? window.SabreCore.hooksErros() : [];
        if (errs.length) c.appendChild(el('p', 'ger-msg', 'Módulos com erro nesta página (foram desligados): ' + errs.map(function (x) { return x.modulo + ' (' + x.gancho + '): ' + x.erro; }).join(' · ')));
        if (window.SabreModoSeguro) c.appendChild(el('p', 'ger-msg', 'Esta página foi aberta em modo seguro (?sabre=padrao): nada do banco está sendo aplicado.'));
        var t = tabela(['Nome', 'Tipo', 'Ativo', 'Tamanho', 'Descrição', '']); c.appendChild(t.n);
        (r.data || []).forEach(function (m) {
            var tr = el('tr'); if (!m.ativo) tr.style.opacity = '0.55';
            celula(tr, m.nome, 'Nome'); celula(tr, MOD_ROT[m.tipo], 'Tipo'); celula(tr, m.ativo ? 'Sim' : 'Não', 'Ativo'); celula(tr, m.codigo.length + ' car.', 'Tamanho'); celula(tr, (m.descricao || '').slice(0, 100), 'Descrição');
            var ac = el('div', 'dev-acoes');
            var ed = btn('', 'pencil', function () { moduloForm(m, depois); }, 'ger-ico-btn'); ed.title = 'Editar'; ed.setAttribute('aria-label', 'Editar'); ac.appendChild(ed);
            var ap = btn('', 'trash-2', async function () {
                if (!window.confirm('Apagar o módulo "' + m.nome + '"? Baixe um pacote antes se quiser guardar uma cópia.')) return;
                var d = await sb().from('sabre_modulos').delete().eq('id', m.id); if (d.error) return msg(sbErro(d.error), false);
                await sbAtualizarSite(); depois('Módulo apagado.');
            }, 'ger-ico-btn'); ap.title = 'Apagar'; ap.setAttribute('aria-label', 'Apagar'); ac.appendChild(ap);
            celula(tr, ac); t.corpo.appendChild(tr);
        });
        if (!(r.data || []).length) { t.n.hidden = true; c.appendChild(el('p', 'ger-hint', 'Nenhum módulo ainda. Use "Novo módulo" ou "Importar pacote".')); }
    }

    async function sabre(c) {
        c.appendChild(titulo('Agente Sabre — regras', 'Tudo o que o Sabre usa para interpretar o histórico fica aqui: códigos, quem alterou, remarks, alertas… Mudanças valem para todos assim que a pessoa recarregar a página. O que não está nestas listas (a leitura das linhas do SABRE em si) continua no código.'));
        var cfg = SB_TIPOS.filter(function (x) { return x.t === sbTipo; })[0] || SB_TIPOS[0];
        var nav = el('div', 'dev-nav dev-nav--sub');
        SB_TIPOS.concat([{ t: '_codigo', rot: 'Código e estilo' }]).forEach(function (x) { var b = el('button', 'dev-nav-btn' + (x.t === sbTipo ? ' is-on' : ''), x.rot); b.type = 'button'; b.addEventListener('click', function () { sbTipo = x.t; sbBusca = ''; desenhar(); }); nav.appendChild(b); });
        c.appendChild(nav);
        if (sbTipo === '_codigo') return sabreCodigo(c);
        var r = await sb().from('sabre_regras').select('*').eq('tipo', cfg.t).order('ordem').order('chave').limit(2000);
        if (r.error) { c.appendChild(el('p', 'ger-msg', /sabre_regras/.test(r.error.message || '') ? 'A tabela sabre_regras ainda não existe: rode o arquivo 9-agente-sabre-regras.sql no Supabase.' : erro(r.error))); return; }
        var dados = r.data || [], maxOrdem = dados.reduce(function (m, x) { return Math.max(m, x.ordem || 0); }, 0);
        c.appendChild(el('p', 'ger-hint', cfg.ajuda));
        var barra = el('div', 'dev-acoes dev-acoes--linha'), busca = el('input', 'login-input'); busca.type = 'search'; busca.placeholder = 'Buscar nesta lista…'; busca.value = sbBusca; busca.style.maxWidth = '280px'; busca.setAttribute('aria-label', 'Buscar nesta lista');
        barra.appendChild(busca);
        var depois = { maxOrdem: maxOrdem, fn: function (m) { desenhar().then(function () { msg(m, true); }); } };
        barra.appendChild(btn('Nova regra', 'plus', function () { sbForm(cfg, null, depois); }, 'btn btn--primary btn--sm'));
        barra.appendChild(btn('Restaurar padrão de fábrica deste tipo', 'history', async function () {
            if (!window.confirm('Apagar as regras de "' + cfg.rot + '" e voltar às que vêm de fábrica? Suas alterações neste tipo serão perdidas.')) return;
            var pad = window.SabreCore.padroes().filter(function (x) { return x.tipo === cfg.t; });
            var d = await sb().from('sabre_regras').delete().eq('tipo', cfg.t); if (d.error) return msg(sbErro(d.error), false);
            if (pad.length) { pad.forEach(function (x) { delete x.ativo; }); var i = await sb().from('sabre_regras').insert(pad); if (i.error) return msg(sbErro(i.error), false); }
            await sbAtualizarSite(); desenhar().then(function () { msg('Padrão de fábrica restaurado (' + pad.length + ' regra(s)).', true); });
        }, 'btn btn--outline btn--sm'));
        botoesPacote(barra);
        c.appendChild(barra);

        if (cfg.teste) {
            var tb = el('div', 'dev-novo'); tb.appendChild(el('p', 'ger-hint', 'Teste: digite um exemplo e veja o que as regras salvas fazem com ele.'));
            var a = el('input', 'login-input'); a.type = 'text'; a.maxLength = 300; a.placeholder = cfg.teste === 'ator' ? 'Código da assinatura (ex.: QOC1ABC)' : 'Texto de exemplo (ex.: CNL DUE AE HD EXPIRED)'; a.setAttribute('aria-label', 'Texto do teste');
            var b2 = null; if (cfg.teste === 'ator') { b2 = el('input', 'login-input'); b2.type = 'text'; b2.maxLength = 200; b2.placeholder = 'Texto do R- (opcional)'; b2.setAttribute('aria-label', 'Texto do R-'); }
            var res = el('p', 'ger-hint'); res.setAttribute('aria-live', 'polite');
            var rodar = btn('Testar', 'check', function () { var x = window.SabreCore.testar(cfg.teste, a.value, b2 ? b2.value : ''); res.textContent = (x.ok ? '✔ ' : '✖ ') + x.texto; });
            a.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); rodar.click(); } });
            tb.appendChild(a); if (b2) tb.appendChild(b2); tb.appendChild(rodar); tb.appendChild(res); c.appendChild(tb);
        }

        var t = tabela(cfg.cols.map(function (x) { return x[1]; }).concat(['Ativa', ''])); c.appendChild(t.n);
        var vazio = el('p', 'ger-hint', 'Nenhuma regra neste tipo. Use "Nova regra" ou "Restaurar padrão de fábrica".'); c.appendChild(vazio);
        function lista() {
            t.corpo.textContent = ''; var q = busca.value.trim().toLowerCase(), n = 0;
            dados.forEach(function (x, idx) {
                var txt = cfg.cols.map(function (cl) { return String(sbGet(x, cl[0])); }).join(' ').toLowerCase(); if (q && txt.indexOf(q) < 0) return; n++;
                var tr = el('tr'); if (!x.ativo) tr.style.opacity = '0.55';
                cfg.cols.forEach(function (cl) { var v = sbGet(x, cl[0]); if (cl[0] === 'cor' || cl[0] === 'modo') v = sbRot(cfg, cl[0], v) || v; if (cl[0] === 'x.cat') v = sbRot(cfg, 'x.cat', v); celula(tr, String(v).slice(0, 140), cl[1]); });
                celula(tr, x.ativo ? 'Sim' : 'Não', 'Ativa');
                var ac = el('div', 'dev-acoes');
                if (SB_ORDENADO[cfg.t] && !q) {
                    [['chevron-up', 'Subir', -1], ['chevron-down', 'Descer', 1]].forEach(function (m) {
                        var viz = dados[idx + m[2]]; var b = btn('', m[0], async function () {
                            if (!viz) return; b.disabled = true;
                            var o1 = x.ordem, o2 = viz.ordem; if (o1 === o2) { o2 = o1 + m[2]; }
                            var u1 = await sb().from('sabre_regras').update({ ordem: o2 }).eq('id', x.id), u2 = await sb().from('sabre_regras').update({ ordem: o1 }).eq('id', viz.id);
                            if (u1.error || u2.error) { b.disabled = false; return msg(sbErro(u1.error || u2.error), false); }
                            await sbAtualizarSite(); desenhar();
                        }, 'ger-ico-btn'); b.title = m[1]; b.setAttribute('aria-label', m[1]); if (!viz) b.disabled = true; ac.appendChild(b);
                    });
                }
                var ed = btn('', 'pencil', function () { sbForm(cfg, x, depois); }, 'ger-ico-btn'); ed.title = 'Editar'; ed.setAttribute('aria-label', 'Editar'); ac.appendChild(ed);
                var ap = btn('', 'trash-2', async function () {
                    if (!window.confirm('Apagar esta regra? Dá para recuperá-la depois só pelo "Restaurar padrão" (se for de fábrica).')) return;
                    var d = await sb().from('sabre_regras').delete().eq('id', x.id); if (d.error) return msg(sbErro(d.error), false);
                    await sbAtualizarSite(); desenhar().then(function () { msg('Regra apagada.', true); });
                }, 'ger-ico-btn'); ap.title = 'Apagar'; ap.setAttribute('aria-label', 'Apagar'); ac.appendChild(ap);
                celula(tr, ac); t.corpo.appendChild(tr);
            });
            vazio.hidden = n > 0; t.n.hidden = n === 0;
        }
        busca.addEventListener('input', function () { sbBusca = busca.value; lista(); });
        lista();
    }

    async function transparencia(c) { if (!window.PortalTransparencia) { c.appendChild(el('p', 'ger-msg', 'Módulo da Transparência não carregado.')); return; } await window.PortalTransparencia.editor(c, msg); }

    /* ---------- formulários e planilhas (a tela fica em 17-formularios-admin.js) ---------- */
    var subForm = 'criar';
    async function formularios(c) {
        var FA = window.PortalFormsAdmin; if (!FA) { c.appendChild(el('p', 'ger-msg', 'Módulo de formulários não carregado.')); return; }
        var nav = el('div', 'dev-nav dev-nav--sub'), corpo = el('div'); c.appendChild(nav); c.appendChild(corpo);
        function pintar() { nav.textContent = ''; [['criar', 'Criar e editar', 'pencil'], ['resp', 'Respostas', 'list-checks']].forEach(function (a) { var b = el('button', 'dev-nav-btn' + (a[0] === subForm ? ' is-on' : '')); b.type = 'button'; b.appendChild(C.icon(a[2], true)); b.appendChild(el('span', null, a[1])); b.addEventListener('click', function () { subForm = a[0]; pintar(); }); nav.appendChild(b); }); corpo.textContent = ''; (subForm === 'criar' ? FA.construtor(corpo) : FA.respostas(corpo)); }
        pintar();
    }
    async function planilhas(c) { var FA = window.PortalFormsAdmin; if (!FA) { c.appendChild(el('p', 'ger-msg', 'Módulo de planilhas não carregado.')); return; } FA.planilhas(c, true); }

    async function mensagens(c) { if (!window.PortalMensagens) { c.appendChild(el('p', 'ger-msg', 'Módulo de mensagens não carregado.')); return; } await window.PortalMensagens.painel(c); }

    /* ---------- estrutura do painel ---------- */
    var SECOES = [['equipe', 'Equipe', 'users-round', equipe], ['permissoes', 'Permissões', 'key-round', permissoes], ['abas', 'Abas e portais', 'layers', abas], ['aparencia', 'Aparência', 'sparkles', aparencia],
        ['textos', 'Textos do site', 'pencil-line', textos], ['fluxos', 'Fluxos', 'workflow', fluxos], ['sabre', 'Agente Sabre', 'bot', sabre], ['transparencia', 'Transparência', 'shield-check', transparencia], ['formularios', 'Formulários', 'list-checks', formularios], ['planilhas', 'Planilhas', 'layers', planilhas], ['mensagens', 'Mensagens', 'megaphone', mensagens], ['backup', 'Backup', 'vault', backup], ['historico', 'Histórico', 'history', historico]];
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
        var sk = window.PortalSkeleton ? window.PortalSkeleton.painel('tabela') : null; if (sk) c.appendChild(sk);
        try { await fn(c); } catch (e) { console.error('[dev]', e); c.appendChild(el('p', 'ger-msg', 'Erro ao abrir esta seção: ' + (e.message || e))); }
        if (sk && sk.parentNode) sk.parentNode.removeChild(sk);
    }
    var ultimo = -1;
    document.addEventListener('portal:conteudo', function () {
        var n = C.nivel(); if (n === ultimo && document.getElementById('dev') && document.getElementById('dev').hidden) return;
        if (n !== ultimo) { ultimo = n; if (n >= 3) desenhar(); else root.textContent = ''; }
    });
    document.addEventListener('click', function (e) { var b = e.target.closest('[data-tab="dev"]'); if (b && C.nivel() >= 3) desenhar(); });
})();
