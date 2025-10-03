// ====================================================================
// CONFIGURATION ET VARIABLES GLOBALES : LE CONTRE-LA-MONTRE
// ====================================================================

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SURVIVAL_TIME = 20; // 20 secondes à tenir
const MAX_TEMPTATION_LEVEL = 100; // Niveau max pour le rouge

// --- Variables de Jeu ---
let player; 
let zazaGroup;         // Le groupe qui contient toutes les icônes de Zaza
let timeRemaining = SURVIVAL_TIME;
let timerText;
let temptationLevel = 0; // 0 = Vert/Bleu (Calme), 100 = Rouge Vif (Danger)
let isGameActive = true;
let spawnTimer;        // Le timer pour faire apparaître les Zaza
let backgroundMusic; 


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
        this.load.image('zaza_icon', 'assets/zaza_icon.png'); // NOUVEL ASSET ZAZA
        this.load.image('bg_dark', 'assets/bg_dark.png');     // Nouveau fond plus sombre ou simplement une couleur
        
        // CHARGEMENT AUDIO
        this.load.audio('music', [
            'assets/EN VAIN.mp3', 
            'assets/EN VAIN.wav'  
        ]); 
        this.load.audio('sfx_tap', 'assets/sfx_tap.mp3');     // NOUVEL ASSET : son quand on tape un Zaza
    }

    create() {
        this.cameras.main.setBackgroundColor('#222222'); // Fond sombre par défaut
        isGameActive = true;
        timeRemaining = SURVIVAL_TIME;
        temptationLevel = 0;

        // --- 1. Décors et Fond ---
        // On peut utiliser une simple couleur pour un style plus arcade
        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111111).setOrigin(0, 0);


        // --- 2. Création du Joueur (Fixe au centre) ---
        player = this.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player').setScale(0.3).setDepth(2);
        player.setTint(0x00FF00); // Commence en vert (calme)


        // --- 3. Groupes d'objets ---
        zazaGroup = this.physics.add.group();

        // --- 4. UI et Timer ---
        const defaultTextStyle = { fontSize: '48px', fill: '#FFF', align: 'center' };
        
        timerText = this.add.text(GAME_WIDTH / 2, 50, `TEMPS: ${SURVIVAL_TIME}`, defaultTextStyle).setOrigin(0.5, 0).setDepth(10);
        
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, "ÉVITE QUE LE ROUGE NE TE CONSOMME", { fontSize: '24px', fill: '#FFD700' }).setOrigin(0.5).setDepth(10);


        // --- 5. Logique de Jeu (Spawning et Chrono) ---
        
        // A. Chronomètre de survie (déclenche la victoire à la fin)
        this.time.addEvent({
            delay: 1000, // Toutes les secondes
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });

        // B. Chronomètre d'apparition des Zaza
        spawnTimer = this.time.addEvent({
            delay: 1500, // Démarre toutes les 1.5s
            callback: this.spawnZaza,
            callbackScope: this,
            loop: true
        });


        // --- 6. Musique de Fond (BGM) ---
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

        // --- 1. Mise à jour de la couleur du joueur ---
        const colorRatio = temptationLevel / MAX_TEMPTATION_LEVEL;
        
        // On interpole entre le vert (0x00FF00) et le rouge (0xFF0000)
        const r = Math.floor(0xFF * colorRatio); 
        const g = Math.floor(0xFF * (1 - colorRatio));
        const color = (r << 16) + (g << 8); // Crée le code hexadécimal de la couleur

        player.setTint(color);

        // --- 2. Vérification de la défaite ---
        if (temptationLevel >= MAX_TEMPTATION_LEVEL) {
            this.endGame(false, "La Zaza t'a consumé !");
            return;
        }

        // --- 3. Vérification des collisions Zaza ---
        zazaGroup.getChildren().forEach(zaza => {
            // Si le Zaza est assez proche du centre pour "toucher" le joueur
            const distanceToCenter = Phaser.Math.Distance.Between(zaza.x, zaza.y, GAME_WIDTH / 2, GAME_HEIGHT / 2);
            
            if (distanceToCenter < 50) { // Seuil de "collision"
                zaza.destroy();
                this.increaseTemptation(25); // Gros choc à l'impact
            }
        });
    }

    // --- Fonctions de Gameplay ---
    
    updateTimer() {
        if (!isGameActive) return;

        timeRemaining--;
        timerText.setText(`TEMPS: ${timeRemaining}`);

        // Défaite lente (la tentation augmente avec le temps)
        this.increaseTemptation(5); 

        // VICTOIRE !
        if (timeRemaining <= 0) {
            this.endGame(true, "T'as tenu 20 secondes, maman est fière !");
        }
    }
    
    spawnZaza() {
        if (!isGameActive) return;

        // Sélection d'un point de départ aléatoire sur le bord de l'écran
        const side = Phaser.Math.Between(0, 3);
        let startX, startY;

        switch (side) {
            case 0: // Haut
                startX = Phaser.Math.Between(0, GAME_WIDTH);
                startY = -50;
                break;
            case 1: // Bas
                startX = Phaser.Math.Between(0, GAME_WIDTH);
                startY = GAME_HEIGHT + 50;
                break;
            case 2: // Gauche
                startX = -50;
                startY = Phaser.Math.Between(0, GAME_HEIGHT);
                break;
            case 3: // Droite
                startX = GAME_WIDTH + 50;
                startY = Phaser.Math.Between(0, GAME_HEIGHT);
                break;
        }
        
        const zaza = this.add.sprite(startX, startY, 'zaza_icon').setScale(0.1).setDepth(3);
        zazaGroup.add(zaza);

        // Rendre l'icône cliquable (pour la détruire)
        zaza.setInteractive({ useHandCursor: true });
        zaza.on('pointerdown', () => this.destroyZaza(zaza));
        
        // Animation de déplacement vers le centre du joueur
        this.tweens.add({
            targets: zaza,
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT / 2,
            duration: Phaser.Math.Between(3000, 5000), // Vitesse aléatoire
            ease: 'Linear'
        });
    }

    destroyZaza(zazaIcon) {
        if (!isGameActive) return;

        // 1. Jouer le son de destruction
        this.sound.play('sfx_tap', { volume: 0.8 }); 

        // 2. Détruire l'icône
        zazaIcon.destroy();
        
        // 3. Diminuer la tentation (Récompense)
        this.increaseTemptation(-15); // Réduire le rouge
    }
    
    increaseTemptation(amount) {
        temptationLevel += amount;
        temptationLevel = Phaser.Math.Clamp(temptationLevel, 0, MAX_TEMPTATION_LEVEL);
    }


    endGame(isVictory, reason) {
        if (!isGameActive) return;
        
        try {
            isGameActive = false;
            const currentScene = this; 
            const sceneKey = 'GameScene'; 

            // Arrêter les timers
            if(spawnTimer) spawnTimer.destroy();
            this.time.removeAllEvents(); 
            
            // Arrêt de la musique
            if (backgroundMusic && backgroundMusic.isPlaying) {
                backgroundMusic.stop(); 
            }
            
            // Nettoyage des sprites
            zazaGroup.clear(true, true); // Détruire tous les Zaza

            if (player) player.setTint(isVictory ? 0x00FF00 : 0xFF0000); // Couleur de fin
            
            // ⬛️ Écran noir de fin de partie
            const blackScreen = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000)
                .setOrigin(0)
                .setAlpha(0.8) 
                .setDepth(9); 


            // --- 3. Affichage des messages et boutons ---
            const messageTitle = isVictory ? `VICTOIRE ! 🥳` : 'GAME OVER ! 💀';
            const messageColor = isVictory ? '#00FF00' : '#FF0000';
            const buttonText = isVictory ? 'ENCORE UNE FOIS' : 'RÉESSAYER';

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

            // Redémarrage de la scène
            replayButton.on('pointerdown', () => {
                if (currentScene.scene.isActive(sceneKey)) {
                    currentScene.scene.stop(sceneKey); 
                    currentScene.scene.start(sceneKey); 
                }
            });

            // Bouton Spotify (Conservé)
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
             // debug: true // Utile pour voir les zones de collision si besoin
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