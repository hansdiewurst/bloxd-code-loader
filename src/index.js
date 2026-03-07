import { funnyLog } from "./helpers";

let counter = 0;
CBs.tick = () => {
    //only run once a second
    if((counter++ % 20) !== 0) return;

    funnyLog("Another second has passed! Isn't it awesome!");
};

CBs.onPlayerJoin = id => {
    funnyLog(`Welcome ${api.getEntityName(id)}!!!`);
}