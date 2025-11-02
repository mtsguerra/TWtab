// rollScript.js - Enhanced dice rolling with single roll per turn restriction

const lightSide = "media/lightSide.png";
const darkSide = "media/darkSide.png";

document.addEventListener("DOMContentLoaded", () => {
    const rollButton = document.getElementById("roll-dice");
    const diceImagesContainer = document.querySelector(".dice-images");
    const diceTotal = document.querySelector(".dice-total");

    // Initially disable roll button
    rollButton.disabled = true;

    rollButton.addEventListener("click", () => {
        if (!window.gameLogic || !window.gameLogic.gameState.gameActive) {
            updateMessage("Inicie um jogo primeiro!");
            return;
        }

        // NOVA VALIDAÇÃO: Impedir rolar novamente se já tiver um valor de dado não usado
        if (window.gameLogic.gameState.diceValue > 0 && !window.gameLogic.gameState.diceUsed) {
            updateMessage(`⚠️ Você já rolou os dados (${window.gameLogic.gameState.diceValue} passos)! Use este valor ou pule a vez.`);
            return;
        }

        diceImagesContainer.innerHTML = "";
        let lightSides = 0;

        // Animate dice rolling
        rollButton.disabled = true;
        diceImagesContainer.style.opacity = '0.5';

        setTimeout(() => {
            // Generate 4 random dice
            for (let i = 0; i < 4; i++) {
                const isLight = Math.random() < 0.5;
                const img = document.createElement("img");
                img.src = isLight ? lightSide : darkSide;
                img.style.animation = 'spin 0.5s ease-out';
                diceImagesContainer.appendChild(img);
                if (isLight) lightSides++;
            }

            diceImagesContainer.style.opacity = '1';

            // Calculate steps and bonus roll based on light sides
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

            // Update result display
            let resultText = `Resultado: ${steps} passo${steps !== 1 ? 's' : ''}`;
            if (bonusRoll) {
                resultText += " 🎲 (Jogue novamente!)";
            }
            diceTotal.textContent = resultText;

            // Update game state
            if (window.gameLogic) {
                window.gameLogic.gameState.diceValue = steps;
                window.gameLogic.gameState.bonusRoll = bonusRoll;
                window.gameLogic.gameState.diceUsed = false; // NOVO: Marcar que o dado ainda não foi usado

                updateMessage(`Você tirou ${steps} passo${steps !== 1 ? 's' : ''}! ${bonusRoll ? 'Pode jogar novamente após mover.' : 'Selecione uma peça para mover.'}`);
                window.gameLogic.makeCurrentPlayerPiecesSelectable();

                // NOVO: Desabilitar botão de rolar até que o valor seja usado
                rollButton.disabled = true;
                rollButton.title = "Você deve usar o valor dos dados antes de rolar novamente";
            }
        }, 300);
    });
});

// NOVA FUNÇÃO: Habilitar o botão de rolar dados (chamada após usar o valor)
function enableRollButton() {
    const rollButton = document.getElementById("roll-dice");
    if (rollButton && window.gameLogic && window.gameLogic.gameState.gameActive) {
        rollButton.disabled = false;
        rollButton.title = "Jogar Dados";
    }
}

// NOVA FUNÇÃO: Desabilitar o botão de rolar dados
function disableRollButton(reason) {
    const rollButton = document.getElementById("roll-dice");
    if (rollButton) {
        rollButton.disabled = true;
        rollButton.title = reason || "Aguarde sua vez";
    }
}

// Helper function to update message
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Exportar funções globalmente
window.enableRollButton = enableRollButton;
window.disableRollButton = disableRollButton;

// Add spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg) scale(0.5); }
        to { transform: rotate(360deg) scale(1); }
    }
`;
document.head.appendChild(style);