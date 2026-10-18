/* ==========================================================================
   REGRAS DO AGENTE SABRE (vêm da tabela sabre_regras do banco)
   Ao abrir o site, aplica a cópia guardada no navegador (rápido) e depois busca
   a versão atual no banco. Se o banco não responder, o Sabre usa as regras de
   fábrica que já vêm no código (02-app.js). Os desenvolvedores mudam as regras
   em Desenvolvedor > Agente Sabre.
   ========================================================================== */
(function () {
    'use strict';
    var CHAVE = 'suporteLua.sabreRegras.v1', COLS = 'tipo,chave,titulo,descricao,cor,modo,padrao,padrao2,extra,ordem,ativo';
    var pronto = false;

    function aplicar(rows) { if (window.SabreCore && rows && rows.length) { try { window.SabreCore.aplicarRegras(rows); } catch (e) { console.error('[sabre] regras inválidas, usando as de fábrica', e); try { window.SabreCore.aplicarRegras(window.SabreCore.padroes()); } catch (e2) { /* ignora */ } return false; } return true; } return false; }

    try { var c = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (c && c.length) aplicar(c); } catch (e) { /* sem cópia local */ }

    async function buscar() {
        var sb = window.suporteLuaSb; if (!sb) return false;
        var todas = [], de = 0;
        for (var i = 0; i < 20; i++) {
            var r = await sb.from('sabre_regras').select(COLS).eq('ativo', true).order('tipo').order('ordem').range(de, de + 999);
            if (r.error) return false;
            todas = todas.concat(r.data || []); if (!r.data || r.data.length < 1000) break; de += 1000;
        }
        if (!todas.length) return false;
        if (!aplicar(todas)) return false;
        try { localStorage.setItem(CHAVE, JSON.stringify(todas)); } catch (e) { /* ignora */ }
        pronto = true; return true;
    }
    window.SabreRegrasCarregar = buscar;

    var tent = 0;
    (function tentar() {
        if (pronto || tent++ > 20) return;
        buscar().then(function (ok) { if (!ok) setTimeout(tentar, 1500); }, function () { setTimeout(tentar, 1500); });
    })();
    document.addEventListener('suporteLua:auth', function () { buscar(); });
})();
