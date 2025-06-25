const SoundManager = (() => {
    let backgroundSound = null;
    let bounceSound = null;
    let hoopHitSound = null;
    let wheelsSound = null;
    let scoreSound = null;
    let scoreAddSound = null;
    let winSound = null;
    let loseSound = null;
    let chatNotificationSound = null; // Nuevo sonido para notificación de chat
    let isSoundPlaying = false;
    let isWheelsPlaying = false;

    const init = () => {
        backgroundSound = new Audio('sound/background.mp3'); // Corregido .b3 a .mp3
        backgroundSound.loop = true;
        backgroundSound.volume = 0.4;

        bounceSound = new Audio('sound/ball_bounce.mp3');
        hoopHitSound = new Audio('sound/hoop_hit.mp3');
        wheelsSound = new Audio('sound/wheels.mp3');
        wheelsSound.volume = 0.3;
        wheelsSound.loop = true;

        scoreSound = new Audio('sound/score.mp3'); // Corregido
        scoreAddSound = new Audio('sound/score_add.mp3'); // Corregido
        winSound = new Audio('sound/win.mp3'); // Corregido
        loseSound = new Audio('sound/lose.mp3'); // Corregido
        chatNotificationSound = new Audio('sound/chat_notification.mp3'); // Nuevo sonido
        chatNotificationSound.volume = 0.6; // Volumen moderado para la notificación

        const allSounds = [
            backgroundSound,
            bounceSound,
            hoopHitSound,
            wheelsSound,
            scoreSound,
            scoreAddSound,
            winSound,
            loseSound,
            chatNotificationSound, // Añadir al array de sonidos
        ];

        allSounds.forEach((sound) => {
            sound.onerror = () => console.error(`Error al cargar ${sound.src}`);
            sound.onloadeddata = () => console.log(`${sound.src} cargado`);
        });

        console.log("SoundManager inicializado con API de audio nativa");
    };

    const playBackground = () => {
        if (backgroundSound && !isSoundPlaying) {
            backgroundSound.play().catch((err) =>
                console.error("Error al reproducir el sonido de fondo:", err)
            );
            isSoundPlaying = true;
            console.log("Se inició el sonido de fondo.");
        }
    };

    const stopBackground = () => {
        if (backgroundSound) {
            backgroundSound.pause();
            backgroundSound.currentTime = 0;
            isSoundPlaying = false;
            console.log("El sonido de fondo se detuvo");
        }
    };

    const playWheels = () => {
        if (wheelsSound && !isWheelsPlaying) {
            wheelsSound.play().catch((err) =>
                console.error("Error al reproducir wheels:", err)
            );
            isWheelsPlaying = true;
            console.log("Sonido wheels iniciado");
        }
    };

    const stopWheels = () => {
        if (wheelsSound && isWheelsPlaying) {
            wheelsSound.pause();
            wheelsSound.currentTime = 0;
            isWheelsPlaying = false;
            console.log("Sonido wheels detenido");
        }
    };

    const playSound = (soundType) => {
        const soundMap = {
            bounce: bounceSound,
            hoopHit: hoopHitSound,
            score: scoreSound,
            scoreAdd: scoreAddSound,
            win: winSound,
            lose: loseSound,
            chatNotification: chatNotificationSound, // Añadir al mapa de sonidos
        };

        const sound = soundMap[soundType];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch((err) =>
                console.error(`Error al reproducir ${soundType} sonido:`, err)
            );
            console.log(`${soundType} sonido reproducido`);
        }
    };

    const cleanup = () => {
        stopBackground();
        stopWheels();
        [bounceSound, hoopHitSound, scoreSound, scoreAddSound, winSound, loseSound, chatNotificationSound].forEach((sound) => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
    };

    return {
        init,
        playBackground,
        stopBackground,
        playWheels,
        stopWheels,
        playSound,
        cleanup,
    };
})();
