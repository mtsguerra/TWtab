// rollScript.js - Sistema de lançamento de dados com restrição de lançamento único por turno

const lightSide = "media/lightSide.png";
const darkSide = "media/darkSide.png";

document.addEventListener("DOMContentLoaded", () => {
    const rollButton = document.getElementById("roll-dice");
    const diceImagesContainer = document.querySelector(".dice-images");
    const diceTotal = document.querySelector(".dice-total");

    // Desabilita botão de lançamento inicialmente
    rollButton.disabled = true;

    rollButton.addEventListener("click", async () => {
        if (! window.gameLogic || !window.gameLogic.gameState. gameActive) {
            updateMessage("Inicie um jogo primeiro!");
            return;
        }

        // MODO ONLINE
        if (window.OnlineGame && window.OnlineGame.isOnlineMode()) {
            const state = window.OnlineGame.getOnlineState();

            if (! state.myTurn) {
                updateMessage("Aguarde sua vez!");
                return;
            }

            rollButton.disabled = true;
            const result = await window.OnlineGame.rollDice(state.myNick, state.myPassword, state.gameId);

            if (! result.success) {
                alert(`Erro ao lançar dados: ${result.error}`);
                rollButton.disabled = false;
            }

            // O resultado será processado via UPDATE (SSE)
            return;
        }

        // MODO LOCAL (código original)
        if (window.gameLogic. gameState. diceValue > 0 && ! window.gameLogic.gameState. diceUsed) {
            updateMessage(`⚠️ Você já rolou os dados (${window.gameLogic.gameState.diceValue} passos)! Use este valor ou pule a vez.`);
            return;
        }

        diceImagesContainer.innerHTML = "";
        let lightSides = 0;

        rollButton.disabled = true;
        diceImagesContainer.style.opacity = '0.5';

        setTimeout(() => {
            for (let i = 0; i < 4; i++) {
                const isLight = Math.random() < 0.5;
                const img = document.createElement("img");
                img.src = isLight ? lightSide : darkSide;
                img.style.animation = 'spin 0.5s ease-out';
                diceImagesContainer.appendChild(img);
                if (isLight) lightSides++;
            }

            diceImagesContainer.style.opacity = '1';

            let steps = 0;
            let bonusRoll = false;

            switch(lightSides) {
                case 0:
                    steps = 6;
                    bonusRoll = true;
                    break;
                case 1:
                    steps = 1;
                    bonusRoll = true;
                    break;
                case 2:
                    steps = 2;
                    bonusRoll = false;
                    break;
                case 3:
                    steps = 3;
                    bonusRoll = false;
                    break;
                case 4:
                    steps = 4;
                    bonusRoll = true;
                    break;
            }

            let resultText = `Resultado: ${steps} passo${steps !== 1 ? 's' :  ''}`;
            if (bonusRoll) {
                resultText += " 🎲 (Jogue novamente!)";
            }
            diceTotal.textContent = resultText;

            if (window.gameLogic) {
                window.gameLogic.gameState.diceValue = steps;
                window.gameLogic.gameState.bonusRoll = bonusRoll;
                window.gameLogic.gameState.diceUsed = false;

                updateMessage(`Você tirou ${steps} passo${steps !== 1 ?  's' : ''}! ${bonusRoll ? 'Pode jogar novamente após mover.' : 'Selecione uma peça para mover.'}`);
                window.gameLogic.makeCurrentPlayerPiecesSelectable();

                rollButton.disabled = true;
                rollButton.title = "Você deve usar o valor dos dados antes de rolar novamente";
            }
        }, 300);
    });
});

// Função para habilitar botão de lançamento (chamada após uso do valor)
function enableRollButton() {
    const rollButton = document.getElementById("roll-dice");
    if (rollButton && window.gameLogic && window.gameLogic.gameState.gameActive) {
        rollButton.disabled = false;
        rollButton.title = "Jogar Dados";
    }
}

// Função para desabilitar botão de lançamento
function disableRollButton(reason) {
    const rollButton = document.getElementById("roll-dice");
    if (rollButton) {
        rollButton.disabled = true;
        rollButton.title = reason || "Aguarde sua vez";
    }
}

// Função auxiliar para atualização de mensagem
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Exporta funções globalmente
window.enableRollButton = enableRollButton;
window.disableRollButton = disableRollButton;

// Adiciona animação de rotação
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg) scale(0.5); }
        to { transform: rotate(360deg) scale(1); }
    }
`;
document.head.appendChild(style);