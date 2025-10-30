// startingGameScript.js - Enhanced with game initialization

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
    document.getElementById('boardSize').focus();
}

function closeDialog() {
    overlay.classList.add('hidden');
    overlay.dataset.hidden = "true";
    playBtn.setAttribute('aria-expanded', 'false');
    playBtn.focus();
}

playBtn.addEventListener('click', openDialog);
playBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDialog();
    }
});

cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeDialog();
});

// Show/hide PC options based on opponent selection
document.querySelectorAll('input[name="opponent"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'pc') {
            pcOptions.classList.remove('hidden');
            pcOptions.setAttribute('aria-hidden', 'false');
        } else {
            pcOptions.classList.add('hidden');
            pcOptions.setAttribute('aria-hidden', 'true');
        }
    });
});

function normalizeBoardSize(value) {
    const min = 7;
    const max = 51;
    let n = parseInt(value, 10);
    if (Number.isNaN(n)) n = min;

    if (n < min) n = min;
    if (n > max) n = max;

    if (n % 2 === 0) n = n + 1;

    if (n > max) n = max - (max % 2 === 0 ? 1 : 0);

    return n;
}

playForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const form = new FormData(playForm);
    let boardSize = form.get('boardSize');
    boardSize = normalizeBoardSize(boardSize);

    const settings = {
        boardSize: boardSize,
        opponent: form.get('opponent'),
        ...(form.get('opponent') === 'pc' ? {
            difficulty: form.get('difficulty')
        } : {}),
        starter: form.get('starter')
    };

    console.log('Game settings chosen:', settings);

    closeDialog();
    createBoard(settings.boardSize, settings.starter);

    // Enable roll button
    document.getElementById('roll-dice').disabled = false;
});

function createBoard(columns, starter) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.classList.remove('hidden');

    board.style.gridTemplateRows = `repeat(4, auto)`;
    board.style.gridTemplateColumns = `repeat(${columns}, auto)`;

    // Create cells
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            board.appendChild(cell);
        }
    }

    // Initialize game logic
    if (window.gameLogic) {
        window.gameLogic.initializePieces(columns);
        window.gameLogic.setupCellClickHandlers();

        // Set starter
        let startingPlayer = 'red';
        if (starter === 'pc') {
            startingPlayer = 'blue';
        } else if (starter === 'random') {
            startingPlayer = Math.random() < 0.5 ? 'red' : 'blue';
        }

        window.gameLogic.gameState.currentPlayer = startingPlayer;

        const playerName = startingPlayer === 'red' ? 'Vermelho' : 'Azul';
        updateMessage(`Jogo iniciado! Jogador ${playerName} começa. Role os dados!`);
    }
}

function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}