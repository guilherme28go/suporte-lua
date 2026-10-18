/* ==========================================================================
   AGENTE SABRE: regras, módulos de código, estilo e ajustes vindos do banco
   (tabelas sabre_regras e sabre_modulos; painel Desenvolvedor > Agente Sabre).
   • Ao abrir o site aplica a cópia das regras guardada no navegador (rápido) e
     depois busca a versão atual no banco.
   • Se o banco não responder, o Sabre usa as regras de fábrica do 02-app.js.
   • Botão de emergência: abra o site com  ?sabre=padrao  na URL para ignorar
     tudo o que veio do banco (regras, código e estilo).
   ========================================================================== */
(function () {
    'use strict';
    var CHAVE = 'suporteLua.sabreRegras.v1', COLS = 'tipo,chave,titulo,descricao,cor,modo,padrao,padrao2,extra,ordem,ativo';
    var seguro = /[?&]sabre=padrao(&|$)/.test(location.search);
    var pronto = false, estilo = null;
    window.SabreModoSeguro = seguro;

    function aplicar(rows) { if (window.SabreCore && rows && rows.length) { try { window.SabreCore.aplicarRegras(rows); } catch (e) { console.error('[sabre] regras inválidas, usando as de fábrica', e); try { window.SabreCore.aplicarRegras(window.SabreCore.padroes()); } catch (e2) { /* ignora */ } return false; } return true; } return false; }

    if (seguro) { console.warn('[sabre] modo seguro (?sabre=padrao): regras, código e estilo do banco ignorados.'); return; }
    try { var c = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (c && c.length) aplicar(c); } catch (e) { /* sem cópia local */ }

    function aplicarModulos(lista) {
        var core = window.SabreCore; if (!core) return;
        core.limparHooks();
        if (estilo && estilo.parentNode) estilo.parentNode.removeChild(estilo); estilo = null;
        var css = [];
        (lista || []).forEach(function (m) {
            if (m.tipo === 'css') css.push('/* ' + m.nome + ' */\n' + m.codigo);
            else if (m.tipo === 'config') { try { core.executarModulo(m.nome, 'Sabre.configurar(' + JSON.stringify(JSON.parse(m.codigo)) + ');'); } catch (e) { console.error('[sabre] ajustes inválidos em "' + m.nome + '"', e); } }
            else if (m.tipo === 'js') { try { core.executarModulo(m.nome, m.codigo); } catch (e) { core.removerModulo(m.nome); console.error('[sabre] módulo "' + m.nome + '" falhou ao carregar e foi ignorado:', e); if (typeof showToast === 'function') try { showToast('O módulo "' + m.nome + '" do Agente Sabre falhou e foi ignorado.'); } catch (x) { /* ignora */ } } }
        });
        if (css.length) { estilo = document.createElement('style'); estilo.id = 'sabre-css-modulos'; estilo.textContent = css.join('\n\n'); document.head.appendChild(estilo); }
    }

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
        var m = await sb.from('sabre_modulos').select('nome,tipo,codigo,ordem').eq('ativo', true).order('ordem').order('nome').limit(200);
        if (!m.error) aplicarModulos(m.data || []);   /* tabela ausente (SQL 10 não rodado): segue só com as regras */
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
