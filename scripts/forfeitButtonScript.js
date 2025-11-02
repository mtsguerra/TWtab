// forfeitButtonScript.js - Módulo de processamento de desistência/rendição

document.addEventListener('DOMContentLoaded', () => {
    const forfeitButton = document.getElementById('forfeit-button');

    if (!forfeitButton) {
        console.error('Forfeit button not found');
        return;
    }

    // Handler principal de clique
    forfeitButton.addEventListener('click', handleForfeit);

    // Suporte a teclado
    forfeitButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleForfeit();
        }
    });
});

function handleForfeit() {
    // Verifica se jogo está ativo
    if (!window.gameLogic || !window.gameLogic.gameState.gameActive) {
        updateMessageSafe("Não há jogo ativo para desistir!");
        return;
    }

    const gameState = window.gameLogic.gameState;

    // Previne desistência durante processamento da AI
    if (window.AI_PLAYER && window.AI_PLAYER.isProcessing) {
        updateMessageSafe("Aguarde a IA terminar sua jogada!");
        return;
    }

    // Confirmação via diálogo nativo
    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    const confirmMessage = `Tem certeza que deseja desistir?\n\nJogador ${currentPlayerName} perderá o jogo.`;

    if (!confirm(confirmMessage)) {
        updateMessageSafe("Desistência cancelada. Continue jogando!");
        return;
    }

    // Determina vencedor (oposto ao jogador atual)
    const winner = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    const loser = gameState.currentPlayer;

    const loserName = loser === 'red' ? 'Vermelho' : 'Azul';
    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';

    updateMessageSafe(`Jogador ${loserName} desistiu! Jogador ${winnerName} vence por desistência!`);

    // Delay antes de finalizar jogo
    setTimeout(() => {
        endGameByForfeit(winner, loser);
    }, 500);
}

function endGameByForfeit(winner, loser) {
    const gameState = window.gameLogic.gameState;

    // Marca jogo como inativo
    gameState.gameActive = false;

    // Limpa seleções e destaques
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

    // Interrompe processamento da AI se ativo
    if (window.AI_PLAYER) {
        window.AI_PLAYER.isProcessing = false;
    }

    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';
    const loserName = loser === 'red' ? 'Vermelho' : 'Azul';

    // Atualiza mensagem com informação de desistência
    updateMessageSafe(`🏳️ Jogo terminado por desistência!\n\nJogador ${loserName} desistiu.\nJogador ${winnerName} VENCEU! 🎉`);

    // Adiciona classe de finalização
    const messageBox = document.querySelector('.message-box');
    if (messageBox) {
        messageBox.classList.add('game-over');
    }

    // Desabilita botão de lançamento
    const rollButton = document.getElementById('roll-dice');
    if (rollButton) {
        rollButton.disabled = true;
    }

    // Desabilita botão de pular
    const skipButton = document.getElementById('skip-button');
    if (skipButton) {
        skipButton.style.opacity = '0.5';
        skipButton.style.pointerEvents = 'none';
    }

    // Desabilita botão de desistência
    const forfeitButton = document.getElementById('forfeit-button');
    if (forfeitButton) {
        forfeitButton.style.opacity = '0.5';
        forfeitButton.style.pointerEvents = 'none';
    }

    // Adiciona efeitos visuais de desistência
    addForfeitVisualEffects(winner, loser);

    // Exibe prompt para novo jogo após delay
    setTimeout(() => {
        showPlayAgainPrompt(winnerName, loserName);
    }, 2000);
}

function addForfeitVisualEffects(winner, loser) {
    // Atenua peças do perdedor
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const piece = cell.querySelector(`.${loser}-piece`);
        if (piece) {
            piece.style.opacity = '0.3';
            piece.style.filter = 'grayscale(100%)';
        }
    });

    // Destaca peças do vencedor
    cells.forEach(cell => {
        const piece = cell.querySelector(`.${winner}-piece`);
        if (piece) {
            piece.style.animation = 'pulse 1s ease-in-out infinite';
        }
    });

    // Adiciona animação pulse se não existir
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
    // Tenta usar updateMessage global se disponível
    if (window.updateMessage && typeof window.updateMessage === 'function') {
        window.updateMessage(text);
        return;
    }

    // Fallback para manipulação direta do DOM
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        // Substitui \n por <br> para exibição HTML
        messageElement.innerHTML = text.replace(/\n/g, '<br>');
    } else {
        console.warn('Message element not found:', text);
    }
}

// Exporta funções para acesso global
window.handleForfeit = handleForfeit;
window.endGameByForfeit = endGameByForfeit;

console.log('Forfeit button script loaded');