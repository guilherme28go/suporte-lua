/* ==========================================================================
   PORTAL SUPORTE LUA - Hub Operacional Latam
   script.js - abas, busca, scripts de atendimento, tradutor fonético e relógio.
   As funções públicas mantêm os nomes do portal original:
   openTab, filterAll, updateScripts, copyScript, showToast,
   updateFonetico, checkBackspace, renderFonetico, limparFonetico.
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
let activeGroup = 'all'; // filtro de categoria da aba PIC

/** Minúsculas e sem acentos, para a busca encontrar "contingencia" em "CONTINGÊNCIA". */
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
 * opts.initial    -> carga da página (sem rolagem e sem alterar a URL)
 * opts.keepScroll -> não rola a página (navegação por teclado)
 */
// Em telas estreitas a barra de abas rola na horizontal: mantém a aba ativa à vista
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

    // Como no portal original: trocar de aba limpa a busca (e o filtro de categoria)
    const search = qs('#global-search');
    if (search) search.value = '';
    activeGroup = 'all';
    qsa('.chip').forEach((chip) => {
        const on = chip.dataset.group === 'all';
        chip.classList.toggle('is-active', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
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
   Busca instantânea + filtro por categoria
   -------------------------------------------------------------------------- */
function filterAll() {
    const input = qs('#global-search');
    const panel = qs('.panel:not([hidden])');
    if (!input || !panel) return;

    const raw = input.value.trim();
    const query = normalizar(raw);

    const wrap = qs('.search');
    if (wrap) wrap.classList.toggle('has-value', raw !== '');
    const clear = qs('.search-clear');
    if (clear) clear.hidden = raw === '';

    const items = qsa('.card, tbody tr, .script-card', panel);
    let visible = 0;

    items.forEach((el) => {
        const textOk = !query || normalizar(el.textContent).includes(query);
        const groupOk = activeGroup === 'all' || !el.dataset.group || el.dataset.group === activeGroup;
        const show = textOk && groupOk;
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

    const filtering = query !== '' || activeGroup !== 'all';

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

function setGroup(group) {
    activeGroup = group || 'all';
    qsa('.chip').forEach((chip) => {
        const on = chip.dataset.group === activeGroup;
        chip.classList.toggle('is-active', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    filterAll();
}

function clearSearch(focus) {
    const input = qs('#global-search');
    if (!input) return;
    input.value = '';
    setGroup('all');
    if (focus) input.focus();
}

/* --------------------------------------------------------------------------
   Contadores (calculados a partir do HTML, então acompanham novos itens)
   -------------------------------------------------------------------------- */
function updateCounts() {
    const fontes = {
        sistemas: '#sistemas .card',
        forms: '#forms .card',
        slides: '#slides .card',
        pic: '#pic .card',
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

    qsa('#pic .chip').forEach((chip) => {
        const group = chip.dataset.group;
        const n = group === 'all'
            ? qsa('#pic .card').length
            : qsa('#pic .card').filter((card) => card.dataset.group === group).length;
        qs('.chip-n', chip).textContent = n;
    });
}

/* --------------------------------------------------------------------------
   Scripts de atendimento: preenchimento automático e cópia
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

    if (qs('#global-search').value.trim() !== '') filterAll();
}

/** Copia texto; usa a API moderna e cai para execCommand (http/intranet sem HTTPS). */
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
   Aviso visual (toast)
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
   Tradutor fonético em tempo real (Alfabeto NATO)
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

/** Colar o localizador inteiro (ex.: "ABC123") distribui os caracteres pelos quadrados. */
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

    // Mesmo texto do portal original: palavras separadas por " • "
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

/** Tabela de referência A-Z (gerada a partir do mesmo dicionário). */
function buildNatoGrid() {
    const grid = document.getElementById('natoGrid');
    if (!grid) return;
    grid.innerHTML = Object.keys(alfabetoFonetico)
        .map((letra) => '<div class="nato-item"><b>' + letra + '</b><span>' + alfabetoFonetico[letra] + '</span></div>')
        .join('');
}

/* --------------------------------------------------------------------------
   Relógio de referência: Brasília e UTC (Zulu)
   -------------------------------------------------------------------------- */
const fmtHoraBRT = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const fmtHoraUTC = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const fmtDataBRT = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

function tickClock() {
    const agora = new Date();
    const brt = qs('#clockBRT');
    const utc = qs('#clockUTC');
    const data = qs('#clockDate');
    if (brt) brt.textContent = fmtHoraBRT.format(agora);
    if (utc) utc.textContent = fmtHoraUTC.format(agora);
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
   Eventos (delegação: itens novos no HTML funcionam sem religar nada)
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

        const chip = alvo.closest('.chip');
        if (chip) {
            setGroup(chip.dataset.group);
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
    busca.addEventListener('input', filterAll);
    busca.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') clearSearch(false);
    });
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

    // Abas por teclado e por endereço (#scripts, #pic, ...)
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
function init() {
    updateCounts();
    buildNatoGrid();
    renderFonetico();
    setupEvents();
    setupScrollUi();

    openTab(tabFromHash() || DEFAULT_TAB, { initial: true });

    tickClock();
    setInterval(tickClock, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
