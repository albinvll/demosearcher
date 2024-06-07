importScripts('./pkg/demoparser2.js');

const { parseEvent} = wasm_bindgen;

async function loadWorker() {
    await wasm_bindgen('./pkg/demoparser2_bg.wasm');
}
loadWorker();

onmessage = async function(event) {
    const uint8Array = new Uint8Array(event.data.file);
    const result = parseEvent(uint8Array, "player_death", ["health"], ["total_rounds_played"]);
    postMessage(result);
};
