/* Aviso de atualização */
var fmtAvisoBRT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' });
function avisoManutencaoAtivo(data) {
    return fmtAvisoBRT.format(data || new Date()) === 'Fri';
}
function atualizarAvisoManutencao(data) {
    var el = document.getElementById('maintBanner');
    if (el) el.hidden = !avisoManutencaoAtivo(data);
    if (window.atualizarAvisoSenha) window.atualizarAvisoSenha();
}
atualizarAvisoManutencao();
setInterval(function () { if (!document.hidden) atualizarAvisoManutencao(); }, 60000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) atualizarAvisoManutencao(); });
