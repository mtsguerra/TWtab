// onlineGameScript.js - Sistema de jogo online multiplayer

class OnlineGameManager {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isHost = false;
        this.roomId = null;
        this.playerColor = null;
        this.connected = false;
    }

    // Inicializa conexão peer-to-peer usando PeerJS
    async initializePeerConnection(isHost, roomId = null) {
        return new Promise((resolve, reject) => {
            // Verifica se PeerJS está disponível
            if (typeof Peer === 'undefined') {
                console.error('PeerJS não está carregado. Usando fallback de sincronização local.');
                this.setupLocalFallback();
                resolve({ roomId: 'LOCAL_GAME', isHost: true });
                return;
            }

            try {
                this.isHost = isHost;

                if (isHost) {
                    // Criar nova sala
                    this.roomId = this.generateRoomId();
                    this.peer = new Peer(this.roomId);
                } else {
                    // Entrar em sala existente
                    this.roomId = roomId;
                    this.peer = new Peer();
                }

                this.peer.on('open', (id) => {
                    console.log('Conexão peer aberta com ID:', id);
                    this.updateConnectionStatus('Aguardando jogador...', 'connecting');

                    if (isHost) {
                        this.setupHostListeners();
                        resolve({ roomId: this.roomId, isHost: true });
                    } else {
                        this.connectToHost(roomId)
                            .then(() => resolve({ roomId: this.roomId, isHost: false }))
                            .catch(reject);
                    }
                });

                this.peer.on('error', (err) => {
                    console.error('Erro na conexão peer:', err);
                    this.updateConnectionStatus('Erro na conexão', 'error');
                    reject(err);
                });

            } catch (error) {
                console.error('Erro ao inicializar PeerJS:', error);
                this.setupLocalFallback();
                resolve({ roomId: 'LOCAL_GAME', isHost: true });
            }
        });
    }

    // Configura listeners para o host (criador da sala)
    setupHostListeners() {
        this.peer.on('connection', (conn) => {
            console.log('Jogador conectado:', conn.peer);
            this.connection = conn;
            this.setupConnectionHandlers();
            this.updateConnectionStatus('Conectado!', 'connected');
            this.connected = true;

            // Envia estado inicial do jogo
            this.sendGameState();
        });
    }

    // Conecta ao host (entra em uma sala)
    connectToHost(hostId) {
        return new Promise((resolve, reject) => {
            try {
                this.connection = this.peer.connect(hostId);

                this.connection.on('open', () => {
                    console.log('Conectado ao host:', hostId);
                    this.setupConnectionHandlers();
                    this.updateConnectionStatus('Conectado!', 'connected');
                    this.connected = true;
                    resolve();
                });

                this.connection.on('error', (err) => {
                    console.error('Erro ao conectar:', err);
                    this.updateConnectionStatus('Erro ao conectar', 'error');
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Configura handlers para mensagens da conexão
    setupConnectionHandlers() {
        this.connection.on('data', (data) => {
            console.log('Dados recebidos:', data);
            this.handleReceivedData(data);
        });

        this.connection.on('close', () => {
            console.log('Conexão fechada');
            this.updateConnectionStatus('Desconectado', 'error');
            this.connected = false;
            this.showDisconnectionMessage();
        });
    }

    // Processa dados recebidos do outro jogador
    handleReceivedData(data) {
        if (!data || !data.type) return;

        switch (data.type) {
            case 'gameState':
                this.syncGameState(data.state);
                break;
            case 'move':
                this.applyOpponentMove(data.move);
                break;
            case 'roll':
                this.syncDiceRoll(data.roll);
                break;
            case 'skip':
                this.handleOpponentSkip();
                break;
            case 'forfeit':
                this.handleOpponentForfeit();
                break;
            default:
                console.warn('Tipo de mensagem desconhecido:', data.type);
        }
    }

    // Envia estado do jogo para o outro jogador
    sendGameState() {
        if (!this.connected || !window.gameLogic) return;

        const state = {
            type: 'gameState',
            state: window.gameLogic.gameState
        };

        this.sendData(state);
    }

    // Envia movimento para o outro jogador
    sendMove(move) {
        const data = {
            type: 'move',
            move: move
        };
        this.sendData(data);
    }

    // Envia resultado do dado para o outro jogador
    sendDiceRoll(result) {
        const data = {
            type: 'roll',
            roll: result
        };
        this.sendData(data);
    }

    // Envia skip para o outro jogador
    sendSkip() {
        const data = { type: 'skip' };
        this.sendData(data);
    }

    // Envia forfeit para o outro jogador
    sendForfeit() {
        const data = { type: 'forfeit' };
        this.sendData(data);
    }

    // Função auxiliar para enviar dados
    sendData(data) {
        if (this.connection && this.connected) {
            try {
                this.connection.send(data);
            } catch (error) {
                console.error('Erro ao enviar dados:', error);
            }
        }
    }

    // Sincroniza estado do jogo recebido
    syncGameState(state) {
        if (window.gameLogic) {
            window.gameLogic.gameState = state;
            window.gameLogic.renderBoard();
        }
    }

    // Aplica movimento do oponente
    applyOpponentMove(move) {
        if (window.gameLogic) {
            // Aplica o movimento sem enviar de volta
            window.gameLogic.applyMove(move, false);
        }
    }

    // Sincroniza resultado do dado
    syncDiceRoll(roll) {
        if (window.gameLogic) {
            window.gameLogic.handleDiceResult(roll);
        }
    }

    // Handle opponent skip
    handleOpponentSkip() {
        if (window.gameLogic) {
            window.gameLogic.skipTurn(false);
        }
    }

    // Handle opponent forfeit
    handleOpponentForfeit() {
        updateMessage('O oponente desistiu! Você venceu!');
        if (window.gameLogic) {
            window.gameLogic.endGame();
        }
    }

    // Atualiza status da conexão na UI
    updateConnectionStatus(text, status) {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = statusElement?.querySelector('.status-text');
        const statusIndicator = statusElement?.querySelector('.status-indicator');

        if (statusText) {
            statusText.textContent = text;
        }

        if (statusIndicator) {
            statusIndicator.classList.remove('connected', 'error');
            if (status === 'connected') {
                statusIndicator.classList.add('connected');
            } else if (status === 'error') {
                statusIndicator.classList.add('error');
            }
        }

        // Mostra o status se estiver escondido
        if (statusElement) {
            statusElement.classList.remove('hidden');
        }
    }

    // Gera ID único para sala
    generateRoomId() {
        return 'tab-' + Math.random().toString(36).substr(2, 9);
    }

    // Mostra mensagem de desconexão
    showDisconnectionMessage() {
        updateMessage('Conexão perdida com o oponente. O jogo foi encerrado.');
        if (window.gameLogic) {
            window.gameLogic.endGame();
        }
    }

    // Fallback para modo local quando PeerJS não está disponível
    setupLocalFallback() {
        console.warn('Modo online não disponível. Usando modo local.');
        this.updateConnectionStatus('Modo local (2 jogadores)', 'connected');
        this.connected = false;
    }

    // Desconecta e limpa recursos
    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.connected = false;
        this.connection = null;
        this.peer = null;
    }
}

// Instância global do gerenciador de jogo online
window.onlineGameManager = new OnlineGameManager();

// Função auxiliar para atualizar mensagem (se não existir)
if (typeof updateMessage === 'undefined') {
    function updateMessage(text) {
        const messageElement = document.querySelector('.message p');
        if (messageElement) {
            messageElement.textContent = text;
        }
    }
}
