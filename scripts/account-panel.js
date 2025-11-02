/* account-panel.js
 *
 * Módulo de controle do painel de conta com posicionamento absoluto via portal pattern.
 * Implementa solução para problema de z-index através de movimentação do elemento para document.body.
 * Funcionalidades:
 * - Reposicionamento do painel usando position:fixed para escape de stacking context
 * - Cálculo de posicionamento relativo ao botão disparador (#account-btn)
 * - Controles de acessibilidade: aria-expanded, aria-hidden, gestão de foco
 * - Fechamento via clique externo, tecla Escape, e trap de foco via Tab
 *
 * Inclusão requerida:
 * <script src="account-panel.js" defer></script>
 */

(function () {
    'use strict';

    const BTN_ID = 'account-btn';
    const PANEL_ID = 'account-panel';
    const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const PORTAL_ZINDEX = 99999;
    const GAP = 8; // Espaçamento em pixels entre botão/painel e bordas da viewport

    const btn = document.getElementById(BTN_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!btn || !panel) return;

    // Define type=button para prevenir submissão acidental de formulários
    try { if (!btn.getAttribute('type')) btn.setAttribute('type', 'button'); } catch (e) {}

    // Variáveis de estado do painel
    let isOpen = !panel.hasAttribute('hidden');
    let isPortalled = false;
    const placeholder = document.createComment('account-panel-placeholder');
    let onDocClick = null;
    let onDocKey = null;

    // Retorna array de elementos focáveis visíveis dentro do painel
    function getFocusableElements() {
        return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    }

    // Transfere painel para document.body e insere marcador de posição original
    function portalize() {
        if (isPortalled) return;
        const parent = panel.parentNode;
        if (!parent) return;
        parent.insertBefore(placeholder, panel);
        document.body.appendChild(panel);
        isPortalled = true;

        // Aplica estilos para posicionamento fixo
        panel.style.position = 'fixed';
        panel.style.zIndex = String(PORTAL_ZINDEX);
        panel.style.willChange = 'top, left';
        panel.style.minWidth = panel.style.minWidth || panel.offsetWidth + 'px';
    }

    // Restaura painel à posição original no DOM e remove estilos inline
    function restoreFromPortal() {
        if (!isPortalled) return;
        placeholder.parentNode.insertBefore(panel, placeholder);
        placeholder.parentNode.removeChild(placeholder);
        isPortalled = false;

        // Remove estilos inline aplicados durante portal
        panel.style.position = '';
        panel.style.left = '';
        panel.style.top = '';
        panel.style.zIndex = '';
        panel.style.willChange = '';
    }

    // Calcula e aplica posicionamento do painel relativo ao botão
    function positionPanelRelativeToButton() {
        const rect = btn.getBoundingClientRect();

        // Torna painel invisível temporariamente para medição sem efeito visual
        const prevVisibility = panel.style.visibility;
        panel.style.visibility = 'hidden';
        panel.removeAttribute('hidden');

        // Obtém dimensões do painel
        const pW = panel.offsetWidth;
        const pH = panel.offsetHeight;

        // Calcula posição horizontal: alinha borda direita do painel com borda direita do botão
        let left = rect.right - pW;
        if (left < GAP) left = GAP; // Previne overflow à esquerda

        // Calcula posição vertical: posiciona abaixo do botão por padrão
        let top = rect.bottom + GAP;
        if (top + pH > window.innerHeight - GAP) {
            top = rect.top - pH - GAP; // Posiciona acima se não houver espaço abaixo
            if (top < GAP) top = GAP; // Garante que não ultrapasse topo da viewport
        }

        panel.style.left = Math.round(left) + 'px';
        panel.style.top = Math.round(top) + 'px';
        panel.style.visibility = prevVisibility || '';
    }

    function openPanel() {
        if (isOpen) return;
        portalize();
        panel.removeAttribute('hidden');
        panel.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        isOpen = true;

        positionPanelRelativeToButton();

        // Define foco: prioriza input#username, caso contrário primeiro elemento focável
        const prefer = panel.querySelector('#username');
        const firstFocusable = prefer || getFocusableElements()[0] || panel;
        try { firstFocusable.focus(); } catch (e) {}

        // Registra handler de clique externo para fechamento
        onDocClick = function (ev) {
            if (!panel.contains(ev.target) && !btn.contains(ev.target)) closePanel();
        };
        document.addEventListener('click', onDocClick, { capture: true });

        // Registra handler de teclado para Escape e trap de foco
        onDocKey = function (ev) {
            if (ev.key === 'Escape' || ev.key === 'Esc') {
                ev.preventDefault();
                closePanel();
                try { btn.focus(); } catch (e) {}
                return;
            }

            // Implementa trap de foco: Tab circula entre elementos focáveis do painel
            if (ev.key === 'Tab') {
                const focusables = getFocusableElements();
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const active = document.activeElement;
                if (ev.shiftKey && active === first) {
                    ev.preventDefault();
                    last.focus();
                } else if (!ev.shiftKey && active === last) {
                    ev.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', onDocKey, true);

        // Registra handlers para reposicionamento ou fechamento em mudanças de viewport
        window.addEventListener('resize', handleWindowChange, { passive: true });
        window.addEventListener('scroll', handleWindowChange, { passive: true });
    }

    function closePanel() {
        if (!isOpen) return;
        panel.setAttribute('hidden', '');
        panel.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        isOpen = false;

        // Remove event listeners
        if (onDocClick) {
            document.removeEventListener('click', onDocClick, { capture: true });
            onDocClick = null;
        }
        if (onDocKey) {
            document.removeEventListener('keydown', onDocKey, true);
            onDocKey = null;
        }
        window.removeEventListener('resize', handleWindowChange);
        window.removeEventListener('scroll', handleWindowChange);

        // Restaura painel à posição original no DOM
        restoreFromPortal();
    }

    function togglePanel() {
        if (isOpen) closePanel();
        else openPanel();
    }

    function handleWindowChange() {
        // Reposiciona painel em mudanças de viewport; fecha em caso de erro
        if (!isOpen) return;
        try {
            positionPanelRelativeToButton();
        } catch (e) {
            closePanel();
        }
    }

    // Handler de clique no botão: alterna estado e previne propagação
    btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        togglePanel();
    });

    // Handler de focusin: fecha painel quando foco sai completamente
    document.addEventListener('focusin', function (ev) {
        if (!isOpen) return;
        const t = ev.target;
        if (!panel.contains(t) && !btn.contains(t)) {
            // Timeout para permitir estabilização de foco antes de verificação
            setTimeout(function () {
                const active = document.activeElement;
                if (!panel.contains(active) && !btn.contains(active)) closePanel();
            }, 0);
        }
    }, true);

    // Inicializa atributos ARIA conforme estado inicial
    if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (!panel.hasAttribute('aria-hidden')) panel.setAttribute('aria-hidden', panel.hasAttribute('hidden') ? 'true' : 'false');

    // Expõe API pública para controle programático
    window.__accountPanel = {
        open: openPanel,
        close: closePanel,
        toggle: togglePanel,
        isOpen: () => isOpen
    };
})();