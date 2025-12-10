// onlineGameScript.js - Sistema de comunicação com servidor para jogo online (CORRIGIDO)

(function() {
    'use strict';

    const SERVER_URL = 'http://twserver.alunos.dcc.fc.up.pt:8008';
    const GROUP_ID = 99; // ALTERAR PARA SEU NÚMERO DE GRUPO

    // Estado do jogo online
    const onlineState = {
        isOnline: false,
        gameId: null,
        myNick: null,
        myPassword: null,
        myColor: null,
        opponentNick: null,
        myTurn: false,
        eventSource: null,
        awaitingResponse: false,
        lastActivity: Date.now(),
        timeoutTimer: null
    };

    /**
     * Função auxiliar para processar respostas HTTP (VERSÃO MELHORADA)
     */
    async function parseResponse(response) {
        // Pega resposta como texto primeiro
        const text = await response. text();

        console.log('Raw response:', text);
        console.log('Response status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));

        // Se a resposta estiver vazia
        if (!text || text.trim() === '') {
            if (response.ok) {
                return { success: true };
            } else {
                return { error: 'Empty response from server' };
            }
        }

        // Detecta HTML (erro do servidor)
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            console.error('Server returned HTML instead of JSON');
            return { error: `Server error (${response.status})` };
        }

        // Tenta parsear como JSON
        try {
            const json = JSON.parse(text);
            return json;
        } catch (e) {
            console.warn('Response is not JSON, treating as plain text');

            // Retorna texto como mensagem
            if (response.ok) {
                return { success: true, message: text };
            } else {
                return { error: text };
            }
        }
    }

    /**
     * REGISTER - Registra/autentica jogador no servidor (COM DEBUG)
     */
    async function register(nick, password) {
        try {
            console.log('=== REGISTER DEBUG ===');
            console.log('Nick:', nick);
            console.log('Password:', password);
            console.log('URL:', `${SERVER_URL}/register`);

            const response = await fetch(`${SERVER_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body:  new URLSearchParams({
                    nick: nick,
                    password: password
                })
            });

            console.log('Response status:', response. status);
            console.log('Response headers:', [... response.headers.entries()]);

            // Pega a resposta como TEXTO primeiro
            const textResponse = await response.text();
            console.log('Raw response text:', textResponse);

            // Tenta parsear como JSON
            let data;
            try {
                data = JSON.parse(textResponse);
                console.log('Parsed JSON:', data);
            } catch (e) {
                console.error('JSON parse failed:', e);
                console.log('Treating as plain text response');
                data = { message: textResponse };
            }

            if (response.ok) {
                console.log('Registration successful:', data);
                return { success: true, data };
            } else {
                console.error('Registration failed:', data);
                return {
                    success: false,
                    error: data.error || data.message || textResponse || 'Registration failed'
                };
            }
        } catch (error) {
            console.error('Network error during registration:', error);
            return { success: false, error: 'Network error: ' + error.message };
        }
    }

    /**
     * JOIN - Entra em fila de espera para jogo
     */
    async function joinGame(nick, password, size) {
        try {
            const response = await fetch(`${SERVER_URL}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body:  new URLSearchParams({
                    group:  GROUP_ID. toString(),
                    nick: nick,
                    password: password,
                    size: size. toString()
                })
            });

            const data = await parseResponse(response);

            if (response.ok) {
                console. log('Join successful:', data);

                onlineState.isOnline = true;
                onlineState.gameId = data.game;
                onlineState.myNick = nick;
                onlineState.myPassword = password;

                // Conecta ao sistema de updates
                subscribeToUpdates(data.game, nick);

                return { success: true, data };
            } else {
                console.error('Join failed:', data);
                return { success: false, error:  data.error || data.message || 'Join failed' };
            }
        } catch (error) {
            console.error('Network error during join:', error);
            return { success: false, error:  'Network error: ' + error.message };
        }
    }

    /**
     * LEAVE - Sai do jogo atual
     */
    async function leaveGame(nick, password, gameId) {
        try {
            const response = await fetch(`${SERVER_URL}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    nick: nick,
                    password: password,
                    game: gameId
                })
            });

            const data = await parseResponse(response);

            if (response.ok) {
                console.log('Leave successful:', data);
                cleanupOnlineGame();
                return { success: true, data };
            } else {
                console.error('Leave failed:', data);
                return { success:  false, error: data.error || data.message || 'Leave failed' };
            }
        } catch (error) {
            console.error('Network error during leave:', error);
            return { success:  false, error: 'Network error: ' + error.message };
        }
    }

    /**
     * ROLL - Lança dados no servidor
     */
    async function rollDice(nick, password, gameId) {
        if (onlineState.awaitingResponse) {
            console.warn('Already awaiting response from server');
            return { success:  false, error: 'Awaiting previous response' };
        }

        try {
            onlineState.awaitingResponse = true;
            updateLastActivity();

            const response = await fetch(`${SERVER_URL}/roll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    nick: nick,
                    password: password,
                    game: gameId
                })
            });

            const data = await parseResponse(response);

            if (response.ok) {
                console.log('Roll successful:', data);
                return { success: true, data };
            } else {
                console. error('Roll failed:', data);
                return { success: false, error: data.error || data.message || 'Roll failed' };
            }
        } catch (error) {
            console.error('Network error during roll:', error);
            return { success: false, error: 'Network error: ' + error.message };
        } finally {
            onlineState.awaitingResponse = false;
        }
    }

    /**
     * NOTIFY - Notifica jogada ao servidor
     */
    async function notifyMove(nick, password, gameId, cell) {
        if (onlineState.awaitingResponse) {
            console.warn('Already awaiting response from server');
            return { success: false, error: 'Awaiting previous response' };
        }

        try {
            onlineState.awaitingResponse = true;
            updateLastActivity();

            const response = await fetch(`${SERVER_URL}/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    nick: nick,
                    password: password,
                    game: gameId,
                    move: cell. toString()
                })
            });

            const data = await parseResponse(response);

            if (response. ok) {
                console.log('Notify successful:', data);
                return { success: true, data };
            } else {
                console.error('Notify failed:', data);
                return { success: false, error: data.error || data.message || 'Notify failed' };
            }
        } catch (error) {
            console.error('Network error during notify:', error);
            return { success: false, error: 'Network error: ' + error.message };
        } finally {
            onlineState. awaitingResponse = false;
        }
    }

    /**
     * PASS - Passa a vez
     */
    async function passTurn(nick, password, gameId) {
        if (onlineState.awaitingResponse) {
            console.warn('Already awaiting response from server');
            return { success: false, error:  'Awaiting previous response' };
        }

        try {
            onlineState.awaitingResponse = true;
            updateLastActivity();

            const response = await fetch(`${SERVER_URL}/pass`, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    nick: nick,
                    password: password,
                    game: gameId
                })
            });

            const data = await parseResponse(response);

            if (response.ok) {
                console.log('Pass successful:', data);
                return { success: true, data };
            } else {
                console.error('Pass failed:', data);
                return { success: false, error:  data.error || data.message || 'Pass failed' };
            }
        } catch (error) {
            console.error('Network error during pass:', error);
            return { success: false, error:  'Network error: ' + error.message };
        } finally {
            onlineState.awaitingResponse = false;
        }
    }

    /**
     * UPDATE - Subscreve a atualizações via Server-Sent Events
     */
    function subscribeToUpdates(gameId, nick) {
        // Fecha conexão anterior se existir
        if (onlineState.eventSource) {
            onlineState.eventSource.close();
        }

        const url = `${SERVER_URL}/update?game=${encodeURIComponent(gameId)}&nick=${encodeURIComponent(nick)}`;

        console.log('Subscribing to updates:', url);

        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
            console.log('SSE connection opened');
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON. parse(event.data);
                console.log('Received update:', data);
                processServerUpdate(data);
            } catch (error) {
                console. error('Error processing update:', error);
            }
        };

        eventSource.onerror = (error) => {
            console. error('SSE error:', error);

            // Reconecta se jogo ainda ativo
            if (onlineState.isOnline && onlineState.gameId) {
                console.log('Attempting to reconnect.. .');
                setTimeout(() => {
                    if (onlineState.isOnline) {
                        subscribeToUpdates(gameId, nick);
                    }
                }, 3000);
            } else {
                eventSource.close();
            }
        };

        onlineState. eventSource = eventSource;
        startTimeoutTimer();
    }

    /**
     * RANKING - Obtém top 10 jogadores
     */
    async function getRanking(size) {
        try {
            const response = await fetch(`${SERVER_URL}/ranking?group=${GROUP_ID}&size=${size}`, {
                method: 'GET'
            });

            const data = await parseResponse(response);

            if (response.ok) {
                console.log('Ranking retrieved:', data);
                return { success:  true, data:  data.ranking || [] };
            } else {
                console.error('Ranking retrieval failed:', data);
                return { success: false, error: data.error || data.message || 'Failed to get ranking' };
            }
        } catch (error) {
            console.error('Network error during ranking retrieval:', error);
            return { success: false, error: 'Network error: ' + error.message };
        }
    }

    /**
     * Processa atualizações recebidas do servidor via SSE
     */
    function processServerUpdate(data) {
        updateLastActivity();

        if (data. winner) {
            handleGameEnd(data);
        } else if (data. roll !== undefined) {
            handleRollUpdate(data);
        } else if (data.move !== undefined) {
            handleMoveUpdate(data);
        } else if (data.turn !== undefined) {
            handleTurnUpdate(data);
        }

        // Dispara evento customizado para outros módulos
        window.dispatchEvent(new CustomEvent('onlineGameUpdate', { detail: data }));
    }

    /**
     * Handlers de atualização (IMPLEMENTAR APÓS ESPECIFICAÇÃO)
     */
    function handleRollUpdate(data) {
        console.log('Roll update:', data);
    }

    function handleMoveUpdate(data) {
        console.log('Move update:', data);
    }

    function handleTurnUpdate(data) {
        console.log('Turn update:', data);
    }

    function handleGameEnd(data) {
        console.log('Game ended:', data);
        cleanupOnlineGame();

        if (window.endGame) {
            window.endGame(data.winner);
        }
    }

    /**
     * Gerenciamento de timeout (2 minutos sem atividade)
     */
    function updateLastActivity() {
        onlineState.lastActivity = Date. now();
    }

    function startTimeoutTimer() {
        if (onlineState.timeoutTimer) {
            clearInterval(onlineState.timeoutTimer);
        }

        onlineState.timeoutTimer = setInterval(() => {
            const elapsed = Date.now() - onlineState.lastActivity;
            const remaining = 120000 - elapsed; // 2 minutos

            if (remaining <= 0) {
                handleTimeout();
            } else {
                updateTimeoutDisplay(remaining);
            }
        }, 1000);
    }

    function handleTimeout() {
        console.warn('Game timeout - no activity for 2 minutes');

        if (onlineState.isOnline) {
            leaveGame(onlineState.myNick, onlineState.myPassword, onlineState.gameId);
        }

        alert('Você foi desconectado por inatividade (2 minutos sem jogadas).');
    }

    function updateTimeoutDisplay(remaining) {
        const seconds = Math.floor(remaining / 1000);
        const timerElement = document.getElementById('timeout-timer');

        if (timerElement && onlineState.myTurn) {
            timerElement.textContent = `⏱️ ${seconds}s`;
        }
    }

    /**
     * Limpeza ao sair do jogo
     */
    function cleanupOnlineGame() {
        if (onlineState.eventSource) {
            onlineState.eventSource.close();
            onlineState.eventSource = null;
        }

        if (onlineState.timeoutTimer) {
            clearInterval(onlineState.timeoutTimer);
            onlineState.timeoutTimer = null;
        }

        onlineState.isOnline = false;
        onlineState.gameId = null;
        onlineState.myNick = null;
        onlineState.myPassword = null;
        onlineState.myColor = null;
        onlineState.opponentNick = null;
        onlineState.myTurn = false;
        onlineState.awaitingResponse = false;
    }

    /**
     * Verifica se está em modo online
     */
    function isOnlineMode() {
        return onlineState.isOnline;
    }

    /**
     * Obtém estado atual do jogo online
     */
    function getOnlineState() {
        return { ... onlineState };
    }

    // Exporta API pública
    window.OnlineGame = {
        register,
        joinGame,
        leaveGame,
        rollDice,
        notifyMove,
        passTurn,
        getRanking,
        isOnlineMode,
        getOnlineState,
        updateLastActivity
    };

    console.log('Online Game System loaded successfully');
})();