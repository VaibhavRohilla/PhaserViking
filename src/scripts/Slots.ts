import Phaser from 'phaser';
import { Globals, ResultData, initData } from "./Globals";
import { gameConfig } from './appconfig';
import { UiContainer } from './UiContainer';
import SoundManager from './SoundManager';
import Disconnection from './Disconnection';
export class Slots extends Phaser.GameObjects.Container {
    slotMask: Phaser.GameObjects.Graphics;
    SoundManager: SoundManager
    slotSymbols: any[][] = [];
    moveSlots: boolean = false;
    uiContainer!: UiContainer;
    // winingMusic!: Phaser.Sound.BaseSound
    resultCallBack: () => void;
    slotFrame!: Phaser.GameObjects.Sprite;
    private maskWidth: number;
    private maskHeight: number;
    private symbolKeys: string[];
    private symbolWidth: number;
    private symbolHeight: number;
    private spacingX: number;
    private spacingY: number;
    private reelContainers: Phaser.GameObjects.Container[] = [];
    private reelTweens: Phaser.Tweens.Tween[] = []; // Array for reel tweens
    private connectionTimeout!: Phaser.Time.TimerEvent;
    constructor(scene: Phaser.Scene, uiContainer: UiContainer, callback: () => void, SoundManager : SoundManager) {
        super(scene);

        this.resultCallBack = callback;
        this.uiContainer = uiContainer;
        this.SoundManager = SoundManager
        this.slotMask = new Phaser.GameObjects.Graphics(scene);
        
        this.maskWidth = gameConfig.scale.width / 1.8;
        this.maskHeight = 490;
        this.slotMask.fillStyle(0xffffff, 1);
        this.slotMask.fillRoundedRect(0, 0, this.maskWidth, this.maskHeight, 20);
        // mask Position set
        this.slotMask.setPosition(
            gameConfig.scale.width / 4,
            gameConfig.scale.height /4.4
        );
        // this.add(this.slotMask);
        // Filter and pick symbol keys based on the criteria
        this.symbolKeys = this.getFilteredSymbolKeys();
        
        // Assume all symbols have the same width and height
        const exampleSymbol = new Phaser.GameObjects.Sprite(scene, 0, 0, this.getRandomSymbolKey());
        this.symbolWidth = exampleSymbol.displayWidth/ 4;
        this.symbolHeight = exampleSymbol.displayHeight/4;
        this.spacingX = this.symbolWidth * 1.9; // Add some spacing
        this.spacingY = this.symbolHeight * 1.8; // Add some spacing
        const startPos = {
            x: gameConfig.scale.width / 3.1,
            y: gameConfig.scale.height /3.25     
        };
        const totalSymbol = 7;
        const visibleSymbol = 3;
        const startIndex = 1;
        const initialYOffset = (totalSymbol - startIndex - visibleSymbol) * this.spacingY;
        for (let i = 0; i < 5; i++) { // 5 columns
            const reelContainer = new Phaser.GameObjects.Container(scene);
            this.reelContainers.push(reelContainer); // Store the container for future use
            this.slotSymbols[i] = [];
            for (let j = 0; j < 28; j++) { // 3 rows
                let symbolKey = this.getRandomSymbolKey(); // Get a random symbol key
                let slot = new Symbols(scene, symbolKey, { x: i, y: j }, reelContainer);
                slot.symbol.setMask(new Phaser.Display.Masks.GeometryMask(scene, this.slotMask));
                slot.symbol.setPosition(
                    startPos.x + i * this.spacingX,
                    startPos.y + j * this.spacingY
                );
                slot.symbol.setScale(0.45, 0.45)
                slot.startX = slot.symbol.x;
                slot.startY = slot.symbol.y;
                this.slotSymbols[i].push(slot);
                reelContainer.add(slot.symbol)
            }
            reelContainer.height = this.slotSymbols[i].length * this.spacingY; 
            reelContainer.setPosition(reelContainer.x, -initialYOffset );
            
            this.add(reelContainer); 
        }
    }

    getFilteredSymbolKeys(): string[] {
        // Filter symbols based on the pattern
        const allSprites = Globals.resources;
        const filteredSprites = Object.keys(allSprites).filter(spriteName => {
            const regex = /^slots\d+_\d+$/; // Regex to match "slots<number>_<number>"
            if (regex.test(spriteName)) {
                const [, num1, num2] = spriteName.match(/^slots(\d+)_(\d+)$/) || [];
                const number1 = parseInt(num1, 10);
                const number2 = parseInt(num2, 10);
                // Check if the numbers are within the desired range
                return number1 >= 1 && number1 <= 14 && number2 >= 1 && number2 <= 14;
            }
            return false;
        });

        return filteredSprites;
    }

    getRandomSymbolKey(): string {
        const randomIndex = Phaser.Math.Between(0, this.symbolKeys.length - 1);        
        return this.symbolKeys[randomIndex];
    }
    moveReel() {    
        const initialYOffset = (this.slotSymbols[0][0].totalSymbol - this.slotSymbols[0][0].visibleSymbol - this.slotSymbols[0][0].startIndex) * this.slotSymbols[0][0].spacingY;
        setTimeout(() => {
            for (let i = 0; i < this.reelContainers.length; i++) {
                this.reelContainers[i].setPosition(
                    this.reelContainers[i].x,
                    -initialYOffset // Set the reel's position back to the calculated start position
                );
            }    
        }, 100);
         
        for (let i = 0; i < this.reelContainers.length; i++) {
            for (let j = 0; j < this.reelContainers[i].list.length; j++) {
                setTimeout(() => {
                    this.slotSymbols[i][j].startMoving = true;
                    if (j < 3) this.slotSymbols[i][j].stopAnimation();
                }, 100 * i);
            }
        }
        this.moveSlots = true;
        setTimeout(() => {
            for (let i = 0; i < this.reelContainers.length; i++) {
                this.startReelSpin(i);
            }
        }, 100);

        //Setting the Timer for response wait
        this.connectionTimeout = this.scene.time.addEvent({
            delay: 20000, // 20 seconds (adjust as needed)
            callback: this.showDisconnectionScene,
            callbackScope: this // Important for the 'this' context
        });
        this.uiContainer.maxbetBtn.disableInteractive();
    }

    startReelSpin(reelIndex: number) {
        if (this.reelTweens[reelIndex]) {
            this.reelTweens[reelIndex].stop(); 
        }
        const reel = this.reelContainers[reelIndex];
        const reelDelay = 200 * reelIndex;
        // 1. Calculate spin distance for initial spin
        const spinDistance = this.spacingY * 10; // Adjust this value for desired spin amount 
        // reel.y -= 1;
        this.reelTweens[reelIndex] = this.scene.tweens.add({
            targets: reel,
            y: `+=${spinDistance}`, // Spin relative to current position
            duration: 600, 
            repeat: -1, 
            onComplete: () => {},
        });
    }

    stopReel(reelIndex: number) {
        const reel = this.reelContainers[reelIndex];
        const reelDelay = 200 * (reelIndex + 1);
        // Calculate target Y (ensure it's a multiple of symbolHeight)
        const targetSymbolIndex = 0; // Example: Align the first symbol
        const targetY = -targetSymbolIndex * this.symbolHeight; 
        this.scene.tweens.add({
            targets: reel,
            y: targetY, // Animate relative to the current position
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (this.reelTweens[reelIndex]) {
                    this.reelTweens[reelIndex].stop(); 
                }
                if (reelIndex === this.reelContainers.length - 1) {
                    this.playWinAnimations();
                    this.moveSlots = false;
                }
            },
            delay: reelDelay
        });
        if (this.connectionTimeout) { 
            this.connectionTimeout.remove(false);
        }
        for (let j = 0; j < this.slotSymbols[reelIndex].length; j++) {
            this.slotSymbols[reelIndex][j].endTween();
         }
    }

    showDisconnectionScene(){
        Globals.SceneHandler?.addScene("Disconnection", Disconnection, true)
    }

    update(time: number, delta: number) {
        if (this.slotSymbols && this.moveSlots) {
            for (let i = 0; i < this.reelContainers.length; i++) {
            }
        }
    }
    stopTween() {
        for (let i = 0; i < this.reelContainers.length; i++) { 
            this.stopReel(i);   
        }
    }

    // Function to play win animations
    playWinAnimations() {
        this.resultCallBack(); // Call the result callback
        ResultData.gameData.symbolsToEmit.forEach((rowArray: any) => {
            rowArray.forEach((row: any) => {
                if (typeof row === "string") {
                    const [y, x]: number[] = row.split(",").map((value) => parseInt(value));
                    const animationId = `symbol_anim_${ResultData.gameData.ResultReel[x][y]}`;
                    if (this.slotSymbols[y] && this.slotSymbols[y][x]) {
                        this.winMusic("winMusic");
                        this.slotSymbols[y][x].playAnimation(animationId);
                    }
                }
            });
        });
    }
    // winMusic
    winMusic(key: string){
        this.SoundManager.playSound(key)
    }
}

// @Sybols CLass
class Symbols {
    symbol: Phaser.GameObjects.Sprite;
    startY: number = 0;
    startX: number = 0;
    startMoving: boolean = false;
    index: { x: number; y: number };
    totalSymbol : number = 14;
    visibleSymbol: number = 3;
    startIndex: number = 1;
    spacingY : number = 204;
    initialYOffset : number = 0
    scene: Phaser.Scene;
    private isMobile: boolean;
    reelContainer: Phaser.GameObjects.Container;
    private bouncingTween: Phaser.Tweens.Tween | null = null;

    constructor(scene: Phaser.Scene, symbolKey: string, index: { x: number; y: number }, reelContainer: Phaser.GameObjects.Container) {
        this.scene = scene;
        this.index = index;
       this.reelContainer = reelContainer;
        const updatedSymbolKey = this.updateKeyToZero(symbolKey)
        this.symbol = new Phaser.GameObjects.Sprite(scene, 0, 0, updatedSymbolKey);
        this.symbol.setOrigin(0.5, 0.5);
        this.isMobile = scene.sys.game.device.os.android || scene.sys.game.device.os.iOS;
        // Load textures and create animation
        const textures: string[] = [];
        for (let i = 0; i < 28; i++) {
            textures.push(`${symbolKey}`);
        }  
        this.scene.anims.create({
            key: `${symbolKey}`,
            frames: textures.map((texture) => ({ key: texture })),
            frameRate: 20,
            repeat: -1,
        });        
    }

    // to update the slotx_0 to show the 0 index image at the end
    updateKeyToZero(symbolKey: string): string {
        const match = symbolKey.match(/^slots(\d+)_\d+$/);
        if (match) {
            const xValue = match[1];
            return `slots${xValue}_0`;
        } else {
            return symbolKey; // Return the original key if format is incorrect
        }
    }
    playAnimation(animationId: any) {
        this.symbol.play(animationId)
    }
    stopAnimation() {
        this.symbol.anims.stop();
        this.symbol.setFrame(0);
    }
    endTween() {
        if (this.index.y < 3) {
            let textureKeys: string[] = [];
            // Retrieve the elementId based on index
            const elementId = ResultData.gameData.ResultReel[this.index.y][this.index.x];
                for (let i = 0; i < 15; i++) {
                    const textureKey = `slots${elementId}_${i}`;
                    // Check if the texture exists in cache
                    if (this.scene.textures.exists(textureKey)) {
                        textureKeys.push(textureKey);                        
                    } 
                }
                // Check if we have texture keys to set
                    if (textureKeys.length > 0) {
                    // Create animation with the collected texture keys
                        this.scene.anims.create({
                            key: `symbol_anim_${elementId}`,
                            frames: textureKeys.map(key => ({ key })),
                            frameRate: 20,
                            repeat: -1
                        });
                    // Set the texture to the first key and start the animation
                        this.symbol.setTexture(textureKeys[0]);           
                    }
        }
        // Stop moving and start tweening the sprite's position
        this.startMoving = false; 
    }
}

