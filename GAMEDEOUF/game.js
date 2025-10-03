// ====================================================================
// CONFIGURATION ET VARIABLES GLOBALES DU RELAIS EN LIGNES
// ====================================================================

// --- Constantes de Positionnement ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

// Lanes condensées et déplacées vers le bas (dans les 50% inférieurs)
const LANE_Y = [
    350, // Ligne du haut (Gauche)
    450, // Ligne du milieu
    550  // Ligne du bas (Droite)
];
const PLAYER_X = 100; 
const RELAY_TARGET_X = GAME_WIDTH + 100; 
const VICTORY_SCORE = 15; 

// --- Constantes de la Route (50% de la hauteur totale) ---
const ROAD_Y_START = GAME_HEIGHT * 0.5; // 300
const ROAD_HEIGHT = GAME_HEIGHT * 0.5;  // 300

// --- Liens Promotionnels ---
const SPOTIFY_LINK = 'https://open.spotify.com/intl-fr/artist/6gQQrSMHA7SfUEoGSVezPX?si=nyoDsOx5SvuozWH0V4N7Bw'; 
const INSTAGRAM_HANDLE = '@shadowmas_';

// --- Variables de Jeu ---
let player; 
let playerLane = 1; 
let nextRelayRunner; 
let scrollSpeed = 4; 
let score = 0;
let scoreText;
let highScore = 0;
let isGameActive = true;
let cigaretteFlame; 
let backgroundMusic; // Variable pour la musique de fond

// --- Variables de Décor ---
let bgLayer; 
let midLayer; 
let roadLines; 


// ====================================================================
// SCÈNE UNIQUE DU JEU (GameScene)
// ====================================================================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // CHARGEMENT DES ASSETS (Chemins simples pour compatibilité locale/distante)
        this.load.image('player', 'assets/player.png'); 
        this.load.image('cigarette', 'assets/cigarette.png'); 
        
        // CHARGEMENT DES DECORS
        this.load.image('bg_sky', 'assets/bg_sky.png'); 
        this.load.image('mid_road', 'assets/mid_road.png');

        // CHARGEMENT AUDIO (Le son de défaite est retiré)
        this.load.audio('music', [
            'assets/EN VAIN.mp3', 
            'assets/EN VAIN.wav'  
        ]); 
        this.load.audio('sfx_relay', 'assets/relay_success.mp3'); 
    }

    create() {
        this.cameras.main.setBackgroundColor('#4444FF'); 
        isGameActive = true;
        score = 0;
        scrollSpeed = 4;
        playerLane = 1;

        // --- 1. Décors (Garantis) ---
        if (this.textures.exists('bg_sky')) {
            bgLayer = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_sky').setOrigin(0, 0); 
        } else {
            bgLayer = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x4444FF).setOrigin(0);
        }
        if (this.textures.exists('mid_road')) {
            midLayer = this.add.tileSprite(0, ROAD_Y_START, GAME_WIDTH, ROAD_HEIGHT, 'mid_road').setOrigin(0, 0);
        } else {
            midLayer = this.add.rectangle(0, ROAD_Y_START, GAME_WIDTH, ROAD_HEIGHT, 0x444444).setOrigin(0);
        }
        roadLines = this.add.group();
        if (!this.textures.exists('mid_road')) {
            for (let i = 0; i < LANE_Y.length; i++) {
                const line = this.add.rectangle(0, LANE_Y[i], GAME_WIDTH * 2, 5, 0xFFFFFF).setOrigin(0, 0.5).setDepth(1);
                roadLines.add(line);
            }
        }


        // --- 2. Création du Joueur ---
        player = this.add.sprite(PLAYER_X, LANE_Y[playerLane], 'player').setScale(0.15).setDepth(2);
        
        // --- 3. La Flamme ---
        cigaretteFlame = this.add.sprite(player.x + 30, player.y - 30, 'cigarette').setScale(0.1).setDepth(3);

        // --- 4. Génération du premier Relieur ---
        this.spawnRelayRunner();

        // --- 5. UI (Score, Meilleur Score et Objectif) ---
        const defaultTextStyle = { fontSize: '32px', fill: '#FFF' };

        scoreText = this.add.text(50, 50, 'RELAIS: 0', defaultTextStyle).setDepth(10);
        
        const objectiveText = `OBJECTIF: ${VICTORY_SCORE} RELAIS - Aide ${this.game.config.gameTitle} à faire passer son truc à ses clones.`;
        this.add.text(GAME_WIDTH / 2, 20, objectiveText, { fontSize: '20px', fill: '#FFD700', align: 'center' }).setOrigin(0.5, 0).setDepth(10);
        
        this.add.text(750, 50, `MEILLEUR: ${highScore}`, { fontSize: '32px', fill: '#FFD700' }).setOrigin(1, 0).setDepth(10);
        
        // --- 6. Musique de Fond (BGM) ---
        backgroundMusic = this.sound.add('music', { loop: true, volume: 0.5 }); 
        
        // Gère le déblocage forcé de l'audio 
        if (this.sound.locked) {
            this.input.once('pointerdown', () => {
                this.sound.unlock();
                if (!backgroundMusic.isPlaying) {
                   backgroundMusic.play();
                }
            }, this);
        } else {
             backgroundMusic.play();
        }


        // --- 7. Contrôles ---
        this.input.keyboard.on('keydown-UP', () => this.changeLane(-1), this); 
        this.input.keyboard.on('keydown-DOWN', () => this.changeLane(1), this); 
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < GAME_HEIGHT / 2) {
                this.changeLane(-1);
            } else {
                this.changeLane(1);
            }
        }, this);
    }

    update(time, delta) {
        if (!player || !isGameActive) {
            if (isGameActive) {
                 this.endGame(false, 'Erreur critique : Personnage manquant');
            }
            return;
        }

        // --- Mouvement des Décors (Parallax) ---
        if (bgLayer.tilePositionX !== undefined) {
             bgLayer.tilePositionX += scrollSpeed * 0.1;
        }
        if (midLayer.tilePositionX !== undefined) {
            midLayer.tilePositionX += scrollSpeed * 1.0; 
        }

        // Défilement des lignes de route (si l'image de route manque)
        if (roadLines.getChildren().length > 0 && midLayer.tilePositionX === undefined) {
             roadLines.getChildren().forEach(line => {
                line.x -= scrollSpeed;
                if (line.x < -line.width) {
                    line.x = GAME_WIDTH;
                }
             });
        }
        
        // --- Mise à jour du Joueur et de la Flamme ---
        if (player) { 
            cigaretteFlame.setPosition(player.x + 30, player.y - 30);
        }
        
        // --- Mouvement du Relieur et Vérification du Relais/Échec ---
        if (nextRelayRunner) {
            nextRelayRunner.x -= scrollSpeed;

            const distance = nextRelayRunner.x - player.x;

            if (distance < 50 && distance > -50) { 
                if (nextRelayRunner.y === player.y) {
                    this.performRelay(nextRelayRunner);
                    return; 
                }
            }
            
            // ÉCHEC (défaite)
            if (nextRelayRunner.x < player.x - 100) { 
                this.endGame(false, `Relais manqué ! Aide ${this.game.config.gameTitle} à faire passer son truc à ses clones.`);
            }
        }
        
        scrollSpeed += 0.00005 * delta; 
    }

    // --- Fonctions de Gameplay ---
    
    changeLane(direction) {
        if (!isGameActive) return;

        let newLane = playerLane + direction;
        
        if (newLane >= 0 && newLane < LANE_Y.length) {
            playerLane = newLane;
            
            this.tweens.add({
                targets: player,
                y: LANE_Y[playerLane],
                duration: 150, 
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    spawnRelayRunner() {
        if(nextRelayRunner) nextRelayRunner.destroy(); 
        
        let targetLane = Phaser.Math.Between(0, LANE_Y.length - 1);
        while (targetLane === playerLane) {
            targetLane = Phaser.Math.Between(0, LANE_Y.length - 1);
        }
        
        nextRelayRunner = this.add.sprite(RELAY_TARGET_X, LANE_Y[targetLane], 'player').setScale(0.15).setDepth(2);
        nextRelayRunner.setTint(0xFF00FF);
    }

    performRelay(newPlayerSprite) {
        // 1. Mise à jour des stats et jeu du son
        this.sound.play('sfx_relay', { volume: 0.8 }); 
        score++;
        scrollSpeed *= 1.03; 
        scoreText.setText(`RELAIS: ${score}`);

        // 2. Vérification de victoire
        if (score >= VICTORY_SCORE) {
            this.endGame(true, `Incroyable ! ${this.game.config.gameTitle} a réussi à faire passer son truc.`);
            return;
        }

        // 3. Changement de personnage
        newPlayerSprite.clearTint();
        
        const oldPlayer = player; 
        player = newPlayerSprite; 
        
        // On déplace la flamme sur le nouveau joueur AVANT de détruire l'ancien
        if (cigaretteFlame) {
             cigaretteFlame.setPosition(player.x + 30, player.y - 30);
        }
        
        oldPlayer.destroy(); // Destruction de l'ancien joueur

        // 4. Lancement du nouveau relai
        nextRelayRunner = null; 
        this.spawnRelayRunner();
    }

    endGame(isVictory, reason) {
        if (!isGameActive) return;
        
        try {
            isGameActive = false;
            const currentScene = this; 
            const sceneKey = 'GameScene'; 

            // 1. 🛑 ARRÊT DE LA MUSIQUE 🛑
            if (backgroundMusic && backgroundMusic.isPlaying) {
                backgroundMusic.stop(); // Arrête la lecture de la musique
            }
            
            // 2. Nettoyage des sprites
            if (score > highScore) {
                highScore = score;
            }

            if (player) player.setTint(0xAAAAAA); 
            if (cigaretteFlame) cigaretteFlame.setVisible(false); 
            if(nextRelayRunner) nextRelayRunner.destroy();

            // ⬛️ Écran noir de fin de partie
            const blackScreen = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000)
                .setOrigin(0)
                .setAlpha(0.8) 
                .setDepth(9); 


            // --- 3. Affichage des messages et boutons ---
            const messageTitle = isVictory ? `VICTOIRE ! 🔥\nMISSION ACCOMPLIE` : 'FLAMME ÉTEINTE !';
            const messageColor = isVictory ? '#00FF00' : '#FF0000';
            const buttonText = isVictory ? 'NOUVELLE COURSE' : 'RÉESSAYER';
            const instagramText = `Retrouve ${this.game.config.gameTitle} sur Insta : ${INSTAGRAM_HANDLE}`;

            const textStyleBase = { 
                fontSize: '28px', 
                fill: '#FFFFFF',
                align: 'center'
            };

            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, messageTitle, { 
                ...textStyleBase,
                fontSize: isVictory ? '40px' : '48px', 
                fill: messageColor, 
            }).setOrigin(0.5).setDepth(10);
            
            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, reason, { 
                ...textStyleBase,
                fontSize: '24px', 
                fill: isVictory ? '#00AA00' : '#FF8888', 
            }).setOrigin(0.5).setDepth(10);
            
            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, `Score final : ${score} relais.`, { 
                ...textStyleBase,
            }).setOrigin(0.5).setDepth(10);


            // Bouton Rejouer
            const replayButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, buttonText, { 
                ...textStyleBase,
                fontSize: '40px', 
                fill: '#FFF', 
                backgroundColor: '#440000',
                padding: { x: 20, y: 10 },
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true }).setDepth(10); 

            // Redémarrage de la scène (méthode stop/start pour une stabilité maximale)
            replayButton.on('pointerdown', () => {
                if (currentScene.scene.isActive(sceneKey)) {
                    currentScene.scene.stop(sceneKey); 
                    currentScene.scene.start(sceneKey); 
                }
            });
            
            // Bouton Single / Spotify
            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, '🎧 ÉCOUTER LA MUSIQUE DE SHADOW MAS 🎧', { 
                ...textStyleBase,
                fontSize: '30px', 
                fill: '#0F0', 
                backgroundColor: '#004400',
                padding: { x: 15, y: 8 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
            .on('pointerdown', () => {
                window.open(SPOTIFY_LINK, '_blank'); 
            });
            
            // Lien Instagram
            this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 220, instagramText, { 
                ...textStyleBase,
                fontSize: '20px', 
                fill: '#AADDFF', 
            }).setOrigin(0.5).setDepth(10)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                 window.open(`https://www.instagram.com/${INSTAGRAM_HANDLE.replace('@', '')}`, '_blank'); 
            });
        
        } catch (e) {
            console.error("Erreur critique dans endGame :", e);
        }
    }
}

// ====================================================================
// LANCEMENT DU JEU
// ====================================================================

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    physics: {
        default: 'arcade',
        arcade: {
            // debug: true 
        }
    },
    scene: [GameScene], 
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    gameTitle: "Shadow Mas", 
    // CORRECTION CRITIQUE POUR GITHUB PAGES
    baseURL: (location.hostname.includes('github.io') || location.hostname.includes('netlify')) 
             ? '/Shadow-Mas-Game/' 
             : '',
};

new Phaser.Game(config);
