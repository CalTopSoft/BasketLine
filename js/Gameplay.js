const { useState, useEffect, useRef } = React;
const Gameplay = ({
    name,
    wsRef,
    gameStarted,
    playerIndexRef,
    turnRef,
    ballRef,
    hoopXRef,
    scoresRef,
    roundRef,
    playersRef,
    playerIconsRef,
    timerRef,
    attemptsRef,
    currentRoom,
}) => {
    const [forceUpdate, setForceUpdate] = useState(0);
    const sketchRef = useRef(null);
    const p5Instance = useRef(null);
    const isMounted = useRef(false);

    const setupSketch = (p) => {
        let ballImg, hoopBaseImg, hoopRingImg;
        let dragging = false;
        let dragStartX, dragStartY;
        let ballScale = 1;
        
        // Cache para optimización crítica
        let lastBallY = -1;
        let cachedBallScale = 1;
        let lastHoopX = -1;
        let hoopBaseX, hoopRingX;
        
        // Pre-calcular constantes
        const HOOP_BASE_WIDTH = 240;
        const HOOP_BASE_HEIGHT = HOOP_BASE_WIDTH * (3464 / 2598);
        const HOOP_RING_WIDTH = 75;
        const HOOP_RING_HEIGHT = HOOP_RING_WIDTH * (499 / 788);
        const HOOP_BASE_OFFSET = HOOP_BASE_WIDTH / 1.98;
        const HOOP_RING_OFFSET = HOOP_RING_WIDTH / 2.2;
        const HOOP_RING_Y = 113;
        
        // Detectar móvil para optimizaciones específicas
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        p.preload = () => {
            ballImg = p.loadImage('img/balon/ball.png');
            hoopBaseImg = p.loadImage('img/arco/hoop_base.png');
            hoopRingImg = p.loadImage('img/arco/hoop_ring.png');
            console.log("Recursos cargados exitosamente");
        };

        p.setup = () => {
            p.createCanvas(600, 490);
            p.frameRate(60); // Mantener 60fps
            
            // Optimizaciones específicas para móvil
            if (isMobile) {
                p.pixelDensity(1); // Reducir carga de GPU
            }
            
            // Configuraciones para mejor rendimiento
            p.imageMode(p.CORNER);
            p.rectMode(p.CORNER);
        };

        p.draw = () => {
            // Usar clear() es más eficiente que background()
            p.clear();
            
            // Inicializar ball si no existe
            if (!ballRef.current) {
                ballRef.current = { x: 300, y: 405, r: 30, vx: 0, vy: 0, thrown: false, rotation: 0 };
            }
            if (!ballRef.current.r) ballRef.current.r = 30;
            if (!hoopXRef.current) hoopXRef.current = 300;

            // Cache del cálculo de escala - solo cuando cambia Y
            if (lastBallY !== ballRef.current.y) {
                cachedBallScale = p.constrain(p.map(ballRef.current.y, 405, 113, 1, 0.8), 0.8, 1);
                lastBallY = ballRef.current.y;
            }
            ballScale = cachedBallScale;
            
            // Cache de posiciones del aro - solo cuando cambia X
            if (lastHoopX !== hoopXRef.current) {
                hoopBaseX = hoopXRef.current - HOOP_BASE_OFFSET;
                hoopRingX = hoopXRef.current - HOOP_RING_OFFSET;
                lastHoopX = hoopXRef.current;
            }

            if (ballImg && hoopBaseImg && hoopRingImg) {
                // Dibujar base del aro
                p.image(hoopBaseImg, hoopBaseX, 40, HOOP_BASE_WIDTH, HOOP_BASE_HEIGHT);
                
                // Función optimizada para dibujar pelota rotada
                const drawRotatedBall = () => {
                    const ballSize = ballRef.current.r * ballScale;
                    const ballDiameter = ballSize * 2;
                    
                    // Solo aplicar rotación si hay movimiento significativo
                    if ((ballRef.current.vx || 0) > 0.1 || (ballRef.current.vy || 0) > 0.1 || (ballRef.current.rotation || 0) !== 0) {
                        p.push();
                        p.translate(ballRef.current.x, ballRef.current.y);
                        p.rotate(ballRef.current.rotation || 0);
                        p.image(ballImg, -ballSize, -ballSize, ballDiameter, ballDiameter);
                        p.pop();
                    } else {
                        // Sin rotación para mejor performance cuando está estática
                        p.image(ballImg, ballRef.current.x - ballSize, ballRef.current.y - ballSize, ballDiameter, ballDiameter);
                    }
                };

                // Optimizar orden de dibujo basado en Z-index
                if (ballRef.current.vy > 0) {
                    drawRotatedBall();
                    p.image(hoopRingImg, hoopRingX, HOOP_RING_Y, HOOP_RING_WIDTH, HOOP_RING_HEIGHT);
                } else {
                    p.image(hoopRingImg, hoopRingX, HOOP_RING_Y, HOOP_RING_WIDTH, HOOP_RING_HEIGHT);
                    drawRotatedBall();
                }
            } else {
                // Modo debug más eficiente
                p.noStroke();
                p.fill(255, 165, 0);
                const debugBallSize = ballRef.current.r * 2 * ballScale;
                p.ellipse(ballRef.current.x, ballRef.current.y, debugBallSize);
                
                p.fill(255, 0, 0);
                p.rect(hoopXRef.current - 37.5, HOOP_RING_Y, 75, 20);
                
                p.fill(255);
                p.textSize(12);
                p.text("Debug mode", 10, 20);
            }
        };

        // Función optimizada para manejar inicio de arrastre
        const handleDragStart = (x, y) => {
            if (
                gameStarted &&
                turnRef.current === playerIndexRef.current &&
                !ballRef.current.thrown &&
                attemptsRef.current[playerIndexRef.current] < 5
            ) {
                const ballRadius = ballRef.current.r * ballScale;
                
                // Optimización: usar distancia al cuadrado para evitar sqrt
                const distanceSquared = Math.pow(x - ballRef.current.x, 2) + Math.pow(y - ballRef.current.y, 2);
                const radiusSquared = ballRadius * ballRadius;
                
                if (distanceSquared <= radiusSquared) {
                    dragging = true;
                    dragStartX = x;
                    dragStartY = y;
                }
            }
        };

        // Función optimizada para manejar fin de arrastre
        const handleDragEnd = (x, y) => {
            if (dragging) {
                const dx = x - dragStartX;
                const dy = y - dragStartY;
                const distanceSquared = dx * dx + dy * dy;
                const power = Math.min(Math.max(Math.sqrt(distanceSquared) / 10, 0.2), 15.5);
                const angle = Math.atan2(dy, dx);
                const vx = power * Math.cos(angle);
                const vy = power * Math.sin(angle);

                if (wsRef.current?.readyState === 1) {
                    wsRef.current.send(
                        JSON.stringify({
                            type: 'shot',
                            room: currentRoom || 'room1',
                            playerIndex: playerIndexRef.current,
                            ballVX: vx,
                            ballVY: vy,
                        })
                    );
                }

                dragging = false;
            }
        };

        // Eventos de mouse
        p.mousePressed = () => handleDragStart(p.mouseX, p.mouseY);
        p.mouseReleased = () => handleDragEnd(p.mouseX, p.mouseY);

        // Eventos de touch optimizados para móvil
        p.touchStarted = (event) => {
            if (event.touches?.length > 0) {
                const rect = p.canvas.getBoundingClientRect();
                const touch = event.touches[0];
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                handleDragStart(x, y);
                return false;
            }
        };

        p.touchEnded = (event) => {
            if (event.changedTouches?.length > 0) {
                const rect = p.canvas.getBoundingClientRect();
                const touch = event.changedTouches[0];
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                handleDragEnd(x, y);
                return false;
            }
        };

        // Eliminar mouseDragged completamente - no es necesario y consume recursos
        p.mouseDragged = () => {
            // Vacío intencionalmente para mejor performance
        };
    };

    useEffect(() => {
        if (!isMounted.current && sketchRef.current && gameStarted) {
            p5Instance.current = new window.p5(setupSketch, sketchRef.current);
            isMounted.current = true;
        }

        // Optimizar manejo de WebSocket - usar throttling implícito
        let lastUpdateTime = 0;
        const handleMessage = (event) => {
            const now = performance.now();
            // Throttle a máximo 60 actualizaciones por segundo
            if (now - lastUpdateTime < 16.67) return;
            lastUpdateTime = now;
            
            try {
                const data = JSON.parse(event.data);
                
                if (['update', 'newRound', 'scoreUpdate', 'start', 'joined'].includes(data.type)) {
                    // Actualización batch para mejor performance
                    let needsUpdate = false;
                    
                    if (data.ball) {
                        Object.assign(ballRef.current || {}, data.ball);
                        if (!ballRef.current.r) ballRef.current.r = 30;
                        needsUpdate = true;
                    }
                    if (data.hoopX !== undefined) { 
                        hoopXRef.current = data.hoopX;
                        needsUpdate = true;
                    }
                    if (data.timer !== undefined) timerRef.current = data.timer;
                    if (data.attempts) attemptsRef.current = data.attempts;
                    if (data.playerIcons) playerIconsRef.current = data.playerIcons;
                    if (data.scores) scoresRef.current = data.scores;
                    if (data.turn !== undefined) turnRef.current = data.turn;
                    if (data.round !== undefined) roundRef.current = data.round;
                    if (data.players) playersRef.current = data.players;
                    if (data.playerIndex !== undefined) playerIndexRef.current = data.playerIndex;
                    
                    // Solo forzar re-render si hay cambios importantes
                    if (needsUpdate) {
                        setForceUpdate((prev) => prev + 1);
                    }
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        if (wsRef.current) {
            wsRef.current.addEventListener('message', handleMessage);
        }

        return () => {
            if (p5Instance.current) {
                p5Instance.current.remove();
                p5Instance.current = null;
                isMounted.current = false;
            }
            if (wsRef.current) {
                wsRef.current.removeEventListener('message', handleMessage);
            }
        };
    }, [gameStarted]);

    return (
        <div className={`gameplay ${gameStarted ? 'in-game' : 'waiting'}`}>
            <div className="game-container">
                <div ref={sketchRef}></div>

                <div className="score-container">
                    <div className="score-player player1-score">{scoresRef.current[0]}</div>
                    <div className="score-player player2-score">{scoresRef.current[1]}</div>
                </div>

                <div className="turn">Turno: {playersRef.current[turnRef.current] || 'Esperando...'}</div>
                <div className="round">Ronda {roundRef.current}/3</div>

                {playersRef.current[0] && (
                    <React.Fragment>
                        <div className="player-icon player1">
                            <img src={playerIconsRef.current[0]} alt="Player 1" />
                        </div>
                        <div className="player-name player1-name">{playersRef.current[0]}</div>
                    </React.Fragment>
                )}

                {playersRef.current[1] && (
                    <React.Fragment>
                        <div className="player-icon player2">
                            <img src={playerIconsRef.current[1]} alt="Player 2" />
                        </div>
                        <div className="player-name player2-name">{playersRef.current[1]}</div>
                    </React.Fragment>
                )}

                {gameStarted && (
                    <React.Fragment>
                        <div className={`timer player1-timer ${turnRef.current === 0 ? 'active' : ''}`}>
                            <div className="timer-bar" style={{ width: `${timerRef.current * 12.5}%` }}></div>
                        </div>
                        <div className={`timer player2-timer ${turnRef.current === 1 ? 'active' : ''}`}>
                            <div className="timer-bar" style={{ width: `${timerRef.current * 12.5}%` }}></div>
                        </div>
                    </React.Fragment>
                )}

                {!gameStarted && <div className="waiting-message">Esperando al segundo jugador...</div>}
            </div>
        </div>
    );
};
