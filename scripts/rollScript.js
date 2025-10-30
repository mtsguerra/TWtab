// rollScript.js - Enhanced dice rolling with game integration

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

                updateMessage(`Você tirou ${steps} passo${steps !== 1 ? 's' : ''}! ${bonusRoll ? 'Pode jogar novamente após mover.' : 'Selecione uma peça para mover.'}`);
                window.gameLogic.makeCurrentPlayerPiecesSelectable();
            }

            rollButton.disabled = false;
        }, 300);
    });
});

// Helper function to update message
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Helper function to switch turn
function switchTurn() {
    if (window.gameLogic && window.gameLogic.gameState.gameActive) {
        const currentPlayer = window.gameLogic.gameState.currentPlayer;
        window.gameLogic.gameState.currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
        window.gameLogic.gameState.diceValue = 0;
        window.gameLogic.gameState.bonusRoll = false;

        const diceTotal = document.querySelector('.dice-total');
        diceTotal.textContent = 'Resultado: —';

        const newPlayer = window.gameLogic.gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
        updateMessage(`Turno do jogador ${newPlayer}. Role os dados!`);
    }
}

// Add spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg) scale(0.5); }
        to { transform: rotate(360deg) scale(1); }
    }
`;
document.head.appendChild(style);