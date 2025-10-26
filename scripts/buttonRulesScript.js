/* Rules panel toggle: show/hide rules content and manage aria + focus */
(function () {
    const leftBar = document.getElementById('left-bar');
    const toggle = document.getElementById('rules-toggle');
    const rulesContent = document.getElementById('rules-content');

    function openRules() {
        leftBar.classList.remove('collapsed');
        leftBar.setAttribute('aria-hidden', 'false');
        rulesContent.removeAttribute('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        // focus first heading inside rules content for keyboard users
        const firstHeading = rulesContent.querySelector('h2, h3, a, input');
        if (firstHeading) firstHeading.focus();
    }

    function closeRules() {
        leftBar.classList.add('collapsed');
        leftBar.setAttribute('aria-hidden', 'true');
        rulesContent.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }

    toggle.addEventListener('click', function () {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        if (expanded) closeRules();
        else openRules();
    });

    // close when clicking outside the left-bar
    document.addEventListener('click', function (e) {
        if (!leftBar.classList.contains('collapsed')) {
            if (!leftBar.contains(e.target) && !e.target.matches('#rules-toggle')) {
                closeRules();
            }
        }
    });

    // close on Escape when open
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !leftBar.classList.contains('collapsed')) {
            closeRules();
        }
    });
})();
