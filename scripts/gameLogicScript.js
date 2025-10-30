// Game state management
let gameState = {
    boardSize: 7,
    currentPlayer: 'red',
    diceRoll: 0,
    selectedPiece: null,
    possibleMoves: [],
    repeatTurn: false,
    pieces: {
        red: [],
        blue: []
    },
    gameActive: false
};

// Initialize game
function initializeGame(boardSize, starter) {
    gameState.boardSize = boardSize;
    gameState.currentPlayer = starter === 'player' ? 'red' : starter === 'pc' ? 'blue' : (Math.random() < 0.5 ? 'red' : 'blue');
    gameState.diceRoll = 0;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    gameState.repeatTurn = false;
    gameState.gameActive = true;

    gameState.pieces.red = [];
    gameState.pieces.blue = [];

    // Red pieces: row 0, columns 0 to size-1 (left to right)
    // Exit order: right to left (rightmost exits first)
    for (let col = 0; col < boardSize; col++) {
        gameState.pieces.red.push({
            row: 0,
            col: col,
            id: `red-${col}`,
            activated: false,
            hasBeenInEnemyRow: false,
            exitOrder: boardSize - 1 - col // rightmost = 0, leftmost = size-1
        });
    }

    // Blue pieces: row 3, columns 0 to size-1 (left to right)
    // Exit order: left to right (leftmost exits first)
    for (let col = 0; col < boardSize; col++) {
        gameState.pieces.blue.push({
            row: 3,
            col: col,
            id: `blue-${col}`,
            activated: false,
            hasBeenInEnemyRow: false,
            exitOrder: col // leftmost = 0, rightmost = size-1
        });
    }

    renderBoard();
    updateMessage(`Jogo iniciado! ${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'} começa. Lance os dados!`);
}

// Get piece at position
function getPieceAt(row, col) {
    for (let piece of gameState.pieces.red) {
        if (piece.row === row && piece.col === col) {
            return { piece, color: 'red' };
        }
    }
    for (let piece of gameState.pieces.blue) {
        if (piece.row === row && piece.col === col) {
            return { piece, color: 'blue' };
        }
    }
    return null;
}

// Check if player has pieces on starting row
function hasStartingRowPieces(color) {
    const startRow = color === 'red' ? 0 : 3;
    return gameState.pieces[color].some(p => p.row === startRow);
}

// Check if enemy has pieces on their starting row
function hasEnemyPiecesOnTheirStartRow(color) {
    const enemyColor = color === 'red' ? 'blue' : 'red';
    const enemyStartRow = enemyColor === 'red' ? 0 : 3;
    return gameState.pieces[enemyColor].some(p => p.row === enemyStartRow);
}

// Check if piece can move (exit order on starting row)
function canPieceMove(piece, color) {
    const startRow = color === 'red' ? 0 : 3;

    if (piece.activated) return true;
    if (piece.row !== startRow) return true;

    // Check if all pieces with lower exit order have already moved
    const pieces = gameState.pieces[color];
    for (let p of pieces) {
        if (p.exitOrder < piece.exitOrder && p.row === startRow) {
            return false;
        }
    }
    return true;
}

// Calculate possible moves
function calculatePossibleMoves(piece, color, steps) {
    const moves = [];
    const size = gameState.boardSize;
    const startRow = color === 'red' ? 0 : 3;
    const enemyStartRow = color === 'red' ? 3 : 0;

    if (!canPieceMove(piece, color)) {
        return [];
    }

    // Inactive piece needs a 1 to activate
    if (!piece.activated) {
        if (steps !== 1) return [];

        // Check if at exit position
        const isAtExit = color === 'red'
            ? piece.col === size - 1  // Red exits from rightmost
            : piece.col === 0;         // Blue exits from leftmost

        if (isAtExit) {
            // Exit to second row
            const nextRow = color === 'red' ? 1 : 2;
            const nextCol = color === 'red' ? size - 1 : 0;
            const occupant = getPieceAt(nextRow, nextCol);

            if (!occupant || occupant.color !== color) {
                moves.push({
                    row: nextRow,
                    col: nextCol,
                    canCapture: occupant && occupant.color !== color,
                    activates: true
                });
            }
        } else {
            // Activate in place
            moves.push({
                row: piece.row,
                col: piece.col,
                canCapture: false,
                activates: true
            });
        }
        return moves;
    }

    // Can't move from enemy row if we have pieces on our starting row
    if (piece.row === enemyStartRow && hasStartingRowPieces(color)) {
        return [];
    }

    // Simulate exact movement
    let targetRow = piece.row;
    let targetCol = piece.col;
    let remainingSteps = steps;

    while (remainingSteps > 0) {
        let moved = false;

        if (color === 'red') {
            // RED MOVEMENT:
            // Row 0: L→R, exit right to Row 1
            // Row 1: R→L, exit left to Row 2
            // Row 2: L→R, exit right to Row 3 or back to Row 1
            // Row 3: R→L, exit left to Row 2

            if (targetRow === 0) {
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    targetRow = 1;
                    targetCol = size - 1;
                    moved = true;
                }
            } else if (targetRow === 1) {
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    targetRow = 2;
                    targetCol = 0;
                    moved = true;
                }
            } else if (targetRow === 2) {
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    // End of row 2
                    if (hasEnemyPiecesOnTheirStartRow(color) && !piece.hasBeenInEnemyRow) {
                        targetRow = 3;
                        targetCol = size - 1;
                        moved = true;
                    } else {
                        targetRow = 1;
                        targetCol = size - 1;
                        moved = true;
                    }
                }
            } else if (targetRow === 3) {
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    targetRow = 2;
                    targetCol = 0;
                    moved = true;
                }
            }
        } else { // BLUE
            // BLUE MOVEMENT:
            // Row 3: R→L, exit left to Row 2
            // Row 2: L→R, exit right to Row 1
            // Row 1: R→L, exit left to Row 0 or back to Row 2
            // Row 0: L→R, exit right to Row 1

            if (targetRow === 3) {
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    targetRow = 2;
                    targetCol = 0;
                    moved = true;
                }
            } else if (targetRow === 2) {
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    targetRow = 1;
                    targetCol = size - 1;
                    moved = true;
                }
            } else if (targetRow === 1) {
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    // End of row 1
                    if (hasEnemyPiecesOnTheirStartRow(color) && !piece.hasBeenInEnemyRow) {
                        targetRow = 0;
                        targetCol = 0;
                        moved = true;
                    } else {
                        targetRow = 2;
                        targetCol = 0;
                        moved = true;
                    }
                }
            } else if (targetRow === 0) {
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    targetRow = 1;
                    targetCol = size - 1;
                    moved = true;
                }
            }
        }

        if (!moved) break;

        remainingSteps--;

        // Check for blocking by own piece (not at final destination)
        if (remainingSteps > 0) {
            const occupant = getPieceAt(targetRow, targetCol);
            if (occupant && occupant.color === color) {
                return [];
            }
        }
    }

    // Valid move if we used all steps
    if (remainingSteps === 0) {
        if (targetRow !== piece.row || targetCol !== piece.col) {
            const occupant = getPieceAt(targetRow, targetCol);
            if (!occupant || occupant.color !== color) {
                moves.push({
                    row: targetRow,
                    col: targetCol,
                    canCapture: occupant && occupant.color !== color
                });
            }
        }
    }

    return moves;
}

// Move piece
function movePieceTo(piece, color, targetRow, targetCol, activates) {
    const enemyStartRow = color === 'red' ? 3 : 0;

    // Capture
    const targetPiece = getPieceAt(targetRow, targetCol);
    if (targetPiece && targetPiece.color !== color) {
        const enemyPieces = gameState.pieces[targetPiece.color];
        const index = enemyPieces.indexOf(targetPiece.piece);
        if (index > -1) {
            enemyPieces.splice(index, 1);
            updateMessage(`${color === 'red' ? 'Vermelho' : 'Azul'} capturou uma peça!`);
        }
    }

    piece.row = targetRow;
    piece.col = targetCol;

    if (activates) {
        piece.activated = true;
    }

    if (targetRow === enemyStartRow) {
        piece.hasBeenInEnemyRow = true;
    }

    return true;
}

// Render board
function renderBoard() {
    const board = document.getElementById('game-board');
    const cells = board.querySelectorAll('.cell');

    cells.forEach(cell => {
        cell.classList.remove('has-piece', 'selectable', 'selected', 'possible-move', 'capture-move', 'inactive-piece');
        cell.innerHTML = '';
        cell.style.cursor = 'default';
    });

    // Highlight possible moves
    for (let move of gameState.possibleMoves) {
        const index = move.row * gameState.boardSize + move.col;
        const cell = cells[index];
        if (cell) {
            cell.classList.add(move.canCapture ? 'capture-move' : 'possible-move');
            cell.style.cursor = 'pointer';
        }
    }

    // Place red pieces
    for (let piece of gameState.pieces.red) {
        const index = piece.row * gameState.boardSize + piece.col;
        const cell = cells[index];
        if (cell) {
            cell.classList.add('has-piece');
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'piece red-piece';
            if (!piece.activated) pieceDiv.classList.add('inactive');
            cell.appendChild(pieceDiv);

            if (gameState.currentPlayer === 'red' && gameState.diceRoll > 0 && !gameState.selectedPiece) {
                const moves = calculatePossibleMoves(piece, 'red', gameState.diceRoll);
                if (moves.length > 0) {
                    cell.classList.add('selectable');
                    cell.style.cursor = 'pointer';
                } else {
                    cell.classList.add('inactive-piece');
                }
            }
        }
    }

    // Place blue pieces
    for (let piece of gameState.pieces.blue) {
        const index = piece.row * gameState.boardSize + piece.col;
        const cell = cells[index];
        if (cell) {
            cell.classList.add('has-piece');
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'piece blue-piece';
            if (!piece.activated) pieceDiv.classList.add('inactive');
            cell.appendChild(pieceDiv);

            if (gameState.currentPlayer === 'blue' && gameState.diceRoll > 0 && !gameState.selectedPiece) {
                const moves = calculatePossibleMoves(piece, 'blue', gameState.diceRoll);
                if (moves.length > 0) {
                    cell.classList.add('selectable');
                    cell.style.cursor = 'pointer';
                } else {
                    cell.classList.add('inactive-piece');
                }
            }
        }
    }

    if (gameState.selectedPiece) {
        const index = gameState.selectedPiece.row * gameState.boardSize + gameState.selectedPiece.col;
        cells[index]?.classList.add('selected');
    }

    checkGameOver();
}

// Handle cell clicks
function handleCellClick(row, col) {
    if (!gameState.gameActive) {
        updateMessage('Inicie um novo jogo primeiro!');
        return;
    }

    if (gameState.diceRoll === 0) {
        updateMessage('Lance os dados primeiro!');
        return;
    }

    const clickedPiece = getPieceAt(row, col);

    if (!gameState.selectedPiece) {
        if (!clickedPiece || clickedPiece.color !== gameState.currentPlayer) {
            updateMessage('Selecione uma de suas peças!');
            return;
        }

        const moves = calculatePossibleMoves(clickedPiece.piece, clickedPiece.color, gameState.diceRoll);

        if (moves.length === 0) {
            if (!clickedPiece.piece.activated && gameState.diceRoll !== 1) {
                updateMessage('Esta peça precisa de um 1 para ativar!');
            } else if (!clickedPiece.piece.activated) {
                if (!canPieceMove(clickedPiece.piece, clickedPiece.color)) {
                    updateMessage('Aguarde as peças da frente saírem primeiro!');
                } else {
                    updateMessage('Caminho bloqueado!');
                }
            } else {
                updateMessage('Esta peça não pode mover exatamente ' + gameState.diceRoll + ' casas!');
            }
            return;
        }

        gameState.selectedPiece = clickedPiece.piece;
        gameState.possibleMoves = moves;
        updateMessage(`Peça selecionada! Clique no destino para mover ${gameState.diceRoll} casas.`);
        renderBoard();
        return;
    }

    if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
        const moves = calculatePossibleMoves(clickedPiece.piece, clickedPiece.color, gameState.diceRoll);

        if (moves.length === 0) {
            updateMessage('Esta peça não pode mover!');
            return;
        }

        gameState.selectedPiece = clickedPiece.piece;
        gameState.possibleMoves = moves;
        updateMessage(`Peça alterada! Clique no destino para mover ${gameState.diceRoll} casas.`);
        renderBoard();
        return;
    }

    const validMove = gameState.possibleMoves.find(m => m.row === row && m.col === col);

    if (!validMove) {
        updateMessage('Movimento inválido!');
        return;
    }

    if (movePieceTo(gameState.selectedPiece, gameState.currentPlayer, row, col, validMove.activates)) {
        gameState.selectedPiece = null;
        gameState.possibleMoves = [];

        if (!gameState.repeatTurn) {
            gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'blue' : 'red';
        }

        gameState.diceRoll = 0;
        gameState.repeatTurn = false;

        renderBoard();
        updateMessage(`Turno de ${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'}. Lance os dados!`);
    }
}

function checkGameOver() {
    if (gameState.pieces.red.length === 0) {
        updateMessage('🎉 Azul venceu!');
        gameState.gameActive = false;
    } else if (gameState.pieces.blue.length === 0) {
        updateMessage('🎉 Vermelho venceu!');
        gameState.gameActive = false;
    }
}

function updateMessage(text) {
    const msgElement = document.querySelector('.message p');
    if (msgElement) {
        msgElement.textContent = text;
    }
}

window.createBoard = function(columns, settings) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    board.classList.remove('hidden');
    board.style.gridTemplateRows = `repeat(4, auto)`;
    board.style.gridTemplateColumns = `repeat(${columns}, auto)`;

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < columns; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.addEventListener('click', () => handleCellClick(parseInt(row), parseInt(col)));
            board.appendChild(cell);
        }
    }

    const starter = settings?.starter || 'player';
    initializeGame(columns, starter);
};

document.addEventListener("DOMContentLoaded", () => {
    const skipButton = document.getElementById("skip-button");
    if (skipButton) {
        skipButton.addEventListener("click", () => {
            if (!gameState.gameActive) return;
            gameState.diceRoll = 0;
            gameState.selectedPiece = null;
            gameState.possibleMoves = [];
            gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'blue' : 'red';
            updateMessage(`Turno de ${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'}.`);
            renderBoard();
        });
    }

    const forfeitButton = document.getElementById("forfeit-button");
    if (forfeitButton) {
        forfeitButton.addEventListener("click", () => {
            if (!gameState.gameActive) return;
            const winner = gameState.currentPlayer === 'red' ? 'Azul' : 'Vermelho';
            updateMessage(`${winner} venceu por desistência!`);
            gameState.gameActive = false;
            renderBoard();
        });
    }

    const rollButton = document.getElementById("roll-dice");
    if (rollButton) {
        const newRollButton = rollButton.cloneNode(true);
        rollButton.parentNode.replaceChild(newRollButton, rollButton);

        newRollButton.addEventListener("click", () => {
            if (!gameState.gameActive) {
                updateMessage('Inicie um novo jogo!');
                return;
            }

            if (gameState.diceRoll > 0) {
                updateMessage('Você já lançou! Mova uma peça.');
                return;
            }

            const diceImagesContainer = document.querySelector(".dice-images");
            const diceTotal = document.querySelector(".dice-total");

            diceImagesContainer.innerHTML = "";
            let brancos = 0;

            for (let i = 0; i < 4; i++) {
                const isBranco = Math.random() < 0.5;
                const img = document.createElement("img");
                img.src = isBranco ? "media/lightSide.png" : "media/darkSide.png";
                diceImagesContainer.appendChild(img);
                if (isBranco) brancos++;
            }

            let steps, repeat;
            if (brancos === 0) {
                steps = 6;
                repeat = true;
            } else if (brancos === 1) {
                steps = 1;
                repeat = true;
            } else if (brancos === 2) {
                steps = 2;
                repeat = false;
            } else if (brancos === 3) {
                steps = 3;
                repeat = false;
            } else if (brancos === 4) {
                steps = 4;
                repeat = true;
            }

            gameState.diceRoll = steps;
            gameState.repeatTurn = repeat;
            diceTotal.textContent = `Resultado: ${steps}${repeat ? ' (Joga de novo!)' : ''}`;

            updateMessage(`${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'} tirou ${steps}! Selecione uma peça.`);
            renderBoard();
        });
    }
});