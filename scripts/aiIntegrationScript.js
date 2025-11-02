// aiIntegrationScript.js - Integrates AI player with existing game logic

/**
 * This script integrates the AI player with the game
 * Must be loaded AFTER gameLogicScript.js and aiPlayerScript.js
 */

(function() {
    'use strict';

    let isAIGame = false;
    let aiDifficulty = 'medium';

    // Store original functions to wrap them
    const originalSwitchTurn = window.switchTurn;
    const originalEndGame = window.endGame;

    /**
     * Enhanced switchTurn to trigger AI after turn switch
     */
    window.switchTurn = function() {
        // Call original function
        if (originalSwitchTurn) {
            originalSwitchTurn();
        }

        // If it's AI game and AI's turn, trigger AI
        if (isAIGame && window.AI_PLAYER) {
            window.AI_PLAYER.checkAndPlay();
        }
    };

    /**
     * Enhanced endGame to handle AI game ending
     */
    window.endGame = function(winner) {
        // Call original function
        if (originalEndGame) {
            originalEndGame(winner);
        }

        // Additional AI game ending logic if needed
        if (isAIGame && window.AI_PLAYER) {
            window.AI_PLAYER.isProcessing = false;
        }
    };

    /**
     * Initialize AI game
     */
    window.initAIGame = function(difficulty) {
        isAIGame = true;
        aiDifficulty = difficulty;

        if (window.AI_PLAYER) {
            window.AI_PLAYER.init(difficulty);
            console.log('AI game initialized with difficulty:', difficulty);

            // If AI starts first, trigger it
            if (window.gameLogic && window.gameLogic.gameState.currentPlayer === 'red') {
                setTimeout(() => {
                    window.AI_PLAYER.checkAndPlay();
                }, 1500); // Give player time to see the board
            }
        } else {
            console.error('AI_PLAYER not loaded');
        }
    };

    /**
     * Disable AI game (for human vs human)
     */
    window.disableAIGame = function() {
        isAIGame = false;
        if (window.AI_PLAYER) {
            window.AI_PLAYER.isProcessing = false;
        }
        console.log('AI game disabled - Human vs Human mode');
    };

    /**
     * Check if current game is AI game
     */
    window.isAIGameActive = function() {
        return isAIGame;
    };

    /**
     * Get current AI difficulty
     */
    window.getAIDifficulty = function() {
        return aiDifficulty;
    };

    // Listen for dice rolls in AI games
    document.addEventListener('DOMContentLoaded', () => {
        const rollButton = document.getElementById('roll-dice');

        if (rollButton) {
            rollButton.addEventListener('click', () => {
                // After human rolls, check if next turn is AI's
                setTimeout(() => {
                    if (isAIGame && window.gameLogic &&
                        window.gameLogic.gameState.currentPlayer === 'red' &&
                        window.AI_PLAYER) {
                        // Don't trigger immediately, let the turn switch happen naturally
                    }
                }, 100);
            });
        }

        // Listen for skip button in AI games
        const skipButton = document.getElementById('skip-button');
        if (skipButton) {
            const originalSkipHandler = skipButton.onclick;

            skipButton.addEventListener('click', () => {
                setTimeout(() => {
                    if (isAIGame && window.AI_PLAYER) {
                        window.AI_PLAYER.checkAndPlay();
                    }
                }, 500);
            });
        }
    });

    console.log('AI Integration loaded successfully');
})();
