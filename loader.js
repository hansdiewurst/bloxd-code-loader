const usedCallbacks = [];
const positions = [];

//THIS IS A TEMPLATE, DO NOT USE IN WORLDCODE - use out/worldcode.js
//--split--
const error = msg => api.broadcastMessage(`[Loader] ${msg}`, { color: "red" });
const log = msg => api.broadcastMessage(`[Loader] ${msg}`, { color: "yellow" });

globalThis.CBs = { };
for(const cb of usedCallbacks) {
    if(cb === "tick") continue;
    globalThis[cb] = (...args) => globalThis.CBs[cb]?.(...args);
}
const codes = new Array(positions.length).fill(null);
let STAGE = 0;
let execI = 0;

tick = () => {
    CBs.tick?.();

    if(STAGE === 0) {
        if(codes.every(c => !!c)) return STAGE = 1;

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
				error(`No code stored at specified position ${pos.join(" ")}`);
				return STAGE = -1;
			}
            codes[i] = text;
        }

    } else if(STAGE === 1) {
		log(`Attempt exec at ${positions[execI].join(" ")}`);
        const code = codes[execI];
        try {
            eval(code.slice(1));
        } catch(e) {
            error(`Error evaluating code (stored at ${positions[execI].join(" ")}): ${e}, ${e.stack}`);
        }
        codes[execI++] = null;
        if(execI >= codes.length) STAGE = 2;
    } else if(STAGE === 2) {
        log("Successfully loaded code");
        STAGE = -1;
    }
}