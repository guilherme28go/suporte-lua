/* Preferências por login (anotações personalizadas, som do alarme...).
   - Guarda sempre uma cópia neste navegador (separada por usuário, para duas pessoas no mesmo computador não se misturarem).
   - Com o login feito, também grava na conta (tabela usuario_prefs, SQL 22), então as configurações acompanham a pessoa em qualquer aparelho.
   - Se a tabela ainda não existir, tudo continua funcionando só neste navegador.
   Uso: PortalPrefs.ler('chave') / PortalPrefs.salvar('chave', valor) / PortalPrefs.aoMudar(fn) / PortalPrefs.logado() */
(function () {
    'use strict';
    var uid = null, dados = {}, ouvintes = [], timer = null, semTabela = false, seq = 0;
    function sb() { return window.suporteLuaSb || null; }
    function chave() { return 'suporteLuaPrefs:' + (uid || 'anon'); }
    function lerLocal() { try { var o = JSON.parse(localStorage.getItem(chave()) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
    function gravarLocal() { try { localStorage.setItem(chave(), JSON.stringify(dados)); } catch (e) { /* sem armazenamento */ } }
    function logado() { return !!(window.suporteLuaPerfil && uid); }
    function avisar() { ouvintes.slice().forEach(function (f) { try { f(); } catch (e) { /* um ouvinte não derruba os outros */ } }); }

    async function identificar() {
        uid = null; var c = sb(); if (!window.suporteLuaPerfil || !c) return;
        try { var r = await c.auth.getSession(); uid = (r && r.data && r.data.session && r.data.session.user && r.data.session.user.id) || null; } catch (e) { uid = null; }
    }
    async function enviar() {
        var c = sb(); if (!logado() || !c || semTabela) return;
        try {
            var r = await c.from('usuario_prefs').upsert([{ user_id: uid, prefs: dados, atualizado_em: new Date().toISOString() }], { onConflict: 'user_id' });
            if (r && r.error && /usuario_prefs|does not exist|schema cache/i.test(r.error.message || '')) semTabela = true;
        } catch (e) { /* tenta de novo na próxima alteração */ }
    }
    async function puxar(minha) {
        var c = sb(); if (!logado() || !c || semTabela) return;
        var r; try { r = await c.from('usuario_prefs').select('prefs').eq('user_id', uid).maybeSingle(); } catch (e) { return; }
        if (minha !== seq) return; /* o login mudou enquanto buscava */
        if (r.error) { if (/usuario_prefs|does not exist|schema cache/i.test(r.error.message || '')) semTabela = true; return; }
        var remoto = r.data && r.data.prefs && typeof r.data.prefs === 'object' ? r.data.prefs : null;
        if (remoto) { Object.keys(remoto).forEach(function (k) { dados[k] = remoto[k]; }); gravarLocal(); avisar(); }
        /* o que só existe neste navegador sobe para a conta (primeiro login depois da novidade) */
        if (Object.keys(dados).some(function (k) { return !remoto || !(k in remoto); })) enviar();
    }
    async function trocar() {
        var minha = ++seq; await identificar(); if (minha !== seq) return;
        dados = lerLocal(); avisar(); puxar(minha);
    }
    window.PortalPrefs = {
        logado: logado,
        ler: function (k, padrao) { return k in dados ? dados[k] : padrao; },
        salvar: function (k, v) { dados[k] = v; gravarLocal(); if (logado()) { clearTimeout(timer); timer = setTimeout(enviar, 700); } },
        aoMudar: function (f) { if (typeof f === 'function') ouvintes.push(f); },
        /* true quando a gravação na conta não é possível (tabela ainda não criada) */
        soLocal: function () { return semTabela; }
    };
    dados = lerLocal();
    document.addEventListener('suporteLua:auth', trocar);
    trocar();
})();
