import Phaser from "phaser";
import { Scene } from "phaser";
import { ResultData } from "./Globals";
let values = ["10", "20", "30", "40", "50", "70", "100", "200"]
export default class Background extends Scene{
private backgroundMusic: Phaser.Sound.BaseSound | null = null; // Add a variable for background music
 constructor(config: Phaser.Types.Scenes.SettingsConfig){
    super(config)
 }
 preload(){
    this.load.image("Background", "src/sprites/Background.jpg");
   //  this.load.audio("backgroundMusic", "src/sounds/Teaser.wav")
    
 }
 create(){
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'Background').setOrigin(0.5).setDisplaySize(width, height);
   //  this.backgroundMusic = this.sound.add("backgroundMusic", { loop: true, volume: 0.1 });
   //  this.backgroundMusic.play();
 }
   
}