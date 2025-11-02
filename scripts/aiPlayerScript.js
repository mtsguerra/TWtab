// aiPlayerScript.js - AI opponent for Tâb game with 3 difficulty levels

/**
 * AI Player for Tâb Game
 * Implements three difficulty levels:
 * - Easy: Random valid moves
 * - Medium: Mix of random and strategic moves (70% strategic, 30% random)
 * - Hard: Always chooses the best possible move
 */

const AI_PLAYER = {
    color: 'red', // AI plays as red (top player)
    difficulty: 'medium', // default difficulty
    isProcessing: false,
    thinkingDelay: 800, // milliseconds to simulate "thinking"

    /**
     * Main AI turn handler
     */
    async takeTurn() {
        if (this.isProcessing) return;
        if (!window.gameLogic || !window.gameLogic.gameState.gameActive) return;
        if (window.gameLogic.gameState.currentPlayer !== this.color) return;

        this.isProcessing = true;

        try {
            // Wait for dice roll if needed
            if (window.gameLogic.gameState.diceValue === 0) {
                await this.rollDice();
            }

            // Wait for thinking animation
            await this.simulateThinking();

            // Make the move
            await this.makeMove();

        } catch (error) {
            console.error('AI Error:', error);
            this.isProcessing = false;
        }
    },

    /**
     * Roll dice for AI
     */
    async rollDice() {
        return new Promise((resolve) => {
            updateMessage('IA está jogando os dados...');
            setTimeout(() => {
                const rollButton = document.getElementById('roll-dice');
                if (rollButton && !rollButton.disabled) {
                    rollButton.click();
                    setTimeout(resolve, 500); // Wait for dice animation
                } else {
                    resolve();
                }
            }, 400);
        });
    },

    /**
     * Simulate AI thinking
     */
    async simulateThinking() {
        return new Promise((resolve) => {
            const messages = [
                'IA está analisando o tabuleiro...',
                'IA está calculando a melhor jogada...',
                'IA está pensando...'
            ];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            updateMessage(randomMessage);
            setTimeout(resolve, this.thinkingDelay);
        });
    },

    /**
     * Make a move based on difficulty level
     */
    async makeMove() {
        const gameState = window.gameLogic.gameState;
        const diceValue = gameState.diceValue;

        if (diceValue === 0) {
            this.isProcessing = false;
            return;
        }

        // Get all possible moves for all AI pieces
        const allPossibleMoves = this.getAllPossibleMoves();

        console.log(`AI: Dice value = ${diceValue}, Found ${allPossibleMoves.length} possible moves`);

        // Debug: Show details of moves found
        if (allPossibleMoves.length > 0) {
            console.log('AI: Available moves:', allPossibleMoves.map(m => ({
                from: `(${m.piece.row},${m.piece.col})`,
                to: `(${m.destination.row},${m.destination.col})`,
                isActivation: m.isActivation,
                pieceActive: m.piece.active
            })));
        } else {
            // Debug: Check why no moves found
            const pieces = gameState.pieces[this.color];
            console.log('AI: Debug info:');
            console.log('- Total pieces:', pieces.length);
            console.log('- Active pieces:', pieces.filter(p => p.active).length);
            console.log('- Inactive pieces:', pieces.filter(p => !p.active).length);

            if (diceValue === 1) {
                console.log('- Dice is 1, checking activation...');
                pieces.filter(p => !p.active).forEach((piece, i) => {
                    const canActivate = window.canActivatePiece ?
                        window.canActivatePiece(piece, this.color) :
                        (typeof canActivatePiece !== 'undefined' ? canActivatePiece(piece, this.color) : false);
                    console.log(`  Piece ${i} at (${piece.row},${piece.col}): canActivate=${canActivate}`);
                });
            }
        }

        if (allPossibleMoves.length === 0) {
            // No valid moves - skip turn
            updateMessage('IA não tem jogadas válidas. Pulando a vez...');
            setTimeout(() => {
                if (window.gameLogic && window.gameLogic.skipTurn) {
                    window.gameLogic.skipTurn();
                } else if (window.handleSkipTurn) {
                    window.handleSkipTurn();
                } else {
                    console.error('Skip turn function not available');
                }
                this.isProcessing = false;
            }, 1000);
            return;
        }

        // Choose move based on difficulty
        let chosenMove;
        switch (this.difficulty) {
            case 'easy':
                chosenMove = this.chooseRandomMove(allPossibleMoves);
                break;
            case 'medium':
                chosenMove = this.chooseMediumMove(allPossibleMoves);
                break;
            case 'hard':
                chosenMove = this.chooseBestMove(allPossibleMoves);
                break;
            default:
                chosenMove = this.chooseRandomMove(allPossibleMoves);
        }

        console.log('AI: Chosen move:', {
            from: `(${chosenMove.piece.row},${chosenMove.piece.col})`,
            to: `(${chosenMove.destination.row},${chosenMove.destination.col})`,
            isActivation: chosenMove.isActivation
        });

        // Execute the chosen move
        await this.executeMove(chosenMove);
    },

    /**
     * Get all possible moves for all AI pieces
     */
    getAllPossibleMoves() {
        const gameState = window.gameLogic.gameState;
        const pieces = gameState.pieces[this.color];
        const diceValue = gameState.diceValue;
        const allMoves = [];

        pieces.forEach(piece => {
            // Check for activation (dice value 1 on inactive piece)
            if (!piece.active && diceValue === 1) {
                // For activation, we need to check if piece can move after being activated
                // Temporarily create an activated version to check moves
                const tempPiece = { ...piece, active: true };

                // Check if piece can move after activation using window function
                let canActivate = false;
                if (window.canActivatePiece) {
                    canActivate = window.canActivatePiece(piece, this.color);
                } else if (typeof canActivatePiece === 'function') {
                    canActivate = canActivatePiece(piece, this.color);
                }

                if (canActivate) {
                    // Get valid moves after activation
                    let activationMoves = [];
                    if (window.getValidMoves) {
                        activationMoves = window.getValidMoves(tempPiece, 1, this.color);
                    } else if (typeof getValidMoves === 'function') {
                        activationMoves = getValidMoves(tempPiece, 1, this.color);
                    }

                    activationMoves.forEach(move => {
                        allMoves.push({
                            piece: piece,
                            destination: move,
                            isActivation: true
                        });
                    });
                }
            } else if (piece.active) {
                // Get valid moves for active pieces
                let validMoves = [];
                if (window.getValidMoves) {
                    validMoves = window.getValidMoves(piece, diceValue, this.color);
                } else if (typeof getValidMoves === 'function') {
                    validMoves = getValidMoves(piece, diceValue, this.color);
                }

                validMoves.forEach(move => {
                    allMoves.push({
                        piece: piece,
                        destination: move,
                        isActivation: false
                    });
                });
            }
        });

        return allMoves;
    },

    /**
     * EASY: Choose a random move
     */
    chooseRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    },

    /**
     * MEDIUM: Mix of strategic and random (70% strategic, 30% random)
     */
    chooseMediumMove(moves) {
        if (Math.random() < 0.3) {
            // 30% chance: random move
            return this.chooseRandomMove(moves);
        } else {
            // 70% chance: strategic move
            return this.chooseBestMove(moves);
        }
    },

    /**
     * HARD: Choose the best move using evaluation heuristics
     */
    chooseBestMove(moves) {
        let bestMove = moves[0];
        let bestScore = -Infinity;

        moves.forEach(move => {
            const score = this.evaluateMove(move);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        });

        return bestMove;
    },

    /**
     * Evaluate a move and return a score
     * Higher score = better move
     */
    evaluateMove(move) {
        let score = 0;
        const { piece, destination, isActivation } = move;
        const gameState = window.gameLogic.gameState;

        // 1. CAPTURE PRIORITY (highest priority)
        const enemyPiece = findPieceAt(destination.row, destination.col, 'blue');
        if (enemyPiece) {
            score += 1000; // Very high priority for captures

            // Bonus for capturing pieces in enemy territory
            if (isInEnemyTerritory(enemyPiece, 'blue')) {
                score += 200;
            }
        }

        // 2. ACTIVATION PRIORITY
        if (isActivation) {
            score += 500; // High priority to activate pieces
        }

        // 3. FORWARD PROGRESS
        // Reward moving pieces forward in their path
        const progressScore = this.calculateProgressScore(piece, destination);
        score += progressScore;

        // 4. ENTERING ENEMY TERRITORY
        if (isPositionInEnemyTerritory(destination.row, this.color)) {
            // Only enter if enemy has pieces there (rule compliance)
            if (enemyHasPiecesInInitialRow(this.color)) {
                score += 300;
            }
        }

        // 5. LEAVING ENEMY TERRITORY
        const wasInEnemyTerritory = isInEnemyTerritory(piece, this.color);
        const willBeInEnemyTerritory = isPositionInEnemyTerritory(destination.row, this.color);
        if (wasInEnemyTerritory && !willBeInEnemyTerritory) {
            score += 150; // Bonus for completing enemy territory
        }

        // 6. AVOID STACKING (slight penalty)
        const friendlyPiece = findPieceAt(destination.row, destination.col, this.color);
        if (friendlyPiece) {
            score -= 50; // Small penalty for landing on own pieces
        }

        // 7. PROTECT VULNERABLE PIECES
        // Prefer moving pieces that are isolated or vulnerable
        if (this.isPieceVulnerable(piece)) {
            score += 100;
        }

        // 8. STRATEGIC POSITIONING
        // Prefer positions that threaten enemy pieces
        const threatenedEnemies = this.countThreatenedEnemies(destination);
        score += threatenedEnemies * 50;

        // 9. COMPLETE PATH BONUS
        if (piece.hasCompletedEnemyTerritory) {
            score += 80; // Bonus for pieces that completed enemy territory
        }

        // 10. DISTANCE TO ENEMY PIECES (for potential captures)
        const distanceScore = this.calculateDistanceToEnemies(destination);
        score += distanceScore;

        return score;
    },

    /**
     * Calculate forward progress score
     */
    calculateProgressScore(piece, destination) {
        // Simple heuristic: pieces that move forward get bonus
        // For red (top player): moving down and right is generally forward

        const rowDiff = destination.row - piece.row;
        const colDiff = Math.abs(destination.col - piece.col);

        let score = 0;

        // Reward row progression
        if (piece.row === 0 && destination.row > 0) score += 100; // Leaving initial row
        if (destination.row === 1 || destination.row === 2) score += 50; // Moving in middle rows
        if (destination.row === 3) score += 80; // Reaching enemy territory

        // Reward column progression
        score += colDiff * 10;

        return score;
    },

    /**
     * Check if piece is vulnerable to capture
     */
    isPieceVulnerable(piece) {
        const enemyPieces = window.gameLogic.gameState.pieces['blue'];
        const gameState = window.gameLogic.gameState;

        // Check if any enemy piece can reach this position
        for (let enemyPiece of enemyPieces) {
            if (!enemyPiece.active) continue;

            // Check all possible dice values (1-6)
            for (let diceValue = 1; diceValue <= 6; diceValue++) {
                const enemyMoves = getValidMoves(enemyPiece, diceValue, 'blue');
                const canCapture = enemyMoves.some(move =>
                    move.row === piece.row && move.col === piece.col
                );
                if (canCapture) return true;
            }
        }

        return false;
    },

    /**
     * Count how many enemy pieces this position threatens
     */
    countThreatenedEnemies(position) {
        const enemyPieces = window.gameLogic.gameState.pieces['blue'];
        let count = 0;

        enemyPieces.forEach(enemyPiece => {
            // Check if position is close to enemy piece
            const rowDiff = Math.abs(position.row - enemyPiece.row);
            const colDiff = Math.abs(position.col - enemyPiece.col);

            if (rowDiff <= 1 && colDiff <= 2) {
                count++;
            }
        });

        return count;
    },

    /**
     * Calculate score based on distance to enemy pieces
     */
    calculateDistanceToEnemies(position) {
        const enemyPieces = window.gameLogic.gameState.pieces['blue'];

        if (enemyPieces.length === 0) return 0;

        let minDistance = Infinity;

        enemyPieces.forEach(enemyPiece => {
            const distance = Math.abs(position.row - enemyPiece.row) +
                Math.abs(position.col - enemyPiece.col);
            minDistance = Math.min(minDistance, distance);
        });

        // Closer to enemies = higher score (for potential captures)
        return Math.max(0, 10 - minDistance * 2);
    },

    /**
     * Execute the chosen move
     */
    async executeMove(move) {
        const { piece, destination, isActivation } = move;
        const gameState = window.gameLogic.gameState;

        // Activate piece if needed
        if (isActivation) {
            piece.active = true;
            const cellIndex = window.getCellIndex ?
                window.getCellIndex(piece.row, piece.col, gameState.boardSize) :
                getCellIndex(piece.row, piece.col, gameState.boardSize);

            const updateFunc = window.updatePieceDisplay || updatePieceDisplay;
            updateFunc(cellIndex, this.color, true, piece.hasCompletedEnemyTerritory);

            updateMessage('IA ativou uma peça!');
            await this.delay(500);
        }

        // Select the piece visually
        const cellIndex = window.getCellIndex ?
            window.getCellIndex(piece.row, piece.col, gameState.boardSize) :
            getCellIndex(piece.row, piece.col, gameState.boardSize);

        gameState.selectedPiece = piece;

        const highlightFunc = window.highlightSelectedPiece || highlightSelectedPiece;
        highlightFunc(cellIndex);

        await this.delay(400);

        // Show possible moves
        gameState.possibleMoves = [destination];
        const showFunc = window.showPossibleMoves || showPossibleMoves;
        showFunc([destination]);

        await this.delay(600);

        // Execute the move
        const destCellIndex = window.getCellIndex ?
            window.getCellIndex(destination.row, destination.col, gameState.boardSize) :
            getCellIndex(destination.row, destination.col, gameState.boardSize);

        // Check for capture
        const findFunc = window.findPieceAt || findPieceAt;
        const enemyPiece = findFunc(destination.row, destination.col, 'blue');

        if (enemyPiece) {
            updateMessage('IA capturou uma peça azul!');
            const captureFunc = window.capturePiece || capturePiece;
            captureFunc(enemyPiece, 'blue');
            await this.delay(800);
        }

        // Move the piece
        const moveFunc = window.movePiece || movePiece;
        moveFunc(piece, destination.row, destination.col);
        updateMessage('IA moveu uma peça.');

        await this.delay(500);

        // Check win condition
        const checkWinFunc = window.checkWinCondition || checkWinCondition;
        if (checkWinFunc()) {
            const endGameFunc = window.endGame || endGame;
            endGameFunc(this.color);
            this.isProcessing = false;
            return;
        }

        // Handle bonus roll or switch turn
        if (gameState.bonusRoll) {
            gameState.diceValue = 0;
            gameState.bonusRoll = false;
            document.querySelector('.dice-total').textContent = 'Resultado: —';
            updateMessage('IA ganhou uma jogada extra!');

            await this.delay(1000);
            this.isProcessing = false;

            // Take another turn
            setTimeout(() => this.takeTurn(), 500);
        } else {
            // Switch to human player
            if (window.switchTurn) {
                window.switchTurn();
            } else if (typeof switchTurn === 'function') {
                switchTurn();
            }
            this.isProcessing = false;
        }
    },

    /**
     * Utility: delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Initialize AI with difficulty setting
     */
    init(difficulty) {
        this.difficulty = difficulty || 'medium';
        this.isProcessing = false;
        console.log(`AI initialized with difficulty: ${this.difficulty}`);
    },

    /**
     * Check if it's AI's turn and trigger move
     */
    checkAndPlay() {
        if (!window.gameLogic || !window.gameLogic.gameState.gameActive) return;
        if (window.gameLogic.gameState.currentPlayer !== this.color) return;
        if (this.isProcessing) return;

        // Small delay before AI starts its turn
        setTimeout(() => this.takeTurn(), 800);
    }
};

// Helper function to update message
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

// Make functions globally accessible for skipTurn
window.canActivatePiece = canActivatePiece;
window.isInEnemyTerritory = isInEnemyTerritory;
window.isPositionInEnemyTerritory = isPositionInEnemyTerritory;
window.enemyHasPiecesInInitialRow = enemyHasPiecesInInitialRow;
window.getValidMoves = getValidMoves;

// Export AI player
window.AI_PLAYER = AI_PLAYER;

console.log('AI Player loaded successfully');
