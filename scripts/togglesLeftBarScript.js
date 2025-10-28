/* Painel lateral: controle de Regras e Classificação */
(function () {
    const leftBar = document.getElementById('left-bar');
    const rulesToggle = document.getElementById('rules-toggle');
    const classToggle = document.getElementById('class-toggle');
    const rulesContent = document.getElementById('rules-content');
    const classContent = document.getElementById('class-content');

    // Fecha ambos os painéis
    function closeAll() {
        [rulesContent, classContent].forEach(content => content.setAttribute('hidden', ''));
        [rulesToggle, classToggle].forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        leftBar.classList.add('collapsed');
        leftBar.setAttribute('aria-hidden', 'true');
    }

    // Abre um painel específico (rules ou class)
    function openPanel(type) {
        leftBar.classList.remove('collapsed');
        leftBar.setAttribute('aria-hidden', 'false');

        // Oculta ambos antes de abrir o desejado
        rulesContent.setAttribute('hidden', '');
        classContent.setAttribute('hidden', '');

        if (type === 'rules') {
            rulesContent.removeAttribute('hidden');
            rulesToggle.setAttribute('aria-expanded', 'true');
            classToggle.setAttribute('aria-expanded', 'false');
            const focusTarget = rulesContent.querySelector('h2, h3, a, input');
            if (focusTarget) focusTarget.focus();
        } else if (type === 'class') {
            classContent.removeAttribute('hidden');
            classToggle.setAttribute('aria-expanded', 'true');
            rulesToggle.setAttribute('aria-expanded', 'false');
            const focusTarget = classContent.querySelector('h2, h3, a, input');
            if (focusTarget) focusTarget.focus();
        }
    }

    // Alterna o painel (abre/fecha)
    function togglePanel(type) {
        const isRules = type === 'rules';
        const toggleBtn = isRules ? rulesToggle : classToggle;
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';

        if (expanded) closeAll();
        else openPanel(type);
    }

    // Eventos dos botões
    rulesToggle.addEventListener('click', () => togglePanel('rules'));
    classToggle.addEventListener('click', () => togglePanel('class'));

})();
