/* Formatação de texto compatível com o Google Chat + modelo automático das anotações.
   Marcação usada nos textos (é o que o Chat entende, mais a cor, que só vale aqui no portal):
     *negrito*   _itálico_   ~tachado~   {c:vermelho}texto colorido{/c}
   Ao copiar, as cores são retiradas (o Google Chat não tem cor de texto) e o resto segue igual.
   Modelo automático: {Nome}, {CPF}... (rótulo do campo) são trocados pelo que foi preenchido; linha cujos campos estão todos vazios some. */
(function () {
    'use strict';
    var CORES = { vermelho: '#c62828', laranja: '#d35400', verde: '#2e7d32', azul: '#1565c0', roxo: '#6a1b9a', cinza: '#616161' };
    var M0 = '', M1 = '';
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function norm(t) { return String(t || '').trim().toLowerCase(); }

    /* troca {Rótulo} por marcadores; devolve { texto, valores[] } (linhas sem nada preenchido saem) */
    function preencher(modelo, campos) {
        var mapa = {}; (campos || []).forEach(function (c) { mapa[norm(c.rot)] = c; });
        var valores = [];
        var linhas = String(modelo || '').replace(/\r/g, '').split('\n').map(function (ln) {
            var achou = 0, vazios = 0;
            var out = ln.replace(/\{([^{}\n]{1,60})\}/g, function (m, nome) {
                if (/^c:|^\/c$/.test(nome)) return m;
                var c = mapa[norm(nome)]; if (!c) return m;
                achou++; var v = String(c.valor || '').trim(); if (!v) { vazios++; return ''; }
                valores.push(v); return M0 + (valores.length - 1) + M1;
            });
            return { out: out, drop: achou > 0 && vazios === achou };
        });
        return { texto: linhas.filter(function (l) { return !l.drop; }).map(function (l) { return l.out; }).join('\n').replace(/\n{3,}/g, '\n\n').trim(), valores: valores };
    }
    function volta(t, valores, fn) { return t.replace(new RegExp(M0 + '(\\d+)' + M1, 'g'), function (m, i) { return fn(valores[+i] || ''); }); }

    /* HTML seguro para a pré-visualização */
    function paraHtml(texto, valores) {
        var h = esc(texto);
        h = h.replace(/\{c:([a-z]+)\}([\s\S]*?)\{\/c\}/g, function (m, c, t) { return CORES[c] ? '<span style="color:' + CORES[c] + '">' + t + '</span>' : t; });
        h = h.replace(/\*(?=\S)([^*\n]*?\S)\*/g, '<strong>$1</strong>');
        h = h.replace(/(^|[\s>(])_(?=\S)([^_\n]*?\S)_(?=$|[\s<.,;:!?)])/g, '$1<em>$2</em>');
        h = h.replace(/~(?=\S)([^~\n]*?\S)~/g, '<s>$1</s>');
        return volta(h, valores || [], esc);
    }
    /* texto para colar no Google Chat: sem as cores, valores no lugar */
    function paraChat(texto, valores) {
        var t = String(texto || '').replace(/\{c:[a-z]+\}/g, '').replace(/\{\/c\}/g, '');
        return volta(t, valores || [], function (v) { return v; }).trim();
    }
    /* atalhos: texto livre (sem campos) e modelo preenchido */
    function livre(texto) { return { html: paraHtml(texto, []), chat: paraChat(texto, []) }; }
    function modelo(modeloTxt, campos) { var p = preencher(modeloTxt, campos); return { html: paraHtml(p.texto, p.valores), chat: paraChat(p.texto, p.valores), vazio: !p.texto }; }

    /* aplica negrito/itálico/cor à seleção de um textarea */
    function aplicar(ta, tipo, cor) {
        var a = ta.selectionStart, b = ta.selectionEnd, v = ta.value, sel = v.slice(a, b), ab, fe, novo, ini, fim;
        if (tipo === 'cor') {
            var limpo = sel.replace(/\{c:[a-z]+\}/g, '').replace(/\{\/c\}/g, '');
            if (!sel) return; novo = cor ? '{c:' + cor + '}' + limpo + '{/c}' : limpo;
            ta.value = v.slice(0, a) + novo + v.slice(b); ta.setSelectionRange(a, a + novo.length);
        } else {
            var m = tipo === 'b' ? '*' : tipo === 'i' ? '_' : '~';
            if (sel.length > 1 && sel[0] === m && sel[sel.length - 1] === m) novo = sel.slice(1, -1);
            else if (v[a - 1] === m && v[b] === m) { ta.value = v.slice(0, a - 1) + sel + v.slice(b + 1); ta.setSelectionRange(a - 1, b - 1); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); return; }
            else novo = m + sel + m;
            ta.value = v.slice(0, a) + novo + v.slice(b);
            if (!sel) ta.setSelectionRange(a + 1, a + 1); else ta.setSelectionRange(a, a + novo.length);
        }
        ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
    }
    function inserir(ta, txt) {
        var a = ta.selectionStart, b = ta.selectionEnd; ta.value = ta.value.slice(0, a) + txt + ta.value.slice(b);
        ta.setSelectionRange(a + txt.length, a + txt.length); ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
    }
    window.PortalTextoChat = { CORES: CORES, livre: livre, modelo: modelo, preencher: preencher, paraHtml: paraHtml, paraChat: paraChat, aplicar: aplicar, inserir: inserir };
})();
