// skipButtonScript.js - Fixed skip turn functionality

document.addEventListener('DOMContentLoaded', () => {
    const skipButton = document.getElementById('skip-button');

    if (!skipButton) {
        console.error('Skip button not found');
        return;
    }

    // Main click handler
    skipButton.addEventListener('click', handleSkipTurn);

    // Keyboard support
    skipButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSkipTurn();
        }
    });
});

function handleSkipTurn() {
    // Check if game is active
    if (!window.gameLogic || !window.gameLogic.gameState.gameActive) {
        updateMessageSafe("Inicie um jogo primeiro!");
        return;
    }

    const gameState = window.gameLogic.gameState;

    // Check if dice has been rolled
    if (gameState.diceValue === 0) {
        updateMessageSafe("Você precisa rolar os dados antes de pular a vez!");
        return;
    }

    // Check if it's AI's turn (should not allow skip during AI turn)
    if (window.isAIGameActive && window.isAIGameActive() && gameState.currentPlayer === 'red') {
        updateMessageSafe("Aguarde a vez da IA!");
        return;
    }

    // Clear any selection
    if (window.gameLogic && typeof clearSelection === 'function') {
        clearSelection();
    } else {
        // Manual clear if function not available
        gameState.selectedPiece = null;
        gameState.possibleMoves = [];
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
        });
    }

    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    updateMessageSafe(`Jogador ${currentPlayerName} pulou a vez.`);

    // Switch to next player
    setTimeout(() => {
        performTurnSwitch();
    }, 800);
}

function performTurnSwitch() {
    const gameState = window.gameLogic.gameState;

    // Switch player
    gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    gameState.diceValue = 0;
    gameState.bonusRoll = false;

    // Clear selection again
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];

    // Clear highlights
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
    });

    // Update dice display
    const diceTotal = document.querySelector('.dice-total');
    if (diceTotal) {
        diceTotal.textContent = 'Resultado: —';
    }

    // Update message
    const newPlayer = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';

    // Check if new turn is AI's turn
    if (window.isAIGameActive && window.isAIGameActive() && gameState.currentPlayer === 'red') {
        updateMessageSafe(`Turno da IA (${newPlayer}). Aguarde...`);
        // Trigger AI turn
        if (window.AI_PLAYER) {
            setTimeout(() => {
                window.AI_PLAYER.checkAndPlay();
            }, 800);
        }
    } else {
        updateMessageSafe(`Turno do jogador ${newPlayer}. Role os dados!`);
    }
}

function updateMessageSafe(text) {
    // Try to use global updateMessage if available
    if (window.updateMessage && typeof window.updateMessage === 'function') {
        window.updateMessage(text);
        return;
    }

    // Fallback to direct DOM manipulation
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    } else {
        console.warn('Message element not found:', text);
    }
}

// Make functions globally accessible
window.handleSkipTurn = handleSkipTurn;

console.log('Skip button script loaded');
