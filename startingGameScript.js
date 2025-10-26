// Simple behavior for the play button menu.
// - Toggle dialog visibility
// - Show/hide PC-only options when opponent is "pc"
// - Confirm returns a settings object (replace console.log with your game start function)

const playBtn = document.getElementById('playBtn');
const overlay = document.getElementById('overlay');
const dialog = document.getElementById('playDialog');
const playForm = document.getElementById('playForm');
const pcOptions = document.getElementById('pcOptions');
const cancelBtn = document.getElementById('cancelBtn');

function openDialog() {
    overlay.classList.remove('hidden');
    overlay.dataset.hidden = "false";
    playBtn.setAttribute('aria-expanded', 'true');
    // focus first control
    document.getElementById('boardSize').focus();
    // trap focus could be added for stronger accessibility
}

function closeDialog() {
    overlay.classList.add('hidden');
    overlay.dataset.hidden = "true";
    playBtn.setAttribute('aria-expanded', 'false');
    playBtn.focus();
}

function togglePcOptions(show) {
    if (show) {
        pcOptions.classList.remove('hidden');
        pcOptions.setAttribute('aria-hidden', 'false');
    } else {
        pcOptions.classList.add('hidden');
        pcOptions.setAttribute('aria-hidden', 'true');
    }
}

// Click / keyboard handlers for play-button
playBtn.addEventListener('click', openDialog);
playBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDialog();
    }
});

// Close when clicking overlay background (outside the dialog)
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
});

// Cancel button
cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeDialog();
});

// Hide/show PC-specific options when opponent changes
playForm.opponent.forEach(radio => {
    radio.addEventListener('change', (e) => {
        togglePcOptions(e.target.value === 'pc');
    });
});

// Keyboard: close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.dataset.hidden === "false") {
        closeDialog();
    }
});

// Form submission (confirm)
playForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Build settings object
    const form = new FormData(playForm);
    const settings = {
        boardSize: form.get('boardSize'),
        opponent: form.get('opponent'),
        // Only include PC options when opponent is pc
        ...(form.get('opponent') === 'pc' ? {
            difficulty: form.get('difficulty'),
            starter: form.get('starter')
        } : {})
    };

    // Example: start game (replace with your actual function)
    console.log('Game settings chosen:', settings);

    // Example callback: if you have a function startGame(settings), call it here:
    // window.startGame && window.startGame(settings);

    closeDialog();
});

// Optional: initialize PC options visibility based on default selected radio
document.addEventListener('DOMContentLoaded', () => {
    const initialPc = Array.from(playForm.opponent).find(r => r.checked)?.value === 'pc';
    togglePcOptions(initialPc);
});