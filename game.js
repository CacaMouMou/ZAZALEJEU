// ====================================================================
// CONFIGURATION ET VARIABLES GLOBALES : HIGH SCORE SIMPLE V7.0 (Score au milieu)
// ====================================================================

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
// Note: Suppression de MAX_HITS et hitsTaken pour cette version simplifiée

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
let isGameActive = true;
let spawnTimer;
let backgroundMusic; 
let currentZazaSpeed = 4000; // Temps en ms pour atteindre le centre
const ACCEL_RATE = 50;  // Vitesse d'accélération

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
        
        // Seul le texte du score est nécessaire
        scoreText = this.add.text(50, 50, 'SCORE: 0', defaultTextStyle).setOrigin(0, 0).setDepth(10);
        this.add.text(750, 50, `BEST: ${highScore}`, { ...defaultTextStyle, fontSize: '30px' }).setOrigin(1, 0).setDepth(10);
        
        // --- 5. Logique de Jeu (Spawning) ---
        
        this.time.addEvent({
            delay: 1000, 
            callback: this.updateSpeed, // On ne met à jour que la vitesse ici
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

        // --- 1. Le joueur reste blanc (pas de dégâts) ---
        player.setTint(0xFFFFFF);
        
        // --- 2. Vérification des collisions Zaza (Score au centre) ---
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

                // 2. Gérer le score (son, augmentation)
                this.handleScore(); // <-- APPEL DE LA NOUVELLE FONCTION DE SCORE

                // 3. Destruction propre après un petit délai
                this.time.delayedCall(200, () => {
                    if (zaza.scene) { 
                        zaza.destroy(); // <-- LA ZAZA DISPARAÎT
                    }
                });
            }
        });
    }

    // --- Fonctions de Gameplay ---
    
    updateSpeed() {
        if (!isGameActive) return;

        // 1. Accélération de la Vitesse
        // La vitesse minimale est 1000ms (1 seconde pour traverser l'écran)
        if (currentZazaSpeed > 1000) {
            currentZazaSpeed -= ACCEL_RATE;
        }

        // 2. Mise à jour de la fréquence d'apparition
        const newSpawnDelay = Math.max(500, currentZazaSpeed / 4); 
        spawnTimer.delay = newSpawnDelay;
    }
    
    spawnZaza() {
        if (!isGameActive) return;

        // Détermine un point de départ aléatoire sur le bord de l'écran
        const side = Phaser.Math.Between(0, 3);
        let startX, startY;

        switch (side) {
            case 0: startX = Phaser.Math.Between(0, GAME_WIDTH); startY = -50; break; // Haut
            case 1: startX = Phaser.Math.Between(0, GAME_WIDTH); startY = GAME_HEIGHT + 50; break; // Bas
            case 2: startX = -50; startY = Phaser.Math.Between(0, GAME_HEIGHT); break; // Gauche
            case 3: startX = GAME_WIDTH + 50; startY = Phaser.Math.Between(0, GAME_HEIGHT); break; // Droite
        }
        
        const zaza = this.physics.add.sprite(startX, startY, 'zaza_icon').setScale(0.3).setDepth(3); 
        zazaGroup.add(zaza);

        zaza.isDamaging = true; // Permet la détection de collision
        zaza.setInteractive({ useHandCursor: true });
        zaza.on('pointerdown', () => this.destroyZaza(zaza)); // Permet de cliquer dessus
        
        // Le Tween déplace la Zaza vers le centre du joueur (PLAYER_CENTER_X/Y)
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

        this.sound.play('sfx_tap', { volume: 0.8 }); // Son de clic (pour les clics réussis)

        // S'assurer qu'elle ne peut plus causer de dégâts
        zazaIcon.isDamaging = false; 
        
        // Effet de destruction visuelle
        this.tweens.add({
            targets: zazaIcon,
            scale: 0.4,
            alpha: 0,
            duration: 100,
            onComplete: () => zazaIcon.destroy()
        });
    }
    
    handleScore() {
        // Nouvelle fonction pour gérer le score quand la Zaza atteint le centre
        if (!isGameActive) return;
        
        this.sound.play('sfx_tap', { volume: 0.8 }); // Son de succès (la Zaza atteint le centre pour 1 point)
        
        score++; // Augmente le score de 1 point
        scoreText.setText(`SCORE: ${score}`); // Mise à jour de l'UI
        
        this.cameras.main.shake(100, 0.005); // Petit effet visuel
        
        // Pas de Game Over dans cette version simplifiée
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

            // Nettoyage de la scène
            if(spawnTimer) spawnTimer.destroy();
            this.time.removeAllEvents(); 
            if (backgroundMusic && backgroundMusic.isPlaying) {
                backgroundMusic.stop(); 
            }
            
            zazaGroup.clear(true, true); 

            // Affichage de Fin
            if (player) player.setTint(0xFFFFFF); // Reste blanc

            // --- Écran de Fin ---
            const blackScreen = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000)
                .setOrigin(0).setAlpha(0.8).setDepth(9); 
            
            const messageTitle = 'FIN DU MODE SIMPLE';
            const messageColor = '#FFFFFF';
            const buttonText = 'RÉESSAYER';

            const textStyleBase = { fontSize: '28px', fill: '#FFFFFF', align: 'center' };

            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 - 120, messageTitle, { 
                ...textStyleBase, fontSize: '40px', fill: messageColor, 
            }).setOrigin(0.5).setDepth(10);
            
            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 - 40, `Tu as marqué ${score} points !`, { 
                ...textStyleBase, fontSize: '24px', fill: '#FFFFFF', 
            }).setOrigin(0.5).setDepth(10);
            
            this.add.text(PLAYER_CENTER_X, GAME_HEIGHT / 2 + 10, `Meilleur score : ${highScore} points`, { 
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
    gameTitle: "Shadow Mas : Zaza Mode (Score Simple)", 
    // ATTENTION : L'URL DE BASE DOIT CORRESPONDRE AU NOM DU DÉPÔT (Casse comprise)
    baseURL: (location.hostname.includes('github.io') || location.hostname.includes('netlify')) 
             ? '/ZAZALEJEU/' // <-- VERIFIEZ QUE CELA CORRESPOND A LA CASSE DE VOTRE DÉPÔT
             : '',
};

new Phaser.Game(config);