importScripts('./pkg/demoparser2.js');

const { parseEvent} = wasm_bindgen;

async function loadWorker() {
    await wasm_bindgen('./pkg/demoparser2_bg.wasm');
}

loadWorker();

onmessage = async function(event) {
    let fileName = event.data.file.name;
    const reader = new FileReader();
    reader.onload = function (event) {
        const uint8Array = new Uint8Array(event.target.result);
        const result = parseEvent(uint8Array, "player_death", ["health"], ["total_rounds_played", "is_warmup_period"]);
        postMessage({"json": result, "file": fileName});
    };
    reader.readAsArrayBuffer(event.data.file);
};
