/* Compartilhar sistema, formulário ou slide */
(function () {
    'use strict';
    var TIPOS = {
        sistemas: { nome: 'sistema', ico: 'monitor', acesso: 'Acessar o sistema' },
        forms: { nome: 'formulário', ico: 'clipboard-list', acesso: 'Abrir o formulário' },
        slides: { nome: 'slide', ico: 'presentation', acesso: 'Abrir o slide' }
    };
    var $ = function (id) { return document.getElementById(id); };
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function icon(n, sm) {
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic' + (sm ? ' ic--sm' : '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
        var u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + n); s.appendChild(u); return s;
    }
    function codificar(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function decodificar(t) {
        t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '=';
        return JSON.parse(decodeURIComponent(escape(atob(t))));
    }
    function tituloDe(card) { var h = card.querySelector('h3'); return h ? h.textContent.trim() : ''; }
    function achar(tipo, nome) {
        var cards = document.querySelectorAll('#' + tipo + ' .card');
        for (var i = 0; i < cards.length; i++) if (tituloDe(cards[i]) === nome) return cards[i];
        return null;
    }
    function linkDe(tipo, nome) {
        return window.location.href.split('#')[0] + '#compartilhado=' + codificar({ t: tipo, n: nome });
    }
    /* Mensagem pronta para colar: leva o link direto do passo a passo/documento, sem passar pelo portal */
    function linkDiretoDe(card) {
        var a = card.querySelector('.card-actions a[href]'), href = a ? (a.getAttribute('href') || '').trim() : '';
        if (!href || href === '#') return '';
        try { return new URL(href, window.location.href).href; } catch (e) { return href; }
    }
    function criadorDe(card) { return (card.getAttribute('data-criador') || '').trim(); }
    function textoDe(tipo, nome, card) {
        var direto = linkDiretoDe(card);
        var link = direto || linkDe(tipo, nome);   /* sem link cadastrado no card: usa o do portal, para não ir vazio */
        var t;
        if (tipo === 'sistemas') t = 'Estou compartilhando o link do sistema ' + nome + ' para seguir com o procedimento: ' + link;
        else if (tipo === 'forms') t = 'Estou compartilhando o link do documento ' + nome + ' para ser preenchido. Lembre-se que para fazer as alterações é necessário realizar uma cópia do arquivo.\n\n' + link;
        else { var cr = criadorDe(card); t = 'Estou lhe enviando o passo a passo para realizar ' + nome + (cr ? ', realizado por ' + cr : '') + ': ' + link; }
        return { texto: t, direto: !!direto };
    }
    /* diretório de telefones: texto com o setor e o(s) número(s) */
    function textoTelefone(tr) {
        var n = tr.querySelector('.name-cell > span:not(.row-ico)'), setor = n ? n.textContent.trim() : '';
        var nums = Array.prototype.map.call(tr.querySelectorAll('.phone-chip'), function (c) { return (c.getAttribute('data-copy') || c.textContent || '').trim(); }).filter(Boolean);
        return 'Estou lhe enviando o telefone do ' + setor + ' para compartilhar com o passageiro, direcione para ' + nums.join(' ou ') + '.';
    }
    function copiarMsg(b, ic, texto, aviso) {
        var ok = function () {
            b.classList.add('is-ok'); ic.firstChild.setAttribute('href', '#i-check'); setTimeout(function () { b.classList.remove('is-ok'); ic.firstChild.setAttribute('href', '#i-share-2'); }, 1800);
            if (typeof showToast === 'function') showToast(aviso);
        };
        var falha = function () { window.prompt('Copie a mensagem abaixo:', texto); };
        if (typeof copyText === 'function') copyText(texto).then(function (r) { if (r) ok(); else falha(); }); else falha();
    }

    /* botão de compartilhar: só existe enquanto a Gerência está liberada */
    function atualizar() {
        var adm = !!window.suporteLuaAdmin;
        if (!adm) document.querySelectorAll('.btn-share').forEach(function (b) { if (b.parentNode) b.parentNode.classList.remove('has-share'); b.remove(); });
        if (!adm) return;
        Object.keys(TIPOS).forEach(function (tipo) {
            document.querySelectorAll('#' + tipo + ' .card--system, #' + tipo + ' .card--form, #' + tipo + ' .card--slide').forEach(function (card) {
                var nome = tituloDe(card);
                if (!nome || card.querySelector(':scope > .btn-share')) return;
                var b = el('button', 'btn-share'); b.type = 'button';
                b.setAttribute('aria-label', 'Compartilhar: ' + nome); b.title = 'Copiar mensagem pronta para compartilhar';
                var ic = icon('share-2', true); b.appendChild(ic);
                b.addEventListener('click', function () {
                    var msg = textoDe(tipo, nome, card);
                    copiarMsg(b, ic, msg.texto, msg.direto ? 'Mensagem copiada! Envie ao agente.' : 'Mensagem copiada, mas este item não tem link cadastrado: foi usado o link do portal.');
                });
                card.classList.add('has-share'); card.appendChild(b);
            });
        });
        document.querySelectorAll('tbody tr').forEach(function (tr) {
            if (!tr.querySelector('.phone-chip') || tr.querySelector('.btn-share')) return;
            var nc = tr.querySelector('.name-cell'); if (!nc) return;
            var b = el('button', 'btn-share btn-share--inline'); b.type = 'button'; b.setAttribute('aria-label', 'Compartilhar telefone'); b.title = 'Copiar mensagem pronta com o telefone';
            var ic = icon('share-2', true); b.appendChild(ic);
            b.addEventListener('click', function () { copiarMsg(b, ic, textoTelefone(tr), 'Mensagem copiada! Envie ao agente.'); });
            nc.appendChild(b);
        });
    }
    window.suporteLuaShareRefresh = atualizar;

    /* tela que o agente vê ao abrir o link */
    var overlay = null, antes = [];
    function fechar(portalCompleto, tipo, card) {
        if (!overlay) return;
        overlay.remove(); overlay = null;
        antes.forEach(function (n) { n.removeAttribute('inert'); }); antes = [];
        document.body.style.overflow = '';
        try { window.history.replaceState(null, '', window.location.href.split('#')[0] + '#' + tipo); } catch (e) { /* ignora */ }
        if (portalCompleto && card) {
            card.scrollIntoView({ block: 'center', behavior: 'smooth' });
            card.classList.add('is-shared'); setTimeout(function () { card.classList.remove('is-shared'); }, 3500);
        }
    }
    function mostrarConvite(tipo, nome, card) {
        var t = TIPOS[tipo];
        var a = card.querySelector('.card-actions a[href]'), href = a ? a.getAttribute('href') : '';
        var temLink = !!href && href !== '#';
        if (typeof openTab === 'function') openTab(tipo, { initial: true });
        overlay = el('div', 'share-overlay'); overlay.id = 'shareOverlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'shareTit');
        var box = el('div', 'share-box');
        var ic = el('span', 'share-ico'); ic.appendChild(icon(t.ico)); box.appendChild(ic);
        box.appendChild(el('p', 'share-eyebrow', 'Compartilhado com você'));
        var h = el('h2', null, 'Foi compartilhado esse ' + t.nome + ' com você para acessar'); h.id = 'shareTit'; box.appendChild(h);
        box.appendChild(el('p', null, nome));
        var ac = el('div', 'share-actions'), ir;
        if (temLink) {
            ir = el('a', 'btn btn--primary'); ir.href = href; ir.target = '_blank'; ir.rel = 'noopener noreferrer';
            ir.appendChild(el('span', null, t.acesso)); ir.appendChild(icon('arrow-up-right', true));
        } else {
            ir = el('button', 'btn btn--primary'); ir.type = 'button'; ir.disabled = true; ir.title = 'Este item não tem link direto. Use o portal completo.';
            ir.appendChild(el('span', null, t.acesso));
        }
        var ver = el('button', 'btn btn--outline'); ver.type = 'button'; ver.appendChild(el('span', null, 'Ver o portal completo'));
        ver.addEventListener('click', function () { fechar(true, tipo, card); });
        ac.appendChild(ir); ac.appendChild(ver); box.appendChild(ac); overlay.appendChild(box);
        /* fundo borrado e fora do alcance do teclado enquanto o convite está aberto */
        antes = Array.prototype.filter.call(document.body.children, function (n) { return n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE'; });
        antes.forEach(function (n) { n.setAttribute('inert', ''); });
        document.body.appendChild(overlay); document.body.style.overflow = 'hidden';
        (temLink ? ir : ver).focus();
    }
    function lerLink() {
        var m = /^#compartilhado=(.+)$/.exec(window.location.hash || '');
        if (!m || overlay) return;
        try {
            var d = decodificar(m[1]);
            if (!d || !TIPOS[d.t] || typeof d.n !== 'string') return;
            var card = achar(d.t, d.n); if (!card) return;
            mostrarConvite(d.t, d.n, card);
        } catch (e) { /* link inválido: abre o portal normal */ }
    }
    function pronto(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
    pronto(function () { atualizar(); lerLink(); });
    window.addEventListener('hashchange', lerLink);
})();
