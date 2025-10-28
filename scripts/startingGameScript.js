// elementos existentes
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

// Valida e normaliza o tamanho vindo do input type="number"
function normalizeBoardSize(value) {
    const min = 7;
    const max = 51;
    let n = parseInt(value, 10);
    if (Number.isNaN(n)) n = min;

    // força dentro do intervalo
    if (n < min) n = min;
    if (n > max) n = max;

    // força ímpar (se for par, soma 1)
    if (n % 2 === 0) n = n + 1;

    // garante que está dentro do max depois de ajustar para ímpar
    if (n > max) n = max - (max % 2 === 0 ? 1 : 0);

    return n;
}

playForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const form = new FormData(playForm);
    // pega o valor diretamente do input (ex: 7, 9, 11...)
    let boardSize = form.get('boardSize');

    // normaliza/valida
    boardSize = normalizeBoardSize(boardSize);

    // Se o seu backend ainda espera o índice antigo (3,4,5...), converta:
    // const boardIndex = Math.floor((boardSize - 1) / 2);

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
    createBoard(settings.boardSize);
});

function createBoard(columns) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.classList.remove('hidden');

    board.style.gridTemplateRows = `repeat(4, auto)`;
    board.style.gridTemplateColumns = `repeat(${columns}, auto)`;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            if (row === 0) cell.classList.add('red');
            if (row === 3) cell.classList.add('blue');

            board.appendChild(cell);
        }
    }
}