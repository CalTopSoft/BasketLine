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
        let hoopBaseWidth, hoopBaseHeight, hoopRingWidth, hoopRingHeight;

        // Detectar dispositivos con menos de 4 GB de RAM
        const isLowEndDevice = (() => {
            const cores = navigator.hardwareConcurrency || 4; // Valor por defecto si no está disponible
            const memoryInfo = window.performance.memory;
            const hasLowMemory = memoryInfo && memoryInfo.jsHeapSizeLimit < 4 * 1024 * 1024 * 1024; // Menos de 4 GB
            return cores <= 2 || hasLowMemory || window.innerWidth <= 768;
        })();

        p.preload = () => {
            ballImg = p.loadImage('img/balon/ball.png');
            hoopBaseImg = p.loadImage('img/arco/hoop_base.png');
            hoopRingImg = p.loadImage('img/arco/hoop_ring.png');
            console.log(`Recursos cargados para ${isLowEndDevice ? 'dispositivo de baja potencia' : 'dispositivo estándar'}`);
        };

        p.setup = () => {
            const canvasWidth = isLowEndDevice ? 480 : 600;
            const canvasHeight = isLowEndDevice ? 392 : 490;
            p.createCanvas(canvasWidth, canvasHeight);
            p.pixelDensity(isLowEndDevice ? 0.5 : 1); // Reducir densidad de píxeles en dispositivos débiles
            p.frameRate(60); // Priorizar 60 FPS en todos los dispositivos
            p.background(200, 220, 255); // Fondo sólido para evitar p.clear()
            hoopBaseWidth = 240;
            hoopBaseHeight = hoopBaseWidth * (3464 / 2598);
            hoopRingWidth = 75;
            hoopRingHeight = hoopRingWidth * (499 / 788);
        };

        p.draw = () => {
            if (!ballRef.current) {
                ballRef.current = { x: 300, y: 405, r: 30, vx: 0, vy: 0, thrown: false, rotation: 0 };
            }
            if (!ballRef.current.r) ballRef.current.r = 30;
            if (!hoopXRef.current) hoopXRef.current = 300;

            // Simplificar cálculo de escala en dispositivos débiles
            ballScale = isLowEndDevice ? 0.9 : p.constrain(p.map(ballRef.current.y, 405, 113, 1, 0.8), 0.8, 1);

            if (ballImg && hoopBaseImg && hoopRingImg) {
                p.image(hoopBaseImg, hoopXRef.current - hoopBaseWidth / 1.98, 40, hoopBaseWidth, hoopBaseHeight);

                const drawRotatedBall = () => {
                    p.push();
                    p.translate(ballRef.current.x, ballRef.current.y);
                    if (!isLowEndDevice) {
                        p.rotate(ballRef.current.rotation || 0); // Desactivar rotación en dispositivos débiles
                    }
                    p.image(
                        ballImg,
                        -ballRef.current.r * ballScale,
                        -ballRef.current.r * ballScale,
                        ballRef.current.r * 2 * ballScale,
                        ballRef.current.r * 2 * ballScale
                    );
                    p.pop();
                };

                if (ballRef.current.vy > 0) {
                    drawRotatedBall();
                    p.image(hoopRingImg, hoopXRef.current - hoopRingWidth / 2.2, 113, hoopRingWidth, hoopRingHeight);
                } else {
                    p.image(hoopRingImg, hoopXRef.current - hoopRingWidth / 2.2, 113, hoopRingWidth, hoopRingHeight);
                    drawRotatedBall();
                }
            } else {
                p.fill(255, 165, 0);
                p.ellipse(ballRef.current.x, ballRef.current.y, ballRef.current.r * 2 * ballScale);
                p.fill(255, 0, 0);
                p.rect(hoopXRef.current - 37.5, 113, 75, 20);
                p.fill(255);
                p.text("Imágenes no cargadas - modo debug", 10, 20);
            }

            // Monitoreo de FPS en modo debug
            if (isLowEndDevice && p.frameCount % 60 === 0) {
                console.log(`FPS: ${p.frameRate().toFixed(1)}`);
            }
        };

        p.mousePressed = () => {
            if (
                gameStarted &&
                turnRef.current === playerIndexRef.current &&
                !ballRef.current.thrown &&
                attemptsRef.current[playerIndexRef.current] < 5
            ) {
                const ballCenterX = ballRef.current.x;
                const ballCenterY = ballRef.current.y;
                const ballRadius = ballRef.current.r * ballScale;
                const distance = Math.sqrt(
                    (p.mouseX - ballCenterX) ** 2 + (p.mouseY - ballCenterY) ** 2
                );

                if (distance <= ballRadius) {
                    dragging = true;
                    dragStartX = p.mouseX;
                    dragStartY = p.mouseY;
                }
            }
        };

        p.mouseReleased = () => {
            if (dragging) {
                const dx = p.mouseX - dragStartX;
                const dy = p.mouseY - dragStartY;
                const power = Math.min(Math.max(Math.sqrt(dx * dx + dy * dy) / 10, 0.2), 15.5);
                const angle = Math.atan2(dy, dx);
                const vx = power * Math.cos(angle);
                const vy = power * Math.sin(angle);

                if (wsRef.current && wsRef.current.readyState === 1) {
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

        p.mouseDragged = () => {
            if (dragging) {
                // Opcional: mostrar línea de trayectoria
            }
        };
    };

    useEffect(() => {
        if (!isMounted.current && sketchRef.current && gameStarted) {
            p5Instance.current = new window.p5(setupSketch, sketchRef.current);
            isMounted.current = true;

            // Escalar canvas con CSS para mantener tamaño visual
            if (navigator.hardwareConcurrency <= 2 || (window.performance.memory && window.performance.memory.jsHeapSizeLimit < 4 * 1024 * 1024 * 1024) || window.innerWidth <= 768) {
                sketchRef.current.style.width = '600px';
                sketchRef.current.style.height = '490px';
            }
        }

        let lastUpdate = 0;
        const DEBOUNCE_MS = 16; // ~60 FPS

        const handleMessage = (event) => {
            const now = Date.now();
            if (now - lastUpdate < DEBOUNCE_MS) return;
            lastUpdate = now;

            const data = JSON.parse(event.data);
            if (['update', 'newRound', 'scoreUpdate', 'start', 'joined'].includes(data.type)) {
                if (data.ball) {
                    ballRef.current = { ...ballRef.current, ...data.ball, r: data.ball.r || 30 };
                }
                if (data.hoopX !== undefined) hoopXRef.current = data.hoopX;
                if (data.timer !== undefined) timerRef.current = data.timer;
                if (data.attempts) attemptsRef.current = data.attempts;
                if (data.playerIcons) playerIconsRef.current = data.playerIcons;
                if (data.scores) scoresRef.current = data.scores;
                if (data.turn !== undefined) turnRef.current = data.turn;
                if (data.round !== undefined) roundRef.current = data.round;
                if (data.players) playersRef.current = data.players;
                if (data.playerIndex !== undefined) playerIndexRef.current = data.playerIndex;
                setForceUpdate((prev) => prev + 1);
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
