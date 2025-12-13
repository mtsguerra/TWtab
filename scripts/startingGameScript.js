// startingGameScript.js - Sistema de inicialização de jogo com suporte a AI

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

// Exibe/oculta opções baseado na seleção de oponente
const onlineOptions = document.getElementById('onlineOptions');
document.querySelectorAll('input[name="opponent"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'pc') {
            pcOptions.classList.remove('hidden');
            pcOptions.setAttribute('aria-hidden', 'false');
            onlineOptions.classList.add('hidden');
            onlineOptions.setAttribute('aria-hidden', 'true');
        } else if (e.target.value === 'online') {
            pcOptions.classList.add('hidden');
            pcOptions.setAttribute('aria-hidden', 'true');
            onlineOptions.classList.remove('hidden');
            onlineOptions.setAttribute('aria-hidden', 'false');
        } else {
            pcOptions.classList.add('hidden');
            pcOptions.setAttribute('aria-hidden', 'true');
            onlineOptions.classList.add('hidden');
            onlineOptions.setAttribute('aria-hidden', 'true');
        }
    });
});

// Exibe/oculta campo de ID da sala baseado no modo online
const gameModeSelect = document.getElementById('gameMode');
const roomIdField = document.getElementById('roomIdField');
if (gameModeSelect) {
    gameModeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'join') {
            roomIdField.classList.remove('hidden');
        } else {
            roomIdField.classList.add('hidden');
        }
    });
}

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

playForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = new FormData(playForm);
    let boardSize = form.get('boardSize');
    boardSize = normalizeBoardSize(boardSize);

    const opponent = form.get('opponent');
    const settings = {
        boardSize: boardSize,
        opponent: opponent,
        playerColor: form.get('playerColor') || 'blue',
        ...(opponent === 'pc' ? {
            difficulty: form.get('difficulty')
        } : {}),
        ...(opponent === 'online' ? {
            gameMode: form.get('gameMode'),
            roomId: form.get('roomId')
        } : {}),
        starter: form.get('starter')
    };

    console.log('Game settings chosen:', settings);

    // Se for jogo online, configura conexão primeiro
    if (opponent === 'online') {
        try {
            const isHost = settings.gameMode === 'create';
            const roomId = isHost ? null : settings.roomId;

            if (!isHost && !roomId) {
                alert('Por favor, digite o ID da sala para entrar.');
                return;
            }

            // Mostra status de conexão
            updateMessage('Conectando ao jogo online...');

            // Inicializa conexão
            const result = await window.onlineGameManager.initializePeerConnection(isHost, roomId);

            // Se for host, mostra o ID da sala
            if (result.isHost && result.roomId !== 'LOCAL_GAME') {
                updateMessage(`Sala criada! ID: ${result.roomId}\nCompartilhe este ID com outro jogador.`);
            }

            closeDialog();
            createBoard(settings.boardSize, settings.starter, settings.opponent, settings.difficulty, settings.playerColor);
            document.getElementById('roll-dice').disabled = false;

        } catch (error) {
            console.error('Erro ao conectar:', error);
            alert('Erro ao conectar ao jogo online. Tente novamente.');
        }
    } else {
        closeDialog();
        createBoard(settings.boardSize, settings.starter, settings.opponent, settings.difficulty, settings.playerColor);
        document.getElementById('roll-dice').disabled = false;
    }
});

function createBoard(columns, starter, opponent, difficulty, playerColor = 'blue') {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.classList.remove('hidden');

    board.style.gridTemplateRows = `repeat(4, auto)`;
    board.style.gridTemplateColumns = `repeat(${columns}, auto)`;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            board.appendChild(cell);
        }
    }

    if (window.gameLogic) {
        window.gameLogic.initializePieces(columns);
        window.gameLogic.setupCellClickHandlers();

        const isAIGame = opponent === 'pc';
        const isOnlineGame = opponent === 'online';

        // NOVA LÓGICA: Define quem é o jogador humano e quem é a IA
        const humanColor = playerColor; // Cor escolhida pelo jogador
        const aiColor = humanColor === 'red' ? 'blue' : 'red'; // IA pega a cor oposta

        // Define jogador inicial
        let startingPlayer = 'red';
        if (starter === 'pc') {
            startingPlayer = aiColor; // IA começa
        } else if (starter === 'player') {
            startingPlayer = humanColor; // Jogador começa
        } else if (starter === 'random') {
            startingPlayer = Math.random() < 0.5 ? 'red' : 'blue';
        }

        window.gameLogic.gameState.currentPlayer = startingPlayer;

        // MODIFICADO: Passa informação de cor do jogador humano
        if (isAIGame) {
            if (window.initAIGame) {
                // Define qual cor a IA controla
                if (window.AI_PLAYER) {
                    window.AI_PLAYER.color = aiColor; // IMPORTANTE: IA recebe cor oposta
                }

                window.initAIGame(difficulty || 'medium');

                const humanName = humanColor === 'red' ? 'Vermelho' : 'Azul';
                const aiName = aiColor === 'red' ? 'Vermelho' : 'Azul';
                const starterName = startingPlayer === humanColor ? 'Você' : `IA (${aiName})`;

                updateMessage(`Jogo contra IA iniciado! Você é ${humanName}. ${starterName} começa. ${startingPlayer === humanColor ? 'Role os dados!' : 'A IA vai jogar...'}`);
            } else {
                console.error('AI integration not loaded');
                updateMessage('Erro ao carregar IA. Jogando como Humano vs Humano.');
            }
        } else if (isOnlineGame) {
            // Desabilita IA se estiver habilitada
            if (window.disableAIGame) {
                window.disableAIGame();
            }

            // Configura jogo online
            if (window.onlineGameManager && window.onlineGameManager.connected) {
                const playerName = startingPlayer === 'red' ? 'Vermelho' : 'Azul';
                updateMessage(`Jogo online iniciado! Jogador ${playerName} começa. Role os dados!`);
            } else {
                // Fallback para modo local se a conexão falhou
                const playerName = startingPlayer === 'red' ? 'Vermelho' : 'Azul';
                updateMessage(`Jogo local iniciado! Jogador ${playerName} começa. Role os dados!`);
            }
        } else {
            if (window.disableAIGame) {
                window.disableAIGame();
            }

            const playerName = startingPlayer === 'red' ? 'Vermelho' : 'Azul';
            updateMessage(`Jogo iniciado! Jogador ${playerName} começa. Role os dados!`);
        }
    }
}

function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}