// skipButtonScript.js - Fixed skip turn with valid moves check

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

    // NEW: Check if player has any valid moves
    if (hasAnyValidMoves(gameState.currentPlayer, gameState.diceValue)) {
        updateMessageSafe("⚠️ Você ainda tem jogadas possíveis! Você só pode pular a vez se não houver movimentos válidos.");

        // Highlight pieces that can move
        highlightMovablePieces(gameState.currentPlayer, gameState.diceValue);
        return;
    }

    // No valid moves - allow skip
    // Clear any selection
    if (window.clearSelection) {
        clearSelection();
    } else {
        gameState.selectedPiece = null;
        gameState.possibleMoves = [];
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
        });
    }

    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    updateMessageSafe(`Sem jogadas válidas. Jogador ${currentPlayerName} pulou a vez.`);

    // Switch to next player
    setTimeout(() => {
        performTurnSwitch();
    }, 800);
}

/**
 * Check if current player has any valid moves
 */
function hasAnyValidMoves(playerColor, diceValue) {
    const gameState = window.gameLogic.gameState;
    const pieces = gameState.pieces[playerColor];

    // Function references (try multiple ways to access)
    const getValidMovesFunc = window.getValidMoves || (typeof getValidMoves !== 'undefined' ? getValidMoves : null);
    const canActivateFunc = window.canActivatePiece || (typeof canActivatePiece !== 'undefined' ? canActivatePiece : null);

    if (!getValidMovesFunc) {
        console.error('getValidMoves function not available');
        return true; // Assume has moves if function not available (safer)
    }

    // Check each piece
    for (let piece of pieces) {
        // Check activation for inactive pieces with dice value 1
        if (!piece.active && diceValue === 1) {
            if (canActivateFunc && canActivateFunc(piece, playerColor)) {
                return true; // Can activate this piece
            }
        }

        // Check regular moves for active pieces
        if (piece.active) {
            const validMoves = getValidMovesFunc(piece, diceValue, playerColor);
            if (validMoves && validMoves.length > 0) {
                return true; // Has valid moves
            }
        }
    }

    return false; // No valid moves found
}

/**
 * Highlight pieces that can move to help player
 */
function highlightMovablePieces(playerColor, diceValue) {
    const gameState = window.gameLogic.gameState;
    const pieces = gameState.pieces[playerColor];
    const getCellIndexFunc = window.getCellIndex || (typeof getCellIndex !== 'undefined' ? getCellIndex : null);
    const getValidMovesFunc = window.getValidMoves || (typeof getValidMoves !== 'undefined' ? getValidMoves : null);
    const canActivateFunc = window.canActivatePiece || (typeof canActivatePiece !== 'undefined' ? canActivatePiece : null);

    if (!getCellIndexFunc || !getValidMovesFunc) {
        console.error('Required functions not available for highlighting');
        return;
    }

    // Clear previous highlights
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selectable', 'has-moves');
    });

    // Highlight pieces that can move
    pieces.forEach(piece => {
        let canMove = false;

        // Check activation
        if (!piece.active && diceValue === 1 && canActivateFunc) {
            canMove = canActivateFunc(piece, playerColor);
        }

        // Check regular moves
        if (piece.active) {
            const validMoves = getValidMovesFunc(piece, diceValue, playerColor);
            canMove = validMoves && validMoves.length > 0;
        }

        // Highlight if can move
        if (canMove) {
            const cellIndex = getCellIndexFunc(piece.row, piece.col, gameState.boardSize);
            const cell = cells[cellIndex];
            if (cell) {
                cell.classList.add('selectable', 'has-moves');

                // Add pulsing effect
                cell.style.animation = 'pulse-hint 1.5s ease-in-out 3';
            }
        }
    });

    // Add pulse animation style if not exists
    if (!document.getElementById('skip-hint-animation')) {
        const style = document.createElement('style');
        style.id = 'skip-hint-animation';
        style.textContent = `
            @keyframes pulse-hint {
                0%, 100% { 
                    box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7);
                }
                50% { 
                    box-shadow: 0 0 0 10px rgba(255, 215, 0, 0);
                }
            }
            .has-moves {
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.8) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Remove animation after it completes
    setTimeout(() => {
        cells.forEach(cell => {
            cell.style.animation = '';
        });
    }, 4500); // 3 pulses × 1.5s
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
        cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable', 'has-moves');
        cell.style.animation = '';
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
window.hasAnyValidMoves = hasAnyValidMoves;

console.log('Skip button script loaded (with valid moves check)');
