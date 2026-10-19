/* ==========================================================================
   MENSAGENS DE ADMINISTRADORES / DESENVOLVEDORES PARA OS AGENTES
   Quem envia (nível 2+) escolhe: ícone, título, texto, estilo (cor), formato
   (faixa no topo, balão no canto ou janela no centro), quem recebe e por quanto
   tempo a mensagem fica visível. Depois do prazo ela some sozinha.
   - Quem recebe: lê só pela função mensagens_para_mim() (o banco decide);
     o portal consulta ao entrar, a cada minuto e quando a aba volta ao foco.
   - Painel de envio: window.PortalMensagens.painel(host)
   Usa só textContent (nada de HTML vindo do banco).
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore; if (!C) return;
    var el = C.el;
    function sb() { return C.sb(); }
    function um(d) { return Array.isArray(d) ? d[0] : d; }
    function erro(e) { return C.erroBanco ? C.erroBanco(e) : 'Erro: ' + ((e && e.message) || e); }
    function btn(txt, ic, fn, cls) { var b = el('button', cls || 'btn btn--outline btn--sm'); b.type = 'button'; if (ic) b.appendChild(C.icon(ic, true)); b.appendChild(el('span', null, txt)); b.addEventListener('click', fn); return b; }

    var ESTILOS = [['info', 'Informação (azul)'], ['sucesso', 'Boa notícia (verde)'], ['alerta', 'Atenção (âmbar)'], ['urgente', 'Urgente (vermelho)']];
    var FORMATOS = [['balao', 'Balão no canto da tela'], ['faixa', 'Faixa no topo da página'], ['janela', 'Janela no centro (exige "Entendi")']];
    var DESTINOS = [['todos', 'Todo mundo que estiver logado'], ['agentes', 'Só quem tem o papel de agente'], ['bps', 'Só estes BPs…']];
    var PRAZOS = [[5, '5 minutos'], [15, '15 minutos'], [30, '30 minutos'], [60, '1 hora'], [120, '2 horas'], [240, '4 horas'], [480, '8 horas'], [1440, '1 dia'], [2880, '2 dias'], [4320, '3 dias'], [10080, '7 dias'], [21600, '15 dias'], [44640, '31 dias (máximo)']];
    var ESTILO_NOME = { info: 'Informação', sucesso: 'Boa notícia', alerta: 'Atenção', urgente: 'Urgente' }, FORMATO_NOME = { balao: 'Balão', faixa: 'Faixa', janela: 'Janela' };

    function quando(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    function restante(iso) {
        var ms = new Date(iso) - Date.now(); if (ms <= 0) return 'expirada'; var m = Math.round(ms / 60000);
        if (m < 60) return 'some em ' + Math.max(1, m) + ' min'; var h = Math.floor(m / 60); if (h < 48) return 'some em ' + h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); return 'some em ' + Math.round(h / 24) + ' dias';
    }

    /* ---------- o cartão da mensagem (usado de verdade e na prévia) ---------- */
    function cartao(m, aoFechar) {
        var n = el('div', 'msg msg--' + m.estilo + ' msg--' + m.formato);
        n.setAttribute('role', m.estilo === 'urgente' ? 'alert' : 'status'); if (m.formato === 'janela') n.setAttribute('aria-live', 'polite');
        var ic = el('span', 'msg-ic'); ic.appendChild(C.icon(m.icone || 'megaphone')); n.appendChild(ic);
        var corpo = el('div', 'msg-corpo'); if (m.titulo) corpo.appendChild(el('strong', 'msg-titulo', m.titulo)); corpo.appendChild(el('p', 'msg-texto', m.texto));
        var rod = el('div', 'msg-rodape'); rod.appendChild(el('span', 'msg-prazo', 'Visível até ' + quando(m.expira_em)));
        if (aoFechar && m.dispensavel) { var ok = el('button', 'msg-ok', 'Entendi'); ok.type = 'button'; ok.addEventListener('click', function () { aoFechar(); }); rod.appendChild(ok); }
        corpo.appendChild(rod); n.appendChild(corpo);
        if (aoFechar && m.dispensavel && m.formato !== 'janela') { var x = el('button', 'msg-x'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar mensagem'); x.title = 'Fechar'; x.appendChild(C.icon('x', true)); x.addEventListener('click', function () { aoFechar(); }); n.appendChild(x); }
        return n;
    }

    /* ---------- quem recebe ---------- */
    var ativos = {}, hFaixas = null, hBaloes = null, hJanela = null, janelaAtual = null, buscando = false, foco = null;
    function hosts() {
        if (!hFaixas) { hFaixas = el('div', 'msg-faixas'); hFaixas.id = 'msgFaixas'; document.body.insertBefore(hFaixas, document.body.firstChild); }
        if (!hBaloes) { hBaloes = el('div', 'msg-baloes'); hBaloes.id = 'msgBaloes'; document.body.appendChild(hBaloes); }
        if (!hJanela) { hJanela = el('div', 'msg-janela-fundo'); hJanela.id = 'msgJanela'; hJanela.hidden = true; document.body.appendChild(hJanela); }
    }
    function tirar(id) {
        var a = ativos[id]; if (!a) return; delete ativos[id]; if (a.no && a.no.parentNode) a.no.parentNode.removeChild(a.no);
        if (janelaAtual === id) { janelaAtual = null; hJanela.hidden = true; hJanela.textContent = ''; try { if (foco && foco.focus) foco.focus(); } catch (e) { /* ignora */ } foco = null; proximaJanela(); }
    }
    function fechar(id) { tirar(id); sb().rpc('mensagem_dispensar', { p_id: id }).then(function () { /* ok */ }, function () { /* ignora */ }); }
    function proximaJanela() {
        if (janelaAtual) return; var id = Object.keys(ativos).filter(function (k) { return ativos[k].m.formato === 'janela'; }).sort(function (a, b) { return ativos[a].ordem - ativos[b].ordem; })[0]; if (!id) return;
        var a = ativos[id]; janelaAtual = id; foco = document.activeElement; hJanela.textContent = ''; hJanela.hidden = false;
        var caixa = el('div', 'msg-janela'); caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-label', a.m.titulo || 'Mensagem'); caixa.appendChild(a.no); hJanela.appendChild(caixa);
        var ok = a.no.querySelector('.msg-ok'); if (ok) ok.focus();
    }
    function montar(m, ordem) {
        var a = { m: m, ordem: ordem, no: null }; ativos[m.id] = a; a.no = cartao(m, function () { fechar(m.id); });
        if (m.formato === 'faixa') hFaixas.appendChild(a.no); else if (m.formato === 'balao') hBaloes.appendChild(a.no); else proximaJanela();
    }
    function limpar() { Object.keys(ativos).forEach(tirar); }
    function podarVencidas() { Object.keys(ativos).forEach(function (id) { if (new Date(ativos[id].m.expira_em) <= Date.now()) tirar(id); }); }
    async function buscar() {
        if (buscando) return; if (!(window.suporteLuaNivel | 0) || !sb()) { if (!(window.suporteLuaNivel | 0)) limpar(); return; } buscando = true;
        try {
            hosts(); var r = await sb().rpc('mensagens_para_mim'); if (r.error) return; var lista = r.data || [], vivos = {};
            lista.forEach(function (m, i) { vivos[m.id] = 1; if (!ativos[m.id]) montar(m, i); else if (JSON.stringify(ativos[m.id].m) !== JSON.stringify(m)) { tirar(m.id); montar(m, i); } });
            Object.keys(ativos).forEach(function (id) { if (!vivos[id]) tirar(id); });
        } catch (e) { /* tenta no próximo ciclo */ } finally { buscando = false; }
    }
    document.addEventListener('suporteLua:auth', function () { limpar(); setTimeout(buscar, 700); });
    document.addEventListener('portal:mensagens', function () { setTimeout(buscar, 300); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) buscar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && janelaAtual && ativos[janelaAtual] && ativos[janelaAtual].m.dispensavel) fechar(janelaAtual); });
    setInterval(podarVencidas, 15000); setInterval(buscar, 60000); setTimeout(buscar, 1500);

    /* ---------- quem envia ---------- */
    async function painel(host) {
        host.textContent = ''; var aviso = el('p', 'bk-msg'); aviso.hidden = true; aviso.setAttribute('role', 'status'); host.appendChild(aviso);
        function dizer(t, ok) { aviso.hidden = !t; aviso.textContent = t || ''; aviso.className = 'bk-msg ' + (ok ? 'bk-msg--ok' : 'bk-msg--err'); }
        var intro = el('p', 'ger-hint', 'Escreva um recado para os agentes. Ele aparece para quem estiver logado em até 1 minuto e some sozinho no fim do prazo. Quem fecha com "Entendi" não vê de novo.'); host.appendChild(intro);
        var topo = el('div', 'pf-topo'); topo.appendChild(btn('Nova mensagem', 'plus', function () { editar(null); }, 'btn btn--primary btn--sm')); host.appendChild(topo);
        var r = await sb().from('portal_mensagens').select('*').order('criado_em', { ascending: false }).limit(100); if (r.error) { host.appendChild(el('p', 'ger-msg', erro(r.error))); return; }
        var lista = r.data || [], leu = {};
        if (lista.length) { var rl = await sb().from('portal_mensagens_lidas').select('mensagem_id').in('mensagem_id', lista.map(function (m) { return m.id; })); (rl.data || []).forEach(function (x) { leu[x.mensagem_id] = (leu[x.mensagem_id] || 0) + 1; }); }
        if (!lista.length) { host.appendChild(el('p', 'card-text', 'Nenhuma mensagem enviada ainda.')); return; }
        var t = el('div', 'table-card dev-table'), tb = el('table', 'dir-table'), th = el('thead'), tr = el('tr');
        ['Mensagem', 'Para', 'Visível até', 'Estado', 'Fecharam', ''].forEach(function (x) { var h = el('th', null, x); h.scope = 'col'; tr.appendChild(h); }); th.appendChild(tr); tb.appendChild(th); var b = el('tbody');
        lista.forEach(function (m) {
            var tr2 = el('tr'), vivo = m.ativo && new Date(m.expira_em) > Date.now();
            var c1 = el('td'), l1 = el('div', 'msg-lin'), ic = el('span', 'msg-mini msg-mini--' + m.estilo); ic.appendChild(C.icon(m.icone || 'megaphone', true)); l1.appendChild(ic);
            var tx = el('div'); tx.appendChild(el('strong', null, m.titulo || (m.texto.length > 50 ? m.texto.slice(0, 50) + '…' : m.texto))); tx.appendChild(el('div', 'ger-hint', ESTILO_NOME[m.estilo] + ' · ' + FORMATO_NOME[m.formato] + (m.titulo ? ' · ' + (m.texto.length > 70 ? m.texto.slice(0, 70) + '…' : m.texto) : ''))); l1.appendChild(tx); c1.appendChild(l1); tr2.appendChild(c1);
            tr2.appendChild(el('td', null, m.destino === 'todos' ? 'Todos os logados' : m.destino === 'agentes' ? 'Só agentes' : (m.bps.length + ' BP(s)')));
            tr2.appendChild(el('td', null, quando(m.expira_em)));
            var st = el('td'), pill = el('span', 'pf-pill'); pill.style.setProperty('--c', !m.ativo ? '#6b7280' : vivo ? '#16a34a' : '#d97706'); pill.textContent = !m.ativo ? 'Desligada' : vivo ? 'No ar · ' + restante(m.expira_em) : 'Expirada'; st.appendChild(pill); tr2.appendChild(st);
            tr2.appendChild(el('td', null, m.dispensavel ? String(leu[m.id] || 0) : '—'));
            var ac = el('td', 'cm-acoes'); ac.appendChild(btn('Editar', 'pencil', function () { editar(m); }));
            var ligavel = !m.ativo && new Date(m.expira_em) > Date.now();
            ac.appendChild(btn(vivo ? 'Tirar do ar' : (ligavel ? 'Ligar' : 'Reenviar'), vivo ? 'eye-off' : 'send', function () { if (vivo || ligavel) alternar(m); else editar(m, true); }));
            ac.appendChild(btn('Excluir', 'trash-2', async function () { if (!confirm('Excluir esta mensagem? Ela some para todos.')) return; var x = await sb().from('portal_mensagens').delete().eq('id', m.id); if (x.error) { dizer(erro(x.error)); return; } dizer('Mensagem excluída.', true); document.dispatchEvent(new CustomEvent('portal:mensagens')); painel(host); }));
            tr2.appendChild(ac); b.appendChild(tr2);
        }); tb.appendChild(b); t.appendChild(tb); host.appendChild(t);
        async function alternar(m) { var x = await sb().from('portal_mensagens').update({ ativo: !m.ativo }).eq('id', m.id).select(); if (x.error) { dizer(erro(x.error)); return; } dizer(m.ativo ? 'Mensagem tirada do ar.' : 'Mensagem ligada.', true); document.dispatchEvent(new CustomEvent('portal:mensagens')); painel(host); }

        /* editor: m = mensagem existente (ou null); reenviar = copia com novo prazo */
        function editar(m, reenviar) {
            var novo = !m || !!reenviar, w = m || { titulo: '', texto: '', icone: 'megaphone', estilo: 'info', formato: 'balao', destino: 'todos', bps: [], dispensavel: true };
            var box = el('div', 'pf-corpo'), lm = el('p', 'bk-msg'); lm.hidden = true;
            var ico = C.seletorIcone('Ícone', w.icone || 'megaphone'), tit = C.campo('Título (opcional)', w.titulo, 80, 'ex.: Mudança no fluxo de reembolso'), txt = C.campo('Mensagem', w.texto, 1000, 'Escreva o recado para os agentes…', 5);
            var es = C.seletor('Estilo', ESTILOS, w.estilo), fo = C.seletor('Como aparece', FORMATOS, w.formato), de = C.seletor('Quem recebe', DESTINOS, w.destino);
            var bpsC = C.campo('BPs (um por linha ou separados por vírgula)', (w.bps || []).join('\n'), 4000, '1234567\n7654321', 4);
            var opsPrazo = (novo ? [] : [['keep', 'Manter o prazo atual (até ' + quando(m.expira_em) + ')']]).concat(PRAZOS.map(function (p) { return [String(p[0]), (novo ? '' : 'Contar de agora: ') + p[1]]; })).concat([['custom', 'Outro tempo…']]);
            var pr = C.seletor('Por quanto tempo fica visível', opsPrazo, novo ? '1440' : 'keep');
            var cuN = el('input', 'login-input'); cuN.type = 'number'; cuN.min = '1'; cuN.value = '3'; cuN.setAttribute('aria-label', 'Quantidade'); var cuU = el('select', 'login-input'); cuU.setAttribute('aria-label', 'Unidade'); [['1', 'minutos'], ['60', 'horas'], ['1440', 'dias']].forEach(function (u) { var o = el('option', null, u[1]); o.value = u[0]; if (u[0] === '60') o.selected = true; cuU.appendChild(o); });
            var cu = el('div', 'lf msg-custom'); cu.appendChild(el('label', null, 'Tempo')); var cl = el('div', 'msg-custom-lin'); cl.appendChild(cuN); cl.appendChild(cuU); cu.appendChild(cl);
            var di = C.caixa('Quem recebe pode fechar com "Entendi"', w.dispensavel !== false), dica = el('p', 'ger-hint');
            var g = el('div', 'cm-grid'); g.appendChild(es.n); g.appendChild(fo.n);
            var previa = el('div', 'msg-previa'), prevT = el('p', 'ger-hint', 'Prévia (é assim que quem recebe vê):'), prevC = el('div', 'msg-previa-area');
            [ico.n, tit.n, txt.n, g, de.n, bpsC.n, pr.n, cu, di.n, dica, prevT, prevC].forEach(function (n) { box.appendChild(n); }); previa = prevC;
            function minutos() { var v = pr.get(); if (v === 'keep') return null; if (v === 'custom') return Math.round((+cuN.value || 0) * (+cuU.value)); return +v; }
            function lerBps() { var s = {}; (bpsC.get().match(/\d{3,12}/g) || []).forEach(function (x) { s[x] = 1; }); return Object.keys(s); }
            function atualizar() {
                bpsC.n.hidden = de.get() !== 'bps'; cu.hidden = pr.get() !== 'custom';
                var jan = fo.get() === 'janela'; var cb = di.n.querySelector('input'); if (jan) { cb.checked = true; cb.disabled = true; } else cb.disabled = false;
                dica.textContent = jan ? 'A janela bloqueia a tela até a pessoa clicar em "Entendi" (ou o prazo acabar), por isso ela sempre pode ser fechada.' : (cb.checked ? '' : 'Sem "Entendi", a mensagem fica na tela de todos até o prazo acabar. Use só quando for realmente necessário.');
                var min = minutos(); previa.textContent = ''; previa.appendChild(cartao({ titulo: tit.get(), texto: txt.get() || 'Sua mensagem aparece aqui.', icone: ico.get() || 'megaphone', estilo: es.get(), formato: fo.get(), dispensavel: cb.checked, expira_em: new Date(min == null ? m.expira_em : Date.now() + (min || 0) * 60000).toISOString() }));
            }
            box.addEventListener('input', atualizar); box.addEventListener('change', atualizar); box.addEventListener('click', function () { setTimeout(atualizar, 0); }); atualizar(); box.appendChild(lm);
            var ac = el('div', 'cm-acoes');
            ac.appendChild(btn(novo ? 'Enviar mensagem' : 'Salvar', 'send', async function () {
                lm.hidden = true; var er = '', min = minutos(), bps = lerBps();
                if (!txt.get()) er = 'Escreva a mensagem.'; else if (de.get() === 'bps' && !bps.length) er = 'Informe ao menos um BP (só números).'; else if (min != null && (!(min >= 1) || min > 44640)) er = 'O tempo precisa ficar entre 1 minuto e 31 dias.';
                if (er) { lm.textContent = er; lm.hidden = false; return; }
                var corpo = { titulo: tit.get(), texto: txt.get(), icone: ico.get() || 'megaphone', estilo: es.get(), formato: fo.get(), destino: de.get(), bps: de.get() === 'bps' ? bps : [], dispensavel: fo.get() === 'janela' ? true : di.get() };
                if (min != null) corpo.expira_em = new Date(Date.now() + min * 60000).toISOString();
                var x = novo ? await sb().from('portal_mensagens').insert(Object.assign({ ativo: true }, corpo)).select() : await sb().from('portal_mensagens').update(corpo).eq('id', m.id).select();
                if (x.error) { lm.textContent = erro(x.error); lm.hidden = false; return; }
                C.fecharModal(); C.toast(novo ? 'Mensagem enviada!' : 'Mensagem atualizada.'); document.dispatchEvent(new CustomEvent('portal:mensagens')); painel(host);
            }, 'btn btn--primary btn--sm')); ac.appendChild(btn('Cancelar', 'x', function () { C.fecharModal(); })); box.appendChild(ac);
            C.abrirModal(reenviar ? 'Reenviar mensagem' : (novo ? 'Nova mensagem' : 'Editar mensagem'), 'megaphone', box, true);
        }
    }
    window.PortalMensagens = { painel: painel, cartao: cartao };
})();
