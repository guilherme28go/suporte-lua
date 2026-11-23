/* ==========================================================================
   EDITOR DE TEXTO "COMO NO WORD"
   Troca os campos em que era preciso escrever código (HTML ou **markdown**) por uma caixa com
   barra de formatação: Negrito, Itálico, Listas, Link, Título, Destaque, Desfazer.
   Usado na Transparência (formato "html") e nos textos dos cartões dos portais (formato "md").
     PortalEditorRico.criar({ rotulo, valor, formato: 'md' | 'html', max, linhas, aviso })
       -> { n: elemento para a tela, i: a área editável, get(): texto salvo, set(v) }
   • formato "md": guarda **negrito**, *itálico*, [texto](https://link) e listas com "- " (igual ao que o portal já lê)
   • formato "html": guarda HTML limpo (só tags seguras; o 18-transparencia.js limpa de novo ao exibir)
   O usuário nunca precisa ver código; quem quiser ainda pode abrir "Editar como código" (só no formato html).
   ========================================================================== */
(function () {
    'use strict';
    var C = window.PortalCore; if (!C) return;
    var el = C.el;

    /* ---------- markdown <-> HTML ---------- */
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function inlineParaHtml(t) {
        return esc(t)
            .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, function (m, a, u) { return '<a href="' + u.replace(/"/g, '%22') + '">' + a + '</a>'; })
            .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    }
    function mdParaHtml(md) {
        var out = [];
        String(md || '').replace(/\r/g, '').split(/\n{2,}/).forEach(function (bloco) {
            var linhas = bloco.split('\n').filter(function (l) { return l.trim(); }); if (!linhas.length) return;
            if (linhas.every(function (l) { return /^\s*[-•]\s+/.test(l); })) out.push('<ul>' + linhas.map(function (l) { return '<li>' + inlineParaHtml(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; }).join('') + '</ul>');
            else out.push('<p>' + linhas.map(inlineParaHtml).join('<br>') + '</p>');
        });
        return out.join('');
    }
    function inlineParaMd(no) {
        var s = '';
        [].slice.call(no.childNodes).forEach(function (n) {
            if (n.nodeType === 3) { s += n.nodeValue.replace(/ /g, ' '); return; }
            if (n.nodeType !== 1) return;
            var t = n.tagName, d = inlineParaMd(n);
            if (t === 'BR') s += '\n';
            else if (t === 'B' || t === 'STRONG') s += d.trim() ? '**' + d.replace(/\*/g, '') + '**' : d;
            else if (t === 'I' || t === 'EM') s += d.trim() ? '*' + d.replace(/\*/g, '') + '*' : d;
            else if (t === 'A') { var u = C.urlSegura(n.getAttribute('href') || ''); s += (u && /^https?:/i.test(u) && d.trim()) ? '[' + d.replace(/[\[\]]/g, '') + '](' + u + ')' : d; }
            else if (t === 'UL' || t === 'OL' || t === 'P' || t === 'DIV') s += '\n' + d + '\n';
            else s += d;
        });
        return s;
    }
    function htmlParaMd(raiz) {
        var blocos = [], solto = '';
        function fechaSolto() { if (solto.trim()) blocos.push(solto.replace(/\n{2,}/g, '\n').trim()); solto = ''; }
        [].slice.call(raiz.childNodes).forEach(function (n) {
            if (n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) {
                fechaSolto();
                var itens = [].slice.call(n.children).filter(function (li) { return li.tagName === 'LI'; }).map(function (li) { return '- ' + inlineParaMd(li).replace(/\s*\n\s*/g, ' ').trim(); }).filter(function (l) { return l.length > 2; });
                if (itens.length) blocos.push(itens.join('\n'));
            } else if (n.nodeType === 1 && (n.tagName === 'P' || n.tagName === 'DIV' || /^H\d$/.test(n.tagName))) {
                fechaSolto();
                var temLista = n.querySelector && n.querySelector('ul,ol');
                if (temLista) { blocos.push(htmlParaMd(n)); } else { var t = inlineParaMd(n).replace(/\n{2,}/g, '\n').trim(); if (t) blocos.push(t); }
            } else solto += n.nodeType === 3 ? n.nodeValue.replace(/ /g, ' ') : (n.nodeType === 1 ? inlineParaMd({ childNodes: [n] }) : '');
        });
        fechaSolto();
        return blocos.join('\n\n');
    }

    /* ---------- editor ---------- */
    function criar(o) {
        o = o || {}; var formato = o.formato === 'html' ? 'html' : 'md', max = o.max || 60000, valor = o.valor || '';
        var d = el('div', 'lf re-campo'), l = el('label', null, o.rotulo || 'Texto'), id = 're' + Math.random().toString(36).slice(2, 9); l.htmlFor = id; d.appendChild(l);
        var caixa = el('div', 're-wrap'), barra = el('div', 're-bar'); barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Formatação do texto');
        var area = el('div', 're-area' + (formato === 'html' ? ' tr-card' : ' cm-md')); area.id = id; area.contentEditable = 'true'; area.setAttribute('role', 'textbox'); area.setAttribute('aria-multiline', 'true'); area.spellcheck = true;
        area.style.minHeight = Math.max(90, (o.linhas || 6) * 24) + 'px';
        var cod = el('textarea', 'login-input cm-area dev-json re-cod'); cod.hidden = true; cod.spellcheck = false; cod.rows = o.linhas || 10; cod.maxLength = max;
        var modoCodigo = false;

        function limparHtml(h) {
            var tmp = document.createElement('div');
            if (formato === 'html' && window.PortalTransparencia) { tmp.appendChild(window.PortalTransparencia.sanitizar(h)); return tmp.innerHTML; }
            tmp.innerHTML = h; return tmp.innerHTML;
        }
        function set(v) {
            if (formato === 'md') area.innerHTML = mdParaHtml(v);
            else area.innerHTML = limparHtml(v);
            if (!area.innerHTML.trim()) area.innerHTML = '<p><br></p>';
        }
        function get() {
            if (modoCodigo) return cod.value.trim();
            if (formato === 'md') return htmlParaMd(area).trim().slice(0, max);
            var t = limparHtml(area.innerHTML).replace(/<p><br><\/p>/g, '').replace(/&nbsp;/g, ' ').trim();
            return t.slice(0, max);
        }
        function foco() { area.focus(); }
        function cmd(c, v) { foco(); try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* ignora */ } document.execCommand(c, false, v == null ? null : v); atualizar(); }
        function blocoAtual() {
            var s = window.getSelection(), n = s && s.anchorNode; if (!n) return null;
            while (n && n !== area) { if (n.nodeType === 1 && /^(P|DIV|H4|H5|LI|BLOCKQUOTE)$/.test(n.tagName)) return n; n = n.parentNode; }
            return null;
        }
        function botao(rot, dica, fn, cls) {
            var b = el('button', 're-btn' + (cls ? ' ' + cls : ''), rot); b.type = 'button'; b.title = dica; b.setAttribute('aria-label', dica);
            b.addEventListener('mousedown', function (e) { e.preventDefault(); });   /* não tira o cursor do texto */
            b.addEventListener('click', function () { if (!modoCodigo) fn(); }); barra.appendChild(b); return b;
        }
        function sep() { barra.appendChild(el('span', 're-sep')); }
        var marcas = {};
        marcas.b = botao('N', 'Negrito (Ctrl+B)', function () { cmd('bold'); }, 're-btn--b');
        marcas.i = botao('I', 'Itálico (Ctrl+I)', function () { cmd('italic'); }, 're-btn--i');
        sep();
        botao('• Lista', 'Lista com marcadores', function () { cmd('insertUnorderedList'); });
        if (formato === 'html') botao('1. Lista', 'Lista numerada', function () { cmd('insertOrderedList'); });
        sep();
        botao('Link', 'Transformar o texto selecionado em link', function () {
            var s = window.getSelection(); if (!s || s.isCollapsed || !area.contains(s.anchorNode)) { alert('Selecione primeiro o texto que vai virar link.'); return; }
            var salvo = s.getRangeAt(0).cloneRange(), u = window.prompt('Endereço do link (começa com https://):', 'https://'); if (!u) return;
            u = u.trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, '');
            if (!C.urlSegura(u)) { alert('Esse endereço não é válido.'); return; }
            s.removeAllRanges(); s.addRange(salvo); cmd('createLink', u);
        });
        botao('Tirar link', 'Remover o link do texto selecionado', function () { cmd('unlink'); });
        if (formato === 'html') {
            sep();
            botao('Título', 'Transformar o parágrafo em título', function () { var b = blocoAtual(); cmd('formatBlock', b && b.tagName === 'H4' ? 'P' : 'H4'); });
            botao('Destaque', 'Caixa de destaque no parágrafo (liga/desliga)', function () { var b = blocoAtual(); if (b && b.tagName === 'P') { b.classList.toggle('tr-note'); if (!b.className) b.removeAttribute('class'); } else if (b && b.tagName === 'DIV') { cmd('formatBlock', 'P'); b = blocoAtual(); if (b) b.classList.add('tr-note'); } atualizar(); });
        }
        sep();
        botao('Limpar', 'Tirar a formatação do texto selecionado', function () { cmd('removeFormat'); });
        botao('↶', 'Desfazer (Ctrl+Z)', function () { cmd('undo'); }, 're-btn--ic');
        botao('↷', 'Refazer (Ctrl+Y)', function () { cmd('redo'); }, 're-btn--ic');
        if (formato === 'html') {
            var tg = botao('Editar como código', 'Modo avançado: editar o HTML direto', function () { }, 're-btn--cod'); tg.style.marginLeft = 'auto';
            tg.addEventListener('click', function () {
                modoCodigo = !modoCodigo;
                if (modoCodigo) { cod.value = get_visual(); area.hidden = true; cod.hidden = false; tg.textContent = 'Voltar ao editor'; barra.classList.add('is-cod'); }
                else { set(cod.value); cod.hidden = true; area.hidden = false; tg.textContent = 'Editar como código'; barra.classList.remove('is-cod'); }
            });
        }
        function get_visual() { var t = limparHtml(area.innerHTML).replace(/<p><br><\/p>/g, '').replace(/&nbsp;/g, ' ').trim(); return t; }
        function atualizar() {
            try { if (marcas.b) marcas.b.classList.toggle('is-on', document.queryCommandState('bold')); if (marcas.i) marcas.i.classList.toggle('is-on', document.queryCommandState('italic')); } catch (e) { /* ignora */ }
        }
        area.addEventListener('keyup', atualizar); area.addEventListener('mouseup', atualizar); area.addEventListener('focus', function () { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignora */ } });
        area.addEventListener('paste', function (e) {   /* cola só o texto, sem trazer fontes e cores de outros lugares */
            e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text/plain'); document.execCommand('insertText', false, t);
        });
        area.addEventListener('input', function () { if (area.textContent.length > max) { /* limite de segurança */ area.textContent = area.textContent.slice(0, max); } });

        caixa.appendChild(barra); caixa.appendChild(area); caixa.appendChild(cod); d.appendChild(caixa);
        if (o.aviso) d.appendChild(el('p', 'ger-hint', o.aviso));
        set(valor);
        return { n: d, i: area, get: get, set: set };
    }

    window.PortalEditorRico = { criar: criar, mdParaHtml: mdParaHtml, htmlParaMd: htmlParaMd };
})();
