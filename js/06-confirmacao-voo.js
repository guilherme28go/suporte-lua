/* Confirmação de Voo */
(function () {
    'use strict';
    var $ = function (id) { return document.getElementById(id); };
    if (!$('confVoo')) return;
    var CAMPOS = [
        { k: 'cia', rot: 'Cia', ph: 'LA', max: 2 },
        { k: 'num', rot: 'Número', ph: '3058', max: 4 },
        { k: 'orig', rot: 'Origem', ph: 'GRU', max: 3 },
        { k: 'dest', rot: 'Destino', ph: 'JFK', max: 3 },
        { k: 'data', rot: 'Data', ph: '20/11/26', max: 10 },
        { k: 'sai', rot: 'Hora de saída', ph: '12:00', max: 5 },
        { k: 'che', rot: 'Hora de chegada', ph: '17:00', max: 5 }
    ];
    var MAXT = 4, seq = 0;
    function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
    function mascara(k, v) {
        var d;
        if (k === 'cia') return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
        if (k === 'num') return v.replace(/\D/g, '').slice(0, 4);
        if (k === 'orig' || k === 'dest') return v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
        if (k === 'data') { d = v.replace(/\D/g, '').slice(0, 8); return d.slice(0, 2) + (d.length > 2 ? '/' + d.slice(2, 4) : '') + (d.length > 4 ? '/' + d.slice(4) : ''); }
        d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d;
    }
    function novoVoo(box, titulo, removivel) {
        var f = el('div', 'cv-flight'); var id = 'cvf' + (++seq);
        if (titulo) f.appendChild(el('p', 'cv-flight-tit', titulo));
        var g = el('div', 'cv-grid');
        CAMPOS.forEach(function (c) {
            var w = el('div'); var lb = el('label', null, c.rot); lb.setAttribute('for', id + c.k); w.appendChild(lb);
            var i = el('input', 'login-input'); i.id = id + c.k; i.type = 'text'; i.dataset.cv = c.k; i.placeholder = c.ph; i.maxLength = c.max; i.autocomplete = 'off'; i.spellcheck = false;
            if (c.k !== 'cia' && c.k !== 'orig' && c.k !== 'dest') i.inputMode = 'numeric';
            i.addEventListener('input', function () { var v = mascara(c.k, i.value); if (v !== i.value) i.value = v; gerar(); });
            w.appendChild(i); g.appendChild(w);
        });
        f.appendChild(g);
        if (removivel) {
            var b = el('button', 'btn btn--ghost btn--sm cv-flight-del'); b.type = 'button'; b.setAttribute('aria-label', 'Remover este trecho'); b.title = 'Remover este trecho';
            b.innerHTML = '<svg class="ic ic--sm" aria-hidden="true" focusable="false"><use href="#i-trash-2"/></svg>';
            b.addEventListener('click', function () { var pai = f.parentNode; f.remove(); renumerar(pai); gerar(); });
            f.appendChild(b);
        }
        box.appendChild(f); return f;
    }
    function renumerar(box) {
        var fs = box.querySelectorAll('.cv-flight');
        fs.forEach(function (f, i) {
            var t = f.querySelector('.cv-flight-tit');
            var pal = box.id === 'cvAntigo' ? 'Voo antigo ' : 'Trecho ';
            if (fs.length > 1) { if (!t) { t = el('p', 'cv-flight-tit'); f.insertBefore(t, f.firstChild); } t.textContent = pal + (i + 1); }
            else if (t) t.remove();
            var d = f.querySelector('.cv-flight-del'); if (d) d.hidden = fs.length < 2;
        });
    }
    function ler(box) {
        return Array.prototype.map.call(box.querySelectorAll('.cv-flight'), function (f) {
            var o = {}; CAMPOS.forEach(function (c) { o[c.k] = f.querySelector('[data-cv="' + c.k + '"]').value.trim(); }); return o;
        });
    }
    function vazio(o) { return CAMPOS.every(function (c) { return !o[c.k]; }); }
    function dataExt(t) {
        var m = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(t); if (!m) return t;
        var a = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10), mes = parseInt(m[2], 10), dia = parseInt(m[1], 10);
        var d = new Date(Date.UTC(a, mes - 1, dia));
        if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return t;
        var sem = d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
        return sem.charAt(0).toUpperCase() + sem.slice(1) + ', ' + m[1] + '/' + m[2] + '/' + a;
    }
    var faltas;
    function bloco(o, rot) {
        var vv = function (k, nome) { if (!o[k]) { faltas.push(rot + ': ' + nome); return '[' + nome + ']'; } return o[k]; };
        var l = [];
        l.push(vv('cia', 'Cia') + vv('num', 'Número') + ' · ' + vv('orig', 'Origem') + ' → ' + vv('dest', 'Destino'));
        l.push('📅 ' + (o.data ? dataExt(o.data) : (faltas.push(rot + ': Data'), '[Data]')));
        l.push('🕒 Saída ' + vv('sai', 'Hora de saída') + ' · Chegada ' + vv('che', 'Hora de chegada'));
        return l.join('\n');
    }
    function secao(titulo, lista, rot, pal) {
        pal = pal || 'Trecho ';
        var vs = lista.filter(function (o) { return !vazio(o); }); if (!vs.length) return '';
        return titulo + '\n' + vs.map(function (o, i) { return (vs.length > 1 ? pal + (i + 1) + '\n' : '') + bloco(o, rot + (vs.length > 1 ? ' (' + pal.trim().toLowerCase() + ' ' + (i + 1) + ')' : '')); }).join('\n\n');
    }
    function gerar() {
        faltas = [];
        var ag = ($('inputAgent') && $('inputAgent').value.trim()) || '[SEU NOME]', cl = ($('inputClient') && $('inputClient').value.trim()) || '[NOME DO CLIENTE]';
        var nAnt = ler($('cvAntigo')).filter(function (o) { return !vazio(o); }).length;
        var antigo = secao(nAnt > 1 ? '✈️ VOOS ANTERIORES' : '✈️ VOO ANTERIOR', ler($('cvAntigo')), 'Voo antigo', 'Voo ');
        var ida = secao('🛫 IDA', ler($('cvIda')), 'Ida');
        var volta = $('cvTemVolta').checked ? secao('🛬 VOLTA', ler($('cvVolta')), 'Volta') : '';
        var saida = $('cvSaida'), st = $('cvStatus');
        if (!antigo && !ida && !volta) {
            saida.textContent = 'Preencha o voo antigo e os voos novos para gerar a mensagem.'; st.textContent = ''; return;
        }
        var partes = ['Olá, ' + cl + '! Segue a confirmação da alteração do seu voo:'];
        if (antigo) partes.push(antigo);
        if (ida || volta) partes.push('✅ NOVO ITINERÁRIO\n\n' + [ida, volta].filter(Boolean).join('\n\n'));
        partes.push('Qualquer dúvida, é só me chamar por aqui. Estou à disposição!\n' + ag);
        saida.textContent = partes.join('\n\n');
        st.textContent = faltas.length ? 'Faltam informações: ' + faltas.slice(0, 4).join(', ') + (faltas.length > 4 ? ' e mais ' + (faltas.length - 4) : '') + '. Elas aparecem entre [colchetes] na mensagem.' : '';
    }
    function iniciar() {
        $('cvAntigo').textContent = ''; $('cvIda').textContent = ''; $('cvVolta').textContent = '';
        novoVoo($('cvAntigo'), '', true); novoVoo($('cvIda'), '', true); novoVoo($('cvVolta'), '', true);
        renumerar($('cvAntigo')); renumerar($('cvIda')); renumerar($('cvVolta'));
        $('cvTemVolta').checked = false; $('cvVoltaBox').hidden = true; gerar();
    }
    document.addEventListener('click', function (e) {
        var a = e.target.closest('[data-cv-add]'); if (!a) return;
        var box = $({ antigo: 'cvAntigo', ida: 'cvIda', volta: 'cvVolta' }[a.dataset.cvAdd]);
        if (box.querySelectorAll('.cv-flight').length >= MAXT) return;
        var f = novoVoo(box, '', true); renumerar(box); var p = f.querySelector('input'); if (p) p.focus(); gerar();
    });
    $('cvTemVolta').addEventListener('change', function () { $('cvVoltaBox').hidden = !this.checked; gerar(); });
    $('cvLimpar').addEventListener('click', iniciar);
    ['inputAgent', 'inputClient'].forEach(function (i) { if ($(i)) $(i).addEventListener('input', gerar); });
    iniciar();
    window.confVooGerar = gerar;
    window.confVooTexto = function () { return $('cvSaida').textContent; };
})();
