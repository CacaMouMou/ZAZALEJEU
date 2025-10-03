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


        // CHARGEMENT AUDIO

        this.load.audio('music', 'assets/EN VAIN.wav'); // Musique de fond (WAV)

        this.load.audio('sfx_relay', 'assets/relay_success.mp3'); // NOUVEAU: SFX du relais (MP3)

    }


    create() {

        this.cameras.main.setBackgroundColor('#4444FF'); 

        isGameActive = true;

        score = 0;

        scrollSpeed = 4;

        playerLane = 1;


        // --- 1. Décors (Garantis) ---

        // Ciel (bgLayer)

        if (this.textures.exists('bg_sky')) {

            bgLayer = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg_sky').setOrigin(0, 0); 

        } else {

            bgLayer = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x4444FF).setOrigin(0);

        }

        

        // Route (Couche intermédiaire) : 50% de la hauteur, commence à 300px

        if (this.textures.exists('mid_road')) {

            midLayer = this.add.tileSprite(0, ROAD_Y_START, GAME_WIDTH, ROAD_HEIGHT, 'mid_road').setOrigin(0, 0);

        } else {

            midLayer = this.add.rectangle(0, ROAD_Y_START, GAME_WIDTH, ROAD_HEIGHT, 0x444444).setOrigin(0);

        }

        

        // Lignes de route (si l'image de route manque)

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

        scoreText = this.add.text(50, 50, 'RELAIS: 0', { fontSize: '32px', fill: '#FFF' }).setDepth(10);

        

        // Texte d'objectif en haut

        const objectiveText = `OBJECTIF: ${VICTORY_SCORE} RELAIS - Aide ${this.game.config.gameTitle} à faire passer son truc à ses clones.`;

        this.add.text(GAME_WIDTH / 2, 20, objectiveText, { fontSize: '20px', fill: '#FFD700', align: 'center' }).setOrigin(0.5, 0).setDepth(10);

        

        this.add.text(750, 50, `MEILLEUR: ${highScore}`, { fontSize: '32px', fill: '#FFD700' }).setOrigin(1, 0).setDepth(10);

        

        // --- 6. Musique de Fond (BGM) ---

        backgroundMusic = this.sound.add('music', { loop: true, volume: 0.5 }); 

        backgroundMusic.play();



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

        cigaretteFlame.setPosition(player.x + 30, player.y - 30);

        

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

                // Message de défaite mis à jour pour inclure l'objectif manqué

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

        // NOUVEAU: Joue l'effet sonore de succès

        this.sound.play('sfx_relay', { volume: 0.8 }); 

        

        score++;

        scrollSpeed *= 1.03; 

        scoreText.setText(`RELAIS: ${score}`);


        // Condition de victoire !

        if (score >= VICTORY_SCORE) {

            this.endGame(true, `Incroyable ! ${this.game.config.gameTitle} a réussi à faire passer son truc.`);

            return;

        }


        newPlayerSprite.clearTint();

        player.destroy(); 

        player = newPlayerSprite; 

        

        nextRelayRunner = null; 

        this.spawnRelayRunner();

    }


    endGame(isVictory, reason) {

        if (!isGameActive) return;

        

        isGameActive = false;

        

        // Arrêt de la musique lorsque le jeu se termine

        if (backgroundMusic) {

            backgroundMusic.stop();

        }


        if (score > highScore) {

            highScore = score;

        }


        if (player) player.setTint(0xAAAAAA); 

        cigaretteFlame.setVisible(false);

        if(nextRelayRunner) nextRelayRunner.destroy();


        // --- Affichage des messages et couleurs ---

        const messageTitle = isVictory ? `VICTOIRE ! 🔥\nMISSION ACCOMPLIE` : 'FLAMME ÉTEINTE !';

        const messageColor = isVictory ? '#00FF00' : '#FF0000';

        const buttonText = isVictory ? 'NOUVELLE COURSE' : 'RÉESSAYER';

        const instagramText = `Retrouve ${this.game.config.gameTitle} sur Insta : ${INSTAGRAM_HANDLE}`;


        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, messageTitle, { 

            fontSize: isVictory ? '40px' : '48px', 

            fill: messageColor, 

            align: 'center' 

        }).setOrigin(0.5).setDepth(10);

        

        // Texte de raison/objectif

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, reason, { fontSize: '24px', fill: isVictory ? '#00AA00' : '#FF8888', align: 'center' }).setOrigin(0.5).setDepth(10);

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, `Score final : ${score} relais.`, { fontSize: '28px', fill: '#FFFFFF' }).setOrigin(0.5).setDepth(10);



        // Bouton Rejouer

        const replayButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, buttonText, { 

            fontSize: '40px', 

            fill: '#FFF', 

            backgroundColor: '#440000',

            padding: { x: 20, y: 10 }

        })

        .setOrigin(0.5)

        .setInteractive({ useHandCursor: true }).setDepth(10); 


        replayButton.on('pointerdown', () => {

            this.scene.restart();

        });

        

        // Bouton Single / Spotify

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 160, '🎧 ÉCOUTER LA MUSIQUE DE SHADOW MAS 🎧', { 

            fontSize: '30px', 

            fill: '#0F0', 

            backgroundColor: '#004400',

            padding: { x: 15, y: 8 }

        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)

        .on('pointerdown', () => {

            window.open(SPOTIFY_LINK, '_blank'); 

        });

        

        // Lien Instagram

        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 220, instagramText, { 

            fontSize: '20px', 

            fill: '#AADDFF', 

        }).setOrigin(0.5).setDepth(10)

        .setInteractive({ useHandCursor: true })

        .on('pointerdown', () => {

             window.open(`https://www.instagram.com/${INSTAGRAM_HANDLE.replace('@', '')}`, '_blank'); 

        });

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

            debug: true 

        }

    },

    scene: [GameScene], 

    scale: {

        mode: Phaser.Scale.FIT,

        autoCenter: Phaser.Scale.CENTER_BOTH

    },

    gameTitle: "Shadow Mas", 

    // CORRECTION POUR LE DÉPLOIEMENT (permet de fonctionner en local ET sur GitHub Pages)

    baseURL: (location.hostname.includes('github.io') || location.hostname.includes('netlify')) 

             ? '/shadow-mas-game/' 

             : '',

};


new Phaser.Game(config);
