// gameLogicScript.js - Complete Tâb game logic with corrected movement

// Game state
let gameState = {
    boardSize: 7,
    currentPlayer: 'red', // 'red' or 'blue'
    diceValue: 0,
    bonusRoll: false,
    pieces: {
        red: [],
        blue: []
    },
    selectedPiece: null,
    possibleMoves: [],
    gameActive: false,
    piecesActivated: {
        red: false,
        blue: false
    }
};

// Board position mapping (row 0-3, col 0-n)
function getCellIndex(row, col, columns) {
    return row * columns + col;
}

function getRowCol(index, columns) {
    return {
        row: Math.floor(index / columns),
        col: index % columns
    };
}

// Initialize pieces on the board
function initializePieces(boardSize) {
    gameState.boardSize = boardSize;
    gameState.pieces.red = [];
    gameState.pieces.blue = [];

    const cells = document.querySelectorAll('.cell');

    // Clear all cells first
    cells.forEach(cell => {
        cell.innerHTML = '';
        cell.classList.remove('has-piece', 'selectable', 'possible-move', 'capture-move', 'selected');
    });

    // Place red pieces on row 0 (top row)
    for (let col = 0; col < boardSize; col++) {
        const cellIndex = getCellIndex(0, col, boardSize);
        gameState.pieces.red.push({
            row: 0,
            col: col,
            active: false,
            cellIndex: cellIndex,
            inEnemyTerritory: false,
            hasCompletedEnemyTerritory: false
        });
        placePieceOnCell(cellIndex, 'red', false, false);
    }

    // Place blue pieces on row 3 (bottom row)
    for (let col = 0; col < boardSize; col++) {
        const cellIndex = getCellIndex(3, col, boardSize);
        gameState.pieces.blue.push({
            row: 3,
            col: col,
            active: false,
            cellIndex: cellIndex,
            inEnemyTerritory: false,
            hasCompletedEnemyTerritory: false
        });
        placePieceOnCell(cellIndex, 'blue', false, false);
    }

    gameState.gameActive = true;
    updateMessage("Jogo iniciado! Jogador Vermelho começa. Role os dados!");
}

// Place a visual piece on a cell
function placePieceOnCell(cellIndex, color, isActive, hasCompleted) {
    const cells = document.querySelectorAll('.cell');
    const cell = cells[cellIndex];

    if (!cell) return;

    cell.innerHTML = '';
    cell.classList.add('has-piece');

    const piece = document.createElement('div');
    piece.classList.add('piece', `${color}-piece`);

    if (!isActive) {
        piece.classList.add('inactive');
    }

    if (hasCompleted) {
        piece.classList.add('completed');
    }

    cell.appendChild(piece);
}

// Check if player has pieces in their initial row
function hasNoPiecesInInitialRow(playerColor) {
    const initialRow = playerColor === 'red' ? 0 : 3;

    return !gameState.pieces[playerColor].some(piece => piece.row === initialRow);
}

// Check if enemy has pieces in their initial row
function enemyHasPiecesInInitialRow(playerColor) {
    const enemyColor = playerColor === 'red' ? 'blue' : 'red';
    const enemyInitialRow = enemyColor === 'red' ? 0 : 3;

    return gameState.pieces[enemyColor].some(piece => piece.row === enemyInitialRow);
}

// Check if piece is in enemy territory
function isInEnemyTerritory(piece, playerColor) {
    if (playerColor === 'red') {
        return piece.row === 3; // Red's enemy territory is row 3
    } else {
        return piece.row === 0; // Blue's enemy territory is row 0
    }
}

// Check if a position is in enemy territory
function isPositionInEnemyTerritory(row, playerColor) {
    if (playerColor === 'red') {
        return row === 3; // Red's enemy territory is row 3
    } else {
        return row === 0; // Blue's enemy territory is row 0
    }
}

// Check if piece is at the exit point of enemy territory
function isAtEnemyTerritoryExit(piece, playerColor) {
    // Red exits enemy territory at row 3, col 0 (start of row 3)
    if (playerColor === 'red' && piece.row === 3 && piece.col === 0) {
        return true;
    }
    // Blue exits enemy territory at row 0, col 0 (start of row 0)
    if (playerColor === 'blue' && piece.row === 0 && piece.col === 0) {
        return true;
    }
    return false;
}

// Check if piece can move (not frozen in enemy territory)
function canPieceMove(piece, playerColor) {
    // If piece is in enemy territory, check if all allies left initial row
    if (isInEnemyTerritory(piece, playerColor)) {
        return hasNoPiecesInInitialRow(playerColor);
    }

    // Piece is not in enemy territory, can move normally
    return true;
}

// Get valid moves for a piece based on Tâb rules
function getValidMoves(piece, diceValue, playerColor) {
    const moves = [];
    const { row, col } = piece;
    const columns = gameState.boardSize;

    if (!piece.active) return moves; // Inactive pieces can't move

    // Check if piece is frozen in enemy territory
    if (!canPieceMove(piece, playerColor)) {
        return moves; // Return empty array - piece is frozen
    }

    // Calculate possible positions based on movement rules
    if (playerColor === 'blue') {
        moves.push(...getBlueValidMoves(row, col, diceValue, columns));
    } else {
        moves.push(...getRedValidMoves(row, col, diceValue, columns));
    }

    // Filter out moves that land on same team pieces
    const validMoves = moves.filter(move => {
        const pieceAtDestination = findPieceAt(move.row, move.col, playerColor);
        return !pieceAtDestination; // Only allow if no same-team piece
    });

    // Check if piece is already in enemy territory
    const pieceAlreadyInEnemyTerritory = isInEnemyTerritory(piece, playerColor);

    // Filter out moves to enemy territory based on conditions
    const finalMoves = validMoves.filter(move => {
        const moveIsToEnemyTerritory = isPositionInEnemyTerritory(move.row, playerColor);

        // If move is to enemy territory
        if (moveIsToEnemyTerritory) {
            // If piece has already completed enemy territory, CANNOT re-enter
            if (piece.hasCompletedEnemyTerritory) {
                return false; // Block re-entry
            }

            // If piece is already in enemy territory, allow movement within it
            if (pieceAlreadyInEnemyTerritory) {
                return true; // Allow movement within enemy territory
            }
            // If piece is NOT in enemy territory, only allow entry if enemy has pieces there
            else {
                return enemyHasPiecesInInitialRow(playerColor);
            }
        }

        // Move is not to enemy territory - always allow
        return true;
    });

    return finalMoves;
}

// Check if piece can be activated (has valid move after activation)
function canActivatePiece(piece, playerColor) {
    const { row, col } = piece;
    const columns = gameState.boardSize;

    // Temporarily mark as active to check moves
    const tempPiece = { ...piece, active: true };

    // Calculate possible positions for 1 step
    let possibleMoves = [];
    if (playerColor === 'blue') {
        possibleMoves = getBlueValidMoves(row, col, 1, columns);
    } else {
        possibleMoves = getRedValidMoves(row, col, 1, columns);
    }

    // Filter out moves that land on same team pieces
    const validMoves = possibleMoves.filter(move => {
        const pieceAtDestination = findPieceAt(move.row, move.col, playerColor);
        return !pieceAtDestination;
    });

    // Piece in initial row can't be already in enemy territory
    const pieceAlreadyInEnemyTerritory = false;

    // Filter out moves to enemy territory if enemy has no pieces there
    const finalMoves = validMoves.filter(move => {
        const moveIsToEnemyTerritory = isPositionInEnemyTerritory(move.row, playerColor);

        if (moveIsToEnemyTerritory) {
            if (piece.hasCompletedEnemyTerritory) {
                return false;
            }
            if (pieceAlreadyInEnemyTerritory) {
                return true;
            } else {
                return enemyHasPiecesInInitialRow(playerColor);
            }
        }
        return true;
    });

    return finalMoves.length > 0;
}

// Blue piece movement logic - CORRECTED WITH CHOICE AT row 1, col N-1
// Pattern:
// Row 3: >>>>>> (down to row 2)
// Row 2: <<<<<< (down to row 1)
// Row 1: >>>>>> (at col N-1: choice → row 0 OR row 2) ← CHOICE HERE
function getBlueValidMoves(row, col, steps, columns) {
    const moves = [];

    // Generate all possible paths
    const paths = getBlueAllPaths(row, col, steps, columns);

    // Add all unique end positions
    paths.forEach(path => {
        if (path.length > 0) {
            const endPos = path[path.length - 1];
            // Check if this position is not already in moves
            if (!moves.some(m => m.row === endPos.row && m.col === endPos.col)) {
                moves.push(endPos);
            }
        }
    });

    return moves;
}

// Get all possible paths for blue pieces (handles choice at row 1, col N-1)
function getBlueAllPaths(row, col, steps, columns, currentPath = []) {
    if (steps === 0) {
        return [currentPath];
    }

    const allPaths = [];

    // Special case: at junction point (row 1, col N-1)
    if (row === 1 && col === columns - 1) {
        // Option 1: Go UP to row 0, col N-1 (enemy territory)
        const path1 = getBlueAllPaths(0, columns - 1, steps - 1, columns, [...currentPath, { row: 0, col: columns - 1 }]);
        allPaths.push(...path1);

        // Option 2: Go UP to row 2, col N-1 (continue loop)
        const path2 = getBlueAllPaths(2, columns - 1, steps - 1, columns, [...currentPath, { row: 2, col: columns - 1 }]);
        allPaths.push(...path2);

        return allPaths;
    }

    // Normal movement
    const nextPos = getNextBluePosition(row, col, columns);
    if (nextPos) {
        return getBlueAllPaths(nextPos.row, nextPos.col, steps - 1, columns, [...currentPath, nextPos]);
    }

    return [currentPath];
}

// Get next position for blue piece - CORRECTED
function getNextBluePosition(row, col, columns) {
    // Row 3 (initial): LEFT TO RIGHT >>>>>>>
    if (row === 3) {
        if (col < columns - 1) {
            return { row: 3, col: col + 1 }; // Move right
        } else {
            // At end of row 3, move UP to row 2 (rightmost position)
            return { row: 2, col: columns - 1 };
        }
    }

    // Row 2: RIGHT TO LEFT <<<<<<<
    if (row === 2) {
        if (col > 0) {
            return { row: 2, col: col - 1 }; // Move left
        } else {
            // At start of row 2, move DOWN to row 1 (leftmost position)
            return { row: 1, col: 0 };
        }
    }

    // Row 1: LEFT TO RIGHT >>>>>>>
    if (row === 1) {
        if (col < columns - 1) {
            return { row: 1, col: col + 1 }; // Move right
        } else {
            // At end of row 1 (col N-1) - JUNCTION POINT
            // This should be handled by getBlueAllPaths
            return null; // Signal that we're at a choice point
        }
    }

    // Row 0 (enemy territory): RIGHT TO LEFT <<<<<<<
    if (row === 0) {
        if (col > 0) {
            return { row: 0, col: col - 1 }; // Move left in enemy territory
        } else {
            // At start of row 0, move DOWN to row 1 (leftmost position)
            return { row: 1, col: 0 };
        }
    }

    return null;
}

// Red piece movement logic - CORRECTED WITH CHOICE AT row 2, col 0
// Pattern:
// Row 0: <<<<<< (down to row 1)
// Row 1: >>>>>> (down to row 2)
// Row 2: <<<<<< (at col 0: choice → row 1 OR row 3) ← CHOICE HERE
// Row 3: >>>>>> (up to row 2)
function getRedValidMoves(row, col, steps, columns) {
    const moves = [];

    // Generate all possible paths
    const paths = getRedAllPaths(row, col, steps, columns);

    // Add all unique end positions
    paths.forEach(path => {
        if (path.length > 0) {
            const endPos = path[path.length - 1];
            // Check if this position is not already in moves
            if (!moves.some(m => m.row === endPos.row && m.col === endPos.col)) {
                moves.push(endPos);
            }
        }
    });

    return moves;
}

// Get all possible paths for red pieces (handles choice at row 2, col 0)
function getRedAllPaths(row, col, steps, columns, currentPath = []) {
    if (steps === 0) {
        return [currentPath];
    }

    const allPaths = [];

    // Special case: at junction point (row 2, col 0)
    if (row === 2 && col === 0) {
        // Option 1: Go UP to row 1, col 0 (continue loop)
        const path1 = getRedAllPaths(1, 0, steps - 1, columns, [...currentPath, { row: 1, col: 0 }]);
        allPaths.push(...path1);

        // Option 2: Go DOWN to row 3, col 0 (enemy territory)
        const path2 = getRedAllPaths(3, 0, steps - 1, columns, [...currentPath, { row: 3, col: 0 }]);
        allPaths.push(...path2);

        return allPaths;
    }

    // Normal movement
    const nextPos = getNextRedPosition(row, col, columns);
    if (nextPos) {
        return getRedAllPaths(nextPos.row, nextPos.col, steps - 1, columns, [...currentPath, nextPos]);
    }

    return [currentPath];
}

// Get next position for red piece - CORRECTED
function getNextRedPosition(row, col, columns) {
    // Row 0 (initial): RIGHT TO LEFT <<<<<<<
    if (row === 0) {
        if (col > 0) {
            return { row: 0, col: col - 1 }; // Move left
        } else {
            // At start of row 0, move DOWN to row 1 (leftmost position)
            return { row: 1, col: 0 };
        }
    }

    // Row 1: LEFT TO RIGHT >>>>>>>
    if (row === 1) {
        if (col < columns - 1) {
            return { row: 1, col: col + 1 }; // Move right
        } else {
            // At end of row 1, move DOWN to row 2 (rightmost position)
            return { row: 2, col: columns - 1 };
        }
    }

    // Row 2: RIGHT TO LEFT <<<<<<<
    if (row === 2) {
        if (col > 0) {
            return { row: 2, col: col - 1 }; // Move left
        } else {
            // At start of row 2 (col 0) - JUNCTION POINT
            // This should be handled by getRedAllPaths
            return null; // Signal that we're at a choice point
        }
    }

    // Row 3 (enemy territory): LEFT TO RIGHT >>>>>>>
    if (row === 3) {
        if (col < columns - 1) {
            return { row: 3, col: col + 1 }; // Move right in enemy territory
        } else {
            // At end of row 3, move UP to row 2 (rightmost position)
            return { row: 2, col: columns - 1 };
        }
    }

    return null;
}

// Handle piece selection
function handlePieceClick(cellIndex) {
    if (!gameState.gameActive || gameState.diceValue === 0) {
        updateMessage("Role os dados primeiro!");
        return;
    }

    const { row, col } = getRowCol(cellIndex, gameState.boardSize);
    const piece = findPieceAt(row, col, gameState.currentPlayer);

    if (!piece) return;

    // Check if clicking on already selected piece - DESELECT IT
    if (gameState.selectedPiece === piece) {
        clearSelection();
        makeCurrentPlayerPiecesSelectable();
        updateMessage("Peça desmarcada. Escolha outra peça ou pule a vez.");
        return;
    }

    // Handle activation with dice value 1 - ACTIVATE AND MOVE (only if can move)
    if (!piece.active) {
        if (gameState.diceValue === 1) {
            // Check if piece can be activated (has valid moves)
            if (!canActivatePiece(piece, gameState.currentPlayer)) {
                updateMessage("Esta peça não pode ser ativada - está bloqueada e não tem movimentos válidos!");
                return;
            }

            piece.active = true;
            updatePieceDisplay(cellIndex, gameState.currentPlayer, true, piece.hasCompletedEnemyTerritory);

            // Calculate valid moves for 1 step (activation + movement)
            const validMoves = getValidMoves(piece, 1, gameState.currentPlayer);

            // If only one valid move, move automatically
            if (validMoves.length === 1) {
                const move = validMoves[0];

                // Check for capture
                const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
                const enemyPiece = findPieceAt(move.row, move.col, enemyColor);

                if (enemyPiece) {
                    capturePiece(enemyPiece, enemyColor);
                }

                // Move the piece
                movePiece(piece, move.row, move.col);

                // Check win condition
                if (checkWinCondition()) {
                    endGame(gameState.currentPlayer);
                    return;
                }

                updateMessage("Peça ativada e movida 1 casa! Você pode jogar novamente.");
                gameState.diceValue = 0;
                gameState.bonusRoll = false;
                document.querySelector('.dice-total').textContent = 'Resultado: —';
            } else {
                // Multiple valid moves - let player choose
                gameState.selectedPiece = piece;
                highlightSelectedPiece(cellIndex);
                gameState.possibleMoves = validMoves;
                showPossibleMoves(validMoves);

                const cells = document.querySelectorAll('.cell');
                cells[cellIndex].classList.add('selectable');
                updateMessage("Peça ativada! Escolha para onde movê-la (1 casa).");
            }
        } else {
            updateMessage(`Esta peça está bloqueada! Você precisa tirar 1 nos dados para ativar (você tirou ${gameState.diceValue}).`);
        }
        return;
    }

    // Check if piece is frozen in enemy territory
    if (!canPieceMove(piece, gameState.currentPlayer)) {
        updateMessage("Esta peça está em território inimigo e não pode se mover até que todas as suas peças saiam da linha inicial!");
        return;
    }

    // Select piece and show valid moves (for already active pieces)
    gameState.selectedPiece = piece;
    highlightSelectedPiece(cellIndex);

    const validMoves = getValidMoves(piece, gameState.diceValue, gameState.currentPlayer);
    gameState.possibleMoves = validMoves;

    if (validMoves.length === 0) {
        updateMessage("Sem movimentos válidos para esta peça! Escolha outra ou pule a vez.");
        clearSelection();
        makeCurrentPlayerPiecesSelectable();
        return;
    }

    showPossibleMoves(validMoves);
    // Keep the piece selectable even when selected
    const cells = document.querySelectorAll('.cell');
    cells[cellIndex].classList.add('selectable');
    updateMessage(`Peça selecionada! Clique nela novamente para desmarcar ou escolha onde mover.`);
}

// Handle move to a cell
function handleMoveClick(cellIndex) {
    if (!gameState.selectedPiece) return;

    const { row, col } = getRowCol(cellIndex, gameState.boardSize);
    const moveValid = gameState.possibleMoves.some(m => m.row === row && m.col === col);

    if (!moveValid) {
        updateMessage("Movimento inválido!");
        return;
    }

    // Check for capture
    const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    const enemyPiece = findPieceAt(row, col, enemyColor);

    if (enemyPiece) {
        capturePiece(enemyPiece, enemyColor);
    }

    // Move piece
    movePiece(gameState.selectedPiece, row, col);

    // Check win condition
    if (checkWinCondition()) {
        endGame(gameState.currentPlayer);
        return;
    }

    // Check if bonus roll
    if (gameState.bonusRoll) {
        gameState.diceValue = 0;
        gameState.bonusRoll = false;
        document.querySelector('.dice-total').textContent = 'Resultado: —';
        updateMessage("Movimento realizado! Você pode jogar novamente. Role os dados!");
    } else {
        // Switch turns
        switchTurn();
    }
}

// Move a piece to new position
function movePiece(piece, newRow, newCol) {
    const oldCellIndex = getCellIndex(piece.row, piece.col, gameState.boardSize);
    const newCellIndex = getCellIndex(newRow, newCol, gameState.boardSize);

    // Check if piece was in enemy territory and is now leaving it
    const wasInEnemyTerritory = isInEnemyTerritory(piece, gameState.currentPlayer);
    const willBeInEnemyTerritory = isPositionInEnemyTerritory(newRow, gameState.currentPlayer);

    // If leaving enemy territory after being inside, mark as completed
    if (wasInEnemyTerritory && !willBeInEnemyTerritory) {
        piece.hasCompletedEnemyTerritory = true;
    }

    // Clear old cell
    const cells = document.querySelectorAll('.cell');
    cells[oldCellIndex].innerHTML = '';
    cells[oldCellIndex].classList.remove('has-piece');

    // Update piece position
    piece.row = newRow;
    piece.col = newCol;
    piece.cellIndex = newCellIndex;

    // Mark if piece entered enemy territory
    piece.inEnemyTerritory = isInEnemyTerritory(piece, gameState.currentPlayer);

    // Place on new cell with updated visual state
    placePieceOnCell(newCellIndex, gameState.currentPlayer, true, piece.hasCompletedEnemyTerritory);

    clearSelection();
}

// Capture an enemy piece
function capturePiece(piece, color) {
    const index = gameState.pieces[color].indexOf(piece);
    if (index > -1) {
        gameState.pieces[color].splice(index, 1);
        updateMessage(`Peça ${color === 'red' ? 'vermelha' : 'azul'} capturada!`);
    }
}

// Find piece at position
function findPieceAt(row, col, color) {
    return gameState.pieces[color].find(p => p.row === row && p.col === col);
}

// Highlight selected piece
function highlightSelectedPiece(cellIndex) {
    clearHighlights();
    const cells = document.querySelectorAll('.cell');
    cells[cellIndex].classList.add('selected');
}

// Show possible moves
function showPossibleMoves(moves) {
    const cells = document.querySelectorAll('.cell');

    moves.forEach(move => {
        const cellIndex = getCellIndex(move.row, move.col, gameState.boardSize);
        const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
        const hasEnemy = findPieceAt(move.row, move.col, enemyColor);

        if (hasEnemy) {
            cells[cellIndex].classList.add('capture-move');
        } else {
            cells[cellIndex].classList.add('possible-move');
        }
    });
}

// Clear all highlights
function clearHighlights() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('selected', 'possible-move', 'capture-move', 'selectable');
    });
}

// Clear selection
function clearSelection() {
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    clearHighlights();
}

// Update piece display
function updatePieceDisplay(cellIndex, color, isActive, hasCompleted) {
    const cells = document.querySelectorAll('.cell');
    const cell = cells[cellIndex];

    // Remove old piece
    cell.innerHTML = '';

    // Create new piece with updated state
    const piece = document.createElement('div');
    piece.classList.add('piece', `${color}-piece`);

    if (!isActive) {
        piece.classList.add('inactive');
    }

    if (hasCompleted) {
        piece.classList.add('completed');
    }

    cell.appendChild(piece);
}

// Switch turn to other player
function switchTurn() {
    gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    gameState.diceValue = 0;
    gameState.bonusRoll = false;
    clearSelection();

    document.querySelector('.dice-total').textContent = 'Resultado: —';
    updateMessage(`Turno do jogador ${gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul'}. Role os dados!`);
}

// Skip turn function
function skipTurn() {
    if (!gameState.gameActive) {
        updateMessage("Inicie um jogo primeiro!");
        return;
    }

    if (gameState.diceValue === 0) {
        updateMessage("Você precisa rolar os dados antes de pular a vez!");
        return;
    }

    clearSelection();
    const currentPlayerName = gameState.currentPlayer === 'red' ? 'Vermelho' : 'Azul';
    updateMessage(`Jogador ${currentPlayerName} pulou a vez.`);

    // Switch to next player
    setTimeout(() => {
        switchTurn();
    }, 1000);
}

// Check win condition
function checkWinCondition() {
    const enemyColor = gameState.currentPlayer === 'red' ? 'blue' : 'red';
    return gameState.pieces[enemyColor].length === 0;
}

// End game
function endGame(winner) {
    gameState.gameActive = false;
    clearHighlights();

    const winnerName = winner === 'red' ? 'Vermelho' : 'Azul';
    updateMessage(`🎉 Jogador ${winnerName} venceu! Parabéns!`);

    const messageBox = document.querySelector('.message-box');
    messageBox.classList.add('game-over');

    document.getElementById('roll-dice').disabled = true;
}

// Update message
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Make pieces selectable for current player
function makeCurrentPlayerPiecesSelectable() {
    if (!gameState.gameActive || gameState.diceValue === 0) return;

    clearHighlights();

    gameState.pieces[gameState.currentPlayer].forEach(piece => {
        const cellIndex = getCellIndex(piece.row, piece.col, gameState.boardSize);
        const cells = document.querySelectorAll('.cell');
        cells[cellIndex].classList.add('selectable');
    });
}

// Setup cell click handlers
function setupCellClickHandlers() {
    const cells = document.querySelectorAll('.cell');

    cells.forEach((cell, index) => {
        cell.addEventListener('click', () => {
            // Always check if it's a piece of current player first
            const { row, col } = getRowCol(index, gameState.boardSize);
            const currentPlayerPiece = findPieceAt(row, col, gameState.currentPlayer);

            if (currentPlayerPiece && gameState.diceValue > 0) {
                // It's a piece from current player - handle selection/deselection
                handlePieceClick(index);
            } else if (cell.classList.contains('possible-move') || cell.classList.contains('capture-move')) {
                // It's a valid move destination
                handleMoveClick(index);
            }
        });
    });
}

// Add this at the END of your gameLogicScript.js file
// This exports necessary functions for other scripts to use

// Make these functions globally accessible
window.clearSelection = clearSelection;
window.clearHighlights = clearHighlights;
window.switchTurn = switchTurn;
window.getCellIndex = getCellIndex;
window.getRowCol = getRowCol;
window.findPieceAt = findPieceAt;
window.movePiece = movePiece;
window.capturePiece = capturePiece;
window.checkWinCondition = checkWinCondition;
window.endGame = endGame;
window.updatePieceDisplay = updatePieceDisplay;
window.highlightSelectedPiece = highlightSelectedPiece;
window.showPossibleMoves = showPossibleMoves;
window.canActivatePiece = canActivatePiece;
window.isInEnemyTerritory = isInEnemyTerritory;
window.isPositionInEnemyTerritory = isPositionInEnemyTerritory;
window.enemyHasPiecesInInitialRow = enemyHasPiecesInInitialRow;
window.hasNoPiecesInInitialRow = hasNoPiecesInInitialRow;
window.getValidMoves = getValidMoves;

// Keep the existing export
window.gameLogic = {
    initializePieces,
    makeCurrentPlayerPiecesSelectable,
    setupCellClickHandlers,
    skipTurn,
    gameState
};

console.log('Game logic functions exported globally');
