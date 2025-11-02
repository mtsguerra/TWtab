// forfeitButtonScript.js - Handle forfeit/surrender functionality

document.addEventListener('DOMContentLoaded', () => {
    const forfeitButton = document.getElementById('forfeit-button');

    if (!forfeitButton) {
        console.error('Forfeit button not found');
        return;
    }

    // Main click handler
    forfeitButton.addEventListener('click', handleForfeit);

    // Keyboard support
    forfeitButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleForfeit();
        }
    });
});

function handleForfeit() {
    // Check if game is active
    if (!window.gameLogic || !window.gameLogic.gameState.gameActive) {
        updateMessageSafe("Não há jogo ativo para desistir!");
        return;
    }

    const gameState = window.gameLogic.gameState;

    // Check if it's AI's turn (prevent forfeit during AI processing)
    if (window.AI_PLAYER && window.AI_PLAYER.isProcessing) {
        updateMessageSafe("Aguarde a IA terminar sua jogada!");
        return;
    }

    // Confirm forfeit with native dialog
    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    const confirmMessage = `Tem certeza que deseja desistir?\n\nJogador ${currentPlayerName} perderá o jogo.`;

    if (!confirm(confirmMessage)) {
        updateMessageSafe("Desistência cancelada. Continue jogando!");
        return;
    }

    // Determine winner (opposite of current player)
    const winner = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    const loser = gameState.currentPlayer;

    const loserName = loser === 'red' ? 'Vermelho' : 'Azul';
    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';

    updateMessageSafe(`Jogador ${loserName} desistiu! Jogador ${winnerName} vence por desistência!`);

    // Small delay before ending game
    setTimeout(() => {
        endGameByForfeit(winner, loser);
    }, 500);
}

function endGameByForfeit(winner, loser) {
    const gameState = window.gameLogic.gameState;

    // Mark game as inactive
    gameState.gameActive = false;

    // Clear any selections and highlights
    if (window.clearSelection) {
        window.clearSelection();
    } else {
        gameState.selectedPiece = null;
        gameState.possibleMoves = [];
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
        });
    }

    // Stop AI if it's processing
    if (window.AI_PLAYER) {
        window.AI_PLAYER.isProcessing = false;
    }

    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';
    const loserName = loser === 'red' ? 'Vermelho' : 'Azul';

    // Update message with forfeit info
    updateMessageSafe(`🏳️ Jogo terminado por desistência!\n\nJogador ${loserName} desistiu.\nJogador ${winnerName} VENCEU! 🎉`);

    // Add game-over styling
    const messageBox = document.querySelector('.message-box');
    if (messageBox) {
        messageBox.classList.add('game-over');
    }

    // Disable roll button
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        rollButton.disabled = true;
    }

    // Disable skip button
    const skipButton = document.getElementById('skip-button');
    if (skipButton) {
        skipButton.style.opacity = '0.5';
        skipButton.style.pointerEvents = 'none';
    }

    // Disable forfeit button
    const forfeitButton = document.getElementById('forfeit-button');
    if (forfeitButton) {
        forfeitButton.style.opacity = '0.5';
        forfeitButton.style.pointerEvents = 'none';
    }

    // Add visual indication on board
    addForfeitVisualEffects(winner, loser);

    // Show play again prompt after delay
    setTimeout(() => {
        showPlayAgainPrompt(winnerName, loserName);
    }, 2000);
}

function addForfeitVisualEffects(winner, loser) {
    // Dim loser's pieces
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const piece = cell.querySelector(`.${loser}-piece`);
        if (piece) {
            piece.style.opacity = '0.3';
            piece.style.filter = 'grayscale(100%)';
        }
    });

    // Highlight winner's pieces
    cells.forEach(cell => {
        const piece = cell.querySelector(`.${winner}-piece`);
        if (piece) {
            piece.style.animation = 'pulse 1s ease-in-out infinite';
        }
    });

    // Add pulse animation if not exists
    if (!document.getElementById('forfeit-animation-style')) {
        const style = document.createElement('style');
        style.id = 'forfeit-animation-style';
        style.textContent = `
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }
}

function showPlayAgainPrompt(winnerName, loserName) {
    const message = document.querySelector('.message p');
    if (message) {
        message.innerHTML = `
            🏳️ <strong>Jogo terminado por desistência!</strong><br><br>
            Jogador ${loserName} desistiu.<br>
            Jogador <strong>${winnerName}</strong> VENCEU! 🎉<br><br>
            <small>Clique em "Jogar" para iniciar um novo jogo.</small>
        `;
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
        // Replace \n with <br> for HTML display
        messageElement.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        console.warn('Message element not found:', text);
    }
}

// Make functions globally accessible
window.handleForfeit = handleForfeit;
window.endGameByForfeit = endGameByForfeit;

console.log('Forfeit button script loaded');
