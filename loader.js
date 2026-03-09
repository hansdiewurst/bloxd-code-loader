const usedCallbacks = [];
const positions = [];

//THIS IS A TEMPLATE, DO NOT USE IN WORLDCODE - use out/worldcode.js
//--split--
const error = msg => api.broadcastMessage(`[Loader] ${msg}`, { color: "red" });
const log = msg => api.broadcastMessage(`[Loader] ${msg}`, { color: "yellow" });

globalThis.CBs = { };
const interruptedCbs = [];
const safeCallCb = (cb, ...args) => {
    if(typeof cb === "string") cb = globalThis.CBs[cb];

    interruptedCbs.push([cb, ...args]);
    const ret = cb?.(...args);
    interruptedCbs.pop();

    return ret;
};
for(const cb of usedCallbacks) {
    if(cb === "tick") continue;
    if(cb === "onPlayerJoin") {
        let ids = [];
        let joinCb;
        //dont crucify me for using setters, should only be called once
        Object.defineProperty(globalThis.CBs, cb, {
            set(v) {
                joinCb = v;
                for(const id of ids) safeCallCb(joinCb, id);
            }
        });
        globalThis[cb] = id => {
            if(joinCb)
                return safeCallCb(joinCb, id);
            ids.push(id);
        }
    } else {
        globalThis[cb] = (...args) => safeCallCb(cb, ...args);
    }
}
const codes = new Array(positions.length).fill(null);
let loadedC = 0;
let STAGE = 0;
let execI = 0;

tick = () => {
    CBs.tick?.();

    for(let i = 0; i < interruptedCbs.length; i++) safeCallCb(...interruptedCbs.shift());
    if(STAGE === -1) return;
    if(STAGE === 0) {
        for(let i = 0; i < positions.length; i++) {
			if(!!codes[i]) continue;

			const pos = positions[i];
			const loaded = api.isBlockInLoadedChunk(...pos);
			if(!loaded) {
				//load chunk
				api.getBlock(...pos);
				continue;
			}

            const text = api.getBlockData(...pos)?.persisted?.shared?.text;
			if(!text) {
                error(`No code stored at specified position ${pos.join(",")}. Make sure you pasted the schematic at the correct position`);
				return STAGE = -1;
			}
            codes[i] = text;
            if(++loadedC >= codes.length) return STAGE = 1;
        }

    } else if(STAGE === 1) {
		log(`Attempt exec at ${positions[execI].join(" ")}`);
        const code = codes[execI];
        try {
            eval(code.slice(1));
        } catch(e) {
            error(`Error evaluating code (stored at ${positions[execI].join(" ")}): ${e}, ${e.stack}`);
        }
        codes[execI] = null;
        if(++execI >= codes.length) STAGE = 2;
    } else if(STAGE === 2) {
        log("Successfully loaded code");
        STAGE = -1;
    }
}