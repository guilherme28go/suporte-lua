(function () {
    /* Portal de Transparência */
    function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function destacar() {
        document.querySelectorAll('.tr-code pre code').forEach(function (c) {
            if (c.dataset.cm) return; c.dataset.cm = '1';
            var t = c.textContent, out = '', i = 0, re = /\/\*[\s\S]*?\*\/|(^|[ \t])\/\/[^\n]*/gm, m;
            while ((m = re.exec(t))) {
                var ini = m.index + (m[1] ? m[1].length : 0);
                out += esc(t.slice(i, ini)) + '<span class="tr-cm">' + esc(t.slice(ini, re.lastIndex)) + '</span>';
                i = re.lastIndex;
            }
            c.innerHTML = out + esc(t.slice(i));
        });
    }
    if (document.readyState !== 'loading') destacar(); else document.addEventListener('DOMContentLoaded', destacar);
})();
