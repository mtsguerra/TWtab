// Game state management
let gameState = {
    boardSize: 7,
    currentPlayer: 'red', // 'red' or 'blue'
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

// Initialize game when board is created
function initializeGame(boardSize, starter) {
    gameState.boardSize = boardSize;
    gameState.currentPlayer = starter === 'player' ? 'red' : starter === 'pc' ? 'blue' : (Math.random() < 0.5 ? 'red' : 'blue');
    gameState.diceRoll = 0;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    gameState.repeatTurn = false;
    gameState.gameActive = true;

    // Initialize pieces positions
    gameState.pieces.red = [];
    gameState.pieces.blue = [];

    // Red pieces start at row 0, LEFT TO RIGHT
    for (let col = 0; col < boardSize; col++) {
        gameState.pieces.red.push({
            row: 0,
            col: col,
            id: `red-${col}`,
            activated: false,
            hasBeenInEnemyRow: false,
            order: col // Order: 0 (leftmost) to size-1 (rightmost)
        });
    }

    // Blue pieces start at row 3, RIGHT TO LEFT
    for (let col = 0; col < boardSize; col++) {
        gameState.pieces.blue.push({
            row: 3,
            col: boardSize - 1 - col, // Place from right to left
            id: `blue-${col}`,
            activated: false,
            hasBeenInEnemyRow: false,
            order: col // Order: 0 (rightmost) to size-1 (leftmost)
        });
    }

    renderBoard();
    updateMessage(`Jogo iniciado! ${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'} começa. Lance os dados!`);
}

// Check if a position has a piece
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

// Check if player has any pieces on starting row
function hasStartingRowPieces(color) {
    const startRow = color === 'red' ? 0 : 3;
    const pieces = gameState.pieces[color];
    return pieces.some(p => p.row === startRow);
}

// Check if there are enemy pieces on their starting row
function hasEnemyPiecesOnTheirStartRow(color) {
    const enemyColor = color === 'red' ? 'blue' : 'red';
    const enemyStartRow = enemyColor === 'red' ? 0 : 3;
    const enemyPieces = gameState.pieces[enemyColor];
    return enemyPieces.some(p => p.row === enemyStartRow);
}

// Check if piece can move (must wait for pieces in front)
function canPieceMove(piece, color) {
    const startRow = color === 'red' ? 0 : 3;
    const pieces = gameState.pieces[color];

    // If piece is activated, it can move freely
    if (piece.activated) {
        return true;
    }

    // If piece is still on starting row, check order
    if (piece.row === startRow) {
        // Check if all pieces with lower order have already moved
        for (let p of pieces) {
            if (p.order < piece.order && p.row === startRow) {
                // There's a piece in front that hasn't moved yet
                return false;
            }
        }
        return true;
    }

    return true;
}

// Calculate all possible moves for a piece (must move exactly N steps)
function calculatePossibleMoves(piece, color, steps) {
    const moves = [];
    const size = gameState.boardSize;
    const startRow = color === 'red' ? 0 : 3;
    const enemyStartRow = color === 'red' ? 3 : 0;

    // Check if this piece can move (order restriction)
    if (!canPieceMove(piece, color)) {
        return [];
    }

    // If piece is not activated
    if (!piece.activated) {
        if (steps !== 1) {
            return [];
        }

        // Can only leave starting row from the END of it
        // RED: must be at rightmost position (col = size - 1)
        // BLUE: must be at leftmost position (col = 0)
        const canLeave = color === 'red'
            ? piece.col === size - 1
            : piece.col === 0;

        if (!canLeave) {
            return [];
        }

        // Exit to their second row
        // RED exits from row 0 to row 1 at rightmost
        // BLUE exits from row 3 to row 2 at leftmost
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
        return moves;
    }

    // If piece is in enemy's starting row, can only move if no pieces on our starting row
    if (piece.row === enemyStartRow && hasStartingRowPieces(color)) {
        return [];
    }

    function isValidPosition(row, col) {
        return row >= 0 && row <= 3 && col >= 0 && col < size;
    }

    // Calculate exact position after moving N steps
    let targetRow = piece.row;
    let targetCol = piece.col;
    let remainingSteps = steps;
    let pathBlocked = false;

    // Simulate movement step by step
    while (remainingSteps > 0 && !pathBlocked) {
        let moved = false;

        if (color === 'red') {
            // RED movement pattern:
            // Row 0 (start): L→R, exits at right to Row 1
            // Row 1 (second): R→L, exits at left to Row 2
            // Row 2 (third): L→R, exits at right to Row 3 OR Row 1
            // Row 3 (enemy): R→L, exits at left to Row 2

            if (targetRow === 0) {
                // Starting row: Left to Right
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    // End of row, exit to second row
                    targetRow = 1;
                    targetCol = size - 1;
                    moved = true;
                }
            } else if (targetRow === 1) {
                // Second row: Right to Left
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    // End of row, must go to third row
                    targetRow = 2;
                    targetCol = 0;
                    moved = true;
                }
            } else if (targetRow === 2) {
                // Third row: Left to Right
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    // End of row - can enter enemy row if conditions met
                    if (hasEnemyPiecesOnTheirStartRow(color) && !piece.hasBeenInEnemyRow) {
                        targetRow = 3;
                        targetCol = size - 1;
                        moved = true;
                    } else {
                        // Loop back to second row
                        targetRow = 1;
                        targetCol = size - 1;
                        moved = true;
                    }
                }
            } else if (targetRow === 3) {
                // Enemy row: Right to Left
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    // Exit enemy row, must return to third row
                    targetRow = 2;
                    targetCol = 0;
                    moved = true;
                }
            }
        } else { // BLUE
            // BLUE movement pattern:
            // Row 3 (start): L→R, exits at left to Row 2
            // Row 2 (second): L→R, exits at right to Row 1
            // Row 1 (third): R→L, exits at left to Row 0 OR Row 2
            // Row 0 (enemy): L→R, exits at right to Row 1

            if (targetRow === 3) {
                // Starting row: Left to Right
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    // End of row, exit to second row
                    targetRow = 2;
                    targetCol = 0;
                    moved = true;
                }
            } else if (targetRow === 2) {
                // Second row: Left to Right
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    // End of row, must go to third row
                    targetRow = 1;
                    targetCol = size - 1;
                    moved = true;
                }
            } else if (targetRow === 1) {
                // Third row: Right to Left
                if (targetCol - 1 >= 0) {
                    targetCol--;
                    moved = true;
                } else {
                    // End of row - can enter enemy row if conditions met
                    if (hasEnemyPiecesOnTheirStartRow(color) && !piece.hasBeenInEnemyRow) {
                        targetRow = 0;
                        targetCol = 0;
                        moved = true;
                    } else {
                        // Loop back to second row
                        targetRow = 2;
                        targetCol = 0;
                        moved = true;
                    }
                }
            } else if (targetRow === 0) {
                // Enemy row: Left to Right
                if (targetCol + 1 < size) {
                    targetCol++;
                    moved = true;
                } else {
                    // Exit enemy row, must return to third row
                    targetRow = 1;
                    targetCol = size - 1;
                    moved = true;
                }
            }
        }

        if (!moved) {
            pathBlocked = true;
            break;
        }

        remainingSteps--;

        // Check if path is blocked by own piece (except at final destination)
        if (remainingSteps > 0) {
            const occupant = getPieceAt(targetRow, targetCol);
            if (occupant && occupant.color === color) {
                pathBlocked = true;
                break;
            }
        }
    }

    // If we completed all steps and didn't hit our own piece
    if (remainingSteps === 0 && !pathBlocked && isValidPosition(targetRow, targetCol)) {
        // Check final position
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

// Move piece to specific position
function movePieceTo(piece, color, targetRow, targetCol, activates) {
    const enemyStartRow = color === 'red' ? 3 : 0;
    const wasInEnemyRow = piece.row === enemyStartRow;

    // Check for capture
    const targetPiece = getPieceAt(targetRow, targetCol);
    if (targetPiece && targetPiece.color !== color) {
        const enemyPieces = gameState.pieces[targetPiece.color];
        const index = enemyPieces.indexOf(targetPiece.piece);
        if (index > -1) {
            enemyPieces.splice(index, 1);
            updateMessage(`${color === 'red' ? 'Vermelho' : 'Azul'} capturou uma peça ${targetPiece.color === 'red' ? 'vermelha' : 'azul'}!`);
        }
    }

    // Move the piece
    piece.row = targetRow;
    piece.col = targetCol;

    // Activate piece if this is an activation move
    if (activates) {
        piece.activated = true;
    }

    // Mark if entering enemy row
    if (targetRow === enemyStartRow) {
        piece.hasBeenInEnemyRow = true;
    }

    // If leaving enemy row, mark that it's been there
    if (wasInEnemyRow && targetRow !== enemyStartRow) {
        piece.hasBeenInEnemyRow = true;
    }

    return true;
}

// Render the board
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
            if (move.canCapture) {
                cell.classList.add('capture-move');
            } else {
                cell.classList.add('possible-move');
            }
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
            if (!piece.activated) {
                pieceDiv.classList.add('inactive');
            }
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
            if (!piece.activated) {
                pieceDiv.classList.add('inactive');
            }
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
                updateMessage('Esta peça precisa de um 1 para sair da linha inicial!');
            } else if (!clickedPiece.piece.activated) {
                if (!canPieceMove(clickedPiece.piece, clickedPiece.color)) {
                    updateMessage('Aguarde as peças da frente se moverem primeiro!');
                } else {
                    const isAtEnd = clickedPiece.color === 'red'
                        ? clickedPiece.piece.col === gameState.boardSize - 1
                        : clickedPiece.piece.col === 0;
                    if (!isAtEnd) {
                        updateMessage('Apenas peças no fim da linha inicial podem sair!');
                    } else {
                        updateMessage('Caminho bloqueado!');
                    }
                }
            } else {
                updateMessage('Esta peça não pode mover exatamente ' + gameState.diceRoll + ' casas!');
            }
            return;
        }

        gameState.selectedPiece = clickedPiece.piece;
        gameState.possibleMoves = moves;
        updateMessage(`Peça selecionada! Clique no espaço destacado para mover ${gameState.diceRoll} casas.`);
        renderBoard();
        return;
    }

    if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
        const moves = calculatePossibleMoves(clickedPiece.piece, clickedPiece.color, gameState.diceRoll);

        if (moves.length === 0) {
            updateMessage('Esta peça não pode mover exatamente ' + gameState.diceRoll + ' casas!');
            return;
        }

        gameState.selectedPiece = clickedPiece.piece;
        gameState.possibleMoves = moves;
        updateMessage(`Peça alterada! Clique no espaço destacado para mover ${gameState.diceRoll} casas.`);
        renderBoard();
        return;
    }

    const validMove = gameState.possibleMoves.find(m => m.row === row && m.col === col);

    if (!validMove) {
        updateMessage('Movimento inválido!');
        return;
    }

    const currentColor = gameState.currentPlayer;
    if (movePieceTo(gameState.selectedPiece, currentColor, row, col, validMove.activates)) {
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

            // Apply correct dice rules
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