/* account-panel.js
 *
 * Resolve problema de o painel de "Conta" abrir atrás do container:
 * - Ao abrir, o painel é "teleportado" (portal) para document.body com position:fixed
 *   para escapar de stacking contexts/ordem de empilhamento do container.
 * - Posiciona o painel em relação ao botão (#account-btn).
 * - Mantém acessibilidade: aria-expanded/aria-hidden, foco no primeiro elemento (username),
 *   fechamento ao clicar fora, Escape, e tab-trap.
 *
 * Incluir na página:
 * <script src="account-panel.js" defer></script>
 */

(function () {
    'use strict';

    const BTN_ID = 'account-btn';
    const PANEL_ID = 'account-panel';
    const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const PORTAL_ZINDEX = 99999;
    const GAP = 8; // espaçamento em px entre botão/painel e bordas

    const btn = document.getElementById(BTN_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!btn || !panel) return;

    // Garantir type=button para evitar submissões acidentais
    try { if (!btn.getAttribute('type')) btn.setAttribute('type', 'button'); } catch (e) {}

    // Estado
    let isOpen = !panel.hasAttribute('hidden');
    let isPortalled = false;
    const placeholder = document.createComment('account-panel-placeholder');
    let onDocClick = null;
    let onDocKey = null;

    // util: listagem focusables dentro do painel visível
    function getFocusableElements() {
        return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    }

    // Move painel para body (portal) e insere placeholder na posição original
    function portalize() {
        if (isPortalled) return;
        const parent = panel.parentNode;
        if (!parent) return;
        parent.insertBefore(placeholder, panel);
        document.body.appendChild(panel);
        isPortalled = true;

        // força estilos que ajudam no posicionamento fixo
        panel.style.position = 'fixed';
        panel.style.zIndex = String(PORTAL_ZINDEX);
        panel.style.willChange = 'top, left';
        panel.style.minWidth = panel.style.minWidth || panel.offsetWidth + 'px';
    }

    // Restaura o painel à posição original no DOM e remove estilos inline adicionados
    function restoreFromPortal() {
        if (!isPortalled) return;
        placeholder.parentNode.insertBefore(panel, placeholder);
        placeholder.parentNode.removeChild(placeholder);
        isPortalled = false;

        // limpar estilos inline que alteram o comportamento original
        panel.style.position = '';
        panel.style.left = '';
        panel.style.top = '';
        panel.style.zIndex = '';
        panel.style.willChange = '';
        // manter hidden state controlado externamente
    }

    // posiciona o painel (após ter sido mostrado/medido)
    function positionPanelRelativeToButton() {
        const rect = btn.getBoundingClientRect();

        // Garantir que o painel esteja visível ao medir (visibilidade:hidden para evitar "flash")
        const prevVisibility = panel.style.visibility;
        panel.style.visibility = 'hidden';
        panel.removeAttribute('hidden'); // precisa estar fora do flow para medir corretamente (já portalled)
        // medir
        const pW = panel.offsetWidth;
        const pH = panel.offsetHeight;

        // calcular left para alinhar a borda direita do painel com a borda direita do botão
        let left = rect.right - pW;
        // evitar ir além da borda esquerda da viewport
        if (left < GAP) left = GAP;

        // normalmente abrir abaixo do botão; se extrapolar a viewport inferior, tenta abrir acima
        let top = rect.bottom + GAP;
        if (top + pH > window.innerHeight - GAP) {
            top = rect.top - pH - GAP;
            // se ainda extrapolar topo, força dentro da viewport
            if (top < GAP) top = GAP;
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

        // foco preferencial: input#username, senão primeiro focusable
        const prefer = panel.querySelector('#username');
        const firstFocusable = prefer || getFocusableElements()[0] || panel;
        try { firstFocusable.focus(); } catch (e) {}

        // handlers
        onDocClick = function (ev) {
            if (!panel.contains(ev.target) && !btn.contains(ev.target)) closePanel();
        };
        document.addEventListener('click', onDocClick, { capture: true });

        onDocKey = function (ev) {
            if (ev.key === 'Escape' || ev.key === 'Esc') {
                ev.preventDefault();
                closePanel();
                try { btn.focus(); } catch (e) {}
                return;
            }

            // foco preso (tab trap) dentro do painel
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

        // fechar automaticamente se o usuário redimensionar/scrollar excessivamente
        window.addEventListener('resize', handleWindowChange, { passive: true });
        window.addEventListener('scroll', handleWindowChange, { passive: true });
    }

    function closePanel() {
        if (!isOpen) return;
        panel.setAttribute('hidden', '');
        panel.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        isOpen = false;

        // remover handlers
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

        // opcional: restaurar ao DOM original (para manter markup original)
        restoreFromPortal();
    }

    function togglePanel() {
        if (isOpen) closePanel();
        else openPanel();
    }

    function handleWindowChange() {
        // Se aberto, reposiciona; se a janela mudou drasticamente, fecha (evita painéis "fora")
        if (!isOpen) return;
        try {
            positionPanelRelativeToButton();
        } catch (e) {
            closePanel();
        }
    }

    // Clique no botão: alterna; evita propagação para que handler global não feche imediatamente
    btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        togglePanel();
    });

    // Fecha se foco sair completamente do painel (caso o usuário navegue com teclado)
    document.addEventListener('focusin', function (ev) {
        if (!isOpen) return;
        const t = ev.target;
        if (!panel.contains(t) && !btn.contains(t)) {
            // permitir que foco se estabilize (ex: mudança de foco dentro do painel)
            setTimeout(function () {
                const active = document.activeElement;
                if (!panel.contains(active) && !btn.contains(active)) closePanel();
            }, 0);
        }
    }, true);

    // Inicializa atributos ARIA coerentes
    if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (!panel.hasAttribute('aria-hidden')) panel.setAttribute('aria-hidden', panel.hasAttribute('hidden') ? 'true' : 'false');

    // expor API para debug se necessário
    window.__accountPanel = {
        open: openPanel,
        close: closePanel,
        toggle: togglePanel,
        isOpen: () => isOpen
    };
})();