/* ==========================================================================
   PORTAL SUPORTE LUA - Hub Operacional Latam
   ========================================================================== */
'use strict';

/* --------------------------------------------------------------------------
   Utilitários
   -------------------------------------------------------------------------- */
const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const DEFAULT_TAB = 'sistemas';
const MSG_COPIADO = 'Copiado com sucesso!';

let currentTab = DEFAULT_TAB;
const SEARCH_PLACEHOLDER0 = (qs('#global-search') || {}).placeholder || '';
const searchPlaceholder = () => ((qs('#global-search') || {}).dataset || {}).ph || SEARCH_PLACEHOLDER0;

/** Minúsculas e sem acentos */
function normalizar(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* --------------------------------------------------------------------------
   Navegação por abas
   -------------------------------------------------------------------------- */
function tabIds() {
    return qsa('.dock-tile').map((tile) => tile.dataset.tab);
}

function tabFromHash() {
    let id = '';
    try {
        id = decodeURIComponent(window.location.hash.replace('#', ''));
    } catch (e) {
        id = '';
    }
    return tabIds().includes(id) ? id : null;
}

/**
 * Abre uma aba.
 * opts.initial    -> carga da página
 * opts.keepScroll -> não rola a página
 */
// Em telas estreitas a barra de abas rola na horizontal
function revealActiveTile(instant) {
    const dock = qs('.dock');
    const tile = qs('.dock-tile[aria-selected="true"]');
    if (!dock || !tile || dock.scrollWidth <= dock.clientWidth + 1) return;

    const d = dock.getBoundingClientRect();
    const t = tile.getBoundingClientRect();
    const alvo = dock.scrollLeft + (t.left - d.left) - (dock.clientWidth - t.width) / 2;
    dock.scrollTo({
        left: Math.max(0, alvo),
        behavior: instant || prefersReducedMotion() ? 'auto' : 'smooth'
    });
}

function openTab(tabId, opts = {}) {
    if (!tabIds().includes(tabId)) tabId = DEFAULT_TAB;
    currentTab = tabId;

    qsa('.panel').forEach((panel) => {
        panel.hidden = panel.id !== tabId;
    });

    qsa('.dock-tile').forEach((tile) => {
        const on = tile.dataset.tab === tabId;
        tile.setAttribute('aria-selected', on ? 'true' : 'false');
        tile.tabIndex = on ? 0 : -1;
    });
    revealActiveTile(!!opts.initial);

    qsa('.mini-tab').forEach((tab) => {
        const on = tab.dataset.tab === tabId;
        tab.classList.toggle('is-active', on);
        if (on) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
    });

    // Trocar de aba limpa a busca.
    // Abas marcadas com data-nosearch (Agente Sabre) não têm itens para filtrar.
    const search = qs('#global-search');
    const semBusca = document.getElementById(tabId).hasAttribute('data-nosearch');
    if (search) {
        search.value = '';
        search.disabled = semBusca;
        search.placeholder = semBusca ? 'Busca indisponível nesta aba' : searchPlaceholder();
    }
    filterAll();

    if (!opts.initial) {
        try {
            window.history.replaceState(null, '', '#' + tabId);
        } catch (e) {
            /* file:// ou iframe restrito: ignora */
        }
    }

    // Se a barra grande de abas já saiu da tela, leva o início da seção de volta para a vista
    if (!opts.initial && !opts.keepScroll && document.body.classList.contains('dock-hidden')) {
        const panel = document.getElementById(tabId);
        if (panel) panel.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
}

/* --------------------------------------------------------------------------
   Busca instantânea
   -------------------------------------------------------------------------- */
/** Texto usado na busca: ignora os selos de autenticação para não poluir resultados. */
function textoBusca(el) {
    const selo = el.querySelector('.auth');
    if (!selo) return el.textContent;
    const copia = el.cloneNode(true);
    copia.querySelector('.auth').remove();
    return copia.textContent;
}

function filterAll() {
    const input = qs('#global-search');
    const panel = qs('.panel:not([hidden])');
    if (!input || !panel) return;

    const raw = input.value.trim();
    const query = normalizar(raw);
    if (query === '') travarPainel(panel, false);

    const wrap = qs('.search');
    if (wrap) wrap.classList.toggle('has-value', raw !== '');
    const clear = qs('.search-clear');
    if (clear) clear.hidden = raw === '';

    // Abas sem itens pesquisáveis (Agente Sabre) não são filtradas
    if (panel.hasAttribute('data-nosearch')) return;

    const items = qsa('.card, tbody tr, .script-card', panel);
    let visible = 0;

    items.forEach((el) => {
        const textOk = !query || normalizar(textoBusca(el)).includes(query);
        const show = textOk;
        el.hidden = !show;
        if (show) visible += 1;
    });

    // Esconde títulos de grupos/seções que ficaram sem nenhum item visível
    qsa('.script-group', panel).forEach((group) => {
        group.hidden = !qsa('.script-card', group).some((card) => !card.hidden);
    });
    qsa('.subsection', panel).forEach((section) => {
        const cards = qsa('.card', section);
        if (cards.length) section.hidden = cards.every((card) => card.hidden);
    });

    const filtering = query !== '';

    const pill = qs('.count-pill', panel);
    if (pill) {
        qs('.count-now', pill).textContent = filtering ? visible : pill.dataset.total;
        qs('.count-of', pill).hidden = !filtering;
        pill.classList.toggle('is-filtered', filtering);
    }

    const empty = qs('.empty', panel);
    if (empty) {
        const none = items.length > 0 && visible === 0;
        empty.hidden = !none;
        if (none) qs('.empty-query', empty).textContent = raw ? '“' + raw + '”' : 'este filtro';
    }

}

/** Mantém o painel parado durante a busca: a altura não encolhe e o início dos resultados fica sempre à vista. */
function travarPainel(panel, ligado) {
    if (!panel) return;
    const raiz = document.documentElement;
    if (ligado) {
        if (!panel.dataset.buscaTrava) {
            panel.dataset.buscaTrava = '1';
            panel.style.minHeight = panel.offsetHeight + 'px';
            panel.style.overflowAnchor = 'none';
            raiz.style.overflowAnchor = 'none';   // sem ajustes automáticos de rolagem enquanto filtra
            raiz.style.scrollBehavior = 'auto';   // sem animação
        }
    } else {
        qsa('.panel[data-busca-trava]').forEach((p) => {
            delete p.dataset.buscaTrava;
            p.style.minHeight = '';
            p.style.overflowAnchor = '';
        });
        raiz.style.overflowAnchor = '';
        raiz.style.scrollBehavior = '';
    }
}

let yBusca = null;
function manterRolagem() {
    if (yBusca !== null && Math.abs(window.scrollY - yBusca) > 1) window.scrollTo({ top: yBusca, behavior: 'auto' });
}

function onSearchInput() {
    manterRolagem();
    requestAnimationFrame(manterRolagem);
    setTimeout(manterRolagem, 60);
    const panel = qs('.panel:not([hidden])');
    const ligado = qs('#global-search').value.trim() !== '' && !(panel && panel.hasAttribute('data-nosearch'));
    travarPainel(panel, ligado);
    filterAll();
    if (!ligado || !panel) return;
    // A tela só se move se o primeiro resultado ficou fora da vista; senão, fica parada
    const primeiro = qsa('.card, tbody tr, .script-card', panel).find((el) => !el.hidden && el.offsetParent !== null);
    if (!primeiro) return;
    const headerH = (qs('.topbar') || qs('header') || { offsetHeight: 68 }).offsetHeight || 68;
    const r = primeiro.getBoundingClientRect();
    if (r.bottom < headerH + 8 || r.top > window.innerHeight - 40) {
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - headerH - 24), behavior: 'auto' });
        yBusca = window.scrollY;
    }
}

function clearSearch(focus) {
    const input = qs('#global-search');
    if (!input) return;
    input.value = '';
    filterAll();
    if (focus) input.focus();
}

/* --------------------------------------------------------------------------
   Contadores
   -------------------------------------------------------------------------- */
function updateCounts() {
    const fontes = {
        sistemas: '#sistemas .card',
        forms: '#forms .card',
        slides: '#slides .card',
        telefones: '#telefones tbody tr',
        scripts: '#scripts .script-card',
    };

    Object.keys(fontes).forEach((id) => {
        const total = qsa(fontes[id]).length;
        qsa('[data-count-for="' + id + '"]').forEach((badge) => {
            badge.textContent = total;
        });
        const pill = qs('#' + id + ' .count-pill');
        if (pill) {
            pill.dataset.total = total;
            qs('.count-now', pill).textContent = total;
            qs('.count-of', pill).textContent = ' de ' + total;
        }
    });

}

/* --------------------------------------------------------------------------
   Scripts de atendimento
   -------------------------------------------------------------------------- */
function updateScripts() {
    const agentName = qs('#inputAgent').value.trim() || '[SEU NOME]';
    const clientName = qs('#inputClient').value.trim() || '[NOME DO CLIENTE]';

    qsa('.script-text').forEach((script) => {
        if (!script.hasAttribute('data-template')) return;
        // split/join evita que "$&" ou "$1" digitados no nome sejam interpretados como padrões
        const texto = script
            .getAttribute('data-template')
            .split('{AGENTE}').join(agentName)
            .split('{PAX}').join(clientName);
        script.textContent = texto;
    });

    if (window.confVooGerar) window.confVooGerar();
    if (qs('#global-search').value.trim() !== '') filterAll();
}

/** Copia texto; usa a API moderna e cai para execCommand. */
function legacyCopy(texto) {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, texto.length);
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch (e) {
        ok = false;
    }
    document.body.removeChild(area);
    return ok;
}

function copyText(texto) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(texto).then(() => true).catch(() => legacyCopy(texto));
    }
    return Promise.resolve(legacyCopy(texto));
}

function flashCopied(btn) {
    const label = qs('.btn-copy-label', btn);
    const use = qs('use', btn);
    if (!label || !use) return;

    if (!btn.dataset.label) btn.dataset.label = label.textContent;
    label.textContent = 'Copiado!';
    use.setAttribute('href', '#i-check');
    btn.classList.add('is-done');

    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(() => {
        label.textContent = btn.dataset.label;
        use.setAttribute('href', '#i-copy');
        btn.classList.remove('is-done');
    }, 1800);
}

function copyScript(elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return Promise.resolve(false);

    return copyText(el.textContent.trim()).then((ok) => {
        if (ok) {
            showToast();
            if (btn) flashCopied(btn);
        } else {
            alert('Ocorreu um erro ao copiar. Tente selecionar o texto manualmente.');
        }
        return ok;
    });
}

/* --------------------------------------------------------------------------
   Aviso visual
   -------------------------------------------------------------------------- */
let toastTimer = null;

function showToast(mensagem) {
    const toast = qs('#toast');
    if (!toast) return;
    qs('#toastMsg').textContent = mensagem || MSG_COPIADO;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* --------------------------------------------------------------------------
   Tradutor fonético em tempo real
   -------------------------------------------------------------------------- */
const alfabetoFonetico = {
    'A': 'ALFA', 'B': 'BRAVO', 'C': 'CHARLIE', 'D': 'DELTA', 'E': 'ECHO', 'F': 'FOXTROT',
    'G': 'GOLF', 'H': 'HOTEL', 'I': 'INDIA', 'J': 'JULIET', 'K': 'KILO', 'L': 'LIMA',
    'M': 'MIKE', 'N': 'NOVEMBER', 'O': 'OSCAR', 'P': 'PAPA', 'Q': 'QUEBEC', 'R': 'ROMEO',
    'S': 'SIERRA', 'T': 'TANGO', 'U': 'UNIFORM', 'V': 'VICTOR', 'W': 'WHISKEY', 'X': 'X-RAY',
    'Y': 'YANKEE', 'Z': 'ZULU'
};

const LOC_TOTAL = 6;

function locBox(index) {
    return document.getElementById('loc' + index);
}

function setLoc(index, valor) {
    const box = locBox(index);
    box.value = valor;
    box.classList.toggle('is-filled', valor !== '');
}

function updateFonetico(index) {
    const atual = locBox(index);
    atual.value = atual.value.toUpperCase(); // força maiúsculo
    atual.classList.toggle('is-filled', atual.value !== '');

    // avança automaticamente para o próximo quadrado quando digitou um caractere
    if (atual.value.length === 1 && index < LOC_TOTAL) {
        locBox(index + 1).focus();
    }

    renderFonetico();
}

function checkBackspace(event, index) {
    const atual = locBox(index);

    // Backspace em campo vazio volta para o campo anterior
    if (event.key === 'Backspace' && atual.value === '' && index > 1) {
        locBox(index - 1).focus();
    } else if (event.key === 'ArrowLeft' && index > 1) {
        event.preventDefault();
        locBox(index - 1).focus();
    } else if (event.key === 'ArrowRight' && index < LOC_TOTAL) {
        event.preventDefault();
        locBox(index + 1).focus();
    }
}

/** Colar o localizador inteiro distribui os caracteres pelos quadrados. */
function pasteLocalizador(event, index) {
    const clip = event.clipboardData || window.clipboardData;
    const texto = ((clip && clip.getData('text')) || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (texto.length <= 1) return; // 1 caractere: comportamento normal do campo

    event.preventDefault();
    let i = index;
    for (const ch of texto) {
        if (i > LOC_TOTAL) break;
        setLoc(i, ch);
        i += 1;
    }
    locBox(Math.min(i, LOC_TOTAL)).focus();
    renderFonetico();
}

function renderFonetico() {
    const resultado = document.getElementById('resultadoFonetico');
    const chips = qsa('.nato-chip', resultado);
    const palavras = [];
    let todosVazios = true;

    for (let i = 1; i <= LOC_TOTAL; i++) {
        const val = locBox(i).value;
        if (val !== '') todosVazios = false;

        let palavra;
        if (val && alfabetoFonetico[val]) {
            palavra = alfabetoFonetico[val]; // traduz letra
        } else if (val) {
            palavra = val; // mantém número
        } else {
            palavra = '_'; // campo vazio
        }
        palavras.push(palavra);

        const chip = chips[i - 1];
        if (chip) {
            chip.classList.toggle('is-empty', val === '');
            qs('.nato-word', chip).textContent = palavra;
        }
    }

    // Mesmo texto do portal: palavras separadas por " • "
    document.getElementById('foneticoTexto').textContent = todosVazios ? '_ _ _ _ _ _' : palavras.join(' • ');

    const copiar = document.getElementById('btnCopiarFonetico');
    if (copiar) copiar.disabled = todosVazios;
}

function limparFonetico() {
    for (let i = 1; i <= LOC_TOTAL; i++) {
        setLoc(i, '');
    }
    renderFonetico();
    locBox(1).focus();
}

function copiarFonetico() {
    const texto = document.getElementById('foneticoTexto').textContent.trim();
    if (!texto || texto === '_ _ _ _ _ _') return;
    const btn = document.getElementById('btnCopiarFonetico');
    copyText(texto).then((ok) => {
        if (ok) {
            showToast();
            flashCopied(btn);
        } else {
            alert('Ocorreu um erro ao copiar. Tente selecionar o texto manualmente.');
        }
    });
}

/** Tabela de referência A-Z. */
function buildNatoGrid() {
    const grid = document.getElementById('natoGrid');
    if (!grid) return;
    grid.innerHTML = Object.keys(alfabetoFonetico)
        .map((letra) => '<div class="nato-item"><b>' + letra + '</b><span>' + alfabetoFonetico[letra] + '</span></div>')
        .join('');
}

/* --------------------------------------------------------------------------
   Relógio de referência
   -------------------------------------------------------------------------- */
const fmtHoraBRT = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const fmtHoraTulsa = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const fmtDataBRT = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

function tickClock() {
    const agora = new Date();
    const brt = qs('#clockBRT');
    const tulsa = qs('#clockTulsa');
    const data = qs('#clockDate');
    if (brt) brt.textContent = fmtHoraBRT.format(agora);
    if (tulsa) tulsa.textContent = fmtHoraTulsa.format(agora);
    if (data) data.textContent = fmtDataBRT.format(agora);
}

/* --------------------------------------------------------------------------
   Barra de abas: setas/Home/End (padrão WAI-ARIA de tabs)
   -------------------------------------------------------------------------- */
function onDockKeydown(event) {
    const tiles = qsa('.dock-tile');
    const i = tiles.indexOf(document.activeElement);
    if (i < 0) return;

    let next = null;
    if (event.key === 'ArrowRight') next = (i + 1) % tiles.length;
    else if (event.key === 'ArrowLeft') next = (i - 1 + tiles.length) % tiles.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tiles.length - 1;
    if (next === null) return;

    event.preventDefault();
    tiles[next].focus();
    openTab(tiles[next].dataset.tab, { keepScroll: true });
}

/* --------------------------------------------------------------------------
   Interface que depende da rolagem
   -------------------------------------------------------------------------- */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

function setupScrollUi() {
    const dock = qs('.dock');
    const fab = qs('#backToTop');

    // Mostra a navegação compacta no cabeçalho quando a barra grande de abas sai da tela
    if (dock && 'IntersectionObserver' in window) {
        const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 68;
        // "Visível" = pelo menos 85% da barra de abas fora do cabeçalho fixo; senão aparece a navegação compacta
        new IntersectionObserver(
            (entries) => document.body.classList.toggle('dock-hidden', entries[0].intersectionRatio < 0.85),
            { rootMargin: '-' + headerH + 'px 0px 0px 0px', threshold: [0, 0.25, 0.5, 0.75, 0.85, 0.95, 1] }
        ).observe(dock);
    }

    if (fab) {
        let pendente = false;
        const atualizar = () => {
            fab.hidden = window.scrollY < 700;
            pendente = false;
        };
        window.addEventListener('scroll', () => {
            if (!pendente) {
                pendente = true;
                requestAnimationFrame(atualizar);
            }
        }, { passive: true });
        fab.addEventListener('click', scrollToTop);
        atualizar();
    }
}

/* --------------------------------------------------------------------------
   Eventos
   -------------------------------------------------------------------------- */
function setupEvents() {
    document.addEventListener('click', (event) => {
        const alvo = event.target;

        const tabBtn = alvo.closest('.dock-tile, .mini-tab');
        if (tabBtn) {
            openTab(tabBtn.dataset.tab);
            return;
        }

        const brand = alvo.closest('[data-tab-link]');
        if (brand) {
            event.preventDefault();
            openTab(brand.dataset.tabLink);
            scrollToTop();
            return;
        }

        const limpar = alvo.closest('[data-clear-search]');
        if (limpar) {
            clearSearch(true);
            return;
        }

        const copiar = alvo.closest('[data-copy-target]');
        if (copiar) {
            copyScript(copiar.dataset.copyTarget, copiar);
            return;
        }

        const link = alvo.closest('[data-copy-link]');
        if (link) {
            copyText(link.dataset.copyLink).then((ok) => {
                if (ok) showToast('Link copiado!');
                else alert('Ocorreu um erro ao copiar. Tente selecionar o link manualmente.');
            });
            return;
        }

        const fone = alvo.closest('.phone-chip');
        if (fone) {
            copyText(fone.dataset.copy).then((ok) => {
                if (ok) showToast();
                else alert('Ocorreu um erro ao copiar. Tente selecionar o texto manualmente.');
            });
        }
    });

    // Busca
    const busca = qs('#global-search');
    busca.setAttribute('enterkeyhint', 'search');
    // O Chrome de computador tenta "revelar" o campo de busca (que fica no cabeçalho fixo) a cada letra e
    // rola a página para cima. Guardamos a posição antes de digitar e a devolvemos logo depois.
    busca.addEventListener('beforeinput', () => { yBusca = window.scrollY; });
    busca.addEventListener('input', onSearchInput);
    busca.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') clearSearch(false);
        // Enter fecha o teclado (celular) e deixa os resultados parados, prontos para tocar
        if (event.key === 'Enter') { event.preventDefault(); busca.blur(); }
    });
    // Ao rolar os resultados com o dedo, o teclado fecha sem mover a lista
    document.addEventListener('touchmove', () => {
        if (document.activeElement === busca && busca.value.trim() !== '') busca.blur();
    }, { passive: true });
    qs('.search-clear').addEventListener('click', () => clearSearch(true));

    // Atalho "/" foca a busca (fora de campos de texto)
    document.addEventListener('keydown', (event) => {
        if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
        const t = event.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        event.preventDefault();
        busca.focus();
        busca.select();
    });

    // Abas por teclado e por endereço (#scripts, #sabre, ...)
    qs('.dock').addEventListener('keydown', onDockKeydown);
    window.addEventListener('hashchange', () => {
        const id = tabFromHash();
        if (id && id !== currentTab) openTab(id);
    });

    // Preenchimento automático dos scripts
    qs('#inputAgent').addEventListener('input', updateScripts);
    qs('#inputClient').addEventListener('input', updateScripts);

    // Tradutor fonético
    for (let i = 1; i <= LOC_TOTAL; i++) {
        const box = locBox(i);
        box.addEventListener('input', () => updateFonetico(i));
        box.addEventListener('keydown', (event) => {
            // digitar sobre um quadrado preenchido substitui o caractere
            if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
                && box.value !== '' && box.selectionStart === box.selectionEnd) {
                box.value = '';
            }
            checkBackspace(event, i);
        });
        box.addEventListener('paste', (event) => pasteLocalizador(event, i));
        box.addEventListener('focus', () => box.select());
        box.addEventListener('mouseup', (event) => event.preventDefault());
    }
    qs('#btnLimpar').addEventListener('click', limparFonetico);
    qs('#btnCopiarFonetico').addEventListener('click', copiarFonetico);
}

/* --------------------------------------------------------------------------
   Inicialização
   -------------------------------------------------------------------------- */
const GER_FLAG = 'suporteLuaGerLiberada';
function gerenciaLiberada() { try { return localStorage.getItem(GER_FLAG) === '1'; } catch (e) { return false; } }
/* Gerência liberada: a aba vai para o início da barra; ao sair do aparelho, volta para o fim */
function gerenciaPrimeiro(primeiro) {
    qsa('.dock-tile[data-tab="gerencia"], .mini-tab[data-tab="gerencia"]').forEach((b) => {
        const pai = b.parentNode;
        if (primeiro) pai.insertBefore(b, pai.firstElementChild);
        else pai.appendChild(b);
    });
}
function init() {
    updateCounts();
    buildNatoGrid();
    renderFonetico();
    setupEvents();
    setupScrollUi();

    const gerLib = gerenciaLiberada();
    if (gerLib) gerenciaPrimeiro(true);
    openTab(tabFromHash() || (gerLib ? 'gerencia' : DEFAULT_TAB), { initial: true });

    tickClock();
    setInterval(function () { if (!document.hidden) tickClock(); }, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tickClock(); });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/* ==========================================================================
   AGENTE SABRE 
   ========================================================================== */
(function () {
'use strict';

const $ = (id) => document.getElementById(id);
const ico = (name, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Ícones usados pelos eventos (símbolos do sprite do portal) */
const svgPlane = () => ico('plane');
const svgService = () => ico('briefcase');
const svgInfo = () => ico('info');
const svgMsg = () => ico('message-square');
const svgBot = () => ico('bot');
const svgBot2 = () => ico('bot');
const svgTicket = () => ico('ticket');
const svgSeat = () => ico('armchair');
const svgUser = () => ico('user');
const svgStar = () => ico('star');
const svgWarn = () => ico('triangle-alert');
const svgDoc = () => ico('file-text');
const svgWheelchair = () => ico('accessibility');
const svgPet = () => ico('paw-print');
const svgMeal = () => ico('utensils');

function mostrarErro(msg) {
  const box = $('sbInputError');
  if (!box) return;
  box.hidden = !msg;
  box.querySelector('span').textContent = msg || '';
  if (msg) $('sbInput').focus();
}


function transPax(str) {
  if(!str) return str;
  REGRAS.tradPax.forEach(r => { str = str.replace(r.re, r.para); });
  return str;
}

function cleanRemark(str) {
  str = transPax(str).replace(/^H-\s*/, '');
  REGRAS.tradRemark.forEach(r => { str = str.replace(r.re, r.para); });
  return str.trim();
}

function ensureFirstPax(paxs) {
  const keys = Object.keys(paxs);
  if (keys.length > 0) return paxs[keys[0]];
  const k = 'PAX_NAO_IDENTIFICADO';
  paxs[k] = {nome:k, fones:[], emails:[], tkts:[], locators:[], programas:[], docs:[], conta:[], tarifa:[], rota:'', cpfAutoAssoc:false};
  return paxs[k];
}

function getPaxRef(paxs, rawName) {
    if(!rawName) return null;

    // Limpa título e espaços
    let clean = rawName
        .replace(/\s+(MR|MS|MSTR|MRS|CHD|CHILD|INF|INFANT|ADT)$/i, '')
        .trim().toUpperCase().replace(/\s+/g, ' ');

    // Validação básica: deve ter SOBRENOME/NOME, só letras/espaços
    if(!clean.includes('/')) return null;
    const parts = clean.split('/');
    if(parts.length !== 2) return null;
    const [sob, nom] = parts.map(p => p.trim());
    // Ambas as partes precisam ser >= 2 chars e sem dígitos
    if(sob.length < 2 || nom.length < 1) return null;
    if(/\d/.test(sob) || /\d/.test(nom)) return null;
    // Ignora padrões que claramente não são nomes (ex: HK/WK2, LA/HK1)
    if(/^[A-Z]{1,3}$/.test(sob) || /^\d/.test(nom)) return null;

    let keys = Object.keys(paxs);

    // 1. Match exato
    if(paxs[clean]) return paxs[clean];

    // 2. Match normalizado (sem espaços extras)
    const norm = s => s.toUpperCase().replace(/\s+/g, ' ').trim();
    for(let k of keys) {
        if(norm(k) === norm(clean)) return paxs[k];
    }

    // 2b. Match sem espaços (nome quebrado em duas linhas pode ter espaço a mais ou a menos)
    const compact = s => s.replace(/\s+/g, '');
    for(let k of keys) {
        if(compact(k) === compact(clean)) return paxs[k];
    }

    // 3. Match por sobrenome exato + início do primeiro nome
    const primeiroToken = nom.split(' ')[0];
    for(let k of keys) {
        const kp = k.split('/');
        if(kp.length !== 2) continue;
        const kSob = kp[0].trim(), kNom = kp[1].trim();
        if(kSob === sob || (sob.length >= 8 && kSob.length >= 8 && (kSob.startsWith(sob) || sob.startsWith(kSob)))) {
            const kPrimeiroToken = kNom.split(' ')[0];
            if(kNom === nom || kPrimeiroToken === primeiroToken) return paxs[k];
            const mn = Math.min(kPrimeiroToken.length, primeiroToken.length);
            if(mn >= 3 && (kPrimeiroToken.startsWith(primeiroToken) || primeiroToken.startsWith(kPrimeiroToken))) return paxs[k];
        }
    }

    // 4. Cria o passageiro a partir da referência SSR (comportamento original restaurado,
    //    mas só para nomes validados acima)
    paxs[clean] = {nome:clean, fones:[], emails:[], tkts:[], locators:[], programas:[], docs:[], conta:[], tarifa:[], rota:'', cpfAutoAssoc:false, fromSSR:true};
    return paxs[clean];
}



/* ═══════════════════════════════════════════
   DICIONÁRIOS E MAPAS
═══════════════════════════════════════════ */
const IATA_PT = {
  SSA:'Salvador',GRU:'Guarulhos',CGH:'Congonhas',GIG:'Galeão',SDU:'Santos Dumont',
  BSB:'Brasília',FOR:'Fortaleza',REC:'Recife',MCZ:'Maceió',POA:'Porto Alegre',
  CWB:'Curitiba',FLN:'Florianópolis',MAO:'Manaus',BEL:'Belém',VIX:'Vitória',
  NAT:'Natal',JPA:'João Pessoa',THE:'Teresina',SLZ:'São Luís',AJU:'Aracaju',
  PMW:'Palmas',CGB:'Cuiabá',VCP:'Campinas',GYN:'Goiânia',JDO:'Juazeiro do Norte',
  IMP:'Imperatriz',PNZ:'Petrolina',LDB:'Londrina',MGF:'Maringá',XAP:'Chapecó',
  SCL:'Santiago',LIM:'Lima',BOG:'Bogotá',UIO:'Quito',EZE:'Buenos Aires Ezeiza',
  AEP:'Buenos Aires Aeroparque',MVD:'Montevidéu',ASU:'Assunção',PTY:'Panamá',
  MIA:'Miami',JFK:'Nova York',LAX:'Los Angeles',ORD:'Chicago',ATL:'Atlanta',
  MAD:'Madrid',LIS:'Lisboa',CDG:'Paris',LHR:'Londres',FCO:'Roma',
  RBR:'Rio Branco',MAN:'Manaus (MAO)',PVH:'Porto Velho',CIZ:'Coari',NAV:'Navegantes',
};

const SEG_STATUS = {
  AF:{txt:"Bilhete grátis (prêmio)",cls:'b-blue',d:"Emite bilhete gratuito (prêmio) – CTA (Switzerland)."},
  BB:{txt:"Assento extra",cls:'b-blue',d:"Reserva de assento extra (jumpseat)."},
  BK:{txt:"Confirmado (automação)",cls:'b-ok',d:"Reserva confirmada – usado apenas por contas automatizadas para segmentos OA. Gera uma mensagem de teletipo após o cancelamento. Não pode ser usado para gerar PTA."},
  BL:{txt:"Lista de Espera",cls:'b-warn',d:"Voo em lista de espera diretamente com a companhia aérea. Nenhuma mensagem é gerada, exceto para cancelamento."},
  BR:{txt:"Cartão impresso",cls:'b-blue',d:"Cartões de embarque (boarding pass) foram impressos."},
  CG:{txt:"Embarcou em classe inferior",cls:'b-blue',d:"Comprou executiva, embarcou na primeira classe ou econômica."},
  CH:{txt:"Codeshare confirmado",cls:'b-ok',d:"Codeshare, reserva confirmada."},
  CN:{txt:"Cancelado",cls:'b-err',d:"Cancelado. Verifique uma alternativa."},
  DL:{txt:"Lista Diferida",cls:'b-gray',d:"Lista suspensa. Se ainda desejar, insira .CSS para HL."},
  DS:{txt:"Desejado",cls:'b-warn',d:"Deseja. Use quando os segmentos anteriores/seguintes forem HL. Quando os segmentos HL forem confirmados, insira .CSS para NN."},
  FG:{txt:"Embarcou em classe inferior",cls:'b-blue',d:"Comprou primeira classe, embarcou na executiva ou econômica."},
  FS:{txt:"Venda livre",cls:'b-blue',d:"Venda livre (freesell)."},
  GK:{txt:"Confirmado (automação)",cls:'b-ok',d:"Reserva confirmada – usado apenas por contas automatizadas para segmentos OA. Não gera mensagem e não pode ser usado para gerar PTA."},
  GL:{txt:"Lista de Espera (automação)",cls:'b-warn',d:"Lista de espera de reserva – usado apenas por contas automatizadas para segmentos OA. Não gera mensagem."},
  GN:{txt:"Necessidade de Grupo",cls:'b-blue',d:"Necessidade de grupo – o inventário não é reduzido. Coloque em fila automática para CRC42/15 para ter os assentos confirmados ou negados."},
  HK:{txt:"Confirmado",cls:'b-ok',d:"Reserva confirmada. A mensagem não é gerada, a menos que OSI/SSR/5QQ seja adicionado ao PNR."},
  HL:{txt:"Lista de Espera",cls:'b-warn',d:"Lista de espera de reserva."},
  HN:{txt:"Necessidade (sob solicitação)",cls:'b-warn',d:"Tem necessidade – sob solicitação."},
  HS:{txt:"Venda (só OA)",cls:'b-blue',d:"Tem venda – ajusta o inventário. Será visto apenas no histórico. Apenas OA."},
  HQ:{txt:"Aguardando OA",cls:'b-warn',d:"Mantendo necessidade – aguardando liberação da OA."},
  HX:{txt:"Cancelado",cls:'b-err',d:"Cancelado. Uma ação de cancelamento do sistema hospedeiro gerará um HX de volta para a fonte de reserva."},
  IC:{txt:"Classe incorreta",cls:'b-err',d:"Classe incorreta."},
  IG:{txt:"Up/Downgrade involuntário",cls:'b-warn',d:"Upgrade/downgrade involuntário."},
  IK:{txt:"Infante (bebê)",cls:'b-blue',d:"Infante (bebê)."},
  IN:{txt:"Se não reservado, precisa",cls:'b-warn',d:"Se não estiver reservado, precisa – mensagem gerada."},
  IS:{txt:"Se não reservado, vende",cls:'b-warn',d:"Se não estiver reservado, venda – mensagem gerada."},
  IX:{txt:"Se reservado, cancela",cls:'b-err',d:"Se estiver reservado, cancele – mensagem gerada."},
  JL:{txt:"Lista Prioritária",cls:'b-warn',d:"Lista de espera prioritária – apenas companhia aérea hospedeira."},
  KK:{txt:"Confirmado",cls:'b-ok',d:"Agora confirmado. Insira .CSS para HK."},
  KL:{txt:"Confirmado da Lista",cls:'b-ok',d:"Confirmado a partir da lista. Insira .CSS para HK."},
  LK:{txt:"Confirmado",cls:'b-ok',d:"Reserva confirmada."},
  LL:{txt:"Lista de Espera",cls:'b-warn',d:"Lista de espera – mensagem gerada se for segmento OA."},
  MM:{txt:"Refeição / Pet na cabine",cls:'b-blue',d:"Solicitação de refeição para NRSA ou animal de estimação na cabine. Nota: pode ser reservado com o código de função /6/."},
  NN:{txt:"Solicitado",cls:'b-warn',d:"Precisa, solicitar status – mensagem gerada se for segmento OA."},
  NO:{txt:"Nenhuma ação",cls:'b-err',d:"Nenhuma ação tomada – cancele o segmento e solicite uma alternativa."},
  NR:{txt:"Sem registro",cls:'b-gray',d:"Sem registro: o passageiro não foi embarcado."},
  NS:{txt:"NO SHOW",cls:'b-err',d:"Não compareceu (no show), sem assento."},
  OB:{txt:"Overbooking",cls:'b-err',d:"Overbooking (reserva em excesso)."},
  OS:{txt:"Vendido em excesso",cls:'b-err',d:"Oversold (vendido em excesso)."},
  OX:{txt:"Confirmado como alternativa",cls:'b-warn',d:"Reserva confirmada como alternativa. Cancele apenas se o segmento solicitado estiver disponível."},
  PK:{txt:"Segmento passivo",cls:'b-gray',d:"Segmento passivo, apenas teletipo (TTY) de entrada."},
  PN:{txt:"Pend. Confirmação",cls:'b-warn',d:"Necessidade pendente – mensagem enviada anteriormente para OA, aguardando resposta. O Sabre reenviará automaticamente a solicitação uma vez se não houver resposta dentro de 24 horas."},
  PS:{txt:"Espaço positivo",cls:'b-blue',d:"Espaço positivo. Uma entrada 7PS no PNR permite que o sistema de embarque do aeroporto altere o status do segmento para -PS- durante o processo pós-embarque. O sistema de embarque pode ser NCI ou PCS."},
  PU:{txt:"Seg. passivo c/ bilhete",cls:'b-gray',d:"Atualização de segmento passivo com número do bilhete. Apenas teletipo (TTY) de entrada."},
  RM:{txt:"Pré-removido",cls:'b-err',d:"Pré-removido, não pode ser reintegrado."},
  RQ:{txt:"Sob solicitação",cls:'b-warn',d:"Sob solicitação. Aparece no bilhete do passageiro para qualquer segmento não confirmado."},
  RR:{txt:"Reconfirmado",cls:'b-ok',d:"Reconfirmado – o passageiro telefonou e reconfirmou as reservas."},
  SB:{txt:"Embarcou como standby",cls:'b-blue',d:"Passageiro embarcado como standby (lista de espera no aeroporto)."},
  SC:{txt:"Schedule Change",cls:'b-warn',d:"Alteração de horário do sistema hospedeiro, mostra novo segmento. Altere o status do segmento para HK."},
  SQ:{txt:"Espaço solicitado",cls:'b-warn',d:"Espaço/serviço solicitado. Responda apenas se não estiver disponível."},
  SS:{txt:"Venda",cls:'b-warn',d:"Venda."},
  TK:{txt:"Alt. horário (OA)",cls:'b-warn',d:"Alteração de horário da OA, apenas novos horários. Insira .CSS para HK."},
  TL:{txt:"Alt. horário (lista)",cls:'b-warn',d:"Alteração de horário da OA – em lista de espera. Informe os novos horários e insira .CSS para HL."},
  TN:{txt:"Alt. horário (solicitação)",cls:'b-warn',d:"Sob solicitação/reserva necessária. Informe o passageiro sobre os novos horários/detalhes."},
  UC:{txt:"Impossível Conf.",cls:'b-err',d:"Não é possível confirmar ou colocar em lista de espera."},
  UN:{txt:"Voo Indisponível",cls:'b-err',d:"Não é possível confirmar: voo não está operando."},
  US:{txt:"Impossível vender",cls:'b-err',d:"Não é possível vender: passageiro em lista de espera."},
  UU:{txt:"Impossível confirmar",cls:'b-err',d:"Não é possível confirmar: passageiro em lista de espera."},
  VG:{txt:"Up/Downgrade voluntário",cls:'b-blue',d:"Upgrade/downgrade voluntário."},
  WK:{txt:"Alt. Horário",cls:'b-warn',d:"Estava confirmado, horário alterado/cancelado."},
  WL:{txt:"Alt. horário (lista)",cls:'b-warn',d:"Estava na lista de espera, horário alterado."},
  WN:{txt:"Alt. horário (necessário)",cls:'b-warn',d:"Era necessário, horário alterado."},
  XK:{txt:"Cancelar seg. OA",cls:'b-err',d:"Cancelar segmentos OA – nenhuma mensagem é gerada."},
  XM:{txt:"Cancelado: perda de conexão",cls:'b-err',d:"Cancelado devido a perda de conexão."},
  YG:{txt:"Embarcou em classe superior",cls:'b-blue',d:"Comprou econômica, embarcou na executiva ou primeira classe."},
  YK:{txt:"Reservado via fornecedor",cls:'b-gray',d:"Reservado via fornecedor para documentação e acompanhamento da agência. Nenhuma mensagem gerada ou ação de itinerário requerida. O espaço está HK em outro registro."},
  ZS:{txt:"Venda codeshare",cls:'b-blue',d:"Venda de voo codeshare. Mensagem de entrada."},
  SA:{txt:"Sujeito a Espaço",cls:'b-warn',d:"Sujeito a espaço."},
  OK:{txt:"Ok",cls:'b-ok',d:"Ok."},
};

const ACTION_LABEL = {
  AS:'Segmento Adicionado', XS:'Segmento Cancelado', MS:'Segmento Modificado',
  SC:'Schedule Change',
  A4S:'SSR Acrescentado',  X4S:'SSR Cancelado',
  A4O:'OSI Acrescentado',  X4O:'OSI Cancelado',
  A5H:'Remark Acrescentado', X5H:'Remark Cancelado',
  A4G:'Assento Adicionado',  X4G:'Assento Removido',
  A5T:'Remark Acrescentado', X5T:'Remark Cancelado', A3O:'OSI Acrescentado', X3O:'OSI Cancelado',
  AAX:'Serviço Adicionado', XAX:'Serviço Removido', UAX:'Serviço Atualizado',
  ASH:'Remark/Aviso Inserido', AST:'Queue Adicionada',
  AT:'Texto Adicionado', XT:'Texto Removido',
};

const ROBOTS = ['CALIDRIS','FOR RIB','FOR KHB','FORRIB','LATAM AUTOMATIC','CEPNR','TTY TYRM','SYS SYS','SIOMJR','NDC','REVENUE INTEGRITY','SABRESONIC','SABRE IX','LATAM XP'];
const isRobot = s => s && ROBOTS.some(r => s.toUpperCase().includes(r));

function iataFull(code){ return IATA_PT[code] ? `${code} – ${IATA_PT[code]}` : code; }
function routeHtml(trecho){
  if(!trecho || trecho.length < 6) return trecho||'';
  const d=trecho.slice(0,3), a=trecho.slice(3,6);
  const dn=IATA_PT[d]||d, an=IATA_PT[a]||a;
  return `<span class="sb-route"><span class="iata-pill" title="${dn}">${d}</span>${ico('arrow-right','ic--sm')}<span class="iata-pill" title="${an}">${a}</span></span>`;
}
function stInfo(code){ return SEG_STATUS[code]||{txt:code||'?',cls:'b-gray'}; }
function montarRefStatus(){
  const tb = document.getElementById('sbStatusRef'); if(!tb) return;
  tb.textContent = '';
  Object.keys(SEG_STATUS).sort().forEach(c=>{
    const st = SEG_STATUS[c], tr = document.createElement('tr');
    const a = document.createElement('td'); a.className='ref-code'; a.textContent=c;
    const b = document.createElement('td'); b.textContent = st.d || st.txt;
    tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
  });
}
montarRefStatus();

/* ═══════════════════════════════════════════
   REFERÊNCIA DE LÓGICA
═══════════════════════════════════════════ */
/* Assinatura: "HDQ HDQ8KBH 1250/09OCT26" ou, com código de equipe/duty entre o código e a hora, "BPS BPS5 PD 0819/11OCT26" */
const SIG_LINE = /^[A-Z0-9]{3}(?:-[A-Z0-9]{3}-[A-Z0-9]{2})?\s+([A-Z0-9*]{4,8})(?:\s+[A-Z0-9]{1,4})?\s+(\d{3,4})\/(\d{2}[A-Z]{3}\d{2})$/;
const MESES_SB = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
const pad2 = n => String(n).padStart(2,'0');

function parseDtSabre(hhmm, ddmmmyy){
  const h = String(hhmm).padStart(4,'0');
  const m = String(ddmmmyy).match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if(!m || MESES_SB[m[2]]===undefined) return null;
  const ano = 2000 + (+m[3]);
  const ts = Date.UTC(ano, MESES_SB[m[2]], +m[1], +h.slice(0,2), +h.slice(2));
  return { ts, txt: `${m[1]}/${pad2(MESES_SB[m[2]]+1)}/${ano} ${h.slice(0,2)}:${h.slice(2)} (${CONFIG.rotuloFuso})` };
}
/* "25DEC" sem ano → timestamp, inferindo o ano a partir da data da alteração */
function dataSegTs(ddmmm, refTs){
  const m = String(ddmmm).match(/^(\d{2})([A-Z]{3})$/);
  if(!m || MESES_SB[m[2]]===undefined) return 0;
  const ref = refTs ? new Date(refTs) : new Date();
  let ano = ref.getUTCFullYear();
  if(MESES_SB[m[2]] < ref.getUTCMonth() - 1) ano++;
  return Date.UTC(ano, MESES_SB[m[2]], +m[1]);
}
const fmtMoeda = (v, m) => `${m||'BRL'} ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}`;
const fmtCpf = d => /^\d{11}$/.test(d) ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : d;

/* Quem fez a alteração: a ASSINATURA manda; o campo R- pode ser trocado por qualquer agente */
function classificarAtor(code, from, station){
  const hm = rodarHooks('ator', [code, from, station], 'primeiro'); if(hm) return atorDeModulo(hm);
  const c = (code||'').toUpperCase(), f = (from||'').toUpperCase();
  const A = (k, rot, grupo, cls, robo, desc) => ({k, rot, grupo, cls, robo, desc});
  for(const r of REGRAS.atores){
    if(r.semAssinatura && c) continue;
    if((r.sigs.length && r.sigs.some(p => c.startsWith(p))) || (r.textos.length && r.textos.some(p => f.includes(p))))
      return A(r.k, r.rot, r.grupo, r.cls, r.robo, r.desc);
  }
  if(ROBOTS.some(r => f.includes(r)))
    return A('robo','Robô / sistema','auto','b-gray',true,'Ação automática de sistema.');
  if(!c)
    return A('sistema','Sistema (sem assinatura)','auto','b-gray',true,'Bloco sem assinatura de agente no histórico (ação automática do sistema).');
  return Object.assign(A('agente','Agente / Agência','agente','b-gray',false,`Assinatura ${c} não encontrada entre as assinaturas conhecidas (robôs, CPC, Call Center, site e agências cadastradas). Pode ser um agente ou uma agência nova, ou uma regra que ainda falta.`), {desconhecida:true, sig:c});
}

/* ── Assinaturas que o Agente Sabre não reconheceu: explica qual é e ajuda a reportar ── */
let sigPendentes = [];
function agruparSigsDesconhecidas(blocos){
  const m = new Map();
  blocos.forEach(b => {
    if(!b.ator || !b.ator.desconhecida || !b.sigCode) return;
    const g = m.get(b.sigCode) || {sig:b.sigCode, linha:b.sig, estacao:b.station || '', blocos:0, eventos:0, cats:{}, datas:[]};
    g.blocos++; g.eventos += b.evs.length; if(b.dt) g.datas.push(b.dt);
    b.evs.forEach(e => { const c = String(e.cat || '').replace('cat-',''); g.cats[c] = (g.cats[c]||0) + 1; });
    m.set(b.sigCode, g);
  });
  return [...m.values()];
}
function alertaAssinatura(g){
  const nomes = g.slice(0,3).map(x => x.sig).join(', ') + (g.length > 3 ? ` e mais ${g.length-3}` : '');
  const qtd = g.reduce((n,x) => n + x.blocos, 0);
  return `<div class="alert-item alert-yellow"><div class="alert-icon">${(ICONES.warn || svgInfo)()}</div><div class="alert-text"><div class="alert-title">Assinatura não reconhecida: ${esc(nomes)}</div>` +
    `<div class="alert-desc">O Agente Sabre não encontrou ${g.length > 1 ? 'estas assinaturas' : 'esta assinatura'} entre as que conhece (robôs, CPC, Call Center, site oficial e agências cadastradas), então ${qtd > 1 ? 'as ' + qtd + ' alterações aparecem' : 'a alteração aparece'} como “Agente / Agência”. Pode ser um agente ou uma agência nova, ou uma regra que ainda falta. Se você sabe quem é, ajude a ensinar o Sabre:</div>` +
    `<button class="btn btn--outline btn--sm sb-sig-btn" type="button" data-sb-action="sig-report">${ico('triangle-alert')}<span>Reportar ${g.length > 1 ? 'estas assinaturas' : 'esta assinatura'}</span></button></div></div>`;
}
function reportarAssinaturas(){
  if(!sigPendentes.length) return;
  const agora = new Date().toLocaleString('pt-BR'), nomes = sigPendentes.map(x => x.sig).join(', ');
  const corpo = sigPendentes.map(g =>
    `Assinatura  : ${g.sig}\nLinha lida  : ${g.linha || '—'}\nEstação     : ${g.estacao || '—'}\nAlterações  : ${g.blocos} bloco(s), ${g.eventos} evento(s)\nTipos       : ${Object.entries(g.cats).map(([k,v]) => k + ' ' + v).join(', ') || '—'}\nDatas       : ${[...new Set(g.datas)].slice(0,4).join(' | ') || '—'}`).join('\n\n');
  const relatorio =
`================================================================
   ASSINATURA NÃO RECONHECIDA – AGENTE SABRE (PORTAL SUPORTE LUA)
================================================================
Gerado em : ${agora}
URL       : ${location.href}
Regras    : ${REGRAS.total} carregadas

${corpo}

----------------------------------------------------------------
Nenhum nome de passageiro, localizador ou texto do histórico foi
incluído. Para cadastrar: Desenvolvedor > Agente Sabre > regras
"Quem alterou" (assinatura).
================================================================`;
  const descricao = `O Agente Sabre não reconheceu ${sigPendentes.length > 1 ? 'as assinaturas' : 'a assinatura'} ${nomes}. Quem é (agência, agente novo, equipe)? `;
  if(window.suporteLuaPerfil && window.PortalForms){
    window.PortalForms.abrir('erro-agente-sabre', {preset:{info_incorreta:'Outra informação', descricao, relatorio}});
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([relatorio], {type:'text/plain;charset=utf-8'}));
  a.download = `assinatura_nao_reconhecida_${agora.replace(/[/:, ]/g,'_')}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  if(typeof showToast === 'function') showToast('Baixei o relatório. Entre no portal para enviar direto aos desenvolvedores.');
}

const AX_ST = {HD:'Aguardando pagamento (HD)', HI:'Emitido / pago (HI)', HK:'Confirmado (HK)'};
const SEAT_ATTR = {NW:'Janela', NA:'Corredor', N:'Sem característica'};
const TIPO_ATOR_ORDEM = ['site','cc','cpc','agente','reval','calidris','forrib','ix','xp','reacom','robo','sistema'];

/* Remarks: reconhece o que cada texto significa */
function classificarRemark(t){
  let m;
  const hm = rodarHooks('remark', [t], 'primeiro'); if(hm) return remarkDeModulo(hm);
  const dbr = remarkRegra(t); if(dbr) return dbr;
  const R = (titulo, cat, icon, fields, extra) => Object.assign({titulo, cat, icon, fields}, extra||{});
  if((m = t.match(/^AUTH-APV\/([A-Z0-9]+)\/[^/]*\/([A-Z]{3})\s*([\d.]+)/)))
    return R('Pagamento aprovado', 'cat-pay', svgTicket(), [{l:'Valor aprovado', v:fmtMoeda(m[3], m[2]), vcls:'v-ok'},{l:'Autorização', v:m[1]}], {pay:{valor:+m[3], moeda:m[2], auth:m[1]}});
  if((m = t.match(/^AUTH-XPSP\/([A-Z]{2})(\d{4})\/(\d{2}[A-Z]{3})/)))
    return R('Autorização do cartão', 'cat-pay', svgTicket(), [{l:'Cartão', v:`${m[1]} final ${m[2]}`},{l:'Data da autorização', v:m[3]}], {pay:{cartao:`${m[1]} final ${m[2]}`}});
  if((m = t.match(/^FARE\/PUB\/AMT\/(\d+)([A-Z]{3})\/([\d.]+)\/([\d.]+)\/([\d.]+)\/([A-Z]{3})/)))
    return R('Valores da tarifa', 'cat-pay', svgTicket(), [{l:'Passageiros', v:`${m[1]} ${transPax(m[2])}`},{l:'Tarifa base', v:fmtMoeda(m[3], m[6])},{l:'Taxas', v:fmtMoeda(m[4], m[6])},{l:'Total', v:fmtMoeda(m[5], m[6]), vcls:'v-ok'}], {pay:{tarifaTotal:fmtMoeda(m[5], m[6]), tarifaBase:fmtMoeda(m[3], m[6]), taxas:fmtMoeda(m[4], m[6])}});
  if((m = t.match(/^FARE\/([A-Z]+)\/([A-Z0-9]+)/)))
    return R('Tarifa utilizada', 'cat-pay', svgTicket(), [{l:'Tipo', v: m[1]==='PUB' ? 'Pública (PUB)' : m[1]},{l:'Base tarifária (fare basis)', v:m[2], vcls:'v-ok'}], {pay:{fareBasis:m[2]}});
  if(/^B¥A\//.test(t)) return R('Endereço de cobrança do pagante', 'cat-pay', svgTicket(), [{l:'Endereço', v:t.replace(/¥/g,' · ')}]);
  if((m = t.match(/^SSWMOD-DT\/(\d{4})\/(\d{2})\/(\d{2})-(\d{2})-(\d{2})\/IP\/([\d.]+)/)))
    return R('Compra registrada no site (SSW)', 'cat-pay', svgTicket(), [{l:'Data/hora (UTC)', v:`${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`},{l:'IP da compra', v:m[6]}], {pay:{canal:'Site LATAM'}});
  if((m = t.match(/^CARDHOLDERNAME-(.+)$/)))
    return R('Nome do pagante (titular do cartão)', 'cat-pay', svgTicket(), [{l:'Pagante', v:m[1].trim()}], {pay:{pagante:m[1].trim()}});
  if(/^BT\s?BT?\d/.test(t) || /^BT\d/.test(t)) return R('Token de pagamento (BT)', 'cat-pay', svgTicket(), [{l:'Registro', v:t.replace(/(\d{4})\d{8}(\d{4})/, '$1••••••••$2')}]);
  if((m = t.match(/^SSWREF\/([A-Z0-9-]+)/i)))
    return R('Verificação do pagamento no site (SSWREF)', 'cat-pay', svgTicket(), [{l:'ID do pagamento verificado', v:m[1]}], {pay:{ref:m[1]}});
  if((m = t.match(/PAGO CC COD AUTH\s+(\d+)/)))
    return R('Pagamento realizado (cartão)', 'cat-pay', svgTicket(), [{l:'Situação', v:'Pago com cartão de crédito', vcls:'v-ok'},{l:'Código de autorização', v:m[1]}], {pay:{auth:m[1], pago:true}});
  if((m = t.match(/VMP REEMISION APROBADA\s+([\d-]+)/)))
    return R('Reemissão aprovada (VMP)', 'cat-pay', svgTicket(), [{l:'Situação', v:'Reemissão aprovada', vcls:'v-ok'},{l:'Data', v:m[1]}], {pay:{reemissao:m[1]}});
  if((m = t.match(/^NRP\/(\d{11})$/)))
    return R('Documento do passageiro (NRP)', 'cat-remark', svgDoc(), [{l:'CPF', v:fmtCpf(m[1])}], {cpf:m[1]});
  return null;
}

function classificarOsi(t){
  for(const r of REGRAS.osis){
    const m = casa(r, t); if(!m) continue;
    return Object.assign({titulo:preencher(r.titulo, m), desc:preencher(r.desc, m)}, r.screac ? {screac:true} : {});
  }
  return null;
}

/* ═══════════════════════════════════════════
   REGRAS EDITÁVEIS (vêm do banco; este bloco traz os padrões de fábrica)
   Cada regra tem a forma de uma linha da tabela sabre_regras:
   {tipo, chave, titulo, descricao, cor, modo, padrao, padrao2, extra, ordem, ativo}
═══════════════════════════════════════════ */
const ICONES = {plane:svgPlane, service:svgService, info:svgInfo, msg:svgMsg, bot:svgBot, ticket:svgTicket, seat:svgSeat, user:svgUser, star:svgStar, warn:svgWarn, doc:svgDoc, wheelchair:svgWheelchair, pet:svgPet, meal:svgMeal};
const REGRAS = {atores:[], remarks:[], osis:[], ssr:[], indicios:[], alertas:[], tradPax:[], tradRemark:[], total:0};
const TARIFAS = { QP:'Basic', SL:'Light', KM:'Standard', SE:'Plus', KD:'Full', RL:'Premium Economy Standard', RY:'Premium Economy Full', EV:'Premium Business Standard' };
const DICT0 = {aeroporto:{...IATA_PT}, status:JSON.parse(JSON.stringify(SEG_STATUS)), acao:{...ACTION_LABEL}, ax_status:{...AX_ST}, assento_attr:{...SEAT_ATTR}, tarifa:{...TARIFAS}, robo:[...ROBOTS]};

const lista = s => String(s || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ex = r => (r && r.extra && typeof r.extra === 'object') ? r.extra : {};

/* Compara um texto com uma regra (igual · começa com · contém · expressão regular). Devolve a lista de trechos ou null. */
function casa(r, t){
  if(!r || !r.padrao) return null;
  t = String(t == null ? '' : t);
  if(r.modo === 'regex') return r.re ? t.match(r.re) : null;
  if(r.modo === 'igual') return t === r.padrao ? [t] : null;
  if(r.modo === 'comeca') return t.startsWith(r.padrao) ? [t] : null;
  return t.includes(r.padrao) ? [t] : null;
}
const preencher = (tpl, m) => String(tpl == null ? '' : tpl).replace(/\$(\d)/g, (_, n) => (m && m[+n] != null ? m[+n] : '')).trim();
function compilar(r){
  const o = Object.assign({}, r, {extra: ex(r)});
  o.padrao = o.padrao == null ? '' : String(o.padrao);
  if(o.modo === 'regex'){ try { o.re = new RegExp(o.padrao, 'i'); } catch(e){ o.re = null; } }
  else o.padrao = o.padrao.toUpperCase();
  return o;
}
function remarkRegra(t){
  for(const r of REGRAS.remarks){
    const m = casa(r, t); if(!m) continue;
    const e = r.extra;
    const res = {titulo:preencher(r.titulo, m), cat:e.cat || 'cat-remark', icon:(ICONES[e.icone] || svgMsg)(),
      fields:(Array.isArray(e.campos) ? e.campos : []).map(c => Object.assign({l:preencher(c.l, m), v:preencher(c.v, m)}, c.vcls ? {vcls:c.vcls} : {}))};
    if(e.flag) res[e.flag] = true;
    return res;
  }
  return null;
}

const PADRAO_LISTAS = [
  /* Quem alterou: a ordem importa (a primeira regra que casar vale) */
  {tipo:'ator', ordem:10, titulo:'Revalidação automática', cor:'b-warn', padrao:'HDQ8SJ0', padrao2:'AUTOMATIC REVALIDATION', extra:{k:'reval', grupo:'auto', robo:true},
   descricao:'Serviço automático da LATAM. Indica que o passageiro usou a involuntária oferecida pela LATAM no site: ele perde o direito à involuntária dos itinerários anteriores e só volta a ter se a LATAM alterar o itinerário de novo, conforme a regra.'},
  {tipo:'ator', ordem:20, titulo:'SABRE IX (sistema)', cor:'b-gray', padrao:'HDQ8KBH', padrao2:'SABRE IX', extra:{k:'ix', grupo:'auto', robo:true},
   descricao:'Sistema que confirma ações internas (por exemplo, do Agente 360) ou reescreve de forma organizada alterações feitas por um agente. Não é um agente.'},
  {tipo:'ator', ordem:30, titulo:'Robô Calidris', cor:'b-err', padrao:'HDQ8RIC', padrao2:'CALIDRIS,REVENUE INTEGRITY', extra:{k:'calidris', grupo:'auto', robo:true},
   descricao:'Robô de Revenue Integrity. Derruba assento ou segmento por falta de pagamento (HD expirado / sem TKNE) ou por no-show.'},
  {tipo:'ator', ordem:40, titulo:'Robô FORRIB', cor:'b-err', padrao:'HDQ5RIB', padrao2:'SABRESONIC', extra:{k:'forrib', grupo:'auto', robo:true},
   descricao:'Robô da LATAM (conhecido como FORRIB) que faz alterações automáticas na reserva.'},
  {tipo:'ator', ordem:50, titulo:'LATAM XP (sistema)', cor:'b-gray', padrao:'HDQ5L*S', padrao2:'LATAM XP', extra:{k:'xp', grupo:'auto', robo:true},
   descricao:'Sistema que confirma internamente os dados do bilhete com os voos e grava o SSR LAXP.'},
  {tipo:'ator', ordem:60, titulo:'Call Center LATAM', cor:'b-teal', padrao:'QOC,JDO', padrao2:'', extra:{k:'cc', grupo:'cc', robo:false},
   descricao:'Assinatura iniciada em QOC ou JDO: agente de Call Center.'},
  {tipo:'ator', ordem:70, titulo:'CPC (Contingência)', cor:'b-purple', padrao:'MVD', padrao2:'', extra:{k:'cpc', grupo:'cpc', robo:false},
   descricao:'Assinatura iniciada em MVD: Centro do Passageiro em Contingência. Pode fazer qualquer alteração e dá ao passageiro o direito de seguir com a involuntária.'},
  {tipo:'ator', ordem:80, titulo:'Site oficial LATAM', cor:'b-blue', padrao:'HDQ5RV1,UHO', padrao2:'', extra:{k:'site', grupo:'site', robo:false},
   descricao:'Alteração feita pelo site/app oficial da LATAM (SSW). Não é agência.'},
  {tipo:'ator', ordem:90, titulo:'Reacomodação prioritária', cor:'b-warn', padrao:'', padrao2:'PRIORITY REACCOMMODATION', extra:{k:'reacom', grupo:'auto', robo:true},
   descricao:'Sistema reacomodou o passageiro (assentos). O motivo exato não aparece no histórico.'},
  {tipo:'ator', ordem:100, titulo:'Site oficial LATAM', cor:'b-blue', padrao:'', padrao2:'SSW,MISCWS', extra:{k:'site', grupo:'site', robo:false, sem_assinatura:true},
   descricao:'Alteração feita pelo site/app oficial da LATAM (SSW). Não é agência.'},
  /* OSI */
  {tipo:'osi', ordem:10, modo:'contem', padrao:'SC.REAC', titulo:'Reacomodação por alteração de malha (SC.REAC)', descricao:'Sistema reacomodou o passageiro após uma alteração de horário (schedule change).', extra:{screac:true}},
  {tipo:'osi', ordem:20, modo:'contem', padrao:'REDEMPTION', titulo:'Reserva de resgate de pontos (redemption)', descricao:'Passageiro com bilhete de resgate (LATAM Pass).', extra:{}},
  {tipo:'osi', ordem:30, modo:'contem', padrao:'PREPAID SEAT MCO', titulo:'Passageiro com assento pré-pago (MCO)', descricao:'Há restrições em caso de alteração ou reembolso do assento pré-pago.', extra:{}},
  /* Remarks simples */
  {tipo:'remark', ordem:10, modo:'comeca', padrao:'AUTH-POSTAL CODE AND ADDRESS MATCHED', titulo:'Antifraude: CEP e endereço conferem', extra:{cat:'cat-pay', icone:'ticket', campos:[{l:'Verificação', v:'CEP e endereço do cartão conferem'}]}},
  {tipo:'remark', ordem:20, modo:'comeca', padrao:'AUTH-CVC MATCHED', titulo:'Antifraude: CVC confere', extra:{cat:'cat-pay', icone:'ticket', campos:[{l:'Verificação', v:'CVC do cartão confere'}]}},
  {tipo:'remark', ordem:30, modo:'comeca', padrao:'POS-BT', titulo:'Ponto de venda (POS-BT)', extra:{cat:'cat-pay', icone:'ticket', campos:[{l:'POS', v:'$0'}]}},
  {tipo:'remark', ordem:40, modo:'contem', padrao:'PLEASE ADV ANCILLARIES BEFORE 48 HRS OR AUTO CANCEL', titulo:'Aviso: pagar os serviços (assentos) em até 48h', extra:{cat:'cat-sys', icone:'bot', flag:'aviso48', campos:[{l:'Aviso', v:'Informe/pague os ancillaries antes de 48h ou haverá cancelamento automático'}]}},
  {tipo:'remark', ordem:50, modo:'contem', padrao:'CNL DUE AE HD EXPIRED', titulo:'Cancelado: HD expirado (falta de pagamento)', extra:{cat:'cat-sys', icone:'bot', flag:'hdExpirado', campos:[{l:'Motivo', v:'Assento em espera (HD) expirou sem pagamento (AE)', vcls:'v-err'}]}},
  {tipo:'remark', ordem:60, modo:'regex', padrao:'^NMP/(.+)$', titulo:'Nome do passageiro (NMP)', extra:{cat:'cat-remark', icone:'user', campos:[{l:'Nome', v:'$1'}]}},
  /* SSR por tipo */
  {tipo:'ssr', ordem:10, modo:'comeca', padrao:'WC', titulo:'Cadeira de Rodas', extra:{icone:'wheelchair'}},
  {tipo:'ssr', ordem:20, modo:'igual', padrao:'PETC', titulo:'Pet na Cabine', extra:{icone:'pet'}},
  {tipo:'ssr', ordem:30, modo:'contem', padrao:'ML', titulo:'Refeição Especial', extra:{icone:'meal'}},
  /* Traduções */
  {tipo:'traducao_pax', ordem:10, modo:'palavra', padrao:'ADT', titulo:'Adulto', extra:{}},
  {tipo:'traducao_pax', ordem:20, modo:'palavra', padrao:'CHD,CHILD', titulo:'Criança', extra:{}},
  {tipo:'traducao_pax', ordem:30, modo:'palavra', padrao:'INF,INFANT', titulo:'Bebê', extra:{}},
  {tipo:'traducao_remark', ordem:10, modo:'regex', padrao:'^AUTH-CVC MATCHED.*', titulo:'Autorização de Pagamento (CVC)', extra:{}},
  {tipo:'traducao_remark', ordem:20, modo:'regex', padrao:'^FARE/PUB.*', titulo:'Emissão de Tarifa Pública', extra:{}},
  {tipo:'traducao_remark', ordem:30, modo:'regex', padrao:'^PL(\\s)', titulo:'Prazo de Emissão (Time Limit)$1', extra:{}},
  /* Alertas no topo dos resultados (chave = nome do sinal; sem padrão = o sistema aciona sozinho) */
  {tipo:'alerta', ordem:10, chave:'noshow', titulo:'NO SHOW DETECTADO', descricao:'Passageiro não embarcou. Verifique multas e regras tarifárias da reserva.', cor:'alert-red', extra:{icone:'warn'}},
  {tipo:'alerta', ordem:30, chave:'hdExpirado', titulo:'HD EXPIRADO (FALTA DE PAGAMENTO)', descricao:'Houve cancelamento por HD expirado (CNL DUE AE HD EXPIRED): o assento em espera não foi pago a tempo.', cor:'alert-red', extra:{icone:'bot'}},
  {tipo:'alerta', ordem:40, chave:'reemissao', titulo:'REEMISSÃO APROVADA', descricao:'Remark VMP: reemissão aprovada em {valor}.', cor:'alert-green', extra:{icone:'info'}},
  {tipo:'alerta', ordem:50, chave:'ndc', titulo:'AGÊNCIA EXTERNA / NDC', descricao:'Reserva com marca de agência externa. Não altere sem autorização.', cor:'alert-yellow', extra:{icone:'warn'}},
  {tipo:'alerta', ordem:60, chave:'elite', titulo:'CLIENTE ELITE / LATAMPASS', descricao:'Passageiro com programa de fidelidade. Verifique benefícios de bagagem e assento.', cor:'alert-green', extra:{icone:'star'}},
  {tipo:'alerta', ordem:70, chave:'protecao', titulo:'PROTEÇÃO AUTOMÁTICA ATIVA', descricao:'Robô AUTOREACOM ou ARU atuou nesta reserva. Verifique marcas INVOL CHG e PNR WORKED ARU.', cor:'alert-blue', extra:{icone:'info'}},
  {tipo:'alerta', ordem:80, chave:'codeshare_lx', titulo:'CODESHARE SWISS (LX) DETECTADO', descricao:'Acordo somente com LATAM Brasil (bilhetes 045). INF/CHD/UMNR/Gestante/DEPA/AVIH/ESAN NÃO permitidos no voo marketing.', cor:'alert-yellow', extra:{icone:'warn'}},
  /* Indícios (leitura assistida): chave = tipo de quem alterou (campo "k" da regra de assinatura). {sig} = assinatura, {dt} = data */
  {tipo:'indicio', ordem:10, chave:'reval', titulo:'Involuntária já utilizada (revalidação automática)', cor:'alert-yellow', descricao:'Assinatura {sig} em {dt}: o passageiro usou a involuntária oferecida pela LATAM no site. Perde o direito à involuntária dos itinerários anteriores; só volta a ter se a LATAM alterar o itinerário de novo, conforme a regra.', extra:{icone:'warn', sig_padrao:'HDQ8SJ0'}},
  {tipo:'indicio', ordem:20, chave:'cpc', titulo:'Alteração feita pelo CPC (Contingência)', cor:'alert-blue', descricao:'Assinatura {sig} em {dt}: o CPC pode fazer qualquer alteração e dá ao passageiro o direito de seguir com a involuntária.', extra:{icone:'info'}},
  {tipo:'indicio', ordem:30, chave:'screac', titulo:'Reacomodação do sistema (SC.REAC)', cor:'alert-blue', descricao:'O sistema reacomodou a reserva em {dt}: o segmento antigo sai (XS) e o novo entra (AS/SC), seguindo a mesma lógica.', extra:{icone:'info'}},
  {tipo:'indicio', ordem:40, chave:'reacom', titulo:'Reacomodação prioritária de assentos', cor:'alert-blue', descricao:'Em {dt} o sistema mudou assentos (PRIORITY REACCOMMODATION). O histórico não informa o motivo exato.', extra:{icone:'info'}},
  {tipo:'indicio', ordem:50, chave:'calidris', titulo:'Calidris atuou na reserva', cor:'alert-red', descricao:'Robô de Revenue Integrity em {dt}: derruba assento/segmento por falta de pagamento (HD expirado ou sem TKNE) ou por no-show.', extra:{icone:'bot'}},
  {tipo:'indicio', ordem:51, chave:'forrib', titulo:'Robô FORRIB atuou na reserva', cor:'alert-red', descricao:'Robô da LATAM (FORRIB, {sig}) fez alterações em {dt}.', extra:{icone:'bot', se_ausente:'calidris'}},
  {tipo:'indicio', ordem:60, chave:'site', titulo:'Houve alteração pelo site oficial LATAM', cor:'alert-green', descricao:'Assinatura {sig} (SSW): não é agência.', extra:{icone:'info', sig_padrao:'do site'}},
  {tipo:'indicio', ordem:70, chave:'cc', titulo:'Houve atendimento do Call Center', cor:'alert-blue', descricao:'Assinatura {sig} (QOC/JDO) em {dt}.', extra:{icone:'info'}},
];

/* Todas as regras de fábrica, no formato da tabela (usado para semear o banco e para "restaurar padrão") */
function linhasPadrao(){
  const out = [];
  const kv = (tipo, obj, fn) => Object.keys(obj).forEach((k, i) => out.push(Object.assign({tipo, chave:k, ordem:(i + 1) * 10, modo:'contem', padrao:'', padrao2:'', cor:'', descricao:'', titulo:'', extra:{}, ativo:true}, fn(obj[k]))));
  kv('aeroporto', DICT0.aeroporto, v => ({titulo:v}));
  kv('status', DICT0.status, v => ({titulo:v.txt, cor:v.cls, descricao:v.d || ''}));
  kv('acao', DICT0.acao, v => ({titulo:v}));
  kv('ax_status', DICT0.ax_status, v => ({titulo:v}));
  kv('assento_attr', DICT0.assento_attr, v => ({titulo:v}));
  kv('tarifa', DICT0.tarifa, v => ({titulo:v}));
  DICT0.robo.forEach((r, i) => out.push({tipo:'robo', chave:r, ordem:(i + 1) * 10, modo:'contem', padrao:'', padrao2:'', cor:'', descricao:'', titulo:'', extra:{}, ativo:true}));
  PADRAO_LISTAS.forEach(r => out.push(Object.assign({chave:'', modo:'contem', padrao:'', padrao2:'', cor:'', descricao:'', titulo:'', extra:{}, ativo:true}, JSON.parse(JSON.stringify(r)))));
  return out;
}

/* Aplica um conjunto de regras (do banco ou de fábrica) ao Agente Sabre */
function aplicarRegras(rows){
  const ativas = (rows || []).filter(r => r && r.ativo !== false);
  const por = t => ativas.filter(r => r.tipo === t).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const dic = (alvo, tipo, fn) => { Object.keys(alvo).forEach(k => delete alvo[k]); por(tipo).forEach(r => { if(r.chave) alvo[String(r.chave).trim()] = fn(r); }); };
  dic(IATA_PT, 'aeroporto', r => r.titulo);
  dic(SEG_STATUS, 'status', r => ({txt:r.titulo, cls:r.cor || 'b-gray', d:r.descricao || ''}));
  dic(ACTION_LABEL, 'acao', r => r.titulo);
  dic(AX_ST, 'ax_status', r => r.titulo);
  dic(SEAT_ATTR, 'assento_attr', r => r.titulo);
  dic(TARIFAS, 'tarifa', r => r.titulo);
  ROBOTS.length = 0; por('robo').forEach(r => { if(r.chave) ROBOTS.push(String(r.chave).trim().toUpperCase()); });
  REGRAS.atores = por('ator').map(r => { const e = ex(r); return {k:e.k || ('regra_' + (r.id || r.ordem)), rot:r.titulo, grupo:e.grupo || 'agente', cls:r.cor || 'b-gray', robo:!!e.robo, desc:r.descricao || '', sigs:lista(r.padrao), textos:lista(r.padrao2), semAssinatura:!!e.sem_assinatura}; })
    .filter(r => r.sigs.length || r.textos.length);
  REGRAS.osis = por('osi').map(compilar).map(r => ({...r, desc:r.descricao || '', screac:!!r.extra.screac})).filter(r => r.padrao);
  REGRAS.remarks = por('remark').map(compilar).filter(r => r.padrao);
  REGRAS.ssr = por('ssr').map(compilar).map(r => ({...r, icone:r.extra.icone})).filter(r => r.padrao);
  REGRAS.alertas = por('alerta').map(compilar).map(r => ({...r, icone:r.extra.icone, valor:'', gatilho:r.padrao ? r : null}));
  REGRAS.indicios = por('indicio').map(r => { const e = ex(r); return {k:r.chave, titulo:r.titulo, desc:r.descricao || '', cls:r.cor || 'alert-blue', icone:e.icone, sigPadrao:e.sig_padrao || '', seAusente:e.se_ausente || '', ordem:r.ordem || 0}; });
  const tr = (tipo, fn) => por(tipo).filter(r => r.padrao).map(r => { try { return fn(r); } catch(e){ return null; } }).filter(Boolean);
  REGRAS.tradPax = tr('traducao_pax', r => ({re:new RegExp('\\b(?:' + lista(r.padrao).map(escRe).join('|') + ')\\b', 'g'), para:() => r.titulo}));
  REGRAS.tradRemark = tr('traducao_remark', r => r.modo === 'regex' ? {re:new RegExp(r.padrao), para:r.titulo} : {re:new RegExp(escRe(String(r.padrao).toUpperCase())), para:() => r.titulo});
  REGRAS.total = ativas.length;
  montarRefStatus();
}

/* Teste de uma regra para o painel do desenvolvedor (não altera nada) */
function testarRegra(tipo, a, b){
  a = String(a == null ? '' : a).toUpperCase(); b = String(b == null ? '' : b).toUpperCase();
  if(tipo === 'ator'){ const r = classificarAtor(a, b, ''); return {ok:true, texto:`${r.rot} (tipo "${r.k}", ${r.robo ? 'sistema/robô' : 'pessoa'})`}; }
  if(tipo === 'osi'){ const r = classificarOsi(a); return r ? {ok:true, texto:r.titulo} : {ok:false, texto:'Nenhuma regra casou: o OSI aparece como "OSI Acrescentado".'}; }
  if(tipo === 'remark'){ const r = classificarRemark(a); return r ? {ok:true, texto:`${r.titulo}${r.fields.length ? ' — ' + r.fields.map(f => f.l + ': ' + f.v).join(' · ') : ''}`} : {ok:false, texto:'Nenhuma regra casou: aparece como remark genérico: "' + cleanRemark(a).slice(0, 80) + '"'}; }
  if(tipo === 'ssr'){ const r = REGRAS.ssr.find(x => casa(x, a)); return r ? {ok:true, texto:`Título ganha " (${r.titulo})"`} : {ok:false, texto:'Nenhuma regra de SSR casou.'}; }
  if(tipo === 'traducao_pax') return {ok:true, texto:transPax(a)};
  if(tipo === 'traducao_remark') return {ok:true, texto:cleanRemark(a)};
  if(tipo === 'alerta'){ const r = REGRAS.alertas.filter(x => x.gatilho && casa(x, a)); return r.length ? {ok:true, texto:'Dispara: ' + r.map(x => x.titulo).join(' · ')} : {ok:false, texto:'Nenhum alerta é disparado por esta linha.'}; }
  return {ok:false, texto:'Este tipo não tem teste de texto.'};
}
window.SabreCore = {aplicarRegras, padroes:linhasPadrao, testar:testarRegra, icones:Object.keys(ICONES), total:() => REGRAS.total};
aplicarRegras(linhasPadrao());

/* ═══════════════════════════════════════════
   MÓDULOS (código e estilo vindos do banco) — pontos de extensão do raciocínio do Sabre
   Um módulo JS registra funções com Sabre.hook('nome', função). Se uma função der erro,
   ela é desligada e o Sabre continua com o comportamento de fábrica.
═══════════════════════════════════════════ */
const CONFIG = {larguraSabre:56, maxIgnoradas:300, rotuloFuso:'Tulsa'};
const CONFIG0 = {...CONFIG};
const HOOKS = {antes:[], linha:[], ator:[], remark:[], fatos:[], alertas:[], depois:[]};
const HOOKS_ERROS = [];
const HOOK_NOMES = Object.keys(HOOKS);
function limparHooks(){ HOOK_NOMES.forEach(n => { HOOKS[n].length = 0; }); HOOKS_ERROS.length = 0; Object.assign(CONFIG, CONFIG0); }
function registrarHook(modulo, nome, fn){
  if(!HOOKS[nome]) throw new Error('Gancho desconhecido: ' + nome + '. Use: ' + HOOK_NOMES.join(', '));
  if(typeof fn !== 'function') throw new Error('O gancho "' + nome + '" precisa de uma função.');
  HOOKS[nome].push({modulo, fn, ok:true});
}
function rodarHooks(nome, args, modo){
  let acc = modo === 'lista' ? [] : (modo === 'texto' ? args[0] : null);
  for(const h of HOOKS[nome]){
    if(!h.ok) continue;
    try {
      const r = h.fn.apply(null, modo === 'texto' ? [acc].concat(args.slice(1)) : args);
      if(modo === 'texto'){ if(typeof r === 'string') acc = r; }
      else if(modo === 'lista'){ if(Array.isArray(r)) acc = acc.concat(r); }
      else if(modo === 'primeiro'){ if(r) return r; }
    } catch(e){
      h.ok = false; HOOKS_ERROS.push({modulo:h.modulo, gancho:nome, erro:String(e && e.message || e)});
      console.error('[sabre] módulo "' + h.modulo + '" (' + nome + ') desligado por erro:', e);
      if(typeof showToast === 'function') try { showToast('O módulo "' + h.modulo + '" do Agente Sabre deu erro e foi ignorado.'); } catch(x){ /* ignora */ }
    }
  }
  return acc;
}
const eventoDeModulo = (s, l) => ((cat, icon, title, sub, badge, badgeCls, fields, raw, meta) => ({cat, icon, title, sub, badge, badgeCls, fields, raw, meta: meta||{}}))(s.cat || 'cat-remark', (ICONES[s.icone] || svgMsg)(), String(s.titulo || 'Evento'), String(s.sub || ''), String(s.selo || ''), s.corSelo || 'b-gray',
  (Array.isArray(s.campos) ? s.campos : []).map(c => ({l:String(c.l), v:String(c.v), ...(c.vcls ? {vcls:c.vcls} : {}), ...(c.html ? {html:true} : {})})), l, Object.assign({kind:'modulo'}, s.meta || {}));
function atorDeModulo(s){ return {k:String(s.k || 'modulo'), rot:String(s.rot || s.titulo || 'Módulo'), grupo:s.grupo || 'agente', cls:s.cls || s.cor || 'b-gray', robo:!!s.robo, desc:String(s.desc || s.descricao || '')}; }
function remarkDeModulo(s){ return Object.assign({titulo:String(s.titulo || ''), cat:s.cat || 'cat-remark', icon:(ICONES[s.icone] || svgMsg)(), fields:(Array.isArray(s.campos) ? s.campos : []).map(c => ({l:String(c.l), v:String(c.v), ...(c.vcls ? {vcls:c.vcls} : {})}))}, s.flag ? {[s.flag]:true} : {}, s.pay ? {pay:s.pay} : {}); }
const API_MODULOS = {
  ganchos:HOOK_NOMES, icones:ICONES, config:CONFIG, esc, fmtMoeda, fmtCpf, routeHtml, iataFull, stInfo, transPax, cleanRemark, parseDtSabre,
  regras:REGRAS, dicionarios:{aeroportos:IATA_PT, status:SEG_STATUS, acoes:ACTION_LABEL, tarifas:TARIFAS, robos:ROBOTS}, classificarAtor, classificarRemark, classificarOsi,
  erros:HOOKS_ERROS
};
function executarModulo(nome, codigo){
  const Sabre = Object.assign({}, API_MODULOS, {hook:(g, fn) => registrarHook(nome, g, fn), configurar:o => { Object.keys(o || {}).forEach(k => { if(k in CONFIG && typeof o[k] === typeof CONFIG[k]) CONFIG[k] = o[k]; }); }});
  new Function('Sabre', '"use strict";\n' + codigo)(Sabre);
}
function removerModulo(nome){ HOOK_NOMES.forEach(n => { HOOKS[n] = HOOKS[n].filter(h => h.modulo !== nome); }); }
Object.assign(window.SabreCore, {removerModulo, limparHooks, executarModulo, hooksErros:() => HOOKS_ERROS.slice(), config:CONFIG, ganchos:HOOK_NOMES});


/* ═══════════════════════════════════════════
   PARSER PRINCIPAL
═══════════════════════════════════════════ */
const TITULO_PAX = '(?:MR|MS|MSTR|MRS|CHD|CHILD|INF|INFANT|ADT)';
const RE_TITULO_FIM = new RegExp('\\s' + TITULO_PAX + '$');
const NOVA = /^(?:[AXUM][0-9A-Z]{1,3}\*?\s|XS\s|AS\s|SC\s|MS\s|R-|OAC-|\d+\.\d)/;
/* Início inequívoco de uma linha do histórico (códigos de ação conhecidos) */
const INICIO = /^(?:(?:AS|XS|MS|SC)\s|[AXU][0-9][A-Z0-9]?\*?\s|[AXU]AX\s|[AXU]FF\s|ASH|AST|AT\s|XT\s|ADM\s|AEM\s|SSR\s|H-|R-|OAC-|HIST\s|FQTV\s|Q\s+\d|EMD\s|VCR\s|TTY\s|SYS\s|CALIDRIS|LATAM\s|\d+\.\d|9[A-Z]{3}\d|UHO\d{2}-|\d{6,}\b|.*(?:VCR MOVED TO HISTORY|EMD MARKED FOR PURGE|REVENUE INTEGRITY|LATAM AUTOMATIC))/;
/* o SABRE quebra as linhas entre ~58 e 64 colunas (o espaço final some na cópia): CONFIG.larguraSabre */
/* Fim de linha com nome de passageiro ainda aberto: "...-MENDO", "...-VILLAS BOAS NIZER/PED" */
const RE_NOME_ABERTO_FIM = /-[A-Z][A-Z' .]*(?:\/[A-Z][A-Z' .]*)?$/;
/* Linha que só pode ser o resto de um nome: "NCA SALES/LIVIAN CALILLA MS", "S BOAS NIZER CARNEIR/PEDRO LUCAS MR" */
const RE_RESTO_NOME = /^[A-Z][A-Z' .]*(?:\/[A-Z][A-Z' .]*)?$/;
/* Hora/data da assinatura sozinha numa linha: "0807/11OCT26" */
const RE_HORA_DATA = /^\d{3,4}\/\d{2}[A-Z]{3}\d{2}$/;
/* Voo ligado a um elemento: "LA4716G 10OCT BPSGRU" */
/* Começo de palavra conhecida nos registros AT/EMD (a quebra caiu entre palavras, o espaço some na cópia) */
const RE_INICIO_AT = /^(?:\d\/REFUND-|SEAT-|PURCHASE BY|TRAVEL DATE|COMMISSION-|REFUND-)/;
const RE_VOO_REF = /^[A-Z0-9]{2}\d{1,4}[A-Z]?\s+\d{2}[A-Z]{3}\s+[A-Z]{6}$/;

function normalizarLinhas(raw){
  const txt = String(raw == null ? '' : raw)
    .normalize('NFKC')
    .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g, '')
    .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u2028\u2029\u0085\u000B\u000C]/g, '\n')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .toUpperCase();
  const itens = [];
  txt.split('\n').forEach(L => {
    const sem = L.replace(/\s+$/, '');
    if(!sem.trim()) return;
    const indent = sem.match(/^ */)[0].length;
    let t = sem.trim().replace(/\s*¥$/, '').replace(/ {2,}/g, ' ');
    t = t.replace(/([A-Z])[ ]*\/[ ]*(?=[A-Z])/g, '$1/')            /* SILVA / JOAO → SILVA/JOAO */
         .replace(/ - (?=[A-Z][A-Z' .-]*\/)/g, ' -')                   /* "- SILVA/JOAO" → "-SILVA/JOAO" */
         .replace(/(\d{3,4})\s*\/\s*(\d{2}[A-Z]{3}\d{2})$/, '$1/$2');   /* hora/data da assinatura */
    if(t) itens.push({t, indent, last: sem.length});
  });
  /* assinatura partida em duas linhas: "HDQ-HDQ-FR" + "HDQ8KBH 1250/09OCT26" */
  for(let i = 0; i < itens.length - 1; i++){
    if(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{2}$/.test(itens[i].t) && /^[A-Z0-9*]{4,8} \d{3,4}\/\d{2}[A-Z]{3}\d{2}$/.test(itens[i+1].t)){
      itens[i].t += ' ' + itens[i+1].t; itens[i].last = itens[i+1].last; itens.splice(i+1, 1);
    }
  }
  /* assinatura partida em 2 ou 3 linhas curtas: a hora/data caiu sozinha embaixo
     ("HDQ HDQ8KBH" + "0807/11OCT26"  ·  "HDQ-HDQ-FR" + "HDQ8KBH" + "0807/11OCT26"  ·  "BPS BPS5 PD" + "0819/11OCT26") */
  for(let i = 0; i < itens.length - 1; i++){
    if(SIG_LINE.test(itens[i].t) || itens[i].t.length > 24) continue;
    for(let k = 1; k <= 2 && i + k < itens.length; k++){
      const parte = itens.slice(i, i + k + 1);
      if(parte.some(x => x.t.length > 24) || !RE_HORA_DATA.test(parte[k].t.split(' ').pop())) continue;
      const comEspaco = parte.map(x => x.t).join(' '), semEspaco = parte.map(x => x.t).join('');
      const novo = SIG_LINE.test(comEspaco) ? comEspaco : (k === 1 && SIG_LINE.test(semEspaco) ? semEspaco : null);
      if(novo === null) continue;
      itens[i].t = novo; itens[i].last = parte[k].last; itens.splice(i + 1, k);
      break;
    }
  }
  return itens;
}

/* A linha `it` é continuação da linha anterior `ant` (linha quebrada pelo SABRE ou pela cópia)? */
function ehContinuacao(it, ant){
  const t = it.t;
  if(SIG_LINE.test(t) || SIG_LINE.test(ant.t) || /^OAC-/.test(ant.t)) return false;
  if(it.indent >= 2) return !NOVA.test(t) && !INICIO.test(t) && !(/^R-/.test(ant.t) && !/\d+\.\d/.test(ant.t));
  if(INICIO.test(t)) return false;
  const antEhR = /^R-/.test(ant.t) && !/\d+\.\d|\//.test(ant.t);
  if(!antEhR){
    /* "-SOBRENOME/NOME": o SABRE jogou o nome do passageiro para a linha de baixo (o "-" é o sinal disso) */
    if(/^-[A-Z]/.test(t)) return true;
    /* "* LTM *" e afins: marcador do elemento da linha de cima */
    if(/^\*/.test(t)) return true;
    /* voo ligado ao elemento: "LA4716G 10OCT BPSGRU" */
    if(RE_VOO_REF.test(t)) return true;
    /* AT/EMD: cada passageiro traz o seu "2/REFUND-Y/COMMISSION-N/..." dentro do mesmo registro AT */
    if(/^\d\/REFUND-[YN]\//.test(t) && /^AT\s/.test(ant.t)) return true;
    /* nome cortado antes da barra: a linha de cima termina em "-MENDO" e esta traz "NCA SALES/LIVIAN..." */
    if(/-[A-Z][A-Z' .]*$/.test(ant.t) && !/\/[A-Z]/.test(ant.t.slice(ant.t.lastIndexOf('-'))) && RE_RESTO_NOME.test(t) && t.includes('/') && t.length <= 45) return true;
  }
  /* linha anterior cheia: o SABRE quebrou em ~58-64 colunas */
  if(ant.last >= CONFIG.larguraSabre && !(/^R-/.test(ant.t) && !/\d+\.\d|\//.test(ant.t))) return true;
  /* nome quebrado: a linha anterior termina no meio de um nome e esta traz o resto */
  const fragNome = /^[A-Z][A-Z' .-]*(?:\s+\d+\.\d\S.*)?$/.test(t) && t.length <= 60;
  if(!fragNome) return false;
  if(/^(?:R-\s*)?\d+\.\d/.test(ant.t) || /\s\d+\.\d\S*\/\S*/.test(ant.t)){
    const ultimo = ant.t.split(/\s+(?=\d+\.\d)/).pop();
    return ultimo.includes('/') && !RE_TITULO_FIM.test(ultimo);
  }
  if(RE_TITULO_FIM.test(t) && /-[A-Z][A-Z' .-]*\/[A-Z][A-Z' .-]*$/.test(ant.t) && !RE_TITULO_FIM.test(ant.t)) return true;
  return false;
}

function desdobrarHistorico(raw){
  /* Limpa o texto, remove o marcador ¥ do fim da linha e junta linhas quebradas à anterior */
  const out = [];
  normalizarLinhas(raw).forEach(it => {
    const ant = out[out.length-1];
    if(ant && ehContinuacao(it, ant)){
      /* junta com espaço quando a quebra é entre elementos ("-NOME", "* LTM *", voo, REFUND); sem espaço quando cortou no meio da palavra */
      const sep = it.indent >= 2 ? (it.indent > 3 ? ' ' : '')
        : (/^-[A-Z]/.test(it.t) || /^\*/.test(it.t) || RE_VOO_REF.test(it.t) || RE_INICIO_AT.test(it.t) ? ' ' : (ant.last >= CONFIG.larguraSabre ? '' : ' '));
      ant.t = ant.t + sep + it.t;
      ant.last = it.last;
    } else out.push({t: it.t, last: it.last});
  });
  return out.map(o => o.t.replace(/ {2,}/g, ' '));
}

/* Passageiros numerados ("1.1SOBRENOME/NOME MR"): aceita sobrenome composto, hífen e apóstrofo */
const PAX_NUM_SRC = "\\b(\\d+\\.\\d+)\\s*([A-Z][A-Z' .-]*?[A-Z]|[A-Z]{2,})\\/([A-Z][A-Z'-]*(?:\\s+[A-Z][A-Z'-]*)*?)(?:\\s+" + TITULO_PAX + ")?(?=\\s+\\d+\\.\\d+|\\s*$)";
function extrairPaxNumerados(l){
  const re = new RegExp(PAX_NUM_SRC, 'g'), nomes = [];
  let m;
  while((m = re.exec(l)) !== null){
    const nome = `${m[2].trim().replace(/\s+/g,' ')}/${m[3].trim().replace(/\s+/g,' ')}`;
    if(!/\d/.test(nome)) nomes.push(nome);
  }
  return nomes;
}

/* Nome do passageiro no fim da linha ("...-SOBRENOME/NOME MR"). Se o nome já é conhecido pela lista
   de passageiros, compara sem espaços (nomes quebrados em duas linhas podem ter espaço a mais/a menos). */
function paxDaLinha(l, paxs){
  if(paxs){
    const compacto = l.replace(/\s+/g, '');
    const chaves = Object.keys(paxs).sort((a, b) => b.length - a.length);
    for(const k of chaves){
      const kc = k.replace(/\s+/g, '');
      if(kc.length < 4 || !kc.includes('/')) continue;
      if(new RegExp('-' + kc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:' + TITULO_PAX + ')?$').test(compacto)) return k;
    }
  }
  const m = l.match(/^.*-([A-Z][A-Z' .]+\/[A-Z][A-Z' .]*)$/);
  return m ? m[1].trim() : '';
}

function analisar(){
  const raw = rodarHooks('antes', [$('sbInput').value], 'texto');
  mostrarErro('');
  if(!raw.trim()){ mostrarErro('Cole o histórico antes de analisar.'); return; }

  const linhas = desdobrarHistorico(raw);
  const paxs = {}, flags = {};
  const pendingEvs = [];
  const blocos = [];
  const ignoradas = [];
  let foidCount = 0;
  let curFrom='', curSig='', curSigCode='', curDtObj=null, curStation='', curEpr='';

  const novoPax = (nome, extra) => Object.assign({nome, fones:[], emails:[], tkts:[], locators:[], programas:[], docs:[], conta:[], tarifa:[], rota:'', cpfAutoAssoc:false}, extra||{});
  const mk = (cat, icon, title, sub, badge, badgeCls, fields, raw, meta) => ({cat, icon, title, sub, badge, badgeCls, fields, raw, meta: meta||{}});
  const nomePax = obj => obj ? obj.nome : '';

  const parearAssentos = evs => {
    const rem = evs.filter(e => e.meta.kind==='seat' && e.meta.acao==='X');
    rem.forEach(r => {
      const a = evs.find(x => x.meta.kind==='seat' && x.meta.acao!=='X' && !x.usado && x.meta.voo===r.meta.voo && x.meta.data===r.meta.data && x.meta.pax===r.meta.pax);
      if(!a || a.meta.seat === r.meta.seat) return;
      r.usado = a.usado = true;
      const rota = a.meta.trecho || r.meta.trecho || '';
      const sw = mk('cat-seat', svgSeat(), `Troca de assento: ${r.meta.seat} → ${a.meta.seat}`,
        `${a.meta.voo} ${a.meta.data}${a.meta.pax ? ' · ' + transPax(a.meta.pax) : ''}`, 'Troca', 'b-blue',
        [{l:'Voo/Data', v:`${a.meta.voo} ${a.meta.data}`},{l:'Rota', v:routeHtml(rota), html:true},{l:'Passageiro', v:a.meta.pax ? transPax(a.meta.pax) : '—'},
         {l:'Assento anterior', v:`${r.meta.seat}${r.meta.atr ? ' · ' + r.meta.atr : ''}`, vcls:'v-err'},{l:'Assento novo', v:`${a.meta.seat}${a.meta.atr ? ' · ' + a.meta.atr : ''}`, vcls:'v-ok'}],
        `${r.raw}\n${a.raw}`, {kind:'seatswap', voo:a.meta.voo, data:a.meta.data, pax:a.meta.pax, de:r.meta.seat, para:a.meta.seat, trecho:rota});
      evs[evs.indexOf(a)] = sw;
      evs.splice(evs.indexOf(r), 1);
    });
  };

  const flush = () => {
    const evs = pendingEvs.splice(0);
    const vistos = new Set();
    const unicos = evs.filter(e => { if(vistos.has(e.raw)) return false; vistos.add(e.raw); return true; });
    if(unicos.length){
      let ator = classificarAtor(curSigCode, curFrom, curStation);
      if(!curSigCode && !curFrom.trim() && unicos.some(e => e.meta.screac)) ator = {k:'screac', rot:'Sistema · Schedule Change (SC.REAC)', grupo:'auto', cls:'b-warn', robo:true, desc:'Alterações feitas pelo sistema após mudança de horário (SC.REAC). O padrão é o mesmo: segmento antigo sai (XS) e o novo entra (AS/SC).'};
      parearAssentos(unicos);
      const dtTxt = curDtObj ? curDtObj.txt : '';
      const sig = curEpr ? `EPR ${curEpr} (Assinatura Oficial LATAM)` : (curSig || (curFrom ? curFrom : 'Sem assinatura'));
      unicos.forEach(e => { e.ator = ator; e.sig = sig; e.from = curFrom; e.dt = dtTxt; });
      blocos.push({sigCode:curSigCode, sig, from:curFrom, station:curStation, dt:dtTxt, ts: curDtObj ? curDtObj.ts : 0, ator, evs:unicos});
    }
    curFrom=''; curSig=''; curSigCode=''; curDtObj=null; curStation=''; curEpr='';
  };

  /* Pré-leitura: conhece todos os passageiros numerados antes de ligar as linhas aos nomes */
  linhas.forEach(l => { extrairPaxNumerados(l).forEach(nome => { if(!getPaxExisting(paxs, nome)) paxs[nome] = novoPax(nome); }); });

  linhas.forEach(l => {
    let estrutural = false;
    const eprM = l.match(/\bEPR\s+([A-Z0-9]{3,})\b/);
    if(eprM) curEpr = eprM[1];

    /* ── R- (responsável): só pista, a assinatura é quem manda ── */
    if(/^R-/.test(l)){
      extrairPaxNumerados(l).forEach(nome => { if(!getPaxExisting(paxs, nome)) paxs[nome] = novoPax(nome); });
      let txt = l.replace(/^R-\s*/,'').trim();
      const dM = txt.match(/(\d{3,4})\/(\d{2}[A-Z]{3}\d{2})\s*$/);
      if(dM){   /* R- com data/hora própria (ações do sistema, sem OAC/assinatura) */
        txt = txt.replace(dM[0],'').trim();
        curFrom = txt; curDtObj = parseDtSabre(dM[1], dM[2]); curSig = txt;
        flush();
      } else curFrom = txt;
      return;
    }

    /* ── OAC- (escritório) ── */
    if(/^OAC-/.test(l)){
      curStation = l.replace(/^OAC-\s*/,'').trim().split(/\s+/).slice(0,4).join(' ');
      return;
    }

    /* ── Linha de assinatura: fecha o bloco ── */
    const sg = l.match(SIG_LINE);
    if(sg){
      curSigCode = sg[1];
      curDtObj = parseDtSabre(sg[2], sg[3]);
      curSig = `${curStation ? curStation + ' · ' : ''}Assinatura: ${sg[1]}`;
      flush();
      return;
    }

    /* ── Passageiros numerados (N.N SOBRENOME/NOME) ── */
    extrairPaxNumerados(l).forEach(nome => { estrutural = true; if(!getPaxExisting(paxs, nome)) paxs[nome] = novoPax(nome); });

    /* ── Contato / e-mail / bilhete / fidelidade ── */
    if(/^9[A-Z]{3}\d/.test(l) || (/^\d{6,}/.test(l) && l.length<30)){ ensureFirstPax(paxs).fones.push(l.replace(/^9[A-Z]{3}/,'').trim()); estrutural = true; }
    if(/^UHO\d{2}-/.test(l)){ ensureFirstPax(paxs).fones.push(l.replace(/^UHO\d{2}-/,'').split('-')[0]); estrutural = true; }
    if(l.includes('@')){ const em = l.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i); if(em){ ensureFirstPax(paxs).emails.push(em[0]); estrutural = true; } }
    const tktM = l.match(/\b(\d{13})(?:C\d)?\b/);
    const ffM = l.match(/(?:LATAMPASS|FF|FQTV)[\/\s]([A-Z]{2})[\/\s]([A-Z0-9]+)/i);
    if(ffM && !/^[AXU]FF\s/.test(l)) ensureFirstPax(paxs).programas.push(`${ffM[1]} ${ffM[2]}`);

    /* ── Flags globais ── */
    if(/\bTTY\b/.test(l) || l.includes('NDC')) flags.ndc = true;
    if(/GOLD|PLATINUM|BLACK|LATAMPASS/i.test(l)) flags.elite = l.slice(0,60);
    if(/CALIDRIS|REVENUE INTEGRITY/.test(l)) flags.calidris = true;
    if(/\bNS\b/.test(l) || /NOSHOW|NO SHOW/i.test(l)) flags.noshow = true;
    if(/AUTOREACCOM|\bARU\b|INVOL CHG OK|REVALIDATION PROCESS NOOK/i.test(l)) flags.protecao = true;
    if(/\bLX\b/.test(l) || /045-\d{10}/.test(l)) flags.codeshare_lx = true;
    REGRAS.alertas.forEach(r => { if(r.gatilho && casa(r, l)) flags[r.chave] = true; });

    /* Marca * após o código da ação (ex.: X4S*, X4G*) */
    const estrela = /^[AXU][0-9A-Z]{1,3}\*\s/.test(l);
    if(estrela) l = l.replace(/^([AXU][0-9A-Z]{1,3})\*/, '$1');

    let ev = null, m;
    const hl = rodarHooks('linha', [l, {paxs, flags, passageiro: x => paxDaLinha(x, paxs)}], 'primeiro');
    if(hl && hl.ignorar){ return; }
    if(hl && typeof hl === 'object') ev = eventoDeModulo(hl, l);

    /* ── Segmentos ── */
    const segM = l.match(/^(XS|AS|MS|SC)\s+(?:([A-Z0-9]{2})\s+)?(\d{1,4})([A-Z])?\s+(\d{2}[A-Z]{3})\s+([A-Z]{6})\s*\*?\s*([A-Z]{2})\/([A-Z]{2})/);   /* * entre a rota e ORIGEM/STATUS é opcional (itinerário temporário) */
    const tkneM = l.match(/^([AX][0-9A-Z]{1,2})\s+SSR\s+TKNE\s+([A-Z0-9]{2})\s+([A-Z0-9]+)\s+([A-Z]{6})(\d{1,4})([A-Z])?(\d{2}[A-Z]{3})\/(\d{13})(?:C(\d+))?/);

    if(ev){ /* evento criado por um módulo */ }
    else if(segM){
      const [,acao,ciaRaw,num,cls,data,trecho,stOld,stNew] = segM;
      const cia = ciaRaw || 'LA', fVoo = `${cia}${num}`;
      const si = stInfo(stNew), siOld = stInfo(stOld);
      if(stNew === 'NS') flags.noshow = true;
      const tm = l.match(/\b(\d{4})\s+(\d{4})\b/);
      const dep = tm ? tm[1] : '--', arr = tm ? tm[2] : '--';
      const involSt = ['WK','XK','SC','HX','UN','TK','TL','TN','WL','WN'].includes(stNew) || acao === 'SC';
      if(involSt) flags.invol = true;
      ev = mk('cat-voo', svgPlane(), ACTION_LABEL[acao] || `Segmento: ${acao}`,
        `${fVoo} · ${data} · ${dep!=='--' ? `${dep}→${arr} · ` : ''}Rota: ${trecho}`, si.txt, si.cls,
        [{l:'Ação', v:ACTION_LABEL[acao]||acao},{l:'Voo', v:fVoo},...(cls?[{l:'Classe', v:cls}]:[]),{l:'Data', v:data},{l:'Rota', v:routeHtml(trecho), html:true},
         {l:'Partida', v:dep},{l:'Chegada', v:arr},
         {l:'Status Antigo', v:`${stOld} – ${siOld.txt}`, vcls: siOld.cls==='b-ok'?'v-ok':(siOld.cls==='b-err'?'v-err':'')},
         {l:'Status Novo', v:`${stNew} – ${si.txt}`, vcls: si.cls==='b-ok'?'v-ok':(si.cls==='b-err'?'v-err':'v-warn')},
         ...(si.d ? [{l:'Significado', v:`${stNew}: ${si.d}`}] : [])],
        l, {kind:'seg', acao, voo:fVoo, cls, data, trecho, stOld, stNew, dep, arr, invol:involSt});
    }

    /* ── TKNE: bilhete associado ao voo e ao passageiro ── */
    else if(tkneM){
      const [,acao,cia,st,trecho,num,cls,data,tkt,cupom] = tkneM;
      const fVoo = `${cia}${num}`;
      const pObj = paxDaLinha(l, paxs) ? getPaxRef(paxs, paxDaLinha(l, paxs)) : null;
      const alvo = pObj || ensureFirstPax(paxs);
      if(!alvo.tkts.includes(tkt)) alvo.tkts.push(tkt);
      ev = mk('cat-ticket', svgTicket(), acao.startsWith('X') ? 'Bilhete desassociado do voo (TKNE)' : 'Bilhete associado ao voo (TKNE)',
        `${fVoo} · ${data} · ${tkt}${cupom ? ' (cupom ' + cupom + ')' : ''}${pObj ? ' · ' + transPax(pObj.nome) : ''}`, 'TKNE', 'b-teal',
        [{l:'Ação', v:ACTION_LABEL[acao]||acao},{l:'Passageiro', v:pObj ? transPax(pObj.nome) : '—'},{l:'Bilhete', v:tkt, vcls:'v-ok'},{l:'Cupom', v:cupom ? `C${cupom} (não faz parte do número do bilhete)` : '—'},
         {l:'Voo', v:fVoo},{l:'Data', v:data},{l:'Rota', v:routeHtml(trecho), html:true},{l:'Status', v:st}],
        l, {kind:'tkne', acao:acao[0], tkt, cupom, voo:fVoo, data, trecho, pax:nomePax(pObj)});
    }

    /* ── SSR ── */
    else if(/^[AX][0-9A-Z]{1,2}\s+SSR\s/.test(l) || /^SSR\s/.test(l)){
      const sm = l.match(/^([AX][0-9A-Z]{1,2})\s+SSR\s+(\w+)\s+(\w+)\s+(\w+)\s*(.*)$/) || l.match(/^()SSR\s+(\w+)\s+(\w+)\s+(\w+)\s*(.*)$/);
      if(sm){
        const acao = sm[1], tipo = sm[2], cia = sm[3], st = sm[4], resto = sm[5] || '';
        const added = !acao || acao.startsWith('A');
        const pN = paxDaLinha(l, paxs);
        let paxObj = pN ? getPaxRef(paxs, pN) : null;
        let cCat = 'cat-ssr', cIcon = svgService(), rgs;
        let titulo = !acao ? `SSR – ${tipo}` : (added ? 'SSR Acrescentado' : 'SSR Cancelado');
        const fields = [{l:'Ação', v: acao ? (ACTION_LABEL[acao]||acao) : 'Registro SSR'},{l:'Tipo SSR', v:tipo},{l:'CIA', v:cia},{l:'Status', v:st},{l:'Passageiro', v: pN ? transPax(pN) : '—'}];
        const meta = {kind:'ssr', tipo, pax:nomePax(paxObj)};
        let sub = `Tipo: ${tipo} · CIA: ${cia} · Status: ${st}${pN ? ' · Pax: ' + transPax(pN) : ''}`;

        if(tipo === 'FOID'){
          const dm = resto.match(/(?:NIBR|NI|ID)\s*([A-Z0-9]+)/i);
          const num = dm ? dm[1].replace(/^(NIBR|NI|ID)/i,'') : '';
          titulo = `${added?'Documento adicionado':'Documento removido'} (FOID · CPF${num ? ': ' + fmtCpf(num) : ''})`;
          cIcon = svgDoc();
          if(!paxObj){
            const keys = Object.keys(paxs);
            if(keys.length){ paxObj = paxs[keys[foidCount] || keys[keys.length-1]]; paxObj.cpfAutoAssoc = true; }
          }
          foidCount++;
          if(paxObj && num && added){ const t = `CPF: ${fmtCpf(num)}`; if(!paxObj.docs.includes(t)) paxObj.docs.push(t); }
          meta.pax = nomePax(paxObj);
          fields.push({l:'CPF', v:num ? fmtCpf(num) : '—', vcls:'v-ok'},{l:'Observação', v:'FOID = CPF; DOCS = passaporte. O “NIBR” do início é só o tipo do documento e foi removido.'});
          fields[4] = {l:'Passageiro', v: paxObj ? transPax(paxObj.nome) : '—'};
          sub = `CPF: ${num ? fmtCpf(num) : '—'}${paxObj ? ' · ' + transPax(paxObj.nome) : ''}`;
        }
        else if(tipo === 'DOCS'){
          const dm = resto.match(/\/([A-Z0-9]{6,15})(?:\/|-|$)/);
          const num = dm ? dm[1] : '';
          titulo = `Passaporte/Certidão (DOCS)${num ? ' ' + num : ''}`; cIcon = svgDoc();
          if(paxObj && added){ const t = `DOC: ${num || 'Passaporte/Certidão'}`; if(!paxObj.docs.includes(t)) paxObj.docs.push(t); }
          fields.push({l:'Documento', v:num || '—'});
        }
        else if((rgs = REGRAS.ssr.find(r => casa(r, tipo)))){ titulo += rgs.titulo ? ` (${rgs.titulo})` : ''; cIcon = (ICONES[rgs.icone] || svgService)(); }
        else if(tipo === 'LAXP'){
          titulo = 'Confirmação LATAM XP (SSR LAXP)'; cCat = 'cat-osi'; cIcon = svgInfo();
          fields.push({l:'Significado', v:'O sistema LATAM XP confirmou internamente os dados do passageiro com o itinerário.'});
        }
        else if(tipo === 'SSPR'){
          titulo = 'Confirmação interna do itinerário (SSR SSPR)'; cIcon = svgInfo(); cCat = 'cat-osi';
          const seat = (resto.match(/\/(\d{1,3}[A-Z])\s/)||[])[1];
          const val = resto.match(/(\d+(?:\.\d+)?)([A-Z]{3})¥?B?-?(\d+)?/);
          const vm = resto.match(/([A-Z]{2})(\d{1,4})\s+(\d{2}[A-Z]{3})\s+([A-Z]{6})\s+(\d+(?:\.\d+)?)([A-Z]{3})/);
          if(vm){
            fields.push({l:'Voo', v:`${vm[1]}${vm[2]} ${vm[3]}`},{l:'Rota', v:routeHtml(vm[4]), html:true},{l:'Valor registrado', v:fmtMoeda(vm[5], vm[6])});
            sub = `${vm[1]}${vm[2]} ${vm[3]} · ${vm[4]}${seat ? ' · Assento ' + seat : ''} · ${fmtMoeda(vm[5], vm[6])}`;
          } else if(val){ fields.push({l:'Valor registrado', v:fmtMoeda(val[1], val[2])}); }
          if(seat) fields.push({l:'Assento', v:seat});
          const ref = resto.match(/B-(\d+)/); if(ref) fields.push({l:'Referência (B-)', v:ref[1]});
          fields.push({l:'Significado', v:'SSPR, TKNE e BRND são SSRs usados internamente pelo SABRE para confirmar itinerário, passageiro e dados da compra.'});
        }
        else if(tipo === 'BRND'){
          const bM = resto.match(/\/([A-Z]{2})(?:\s|-|$)/);
          const tMap = TARIFAS;
          if(bM && tMap[bM[1]]){
            titulo += ` – Tarifa ${tMap[bM[1]]} (${bM[1]})`;
            Object.values(paxs).forEach(p => { if(!p.tarifa.includes(tMap[bM[1]])) p.tarifa.push(tMap[bM[1]]); });
            fields.push({l:'Tarifa', v:`${tMap[bM[1]]} (${bM[1]})`, vcls:'v-ok'});
            meta.marca = tMap[bM[1]];
          } else titulo += ' – Tarifa LATAM';
        }
        fields.push({l:'Detalhe', v:transPax(resto.slice(0,140))});
        ev = mk(cCat, cIcon, titulo, sub, !acao ? 'SSR' : (added ? 'Adicionado' : 'Removido'), !acao ? 'b-purple' : (added ? 'b-ok' : 'b-err'), fields, l, meta);
      }
    }

    /* ── OSI (A3O / A4O / X3O / X4O) ── */
    else if(/^[AX][34]O\b/.test(l)){
      const added = l.startsWith('A');
      const txt = l.replace(/^[AX][34]O\s+(?:OSI\s+)?/,'').trim();
      const cl = classificarOsi(txt);
      const cia = (txt.match(/^([A-Z]{2})\s/)||[])[1];
      if(cl && cl.screac) flags.invol = true;
      ev = mk('cat-osi', svgInfo(), cl ? cl.titulo : (added ? 'OSI Acrescentado' : 'OSI Cancelado'), txt.slice(0,90), added ? 'Adicionado' : 'Removido', added ? 'b-ok' : 'b-err',
        [{l:'Conteúdo OSI', v:txt.slice(0,200)},...(cl ? [{l:'Significado', v:cl.desc}] : []),...(cia ? [{l:'CIA', v:cia}] : [])], l, {kind:'osi', screac:!!(cl && cl.screac), acao:added?'A':'X'});
    }

    /* ── Serviços adicionais / EMD (AAX · XAX · UAX): assentos pagos ── */
    else if((m = l.match(/^([AXU])AX\s+([A-Z]+)\/([A-Z]{2})(\d+)\/(.*)$/))){
      const acao = m[1], svc = m[2], st = m[3], rest = m[5];
      const pN = paxDaLinha(l, paxs);
      const pObj = pN ? getPaxRef(paxs, pN) : null;
      const val = rest.match(/(\d+\.\d{2})([A-Z]{3})/);
      const seat = (rest.match(/SEAT-(\d{1,3}[A-Z])/)||[])[1];
      const prazo = rest.match(/PURCHASE BY (\d{2}[A-Z]{3}\d{2})\s+(\d{4})/);
      const vf = rest.match(/([A-Z0-9]{2})(\d{3,4})([A-Z])?(\d{2}[A-Z]{3})([A-Z]{6})-/);
      const opt = (rest.match(/OPTSTAT-([A-Z]{2})/)||[])[1];
      const rfisc = (rest.match(/RFISC-([A-Z0-9]+)/)||[])[1];
      const voo = vf ? `${vf[1]}${vf[2]}` : '';
      const acaoTxt = {A:'Serviço adicionado', X:'Serviço removido', U:'Serviço atualizado'}[acao];
      const svcTxt = svc === 'ASIENTOS' ? 'Assento pago' : `Serviço (${svc})`;
      const stTxt = AX_ST[st] || st;
      const prazoTxt = prazo ? `${prazo[1]} ${prazo[2].slice(0,2)}:${prazo[2].slice(2)}` : '';
      ev = mk('cat-ticket', svgTicket(), `${svcTxt}: ${acaoTxt.toLowerCase()}${seat ? ' (' + seat + ')' : ''}`,
        `${stTxt}${val ? ' · ' + fmtMoeda(val[1], val[2]) : ''}${voo ? ' · ' + voo + ' ' + vf[4] : ''}${pObj ? ' · ' + transPax(pObj.nome) : ''}`,
        st, st==='HI' ? 'b-ok' : (st==='HD' ? 'b-warn' : 'b-blue'),
        [{l:'Ação', v:acaoTxt},{l:'Serviço', v:svcTxt},{l:'Status', v:stTxt, vcls: st==='HI'?'v-ok':(st==='HD'?'v-warn':'')},
         ...(opt ? [{l:'Status opcional (OPTSTAT)', v:AX_ST[opt] || opt}] : []),
         ...(val ? [{l:'Valor', v:fmtMoeda(val[1], val[2])}] : []),
         ...(seat ? [{l:'Assento', v:seat}] : []),
         ...(voo ? [{l:'Voo/Data', v:`${voo} ${vf[4]}`},{l:'Rota', v:routeHtml(vf[5]), html:true}] : []),
         ...(prazoTxt ? [{l:'Pagar até', v:prazoTxt, vcls:'v-warn'}] : []),
         ...(rfisc ? [{l:'RFISC', v:rfisc}] : []),
         {l:'Passageiro', v:pObj ? transPax(pObj.nome) : '—'}],
        l, {kind:'ax', acao, st, valor: val ? +val[1] : null, moeda: val ? val[2] : '', seat, voo, data: vf ? vf[4] : '', trecho: vf ? vf[5] : '', prazo: prazoTxt, pax:nomePax(pObj), opt});
    }

    /* ── Assentos (A4G / X4G) ── */
    else if(/^[AX]4G\b/.test(l)){
      const added = l.startsWith('A');
      const sm = l.match(/^[AX]4G\s+([A-Z0-9]{2})(\d{1,4})([A-Z])?\s+(\d{2}[A-Z]{3})\s+([A-Z]{6})\s*\*?\s*([A-Z]{2})\/([A-Z]{2})\s+@?(\d{1,3}[A-Z])\b(?:\s+([A-Z]{1,2}))?/);
      const pN = paxDaLinha(l, paxs);
      const pObj = pN ? getPaxRef(paxs, pN) : null;
      let seat='', voo='', data='', trecho='', stOld='', stNew='', atr='';
      if(sm){ voo = `${sm[1]}${sm[2]}`; data = sm[4]; trecho = sm[5]; stOld = sm[6]; stNew = sm[7]; seat = sm[8]; atr = SEAT_ATTR[sm[9]] || ''; }
      else {
        const seatM = l.match(/\s([0-9]{1,3}[A-Z])\s/), vooM = l.match(/([A-Z]{2})\s*(\d{3,4}[A-Z]?)\s+(\d{2}[A-Z]{3})/);
        seat = seatM ? seatM[1] : ''; if(vooM){ voo = vooM[1] + vooM[2]; data = vooM[3]; }
      }
      ev = mk('cat-seat', svgSeat(), added ? 'Assento selecionado' : 'Assento removido',
        `${seat ? 'Assento ' + seat : ''}${voo ? ' · ' + voo + ' ' + data : ''}${atr ? ' · ' + atr : ''}${pObj ? ' · ' + transPax(pObj.nome) : ''}`, added ? 'Selecionado' : 'Removido', added ? 'b-ok' : 'b-err',
        [{l:'Assento', v:seat || '—'},{l:'Voo/Data', v:voo ? `${voo} ${data}` : '—'},...(trecho ? [{l:'Rota', v:routeHtml(trecho), html:true}] : []),
         ...(atr ? [{l:'Posição', v:atr}] : []),
         ...(stOld ? [{l:'Status', v:`${stOld}/${stNew} – ${stInfo(stNew).txt}`}] : []),
         {l:'Passageiro', v:pObj ? transPax(pObj.nome) : '—'}],
        l, {kind:'seat', acao: added ? 'A' : 'X', seat, voo, data, trecho, atr, pax:nomePax(pObj)});
    }

    /* ── Nome adicionado / ação de agente ── */
    else if(/^ADM\s/.test(l)){
      const pN = paxDaLinha(l, paxs);
      const pObj = pN ? getPaxRef(paxs, pN) : null;
      ev = mk('cat-remark', svgUser(), 'Passageiro adicionado à reserva (ADM)', pObj ? transPax(pObj.nome) : l.slice(4,80), 'Adicionado', 'b-ok',
        [{l:'Passageiro', v:pObj ? transPax(pObj.nome) : '—'},{l:'Observação', v:'O R- indica apenas quem aparece como responsável; o responsável real é a assinatura do bloco.'}], l, {kind:'adm', pax:nomePax(pObj)});
    }
    else if(/^AEM\s/.test(l)){
      ev = mk('cat-remark', svgMsg(), 'Ação de agente (AEM)', l.replace(/^AEM\s+/,'').slice(0,80), 'Agente', 'b-gray',
        [{l:'Conteúdo', v:l.replace(/^AEM\s+/,'')},{l:'Observação', v:'Tipo de ação não documentado: o histórico só mostra que um agente atuou. Confira no SABRE.'}], l, {kind:'aem'});
    }

    /* ── Emissão / forma de pagamento: A7 T- · X7 T- · A5F · AT ── */
    else if((m = l.match(/^([AX])7\s+T-(?:(\d{2}[A-Z]{3})-([A-Z0-9*]+))?/))){
      const add = m[1] === 'A';
      ev = mk('cat-ticket', svgTicket(), add ? 'Bilhete emitido (indicador T-)' : 'Indicador de emissão removido (T-)',
        add && m[2] ? `Emitido em ${m[2]} por ${m[3]}` : 'Limpa o indicador anterior', add ? 'Emitido' : 'Removido', add ? 'b-ok' : 'b-gray',
        add && m[2] ? [{l:'Data da emissão', v:m[2]},{l:'Assinatura que emitiu', v:m[3]}] : [{l:'Observação', v:'Removido antes de gravar a nova emissão.'}], l, {kind:'emissao', add, data:m[2]||'', sig:m[3]||''});
    }
    else if(/^A5F\s/.test(l)){
      const c = l.match(/([A-Z]{2})4X+(\d{4})(?:¥(\d{2}\/\d{2}))?/);
      ev = mk('cat-pay', svgTicket(), 'Forma de pagamento (cartão)', c ? `${c[1]} final ${c[2]}` : l.slice(4,80), 'Cartão', 'b-blue',
        [{l:'Cartão', v: c ? `${c[1]} final ${c[2]}` : '—'},...(c && c[3] ? [{l:'Validade', v:c[3]}] : [])], l, {kind:'pay', pay: c ? {cartao:`${c[1]} final ${c[2]}`} : {}});
    }
    else if(/^AT\s+W/.test(l) && /SEAT-\d{1,3}[A-Z]\s*\/\s*PURCHASE BY/.test(l)){
      /* Registro AT de assento pago: um bloco "N/REFUND-../SEAT-07E/PURCHASE BY ..-NOME" por passageiro */
      const c = l.match(/([A-Z]{2})\dX+(\d{4})(?:\/(\d{2})(\d{2}))?/);
      const re = /SEAT-(\d{1,3}[A-Z])\s*\/\s*PURCHASE BY (\d{2}[A-Z]{3}\d{2})\s+(\d{2})(\d{2})\s*\/\s*([A-Z0-9]{2})(\d{3,4})([A-Z])?(\d{2}[A-Z]{3})([A-Z]{6})-(.+?)(?=\s+\d\/REFUND-|\s*$)/g;
      const regs = []; let r;
      while((r = re.exec(l)) !== null){
        const pObj = getPaxRef(paxs, r[10].trim());
        regs.push({seat:r[1], prazo:`${r[2]} ${r[3]}:${r[4]}`, voo:`${r[5]}${r[6]}`, data:r[8], trecho:r[9], pax: pObj ? pObj.nome : r[10].trim()});
      }
      const reembolso = (l.match(/REFUND-([YN])/)||[])[1];
      ev = mk('cat-pay', svgTicket(), 'Registro do pagamento de assento pago (AT)',
        regs.map(g => `${g.seat}${g.voo ? ' · ' + g.voo + ' ' + g.data : ''}`).filter((v,i,a) => a.indexOf(v) === i).join(' · ').slice(0,90) || 'Assento pago', 'Pagamento', 'b-ok',
        [...(c ? [{l:'Cartão', v:`${c[1]} final ${c[2]}`},...(c[3] ? [{l:'Validade', v:`${c[3]}/${c[4]}`}] : [])] : []),
         ...(reembolso ? [{l:'Reembolso (REFUND)', v:reembolso}] : []),
         ...regs.map(g => ({l:`Assento ${g.seat}`, v:`${transPax(g.pax)} · ${g.voo} ${g.data} · ${g.trecho} · pagar até ${g.prazo}`})),
         {l:'Registro', v:l.slice(3,260)}],
        l, {kind:'pay', pay: c ? {cartao:`${c[1]} final ${c[2]}`} : {}});
    }
    else if(/^AT\s+W/.test(l) && /\d+\.\d{2}/.test(l)){
      const c = l.match(/([A-Z]{2})\dX+(\d{4})/), v = l.match(/\/(\d+\.\d{2})(?:¥|$)/);
      ev = mk('cat-pay', svgTicket(), 'Registro do pagamento da emissão', `${c ? c[1] + ' final ' + c[2] : 'Cartão'}${v ? ' · ' + fmtMoeda(v[1], 'BRL') : ''}`, 'Pagamento', 'b-ok',
        [...(c ? [{l:'Cartão', v:`${c[1]} final ${c[2]}`}] : []),...(v ? [{l:'Valor', v:fmtMoeda(v[1], 'BRL'), vcls:'v-ok'}] : []),{l:'Registro', v:l.slice(3,160)}],
        l, {kind:'pay', pay:{ ...(v ? {valor:+v[1], moeda:'BRL'} : {}), ...(c ? {cartao:`${c[1]} final ${c[2]}`} : {}) }});
    }

    /* ── Remarks (A5H / X5H / A5T / X5T / ASH / AST / H-) ── */
    else if(/^([AX]5[HT]|ASH|AST|H-)/.test(l)){
      const added = !l.startsWith('X');
      const code = (l.match(/^([AX][0-9A-Z]{1,2}|H-)/)||[])[1] || 'H-';
      let corpo = l.slice(code.length).trim().replace(/^QQ\s+/, '').replace(/^H-\s*/, '');
      const cr = classificarRemark(corpo);
      if(cr){
        if(cr.hdExpirado) flags.hdExpirado = true;
        if(cr.aviso48) flags.aviso48 = true;
        if(cr.pay && cr.pay.reemissao) flags.reemissao = cr.pay.reemissao;
        if(cr.cpf && Object.keys(paxs).length === 1) { const p = paxs[Object.keys(paxs)[0]], t = `CPF: ${fmtCpf(cr.cpf)}`; if(!p.docs.includes(t)) p.docs.push(t); }
        ev = mk(cr.cat, cr.icon, cr.titulo, cr.fields.map(f => `${f.v}`).join(' · ').slice(0,90), added ? 'Adicionado' : 'Removido', added ? 'b-ok' : 'b-err',
          [{l:'Ação', v: added ? 'Remark adicionado' : 'Remark removido'},...cr.fields], l, {kind: cr.pay ? 'pay' : 'remark', pay: cr.pay || null});
      } else {
        const rCont = cleanRemark(corpo);
        ev = mk('cat-remark', svgMsg(), code === 'H-' ? 'Remark Histórico (H-)' : (ACTION_LABEL[code] || (added ? 'Remark adicionado' : 'Remark removido')), rCont.slice(0,80), added ? 'Adicionado' : 'Removido', added ? 'b-ok' : 'b-err',
          [{l:'Conteúdo', v:rCont.slice(0,240)}], l, {kind:'remark'});
      }
    }

    /* ── Robôs / TTY ── */
    else if(/CALIDRIS|REVENUE INTEGRITY|LATAM AUTOMATIC/.test(l) || /^TTY\s/i.test(l) || (l.startsWith('SYS ') && l.includes('SYS'))){
      const noshow = /NOSHOW|NO SHOW/.test(l), reval = /REVALIDAT/.test(l);
      if(noshow) flags.noshow = true;
      ev = mk('cat-sys', svgBot(), noshow ? 'CALIDRIS · Cancelamento por No-Show' : (reval ? 'Revalidação automática (LATAM)' : 'Ação de robô / sistema'),
        l.slice(0,80), 'ROBÔ', 'b-err', [{l:'Ação', v:l.slice(0,150)}], l, {kind:'sys'});
    }

    /* ── VCR / EMD / HIST / Queue / FQTV ── */
    else if(/VCR MOVED TO HISTORY|EMD MARKED FOR PURGE/.test(l)){
      const emd = l.includes('EMD');
      ev = mk('cat-ticket', svgTicket(), emd ? 'EMD enviado para purga' : 'Bilhete enviado para histórico', emd ? 'EMD – NFM 7 Day Rule' : 'VCR – NFM 7 Day Rule (estado final: USED/VOID/EXCH/RFND)', 'HISTÓRICO', 'b-teal',
        [{l:'Regra', v:'NFM – 7 Day Rule'},{l:'Tipo', v: emd ? 'EMD – Electronic Misc. Document' : 'VCR – Bilhete (Ticket)'},{l:'Detalhe', v:l.slice(0,120)}], l, {kind:'hist'});
    }
    else if(/^HIST\s+\d{13}/.test(l)){
      const t = l.match(/\d{13}/)[0];
      ev = mk('cat-ticket', svgTicket(), 'Bilhete histórico identificado', `Número: ${t}`, 'VCR HIST', 'b-teal', [{l:'Ticket', v:t},{l:'Linha', v:l}], l, {kind:'hist'});
    }
    else if(/^Q\s+\d+\/\d+/.test(l)){
      ev = mk('cat-remark', svgMsg(), 'Entrada em fila (Queue)', l, 'QUEUE', 'b-gray', [{l:'Fila', v:l.slice(0,100)}], l, {kind:'queue'});
    }
    else if(/^FQTV\s+/.test(l)){
      const fm = l.match(/FQTV\s+([A-Z]{2})\s+([A-Z0-9]+)\s+-([A-Z\s]+\/[A-Z\s]+(?:MR|MS|MSTR|MRS|CHD|CHILD|INF|INFANT|ADT)?)/i);
      if(fm){
        const p = getPaxRef(paxs, fm[3]);
        if(p) p.programas.push(`${fm[1]} ${fm[2]}`);
        ev = mk('cat-ssr', svgService(), 'Programa de fidelidade (FQTV)', `CIA: ${fm[1]} · Número: ${fm[2]} · Pax: ${fm[3]}`, 'FQTV', 'b-purple',
          [{l:'CIA', v:fm[1]},{l:'Número', v:fm[2]},{l:'Pax', v:fm[3]}], l, {kind:'fqtv'});
      }
    }

    /* ── Fidelidade (AFF = adiciona · XFF = remove · UFF = atualiza): programa de milhagem do passageiro ── */
    if(!ev && (m = l.match(/^([AXU])FF\s+([A-Z0-9]{2})\s+([A-Z0-9]+)\b/))){
      const acao = m[1], cia = m[2], numero = m[3];
      const nomeM = l.match(/\s-([A-Z][A-Z' .]*?\/[A-Z][A-Z' .]*?)(?=\s+[A-Z0-9]{2}\d{1,4}[A-Z]?\s+\d{2}[A-Z]{3}\s+[A-Z]{6}\b|\s+\*|\s*$)/);
      const vooM = l.match(/\b([A-Z0-9]{2})(\d{1,4})([A-Z])?\s+(\d{2}[A-Z]{3})\s+([A-Z]{6})\b/);
      const pObj = nomeM ? getPaxRef(paxs, nomeM[1].trim()) : null;
      const prog = `${cia} ${numero}`;
      if(pObj && acao !== 'X' && !pObj.programas.includes(prog)) pObj.programas.push(prog);
      const acaoTxt = {A:'adicionado', X:'removido', U:'atualizado'}[acao];
      ev = mk('cat-ssr', svgService(), `Programa de fidelidade ${acaoTxt}`, `${prog}${pObj ? ' · ' + transPax(pObj.nome) : ''}${vooM ? ' · ' + vooM[1] + vooM[2] + ' ' + vooM[4] : ''}`,
        acao === 'X' ? 'Removido' : (acao === 'A' ? 'Adicionado' : 'Atualizado'), acao === 'X' ? 'b-err' : (acao === 'A' ? 'b-ok' : 'b-blue'),
        [{l:'Ação', v:`Programa ${acaoTxt}`},{l:'CIA', v:cia},{l:'Número', v:numero},{l:'Passageiro', v: pObj ? transPax(pObj.nome) : (nomeM ? transPax(nomeM[1].trim()) : '—')},
         ...(vooM ? [{l:'Voo/Data', v:`${vooM[1]}${vooM[2]} ${vooM[4]}`},{l:'Rota', v:routeHtml(vooM[5]), html:true}] : [])],
        l, {kind:'fqtv', acao, pax:nomePax(pObj)});
    }

    /* Bilhete genérico (13 dígitos) associado ao passageiro citado na linha */
    if(tktM){
      let alvo = null;
      for(const k of Object.keys(paxs)){ if(k.split('/').some(p => p.length > 2 && l.includes(p))) { alvo = paxs[k]; break; } }
      alvo = alvo || ensureFirstPax(paxs);
      if(!alvo.tkts.includes(tktM[1])) alvo.tkts.push(tktM[1]);
    }

    if(ev){ ev.estrela = estrela; pendingEvs.push(ev); }
    else if(!estrutural && ignoradas.length < CONFIG.maxIgnoradas) ignoradas.push(l);
  });
  flush();

  /* Aliases de passageiros mesclados (nomes abreviados no histórico) */
  const alias = {};
  const dedupKeys = Object.keys(paxs);
  for(let i = 0; i < dedupKeys.length; i++){
    const ki = dedupKeys[i];
    if(!paxs[ki]) continue;
    const pi = ki.split('/'); if(pi.length !== 2) continue;
    for(let j = i + 1; j < dedupKeys.length; j++){
      const kj = dedupKeys[j];
      if(!paxs[kj]) continue;
      const pj = kj.split('/'); if(pj.length !== 2) continue;
      if(pi[0].trim() === pj[0].trim() && primeiroNomeIgual(pi[1], pj[1])){
        const [keep, drop] = pi[1].length >= pj[1].length ? [ki, kj] : [kj, ki];
        ['fones','emails','tkts','locators','programas','docs','conta','tarifa'].forEach(f => (paxs[drop][f]||[]).forEach(v => { if(!paxs[keep][f].includes(v)) paxs[keep][f].push(v); }));
        alias[drop] = keep; delete paxs[drop];
      }
    }
  }
  const canon = n => { while(alias[n]) n = alias[n]; return n; };
  blocos.forEach(b => b.evs.forEach(e => { if(e.meta && e.meta.pax) e.meta.pax = canon(e.meta.pax); }));

  /* Ordem cronológica (histórico vem do mais novo para o mais antigo) */
  const todosComData = blocos.length > 1 && blocos.every(b => b.ts);
  const cron = todosComData ? blocos.slice().sort((a,b) => a.ts - b.ts) : blocos.slice().reverse();

  const fatos = analisarFatos(cron, paxs);
  Object.values(paxs).forEach(p => p.rota = fatos.rota);
  const allTarifas = [...new Set(Object.values(paxs).flatMap(p => p.tarifa))];
  if(allTarifas.length) Object.values(paxs).forEach(p => { p.tarifa = [...allTarifas]; });

  renderTudo({blocos:cron, paxs, flags, fatos, ignoradas});
}

function getPaxExisting(paxs, nome){
  if(paxs[nome]) return paxs[nome];
  const comp = nome.replace(/\s+/g, '');
  for(const k of Object.keys(paxs)) if(k.replace(/\s+/g, '') === comp) return paxs[k];
  const [s, n] = nome.split('/');
  for(const k of Object.keys(paxs)){
    const [ks, kn] = k.split('/');
    if(ks === s && primeiroNomeIgual(kn || '', n || '')) return paxs[k];
  }
  return null;
}
function primeiroNomeIgual(a, b){
  const x = a.trim().split(' ')[0], y = b.trim().split(' ')[0];
  if(!x || !y) return false;
  if(x === y) return true;
  const min = Math.min(x.length, y.length);
  return min >= 3 && (x.startsWith(y) || y.startsWith(x));
}

/* ═══════════════════════════════════════════
   FATOS: o que a reserva "é" depois de ler tudo
═══════════════════════════════════════════ */
function analisarFatos(cron, paxs){
  const f = { itin:[], assentos:[], pagamentos:[], bilhetes:[], atores:[], indicios:[], primeiro:null, ultimo:null, rota:'Não identificada' };
  const segMap = new Map(), seatMap = new Map(), axMap = new Map(), tktMap = new Map();
  let seqAx = 0;

  cron.forEach(b => {
    const evs = b.evs.slice().sort((x, y) => ((x.meta.kind==='seg' && x.meta.acao==='XS') ? 0 : 1) - ((y.meta.kind==='seg' && y.meta.acao==='XS') ? 0 : 1));
    const pay = {};
    evs.forEach(e => {
      const m = e.meta;
      if(m.kind === 'seg'){
        const k = `${m.voo}|${m.data}`;
        const cur = segMap.get(k) || {voo:m.voo, data:m.data, hist:[]};
        cur.trecho = m.trecho; cur.ts = dataSegTs(m.data, b.ts);
        if(m.acao === 'XS') cur.removido = true;
        else { cur.removido = false; cur.dep = m.dep; cur.arr = m.arr; cur.st = m.stNew; cur.cls = m.cls; }
        cur.hist.push(`${m.acao} ${m.stOld}/${m.stNew}`);
        cur.ator = b.ator.rot; cur.quando = b.dt;
        if(m.invol) cur.invol = true;
        segMap.set(k, cur);
      }
      else if(m.kind === 'seat' || m.kind === 'seatswap'){
        const k = `${m.voo}|${m.data}|${m.pax}`;
        const cur = seatMap.get(k) || {voo:m.voo, data:m.data, pax:m.pax, atual:'', hist:[]};
        if(m.kind === 'seatswap'){ if(!cur.hist.length) cur.hist.push(m.de); cur.atual = m.para; cur.hist.push(m.para); }
        else if(m.acao === 'X'){ if(cur.atual === m.seat) cur.atual = ''; if(!cur.hist.includes(m.seat)) cur.hist.push(m.seat); }
        else { cur.atual = m.seat; if(cur.hist[cur.hist.length-1] !== m.seat) cur.hist.push(m.seat); }
        cur.ator = b.ator.rot; cur.quando = b.dt;
        seatMap.set(k, cur);
      }
      else if(m.kind === 'ax'){
        seqAx++;
        const base = `${m.voo}|${m.data}|${m.pax}`;
        if(!m.seat){
          /* XAX/UAX sem assento: age sobre o serviço mais recente do mesmo voo/passageiro */
          const cands = [...axMap.values()].filter(a => a.base === base && !a.removido).sort((x, y) => y.seq - x.seq);
          if(m.acao === 'X'){ const alvo = cands.find(a => a.st === m.st) || cands[0]; if(alvo) alvo.removido = true; }
          else if(m.acao === 'U'){ const alvo = cands.find(a => a.st !== m.st) || cands[0]; if(alvo){ alvo.st = m.st; alvo.seq = seqAx; } }
        } else {
          const k = `${base}|${m.seat}`;
          const cur = axMap.get(k) || {};
          if(m.acao === 'X') cur.removido = true; else { cur.removido = false; cur.st = m.st; }
          if(m.valor != null){ cur.valor = m.valor; cur.moeda = m.moeda; }
          if(m.prazo) cur.prazo = m.prazo;
          Object.assign(cur, {seat:m.seat, voo:m.voo, data:m.data, pax:m.pax, base, seq:seqAx});
          axMap.set(k, cur);
        }
      }
      else if(m.kind === 'tkne'){
        const cur = tktMap.get(m.tkt) || {tkt:m.tkt, pax:m.pax, cupons:new Map()};
        if(m.acao === 'A') cur.cupons.set(m.cupom || String(cur.cupons.size + 1), `${m.voo} ${m.data} · ${m.trecho}`);
        tktMap.set(m.tkt, cur);
      }
      if(m.pay) Object.assign(pay, m.pay);
    });
    if(Object.keys(pay).length && (pay.valor != null || pay.auth || pay.pagante || pay.cartao || pay.fareBasis || pay.reemissao))
{
      const ult = f.pagamentos[f.pagamentos.length-1];
      if(ult && ult.dt === b.dt && ult.ator === b.ator.rot) Object.assign(ult.pay, pay);
      else f.pagamentos.push({dt:b.dt, ator:b.ator.rot, sig:b.sigCode, pay});
    }
  });

  segMap.forEach(s => f.itin.push(s));
  f.itin.sort((a,b) => a.ts - b.ts);
  const ativos = f.itin.filter(s => !s.removido);
  if(ativos.length === 1) f.rota = 'Só ida';
  else if(ativos.length > 1){
    f.rota = ativos[0].trecho.slice(0,3) === ativos[ativos.length-1].trecho.slice(3,6) ? 'Ida e volta' : 'Múltiplos trechos / só ida';
  }

  seatMap.forEach(s => {
    s.ax = null;
    axMap.forEach(a => { if(a.voo === s.voo && a.data === s.data && a.pax === s.pax && a.seat === s.atual && !a.removido) s.ax = a; });
    f.assentos.push(s);
  });

  tktMap.forEach(t => f.bilhetes.push(t));

  /* quem mexeu */
  const porAtor = new Map();
  cron.forEach(b => {
    const c = porAtor.get(b.ator.k) || {ator:b.ator, n:0, sigs:new Set(), ult:''};
    c.n++; if(b.sigCode) c.sigs.add(b.sigCode); c.ult = b.dt || c.ult;
    porAtor.set(b.ator.k, c);
  });
  const ordAtor = k => { const i = TIPO_ATOR_ORDEM.indexOf(k); return i < 0 ? 50 : i; };
  f.atores = [...porAtor.values()].sort((a,b) => ordAtor(a.ator.k) - ordAtor(b.ator.k));
  f.primeiro = cron[0] || null;
  f.ultimo = cron[cron.length-1] || null;
  /* último a mexer que NÃO é sistema/robô: quem de fato alterou por último */
  f.ultimoHumano = [...cron].reverse().find(b => !b.ator.robo) || null;

  /* indícios (leitura assistida, nunca decisão) */
  const has = k => cron.find(b => b.ator.k === k);
  const itens = REGRAS.indicios.map(r => ({o:r.ordem, fn:() => {
    const b = has(r.k); if(!b || (r.seAusente && has(r.seAusente))) return;
    f.indicios.push({cls:r.cls, ico:ICONES[r.icone] || svgInfo, t:r.titulo, d:r.desc.replace(/\{sig\}/g, b.sigCode || r.sigPadrao || '').replace(/\{dt\}/g, b.dt || '')});
  }}));
  itens.push({o:25, fn:() => {
    const invols = f.itin.filter(s => s.invol);
    if(invols.length) f.indicios.push({cls:'alert-yellow', ico:svgWarn, t:'Alteração de malha (schedule change)', d:`Voos com mudança de horário/status: ${invols.map(s => `${s.voo} ${s.data}`).join(', ')}. Verifique direito à isenção ou reacomodação.`});
  }});
  itens.push({o:55, fn:() => {
    const pend = f.assentos.filter(x => x.ax && x.ax.st === 'HD').map(x => x.ax);
    if(pend.length) f.indicios.push({cls:'alert-yellow', ico:svgWarn, t:'Assento pago aguardando pagamento (HD)', d:`${pend.map(a => `${a.seat || 'assento'} ${a.voo} ${a.data}${a.prazo ? ' (pagar até ' + a.prazo + ')' : ''}`).join(' · ')}.  Sem pagamento o Calidris cancela automaticamente.`});
  }});
  itens.sort((x, y) => x.o - y.o).forEach(i => i.fn());
  /* módulos podem acrescentar indícios ou mexer nos fatos (f.indicios, f.itin, f.assentos…) */
  rodarHooks('fatos', [f, {cron, paxs}], 'todos');
  f.indicios.forEach(i => { if(typeof i.ico === 'string') i.ico = ICONES[i.ico] || svgInfo; if(typeof i.ico !== 'function') i.ico = svgInfo; i.cls = i.cls || 'alert-blue'; i.t = String(i.t || i.titulo || ''); i.d = String(i.d || i.desc || ''); });
  return f;
}

/* ═══════════════════════════════════════════
   RENDER
═══════════════════════════════════════════ */
function tabelaSb(cab, linhas){
  if(!linhas.length) return '';
  return `<div class="sb-tbl-wrap"><table class="sb-tbl"><thead><tr>${cab.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${
    linhas.map(r => `<tr>${r.map(c => `<td>${c && c.html ? c.html : esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const secSb = (titulo, icone, corpo) => corpo ? `<section class="sb-sum"><h3 class="sb-sum-title">${ico(icone)}<span>${esc(titulo)}</span></h3>${corpo}</section>` : '';

function resumirBloco(b){
  const f = [];
  const evs = b.evs;
  const segs = evs.filter(e => e.meta.kind === 'seg');
  if(segs.length){ const vs = [...new Set(segs.map(e => `${e.meta.voo} ${e.meta.data}`))]; f.push(`Segmentos: ${vs.slice(0,3).join(', ')}${vs.length>3?'…':''}`); }
  evs.filter(e => e.meta.kind === 'seatswap').forEach(e => f.push(`Assento ${e.meta.voo}: ${e.meta.de} → ${e.meta.para}`));
  const so = evs.filter(e => e.meta.kind === 'seat'); if(so.length) f.push(`${so.length} ação(ões) de assento`);
  const ax = evs.filter(e => e.meta.kind === 'ax'); if(ax.length) f.push(`Assento pago (${[...new Set(ax.map(e => e.meta.st))].join('/')})`);
  const pg = evs.find(e => e.meta.pay && e.meta.pay.valor != null); if(pg) f.push(`Pagamento ${fmtMoeda(pg.meta.pay.valor, pg.meta.pay.moeda)}`);
  const tk = evs.filter(e => e.meta.kind === 'tkne'); if(tk.length) f.push(`Bilhete ${[...new Set(tk.map(e => e.meta.tkt))].join(', ')}`);
  const ss = evs.filter(e => e.meta.kind === 'ssr'); if(ss.length) f.push(`SSR: ${[...new Set(ss.map(e => e.meta.tipo))].join(', ')}`);
  const em = evs.find(e => e.meta.kind === 'emissao' && e.meta.add); if(em) f.push('Emissão');
  if(!f.length) f.push(evs.length === 1 ? evs[0].title : `${evs.length} evento(s): ${[...new Set(evs.map(e => e.title))].slice(0,2).join('; ')}`);
  return f.slice(0,5).join(' · ');
}

function renderTudo({blocos, paxs, flags, fatos, ignoradas}){
  const events = blocos.flatMap(b => b.evs);
  $('sbEmpty').hidden = true;
  $('sbResults').hidden = false;
  resetFiltro();
  abrirAba('resumo');

  /* ── ALERTAS ── */
  const aBox = $('sbAlerts');
  let alertsHtml = '';
  const addAlert = (cls, iconFn, title, desc) => {
    alertsHtml += `<div class="alert-item ${cls}"><div class="alert-icon">${iconFn()}</div><div class="alert-text"><div class="alert-title">${esc(title)}</div><div class="alert-desc">${esc(desc)}</div></div></div>`;
  };
  const alertaDe = r => { if(flags[r.chave]) addAlert(r.cls || r.cor || 'alert-blue', ICONES[r.icone] || svgInfo, r.titulo, String(r.descricao || '').replace(/\{valor\}/g, flags[r.chave] === true ? '' : String(flags[r.chave]))); };
  REGRAS.alertas.filter(r => r.ordem < 20).forEach(alertaDe);
  fatos.indicios.forEach(i => addAlert(i.cls, i.ico, i.t, i.d));
  REGRAS.alertas.filter(r => r.ordem >= 20).forEach(alertaDe);
  rodarHooks('alertas', [flags, fatos], 'lista').forEach(a => { if(a) addAlert(a.cls || 'alert-blue', ICONES[a.icone] || svgInfo, String(a.titulo || ''), String(a.desc || '')); });
  sigPendentes = agruparSigsDesconhecidas(blocos);
  if(sigPendentes.length) alertsHtml = alertaAssinatura(sigPendentes) + alertsHtml;
  aBox.innerHTML = alertsHtml;
  aBox.hidden = !alertsHtml;

  /* ── NÚMEROS ── */
  const cats = {voo:0, ssr:0, osi:0, remark:0, sys:0, ticket:0, seat:0, pay:0};
  events.forEach(e => { const c = e.cat.replace('cat-',''); if(cats[c] !== undefined) cats[c]++; });
  const st = (v, l) => `<div class="stat"><span class="stat-val">${v}</span><span class="stat-lbl">${l}</span></div>`;
  $('sbStats').innerHTML = st(events.length,'Eventos') + st(blocos.length,'Alterações (assinaturas)') + st(cats.voo,'Voos') + st(cats.ssr,'SSR/Serviços') + st(cats.osi,'OSI') + st(cats.remark,'Remarks') + st(cats.pay,'Pagamento') + st(cats.sys,'Sistema') + st(cats.ticket,'Bilhetes/EMD') + st(cats.seat,'Assentos') + st(Object.keys(paxs).length,'Passageiros');

  const grupos = {auto:0, site:0, cc:0, cpc:0, agente:0};
  blocos.forEach(b => { grupos[b.ator.grupo]++; });
  document.querySelectorAll('[data-sb-filter]').forEach(chip => {
    const fl = chip.dataset.sbFilter;
    chip.querySelector('.chip-n').textContent = fl === 'all' ? events.length : (cats[fl.replace('cat-','')] || 0);
  });
  document.querySelectorAll('[data-sb-actor]').forEach(chip => {
    const a = chip.dataset.sbActor;
    chip.querySelector('.chip-n').textContent = a === 'all' ? blocos.length : (grupos[a] || 0);
  });

  /* ── RESUMO ── */
  const kv = (l, v) => `<div class="sb-kv"><span class="sb-kv-l">${esc(l)}</span><span class="sb-kv-v">${v}</span></div>`;
  const quem = b => b ? `${esc(b.ator.rot)}${b.sigCode ? ' · ' + esc(b.sigCode) : ''}<small>${esc(b.dt)}</small>` : '—';
  let resumo = '';
  resumo += `<div class="sb-kv-grid">${
    kv('Reserva criada por', quem(fatos.primeiro)) +
    kv('Última alteração', quem(fatos.ultimo)) +
    kv('Último agente humano', quem(fatos.ultimoHumano)) +
    kv('Rota', esc(fatos.rota)) +
    kv('Passageiros', esc(Object.keys(paxs).map(transPax).join(' · ') || '—')) +
    kv('Bilhetes', esc(fatos.bilhetes.map(t => t.tkt).join(' · ') || '—'))
  }</div><p class="sb-tip">O responsável por uma alteração é a <strong>assinatura</strong> do bloco, não o campo R-, que pode ser trocado por qualquer agente. O histórico é lido de baixo para cima: o início da reserva é o último bloco colado.</p>`;

  resumo += secSb('Quem mexeu na reserva', 'user', tabelaSb(['Quem','Alterações','Assinaturas','Última'], fatos.atores.map(a => [a.ator.rot, String(a.n), [...a.sigs].join(', ') || '—', a.ult || '—'])));
  resumo += secSb('Itinerário (último estado conhecido)', 'plane', tabelaSb(['Voo','Data','Rota','Horário','Status','Última alteração'], fatos.itin.map(s => [
    s.voo + (s.cls ? ' ' + s.cls : ''), s.data, {html: routeHtml(s.trecho)}, s.dep && s.dep !== '--' ? `${s.dep}→${s.arr}` : '—',
    s.removido ? 'Removido (XS)' : `${s.st} – ${stInfo(s.st).txt}`, `${s.ator}${s.quando ? ' · ' + s.quando : ''}`])));
  resumo += secSb('Assentos', 'armchair', tabelaSb(['Voo','Passageiro','Assento atual','Histórico','Serviço pago'], fatos.assentos.map(s => [
    `${s.voo} ${s.data}`, s.pax ? transPax(s.pax) : '—', s.atual || 'Sem assento', s.hist.join(' → ') || '—',
    s.ax ? `${AX_ST[s.ax.st] || s.ax.st}${s.ax.valor != null ? ' · ' + fmtMoeda(s.ax.valor, s.ax.moeda) : ''}${s.ax.st === 'HD' && s.ax.prazo ? ' · até ' + s.ax.prazo : ''}` : '—'])));
  resumo += secSb('Pagamentos e tarifa', 'credit-card', tabelaSb(['Quando','Quem','Valor pago','Autorização','Tarifa (fare basis)','Total da tarifa','Pagante / cartão'], fatos.pagamentos.map(p => [
    p.dt || '—', p.ator, p.pay.valor != null ? fmtMoeda(p.pay.valor, p.pay.moeda) : (p.pay.pago ? 'Pago (cartão)' : '—'), p.pay.auth || '—', p.pay.fareBasis || '—', p.pay.tarifaTotal || '—',
    [p.pay.pagante, p.pay.cartao].filter(Boolean).join(' · ') || (p.pay.reemissao ? `Reemissão aprovada ${p.pay.reemissao}` : '—')])));
  resumo += secSb('Bilhetes por passageiro e cupom', 'ticket', tabelaSb(['Bilhete','Passageiro','Cupons (voos)'], fatos.bilhetes.map(t => [
    t.tkt, t.pax ? transPax(t.pax) : '—', [...t.cupons.entries()].map(([c, v]) => `C${c}: ${v}`).join(' | ') || '—'])));
  if(ignoradas.length) resumo += `<details class="sb-ign"><summary>${ignoradas.length} linha(s) não interpretada(s)</summary><p class="sb-tip">Estas linhas não foram reconhecidas pelo Agente. Confira no histórico original.</p><pre class="sb-raw">${esc(ignoradas.join('\n'))}</pre></details>`;
  $('sbResumo').innerHTML = resumo;

  /* ── LINHA DO TEMPO (por assinatura) ── */
  const tBox = $('sbTimeline');
  if(!events.length){
    tBox.innerHTML = `<div class="empty"><span class="empty-ico">${ico('search-x')}</span><h3>Nenhum evento reconhecido</h3><p>Cole um histórico mais completo com linhas de ação (XS, AS, A4S, OAC-, R- etc.).</p></div>`;
  } else {
    let idx = 0;
    tBox.innerHTML = blocos.map(b => `
      <div class="sb-blk" data-ator="${b.ator.grupo}">
        <div class="sb-blk-head">
          <div class="sb-blk-top"><span class="badge ${b.ator.cls}">${esc(b.ator.rot)}</span>${b.sigCode ? `<code class="sb-blk-sig">${esc(b.sigCode)}</code>` : ''}<span class="sb-blk-dt">${esc(b.dt)}</span></div>
          <p class="sb-blk-sum">${esc(resumirBloco(b))}</p>
          <p class="sb-blk-desc">${esc(b.ator.desc)}</p>
        </div>
        <div class="sb-blk-evs">${b.evs.map(ev => buildEvCard(ev, idx++)).join('')}</div>
      </div>`).join('');
  }

  /* ── PASSAGEIROS ── */
  const pBox = $('sbPax');
  const pKeys = Object.keys(paxs);
  if(!pKeys.length){
    pBox.innerHTML = `<p class="sb-muted">Nenhum passageiro identificado no histórico colado.</p>`;
  } else {
    pBox.innerHTML = pKeys.map(k => {
      const p = paxs[k];
      const tkts = [...new Set(p.tkts)], progs = [...new Set(p.programas)];
      const docs = [...new Set(p.docs)], contas = [...new Set(p.conta)], tarifas = [...new Set(p.tarifa)];
      const seats = fatos.assentos.filter(s => s.pax === k);
      const cpfNote = p.cpfAutoAssoc ? `<div class="sb-pax-row is-warn">${ico('triangle-alert')}<span class="sb-pax-val">CPF associado por ordem (${pKeys.indexOf(k)+1}º passageiro)</span></div>` : '';
      return `<div class="sb-pax-card">
        <div class="sb-pax-name">${svgUser()}<span>${esc(transPax(p.nome))}</span></div>
        <div class="sb-pax-row">${svgPlane()}<span class="sb-pax-val">Rota: ${esc(p.rota||'—')}</span></div>
        <div class="sb-pax-row">${svgService()}<span class="sb-pax-val">Tarifa: ${tarifas.length?esc(tarifas.join(' / ')):'—'}</span></div>
        <div class="sb-pax-row">${svgTicket()}<span class="sb-pax-val">${tkts.length?esc(tkts.join(', ')):'Bilhete não encontrado'}</span></div>
        ${seats.length ? `<div class="sb-pax-row">${svgSeat()}<span class="sb-pax-val">${seats.map(s => esc(`${s.voo} ${s.data}: ${s.atual || 'sem assento'}`)).join(' | ')}</span></div>` : ''}
        <div class="sb-pax-row">${svgDoc()}<span class="sb-pax-val">${docs.length?esc(docs.join(' | ')):'Sem DOCS/FOID'}</span></div>
        ${cpfNote}
        ${contas.length?`<div class="sb-pax-row">${svgStar()}<span class="sb-pax-val">Conta LATAM: ${esc(contas.join(' | '))}</span></div>`:''}
        ${progs.length?`<div class="sb-pax-row">${svgStar()}<span class="sb-pax-val">${esc(progs.join(' | '))}</span></div>`:''}
      </div>`;
    }).join('');
  }

  rodarHooks('depois', [{blocos, paxs, flags, fatos, ignoradas}], 'todos');

  const alvo = aBox.hidden ? $('sbResults') : aBox;
  const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  alvo.scrollIntoView({ block: 'start', behavior: reduz ? 'auto' : 'smooth' });
}

function buildEvCard(ev, idx){
  const robot = ev.ator ? ev.ator.robo : isRobot(ev.sig);
  const fieldsHtml = ev.fields.map(f=>{
    const vHtml = f.html ? f.v : `<span class="sb-ev-val ${f.vcls||''}">${esc(String(f.v||'—'))}</span>`;
    return `<div class="sb-ev-field"><span class="sb-ev-lbl">${esc(f.l)}</span>${f.html?`<span class="sb-ev-val">${f.v}</span>`:vHtml}</div>`;
  }).join('');

  return `
  <div class="sb-ev ${ev.cat}" data-cat="${ev.cat}">
    <button class="sb-ev-head" type="button" aria-expanded="false" aria-controls="sbEv${idx}" data-sb-action="toggle-ev">
      <span class="sb-ev-icon">${ev.icon}</span>
      <span class="sb-ev-info">
        <span class="sb-ev-title">${esc(ev.title)}</span>
        <span class="sb-ev-sub">${esc(ev.sub)}</span>
      </span>
      <span class="sb-ev-right">
        <span class="badge ${ev.badgeCls}">${esc(ev.badge)}</span>
      </span>
      ${ico('chevron-down','sb-ev-chevron')}
    </button>
    <div class="sb-ev-body" id="sbEv${idx}" hidden>
      ${(ev.sig||ev.from||ev.dt)?`<div class="sb-ev-op">
        ${ev.ator?`<div class="sb-op"><span class="sb-op-lbl">Quem</span><span class="sb-op-val ${robot?'is-robot':''}">${esc(ev.ator.rot)}${robot?' · ROBÔ':''}</span></div>`:''}
        ${ev.sig?`<div class="sb-op"><span class="sb-op-lbl">Operador/Estação</span><span class="sb-op-val">${esc(ev.sig)}</span></div>`:''}
        ${ev.from?`<div class="sb-op"><span class="sb-op-lbl">R- (pista, não é o responsável)</span><span class="sb-op-val">${esc(ev.from)}</span></div>`:''}
        ${ev.dt?`<div class="sb-op"><span class="sb-op-lbl">Data/Hora (${esc(CONFIG.rotuloFuso)})</span><span class="sb-op-val">${esc(ev.dt)}</span></div>`:''}
      </div>`:''}
      <div class="sb-ev-grid">${fieldsHtml}</div>
      <button class="sb-raw-toggle" type="button" aria-expanded="false" data-sb-action="toggle-raw"><span>Ver linha bruta do log</span>${ico('chevron-down','ic--sm')}</button>
      <pre class="sb-raw" hidden>${esc(ev.raw)}</pre>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════ */
function toggleEv(head){
  const body = head.nextElementSibling;
  const open = head.getAttribute('aria-expanded') !== 'true';
  head.setAttribute('aria-expanded', open ? 'true' : 'false');
  body.hidden = !open;
}

function toggleRaw(btn){
  const box = btn.nextElementSibling;
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.querySelector('span').textContent = open ? 'Ocultar linha bruta do log' : 'Ver linha bruta do log';
  box.hidden = !open;
}

let fCat = 'all', fAtor = 'all';
function aplicarFiltros(){
  document.querySelectorAll('[data-sb-filter]').forEach(b=>{
    const on = b.dataset.sbFilter === fCat;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('[data-sb-actor]').forEach(b=>{
    const on = b.dataset.sbActor === fAtor;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  let visiveis = 0;
  document.querySelectorAll('#sbTimeline .sb-blk').forEach(blk=>{
    const okAtor = fAtor === 'all' || blk.dataset.ator === fAtor;
    let n = 0;
    blk.querySelectorAll('.sb-ev').forEach(c=>{
      const show = okAtor && (fCat === 'all' || c.dataset.cat === fCat);
      c.hidden = !show;
      if (show) n++;
    });
    blk.hidden = n === 0;
    visiveis += n;
  });
  const fe = $('sbFilterEmpty'); if (fe) fe.hidden = visiveis > 0 || !document.querySelector('#sbTimeline .sb-blk');
}
function filtrar(cat){ fCat = cat; aplicarFiltros(); }
function filtrarAtor(a){ fAtor = a; aplicarFiltros(); }

function resetFiltro(){
  fCat = 'all'; fAtor = 'all'; aplicarFiltros();
}

function abrirAba(id, focar){
  document.querySelectorAll('.sb-tab').forEach(b=>{
    const on = b.dataset.sbTab === id;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    if (on && focar) b.focus();
  });
  document.querySelectorAll('.sb-pane').forEach(p=>{
    p.hidden = p.id !== 'sbPane-' + id;
  });
}

function limpar(){
  $('sbInput').value = '';
  mostrarErro('');
  $('sbAlerts').innerHTML = '';
  $('sbAlerts').hidden = true;
  $('sbResults').hidden = true;
  $('sbEmpty').hidden = false;
  $('sbInput').focus();
}

/* ═══════════════════════════════════════════
   RELATAR PROBLEMA (feedback para a T.I)
═══════════════════════════════════════════ */
let fbSelectedEl = null;
let fbTxtBlob    = null;
let fbOpener     = null;

const FB_OVERLAYS = ['fbOverlay1','fbOverlay3','fbOverlay4','fbOverlay5'];

function fbShow(id) {
  FB_OVERLAYS.forEach(o => { $(o).hidden = o !== id; });
  const alvo = $(id).querySelector('textarea, .btn--primary');
  if (alvo) alvo.focus();
}

function fbStep1(opener) {
  fbOpener = opener || null;
  fbShow('fbOverlay1');
}

function fbClose() {
  FB_OVERLAYS.forEach(id => { $(id).hidden = true; });
  fbCancelSelect();
  $('fbTextarea').value = '';
  fbSelectedEl = null;
  if (fbOpener && document.contains(fbOpener)) fbOpener.focus();
}

function fbStartSelect() {
  FB_OVERLAYS.forEach(id => { $(id).hidden = true; });
  $('fbSelectionBanner').hidden = false;
  document.body.classList.add('fb-selecting');
  document.addEventListener('mouseover',  fbMouseOver,  true);
  document.addEventListener('mouseout',   fbMouseOut,   true);
  document.addEventListener('click',      fbClickEl,    true);
}

function fbCancelSelect() {
  $('fbSelectionBanner').hidden = true;
  document.body.classList.remove('fb-selecting');
  document.removeEventListener('mouseover', fbMouseOver, true);
  document.removeEventListener('mouseout',  fbMouseOut,  true);
  document.removeEventListener('click',     fbClickEl,   true);
  document.querySelectorAll('.fb-highlight').forEach(el => el.classList.remove('fb-highlight'));
}

function fbMouseOver(e) {
  if (e.target.closest('#fbSelectionBanner')) return;
  e.target.classList.add('fb-highlight');
}
function fbMouseOut(e) {
  e.target.classList.remove('fb-highlight');
}

function fbClickEl(e) {
  if (e.target.closest('#fbSelectionBanner')) return;
  e.preventDefault(); e.stopPropagation();

  fbSelectedEl = e.target;
  fbSelectedEl.classList.remove('fb-highlight');
  fbCancelSelect();

  // Coleta informações do elemento
  const tag    = fbSelectedEl.tagName.toLowerCase();
  const id     = fbSelectedEl.id ? `#${fbSelectedEl.id}` : '';
  const cls    = (fbSelectedEl.classList && fbSelectedEl.classList.length) ? `.${[...fbSelectedEl.classList].join('.')}` : '';
  const txt    = (fbSelectedEl.innerText || fbSelectedEl.textContent || '').trim().slice(0, 300);
  const html   = fbSelectedEl.outerHTML.slice(0, 500);
  const rect   = fbSelectedEl.getBoundingClientRect();
  const posStr = `x:${Math.round(rect.left)}, y:${Math.round(rect.top)}, w:${Math.round(rect.width)}, h:${Math.round(rect.height)}`;

  $('fbElPreview').textContent =
    `TAG:      ${tag}${id}${cls}\n` +
    `POSIÇÃO:  ${posStr}\n` +
    `TEXTO:    ${txt || '(sem texto)'}\n` +
    `HTML:     ${html}`;
  fbShow('fbOverlay3');
}

function fbGenerate() {
  const relato = $('fbTextarea').value.trim();
  if(!relato) { $('fbTextarea').focus(); return; }

  const tag  = fbSelectedEl ? fbSelectedEl.tagName.toLowerCase() : '—';
  const id   = fbSelectedEl?.id ? `#${fbSelectedEl.id}` : '';
  const cls  = (fbSelectedEl && fbSelectedEl.classList.length) ? `.${[...fbSelectedEl.classList].join('.')}` : '';
  const txt  = (fbSelectedEl?.innerText || fbSelectedEl?.textContent || '').trim().slice(0, 500);
  const html = fbSelectedEl?.outerHTML?.slice(0, 800) || '—';
  const rect = fbSelectedEl?.getBoundingClientRect();
  const pos  = rect ? `x:${Math.round(rect.left)}, y:${Math.round(rect.top)}, w:${Math.round(rect.width)}, h:${Math.round(rect.height)}` : '—';
  const now  = new Date().toLocaleString('pt-BR');
  const ua   = navigator.userAgent;
  const url  = location.href;
  const res  = `${screen.width}x${screen.height}`;

  const content =
`================================================================
   RELATÓRIO DE FEEDBACK – AGENTE SABRE (PORTAL SUPORTE LUA)
================================================================
Gerado em : ${now}
URL        : ${url}
Resolução  : ${res}
Navegador  : ${ua}

----------------------------------------------------------------
ELEMENTO IDENTIFICADO
----------------------------------------------------------------
Tag/Seletor : ${tag}${id}${cls}
Posição     : ${pos}
Texto       : ${txt || '(sem texto visível)'}

HTML completo:
${html}

----------------------------------------------------------------
RELATO DO USUÁRIO
----------------------------------------------------------------
${relato}

----------------------------------------------------------------
CONTEXTO DA PÁGINA (primeiros 1000 chars do histórico colado)
----------------------------------------------------------------
${($('sbInput')?.value || '(sem histórico carregado)').slice(0, 1000)}

================================================================
FIM DO RELATÓRIO – Envie este arquivo para a equipe de T.I
================================================================`;

  fbTxtBlob = new Blob([content], { type: 'text/plain;charset=utf-8' });

  /* Logado: o relatório vai direto para o painel dos desenvolvedores (formulário interno "erro-agente-sabre").
     O texto fica editável na tela antes de enviar. Sem login (ou sem o módulo de formulários), mantém o .txt. */
  if (window.suporteLuaPerfil && window.PortalForms) {
    fbClose();
    window.PortalForms.abrir('erro-agente-sabre', {
      preset: { descricao: relato.slice(0, 4000), relatorio: content.slice(0, 120000) },
      aoEnviar: () => setTimeout(() => fbShow('fbOverlay5'), 600)
    });
    return;
  }
  fbShow('fbOverlay4');

  const dlBtn = $('fbDownloadBtn');
  dlBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(fbTxtBlob);
    a.download = `feedback_TI_${now.replace(/[/:, ]/g,'_')}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setTimeout(() => fbShow('fbOverlay5'), 500);
  };
}

/* ═══════════════════════════════════════════
   EVENTOS
═══════════════════════════════════════════ */
function initSabre(){
  if (!$('sbInput')) return;

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-sb-action], [data-sb-filter], [data-sb-actor], [data-sb-tab]');
    if (!el) return;

    if (el.dataset.sbFilter) { filtrar(el.dataset.sbFilter); return; }
    if (el.dataset.sbActor)  { filtrarAtor(el.dataset.sbActor); return; }
    if (el.dataset.sbTab)    { abrirAba(el.dataset.sbTab); return; }

    switch (el.dataset.sbAction) {
      case 'analisar':   analisar(); break;
      case 'limpar':     limpar(); break;
      case 'toggle-ev':  toggleEv(el); break;
      case 'toggle-raw': toggleRaw(el); break;
      case 'fb-open':    fbStep1(el); break;
      case 'sig-report': reportarAssinaturas(); break;
      case 'fb-close':   fbClose(); break;
      case 'fb-select':  fbStartSelect(); break;
      case 'fb-cancel':  fbClose(); break;
      case 'fb-generate':fbGenerate(); break;
    }
  });

  // Ctrl/Cmd + Enter analisa direto do campo de texto
  $('sbInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      analisar();
    }
  });
  $('sbInput').addEventListener('input', () => mostrarErro(''));

  // Abas internas por teclado (setas, Home, End)
  document.querySelector('.sb-tabs').addEventListener('keydown', (event) => {
    const abas = [...document.querySelectorAll('.sb-tab')];
    const i = abas.indexOf(document.activeElement);
    if (i < 0) return;
    let n = null;
    if (event.key === 'ArrowRight') n = (i + 1) % abas.length;
    else if (event.key === 'ArrowLeft') n = (i - 1 + abas.length) % abas.length;
    else if (event.key === 'Home') n = 0;
    else if (event.key === 'End') n = abas.length - 1;
    if (n === null) return;
    event.preventDefault();
    abrirAba(abas[n].dataset.sbTab, true);
  });

  // Esc fecha as janelas de relato
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!$('fbSelectionBanner').hidden || FB_OVERLAYS.some(o => !$(o).hidden)) fbClose();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSabre);
} else {
  initSabre();
}

})();
