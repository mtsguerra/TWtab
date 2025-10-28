// Substitua esses caminhos pelas suas imagens reais
const lightSide = "media/lightSide.png";
const darkSide = "media/darkSide.png";

document.addEventListener("DOMContentLoaded", () => {
    const rollButton = document.getElementById("roll-dice");
    const diceImagesContainer = document.querySelector(".dice-images");
    const diceTotal = document.querySelector(".dice-total");

    rollButton.addEventListener("click", () => {
        diceImagesContainer.innerHTML = ""; // limpa antes de jogar
        let brancos = 0;

        // gerar 4 imagens aleatórias
        for (let i = 0; i < 4; i++) {
            const isBranco = Math.random() < 0.5; // 50% chance
            const img = document.createElement("img");
            img.src = isBranco ? lightSide : darkSide;
            diceImagesContainer.appendChild(img);
            if (isBranco) brancos++;
        }

        // atualizar o resultado final
        diceTotal.textContent = `Resultado: ${brancos}`;
    });
});
