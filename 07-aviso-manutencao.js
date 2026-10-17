/* Faixa de manutenção: quando aparece é decidido no banco (textos site.manut_*)
   modo: auto (dias + horários de Brasília) | sempre | nunca.  Padrão: toda sexta-feira, o dia todo. */
var fmtAvisoBRT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
var fmtAvisoHora = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
var DIAS_AVISO = { Sun: 'dom', Mon: 'seg', Tue: 'ter', Wed: 'qua', Thu: 'qui', Fri: 'sex', Sat: 'sab' };
function textoAviso(k) { var C = window.PortalCore; var v = C && C.T ? C.T(k) : null; return v == null ? '' : String(v).trim(); }
function minutosDe(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim()); return m ? (+m[1]) * 60 + (+m[2]) : -1; }
function avisoManutencaoAtivo(data) {
    var modo = textoAviso('site.manut_modo') || 'auto';
    if (modo === 'sempre') return true;
    if (modo === 'nunca') return false;
    var d = data || new Date(), dia = DIAS_AVISO[fmtAvisoBRT.format(d)];
    var dias = (textoAviso('site.manut_dias') || 'sex').toLowerCase().split(',').map(function (x) { return x.trim(); });
    if (dias.indexOf(dia) < 0) return false;
    var faixas = textoAviso('site.manut_faixas'); if (!faixas) return true;
    var agora = minutosDe(fmtAvisoHora.format(d));
    return faixas.split(',').some(function (f) { var p = f.split('-'), a = minutosDe(p[0]), b = minutosDe(p[1] || ''); return a >= 0 && b >= 0 && (a <= b ? (agora >= a && agora < b) : (agora >= a || agora < b)); });
}
function atualizarAvisoManutencao(data) {
    var el = document.getElementById('maintBanner');
    if (el) el.hidden = !avisoManutencaoAtivo(data);
    if (window.atualizarAvisoSenha) window.atualizarAvisoSenha();
}
atualizarAvisoManutencao();
setInterval(function () { if (!document.hidden) atualizarAvisoManutencao(); }, 60000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizarAvisoManutencao(); });
document.addEventListener('portal:conteudo', function () { atualizarAvisoManutencao(); });
