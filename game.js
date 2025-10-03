// ====================================================================
// CONFIGURATION ET VARIABLES GLOBALES : HIGH SCORE INFINI V6.0 (FIABILISÉ)
// ====================================================================

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const MAX_HITS = 5;         // 5 touches max avant la défaite
const HIT_TOLERANCE = 5;    // Tolérance en pixels autour du centre pour la collision

// Constantes de centre pour la fiabilité de la collision
const PLAYER_CENTER_X = GAME_WIDTH / 2;
const PLAYER_CENTER_Y = GAME_HEIGHT / 2;

// --- Variables de Jeu ---
let player; 
let zazaGroup;
let score = 0;              
let highScore = 0;
let scoreText;
let hitsTaken = 0;
let hitsText;
let isGameActive = true;
let spawnTimer;
let backgroundMusic; 
let currentZazaSpeed = 4000; 
const ACCEL_RATE = 50; 


// ====================================================================
// SCÈNE UNIQUE DU JEU (GameScene)
// ====================================================================
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // CHARGEMENT DES ASSETS
        this.load.image('player', 'assets/player.png'); 
        this.load.image('zaza_icon', 'assets/zaza_icon.png');
        this.load.image('bg_dark', 'assets/bg_dark.png'); // Fond simple
        
        // CHARGEMENT AUDIO
        this.load.audio('music', [
            'assets/EN VAIN.mp3', 
            'assets/EN VAIN.wav'  
        ]); 
        this.load.audio('sfx_tap', 'assets/sfx_tap.mp3');     
        this.load.audio('sfx_hit', 'assets/sfx_hit.mp3');     
    }

    create() {
        this.cameras.main.setBackgroundColor('#222222'); 
        isGameActive = true;
        hitsTaken = 0;
        score = 0;
        currentZazaSpeed = 4000;
        
        // --- 1. Décors ---
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111111).setOrigin(0, 0);

        // --- 2. Création du Joueur (Sprite Physique) ---
        player = this.physics.add.sprite(PLAYER_CENTER_X, PLAYER_CENTER_Y, 'player')
                   .setScale(0.3).setDepth(2).setImmovable(true); 
        player.setTint(0xFFFFFF); 

        // --- 3. Groupes d'objets ---
        zazaGroup = this.physics.add.group();

        // --- 4. UI ---
        const defaultTextStyle = { fontSize: '48px', fill: '#FFF', align: 'center' };
        const secondaryTextStyle = { fontSize: '30px', fill: '#FFD700' };
        
        scoreText = this.add.text(50, 50, 'SCORE: 0s', defaultTextStyle).setOrigin(0, 0).setDepth(10);
        this.add.text(750, 50, `BEST: ${highScore}s`, { ...defaultTextStyle, fontSize: '30px' }).setOrigin(1, 0).setDepth(10);
        hitsText = this.add.text(PLAYER_CENTER_X, 120, `TOUCHES: 0 / ${MAX_HITS}`, secondaryTextStyle).setOrigin(0.5, 0).setDepth(10);


        // --- 5. Logique de Jeu (Spawning et Chrono) ---
        
        this.time.addEvent({
            delay: 1000, 
            callback: this.updateScoreAndSpeed,
            callbackScope: this,
            loop: true
        });

        spawnTimer = this.time.addEvent({
            delay: 1000, 
            callback: this.spawnZaza,
            callbackScope: this,
            loop: true
        });


        // --- 6. Musique de Fond (BGM) et Déblocage Mobile ---
        backgroundMusic = this.sound.add('music', { loop: true, volume: 0.5 }); 
        
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
    } // Fin de create()

    update(time, delta) {
        if (!isGameActive) return;

        // --- 1. Mise à jour de la couleur du joueur (Blanc -> Vert) ---
        const finalColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            new Phaser.Display.Color(0xFFFFFF),
            new Phaser.Display.Color(0x00FF00),
            MAX_HITS,
            hitsTaken
        ).color;
        
        player.setTint(finalColor);
        
        
        // --- 2. Vérification des collisions Zaza (LOGIQUE PAR POSITION FIABLE) ---
        zazaGroup.getChildren().forEach(zaza => {
            
            if (zaza.isDamaging === false) return; 

            // Vérification de la proximité par position X et Y (Absolue)
            const isNearX = Math.abs(zaza.x - PLAYER_CENTER_X) < HIT_TOLERANCE;
            const isNearY = Math.abs(zaza.y - PLAYER_CENTER_Y) < HIT_TOLERANCE;
            
            // Si la Zaza touche le centre
            if (isNearX && isNearY) { 
                
                // 1. Désactiver immédiatement et masquer
                zaza.isDamaging = false;
                zaza.setInteractive(false); 
                zaza.setVisible(false);

                // 2. Gérer le coup (dégâts, son, écran)
                this.handleHit();

                // 3. Destruction propre après un petit délai
                this.time.delayedCall(200, () => {
                    if (zaza.scene) { 
                        zaza.destroy();
                    }
                });
            }
        });
    }

    // --- Fonctions de Gameplay ---
    
    updateScoreAndSpeed() {
        if (!isGameActive) return;

        // 1. Augmenter le Score (Temps de survie)
        score++;
        scoreText.setText(`SCORE: ${score}s`);

        // 2. Accélération de la Vitesse
        if (currentZazaSpeed > 1000) {
            currentZazaSpeed -= ACCEL_RATE;
        }

        // 3. Mise à jour de la fréquence d'apparition
        const newSpawnDelay = Math.max(500, currentZazaSpeed / 4); 
        spawnTimer.delay = newSpawnDelay;
    }
    
    spawnZaza() {
        if (!isGameActive) return;

        const side = Phaser.Math.Between(0, 3);
        let startX, startY;

        switch (side) {
            case 0: startX = Phaser.Math.Between(0, GAME_WIDTH); startY = -50; break; 
            case 1: startX = Phaser.Math.Between(0, GAME_WIDTH); startY = GAME_HEIGHT + 50; break; 
            case 2: startX = -50; startY = Phaser.Math.Between(0, GAME_HEIGHT); break; 
            case 3: startX = GAME_WIDTH + 50; startY = Phaser.Math.Between(0, GAME_HEIGHT); break; 
        }
        
        const zaza = this.physics.add.sprite(startX, startY, 'zaza_icon').setScale(0.3).setDepth(3); 
        zazaGroup.add(zaza);

        zaza.isDamaging = true; 
        zaza.setInteractive({ useHandCursor: true });
        zaza.on('pointerdown', () => this.destroyZaza(zaza)); 
        
        // NOUVEAU : La cible du tween utilise les constantes du centre
        this.tweens.add({
            targets: zaza,
            x: PLAYER_CENTER_X, 
            y: PLAYER_CENTER_Y, 
            duration: currentZazaSpeed, 
            ease: 'Linear'
        });
    }

    destroyZaza(zazaIcon) {
        if (!isGameActive) return;

        this.sound.play('sfx_tap', { volume: 0.8 }); 

        // S'assurer qu'elle ne peut plus causer de dégâts
        zazaIcon.isDamaging = false; 
        
        this.tweens.add({
            targets: zazaIcon,
            scale: 0.4,
            alpha: 0,
            duration: 100,
            onComplete: () => zazaIcon.destroy()
        });
    }
    
    handleHit() {
        if (!isGameActive) return;
        
        this.sound.play('sfx_hit', { volume: 0.8 }); 
        
        hitsTaken++;
        hitsText.setText(`TOUCHES: ${hitsTaken} / ${MAX_HITS}`);
        
        this.cameras.main.shake(200, 0.01);
        
        if (hitsTaken >= MAX_HITS) {
            this.endGame(false, `La Zaza t'a touché ${MAX_HITS} fois !`);
        }
    }


    endGame(isVictory, reason) {
        if (!isGameActive) return;
        
        try {
            isGameActive = false;
            const currentScene = this; 
            const sceneKey = 'GameScene'; 

            if (score > highScore) {
                highScore = score;
            }

            if(spawnTimer) spawnTimer.destroy();
            this.time.removeAllEvents(); 
            if (backgroundMusic && backgroundMusic.isPlaying) {
                backgroundMusic.stop(); 
            }
            
            zazaGroup.clear(true, true); 

            if (player) player.setTint(isVictory ? 0x00FF00 : 0xFF0000); 
            
            // --- Écran de Fin ---
            const blackScreen = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000)
                .setOrigin(0).setAlpha(0.8).setDepth(9); 
            
            const messageTitle = isVictory ? `NOUVEAU RECORD ! 🏆` : 'GAME OVER ! 💀';
            const messageColor = isVictory ? '#00FF00' : '#FF0000';
            const buttonText = 'RÉESSAYER';

            const textStyleBase = { fontSize: '28px', fill: '#FFFFFF', align: 'center' };

            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 - 120, messageTitle, { 
                ...textStyleBase, fontSize: isVictory ? '40px' : '48px', fill: messageColor, 
            }).setOrigin(0.5).setDepth(10);
            
            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 - 40, `Tu as tenu ${score} secondes.`, { 
                ...textStyleBase, fontSize: '24px', fill: '#FFFFFF', 
            }).setOrigin(0.5).setDepth(10);
            
            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 + 10, `Meilleur score : ${highScore}s`, { 
                ...textStyleBase, fontSize: '24px', fill: '#FFD700', 
            }).setOrigin(0.5).setDepth(10);
            
            // Bouton Rejouer
            const replayButton = this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 + 80, buttonText, { 
                ...textStyleBase, fontSize: '40px', fill: '#FFF', backgroundColor: '#440000', padding: { x: 20, y: 10 },
            })
            .setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10); 

            replayButton.on('pointerdown', () => {
                if (currentScene.scene.isActive(sceneKey)) {
                    currentScene.scene.stop(sceneKey); 
                    currentScene.scene.start(sceneKey); 
                }
            });

            // Bouton Spotify (Conservé)
            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 + 160, '🎧 ÉCOUTER LA MUSIQUE DE SHADOW MAS 🎧', { 
                ...textStyleBase, fontSize: '30px', fill: '#0F0', backgroundColor: '#004400', padding: { x: 15, y: 8 },
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10)
            .on('pointerdown', () => {
                // Lien de votre single ici (non défini dans ce contexte)
                window.open('https://open.spotify.com/intl-fr/artist/6gQQrSMHA7SfUEoGSVezPX?si=nyoDsOx5SvuozWH0V4N7Bw', '_blank'); 
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
        }
    },
    scene: [GameScene], 
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    gameTitle: "Shadow Mas : Zaza Mode", 
    baseURL: (location.hostname.includes('github.io') || location.hostname.includes('netlify')) 
             ? '/Shadow-Mas-Game/' 
             : '',
};

new Phaser.Game(config);