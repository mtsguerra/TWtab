// aiPlayerScript.js - AI opponent for Tâb game with single dice roll per turn support

/**
 * AI Player for Tâb Game - UPDATED for single dice roll system
 * Implements three difficulty levels:
 * - Easy: Random valid moves
 * - Medium: Mix of random and strategic moves (70% strategic, 30% random)
 * - Hard: Always chooses the best possible move
 */

// Helper function to update message
function updateMessage(text) {
    const messageElement = document.querySelector('.message p');
    if (messageElement) {
        messageElement.textContent = text;
    }
}

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
     * Roll dice for AI - UPDATED for single roll system
     */
    async rollDice() {
        return new Promise((resolve) => {
            updateMessage('IA está jogando os dados...');

            setTimeout(() => {
                const gameState = window.gameLogic.gameState;

                // NOVO: Verificar se já rolou e não usou
                if (gameState.diceValue > 0 && !gameState.diceUsed) {
                    console.log('AI: Dice already rolled, value not used yet');
                    resolve();
                    return;
                }

                // Simular rolagem de dados
                let lightSides = 0;
                for (let i = 0; i < 4; i++) {
                    if (Math.random() < 0.5) lightSides++;
                }

                // Calculate steps and bonus roll
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

                // Update game state
                gameState.diceValue = steps;
                gameState.bonusRoll = bonusRoll;
                gameState.diceUsed = false; // NOVO: Marcar como não usado

                // Update display
                const diceTotal = document.querySelector('.dice-total');
                if (diceTotal) {
                    let resultText = `Resultado: ${steps} passo${steps !== 1 ? 's' : ''}`;
                    if (bonusRoll) {
                        resultText += " 🎲 (Jogue novamente!)";
                    }
                    diceTotal.textContent = resultText;
                }

                console.log(`AI rolled: ${steps} steps, bonus: ${bonusRoll}`);

                setTimeout(resolve, 500);
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

        if (allPossibleMoves.length > 0) {
            console.log('AI: Available moves:', allPossibleMoves.map(m => ({
                from: `(${m.piece.row},${m.piece.col})`,
                to: `(${m.destination.row},${m.destination.col})`,
                isActivation: m.isActivation,
                pieceActive: m.piece.active
            })));
        }

        if (allPossibleMoves.length === 0) {
            // No valid moves - skip turn
            updateMessage('IA não tem jogadas válidas. Pulando a vez...');

            // MODIFICADO: Marcar dado como usado antes de pular
            gameState.diceUsed = true;

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
                const tempPiece = { ...piece, active: true };

                let canActivate = false;
                if (window.canActivatePiece) {
                    canActivate = window.canActivatePiece(piece, this.color);
                } else if (typeof canActivatePiece === 'function') {
                    canActivate = canActivatePiece(piece, this.color);
                }

                if (canActivate) {
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
            return this.chooseRandomMove(moves);
        } else {
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
     */
    evaluateMove(move) {
        let score = 0;
        const { piece, destination, isActivation } = move;
        const gameState = window.gameLogic.gameState;

        // Use window or global functions safely
        const findPieceAtFunc = window.findPieceAt || (typeof findPieceAt !== 'undefined' ? findPieceAt : null);
        const isInEnemyTerritoryFunc = window.isInEnemyTerritory || (typeof isInEnemyTerritory !== 'undefined' ? isInEnemyTerritory : null);
        const isPositionInEnemyTerritoryFunc = window.isPositionInEnemyTerritory || (typeof isPositionInEnemyTerritory !== 'undefined' ? isPositionInEnemyTerritory : null);
        const enemyHasPiecesInInitialRowFunc = window.enemyHasPiecesInInitialRow || (typeof enemyHasPiecesInInitialRow !== 'undefined' ? enemyHasPiecesInInitialRow : null);

        if (!findPieceAtFunc) return 0;

        // 1. CAPTURE PRIORITY
        const enemyPiece = findPieceAtFunc(destination.row, destination.col, 'blue');
        if (enemyPiece) {
            score += 1000;
            if (isInEnemyTerritoryFunc && isInEnemyTerritoryFunc(enemyPiece, 'blue')) {
                score += 200;
            }
        }

        // 2. ACTIVATION PRIORITY
        if (isActivation) {
            score += 500;
        }

        // 3. FORWARD PROGRESS
        const progressScore = this.calculateProgressScore(piece, destination);
        score += progressScore;

        // 4. ENTERING ENEMY TERRITORY
        if (isPositionInEnemyTerritoryFunc && isPositionInEnemyTerritoryFunc(destination.row, this.color)) {
            if (enemyHasPiecesInInitialRowFunc && enemyHasPiecesInInitialRowFunc(this.color)) {
                score += 300;
            }
        }

        // 5. LEAVING ENEMY TERRITORY
        if (isInEnemyTerritoryFunc && isPositionInEnemyTerritoryFunc) {
            const wasInEnemyTerritory = isInEnemyTerritoryFunc(piece, this.color);
            const willBeInEnemyTerritory = isPositionInEnemyTerritoryFunc(destination.row, this.color);
            if (wasInEnemyTerritory && !willBeInEnemyTerritory) {
                score += 150;
            }
        }

        // 6. AVOID STACKING
        const friendlyPiece = findPieceAtFunc(destination.row, destination.col, this.color);
        if (friendlyPiece) {
            score -= 50;
        }

        // 7. PROTECT VULNERABLE PIECES
        if (this.isPieceVulnerable(piece)) {
            score += 100;
        }

        // 8. STRATEGIC POSITIONING
        const threatenedEnemies = this.countThreatenedEnemies(destination);
        score += threatenedEnemies * 50;

        // 9. COMPLETE PATH BONUS
        if (piece.hasCompletedEnemyTerritory) {
            score += 80;
        }

        // 10. DISTANCE TO ENEMY PIECES
        const distanceScore = this.calculateDistanceToEnemies(destination);
        score += distanceScore;

        return score;
    },

    calculateProgressScore(piece, destination) {
        const rowDiff = destination.row - piece.row;
        const colDiff = Math.abs(destination.col - piece.col);
        let score = 0;

        if (piece.row === 0 && destination.row > 0) score += 100;
        if (destination.row === 1 || destination.row === 2) score += 50;
        if (destination.row === 3) score += 80;

        score += colDiff * 10;
        return score;
    },

    isPieceVulnerable(piece) {
        const enemyPieces = window.gameLogic.gameState.pieces['blue'];
        const getValidMovesFunc = window.getValidMoves || (typeof getValidMoves !== 'undefined' ? getValidMoves : null);

        if (!getValidMovesFunc) return false;

        for (let enemyPiece of enemyPieces) {
            if (!enemyPiece.active) continue;

            for (let diceValue = 1; diceValue <= 6; diceValue++) {
                const enemyMoves = getValidMovesFunc(enemyPiece, diceValue, 'blue');
                const canCapture = enemyMoves.some(move =>
                    move.row === piece.row && move.col === piece.col
                );
                if (canCapture) return true;
            }
        }
        return false;
    },

    countThreatenedEnemies(position) {
        const enemyPieces = window.gameLogic.gameState.pieces['blue'];
        let count = 0;

        enemyPieces.forEach(enemyPiece => {
            const rowDiff = Math.abs(position.row - enemyPiece.row);
            const colDiff = Math.abs(position.col - enemyPiece.col);

            if (rowDiff <= 1 && colDiff <= 2) {
                count++;
            }
        });

        return count;
    },

    calculateDistanceToEnemies(position) {
        const enemyPieces = window.gameLogic.gameState.pieces['blue'];

        if (enemyPieces.length === 0) return 0;

        let minDistance = Infinity;

        enemyPieces.forEach(enemyPiece => {
            const distance = Math.abs(position.row - enemyPiece.row) +
                Math.abs(position.col - enemyPiece.col);
            minDistance = Math.min(minDistance, distance);
        });

        return Math.max(0, 10 - minDistance * 2);
    },

    /**
     * Execute the chosen move - UPDATED for single dice roll system
     */
    async executeMove(move) {
        const { piece, destination, isActivation } = move;
        const gameState = window.gameLogic.gameState;

        // Get function references safely
        const getCellIndexFunc = window.getCellIndex || (typeof getCellIndex !== 'undefined' ? getCellIndex : null);
        const updatePieceDisplayFunc = window.updatePieceDisplay || (typeof updatePieceDisplay !== 'undefined' ? updatePieceDisplay : null);
        const highlightSelectedPieceFunc = window.highlightSelectedPiece || (typeof highlightSelectedPiece !== 'undefined' ? highlightSelectedPiece : null);
        const showPossibleMovesFunc = window.showPossibleMoves || (typeof showPossibleMoves !== 'undefined' ? showPossibleMoves : null);
        const findPieceAtFunc = window.findPieceAt || (typeof findPieceAt !== 'undefined' ? findPieceAt : null);
        const capturePieceFunc = window.capturePiece || (typeof capturePiece !== 'undefined' ? capturePiece : null);
        const movePieceFunc = window.movePiece || (typeof movePiece !== 'undefined' ? movePiece : null);
        const checkWinConditionFunc = window.checkWinCondition || (typeof checkWinCondition !== 'undefined' ? checkWinCondition : null);
        const endGameFunc = window.endGame || (typeof endGame !== 'undefined' ? endGame : null);

        // Activate piece if needed
        if (isActivation && updatePieceDisplayFunc && getCellIndexFunc) {
            piece.active = true;
            const cellIndex = getCellIndexFunc(piece.row, piece.col, gameState.boardSize);
            updatePieceDisplayFunc(cellIndex, this.color, true, piece.hasCompletedEnemyTerritory);
            updateMessage('IA ativou uma peça!');
            await this.delay(500);
        }

        // Select the piece visually
        if (getCellIndexFunc && highlightSelectedPieceFunc) {
            const cellIndex = getCellIndexFunc(piece.row, piece.col, gameState.boardSize);
            gameState.selectedPiece = piece;
            highlightSelectedPieceFunc(cellIndex);
            await this.delay(400);
        }

        // Show possible moves
        if (showPossibleMovesFunc) {
            gameState.possibleMoves = [destination];
            showPossibleMovesFunc([destination]);
            await this.delay(600);
        }

        // Check for capture
        if (findPieceAtFunc && capturePieceFunc) {
            const enemyPiece = findPieceAtFunc(destination.row, destination.col, 'blue');
            if (enemyPiece) {
                updateMessage('IA capturou uma peça azul!');
                capturePieceFunc(enemyPiece, 'blue');
                await this.delay(800);
            }
        }

        // Move the piece
        if (movePieceFunc) {
            movePieceFunc(piece, destination.row, destination.col);
            updateMessage('IA moveu uma peça.');
        }

        // MODIFICADO: Marcar dado como usado
        gameState.diceUsed = true;

        await this.delay(500);

        // Check win condition
        if (checkWinConditionFunc && checkWinConditionFunc()) {
            if (endGameFunc) {
                endGameFunc(this.color);
            }
            this.isProcessing = false;
            return;
        }

        // Handle bonus roll or switch turn
        if (gameState.bonusRoll) {
            gameState.diceValue = 0;
            gameState.bonusRoll = false;
            gameState.diceUsed = false; // NOVO: Resetar para permitir nova jogada
            document.querySelector('.dice-total').textContent = 'Resultado: —';
            updateMessage('IA ganhou uma jogada extra!');

            // NOVO: Habilitar botão de rolar se disponível
            if (window.enableRollButton) {
                window.enableRollButton();
            }

            await this.delay(1000);
            this.isProcessing = false;

            // Take another turn
            setTimeout(() => this.takeTurn(), 500);
        } else {
            // Switch to human player
            const switchTurnFunc = window.switchTurn || (typeof switchTurn !== 'undefined' ? switchTurn : null);
            if (switchTurnFunc) {
                switchTurnFunc();
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

// Export AI player FIRST
window.AI_PLAYER = AI_PLAYER;

console.log('AI Player loaded successfully (updated for single dice roll system)');