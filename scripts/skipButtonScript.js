// skipTurnScript.js - Handle skip turn functionality

document.addEventListener('DOMContentLoaded', () => {
    const skipButton = document.getElementById('skip-button');

    if (skipButton) {
        skipButton.addEventListener('click', () => {
            if (window.gameLogic && window.gameLogic.skipTurn) {
                window.gameLogic.skipTurn();
            } else {
                console.error('Game logic not loaded');
            }
        });

        // Also handle keyboard interaction
        skipButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (window.gameLogic && window.gameLogic.skipTurn) {
                    window.gameLogic.skipTurn();
                }
            }
        });
    }
});