import Phaser from "phaser";
import { Globals } from "./Globals";
export default class MyEmitter {
    // private mainscene : MainScene;
    constructor(){
       
    }
    Call(msgType: string, msgParams = {}) {
        console.log(msgType, msgParams, "emitter");
        if (msgType != "timer" && msgType != "turnTimer"){
            Globals.SceneHandler?.recievedMessage(msgType, msgParams)
        }
    }
}