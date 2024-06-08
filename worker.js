importScripts('./pkg/demoparser2.js');

const { parseEvent, parseEvents, parseTicks} = wasm_bindgen;

async function loadWorker() {
    await wasm_bindgen('./pkg/demoparser2_bg.wasm');
}

loadWorker();

onmessage = async function(event) {
    let roundType = event.data.roundType;

    if (roundType.includes("v")){
        return parse1vX(event);
    }else{
        return parseKills(event);
    }
};


function parseKills(event) {
    let fileName = event.data.file.name;
    const weaponName = event.data.weaponName;
    const nRoundKills = parseInt(event.data.roundType[0]);

    const reader = new FileReader();
    reader.onload = function (event) {
        const uint8Array = new Uint8Array(event.target.result);
        const result = parseEvent(uint8Array, "player_death", ["health"], ["total_rounds_played", "is_warmup_period"]);

        let events = result.filter(e => e.get("is_warmup_period") == false);
        let maxRound = Math.max(...events.map(event => event.get("total_rounds_played")));
        const wantedRows = [];
        for (let round = 0; round <= maxRound; round++) {
            const killsPerPlayer = {};
            let killsThisRound = events.filter(kill => kill.get("total_rounds_played") == round);
        
            killsThisRound.forEach(item => {
                const attackerName = item.get("attacker_name");
                const kills = killsPerPlayer[attackerName] || 0;
                if (item.get("weapon") === weaponName || weaponName == "Any" ||
                 (weaponName == "knife" && item.get("weapon").includes("knife"))||
                 (weaponName == "knife" && item.get("weapon") == "bayonet") ) {
                    killsPerPlayer[attackerName] = kills + 1;
                }
            });
        
            for (let [key, value] of Object.entries(killsPerPlayer)) {
                if (value == nRoundKills) {
                    let wantedKills = events.filter(kill => kill.get("total_rounds_played") == round && kill.get("attacker_name") == key &&
                    (kill.get("weapon") === weaponName || weaponName == "Any" ||
                    (weaponName == "knife" && kill.get("weapon").includes("knife"))||
                    (weaponName == "knife" && kill.get("weapon") == "bayonet") ));

                    if (wantedKills.length > 0){
                        wantedRows.push({"name": key, "round": round + 1, "file": fileName, "tick": wantedKills[0].get("tick")});
                    }
                }
            }
        }
        postMessage({"output": wantedRows});
    };
    reader.readAsArrayBuffer(event.data.file);
};



function parse1vX(event) {
    let fileName = event.data.file.name;
    let X = event.data.roundType[2];
    const reader = new FileReader();
    reader.onload = function (event) {
        const uint8Array = new Uint8Array(event.target.result);

        let output = [];

        let event_json = parseEvents(uint8Array, ["player_death", "round_end", "player_spawn", "round_freeze_end"], ["X", "Y", "team_name"], ["total_rounds_played"])
        let roundEnds = event_json.filter(x => x.get("event_name") == "round_end");
        let roundEndArr = [];
        for (const end of roundEnds){
            roundEndArr[end.get("total_rounds_played")] = end;
        }
        
        var Talive = new Set();
        var CTalive = new Set();
        var currentRound = 0;
        var roundHasStarted = false;
        var bestOneVx = [];
        
        for (const e of event_json){
            if (roundHasStarted){
                if (Talive.size == 1){
                    bestOneVx.push({"team": "T", "X": CTalive.size, "clutcher": Array.from(Talive)[0], "round": e.get("total_rounds_played"), "tick": e.get("tick")});
                }
                if (CTalive.size == 1){
                    bestOneVx.push({"team": "CT", "X": Talive.size, "clutcher": Array.from(CTalive)[0], "round": e.get("total_rounds_played"), "tick": e.get("tick")});
                }
            }
            // Spawn
            if (e.get("event_name") == "player_spawn"){
                if (e.get("user_team_name") == "CT"){
                    CTalive.add(e.get("user_name"));
                }else if (e.get("user_team_name") == "TERRORIST"){
                    Talive.add(e.get("user_name"));
                }
            }
            // Death
            if (e.get("event_name") == "player_death"){
                if (e.get("user_team_name") == "CT"){
                    CTalive.delete(e.get("user_name"));
                }else if (e.get("user_team_name") == "TERRORIST"){
                    Talive.delete(e.get("user_name"));
                }
            }
            // Round end
            if (e.get("event_name") == "round_end"){
                if (bestOneVx.length > 0){
    
                    // legacy stuff
                    let winnerString = "";
                    if (e.get("winner") == 3 || e.get("winner") == "CT"){
                        winnerString = "CT";
                    }else if (e.get("winner") == 2 || e.get("winner") == "T"){
                        winnerString = "T";
                    }
    
                    // If player also won the round (killing everyone is not enough/correct)
                    if (bestOneVx[0].team == winnerString){
                        // Are all 1v4 also 1v3? One could argue that a ninja defuse in a 1v4 does never go into a 1v3 state
                        // but for now we assume this to be true
                        if (bestOneVx[0].X >= X){

                            output.push({"name": bestOneVx[0].clutcher, "round": bestOneVx[0].round + 1, "file": fileName, "tick": bestOneVx[0].tick});
                            console.log(bestOneVx[0], fileName);
                        }
                    }
                }
                bestOneVx = [];
                Talive = new Set();
                CTalive = new Set();
                currentRound++;
                roundHasStarted = false;
            }
            // Round start
            if (e.get("event_name") == "round_freeze_end"){
                roundHasStarted = true;
                currentRound = e.get("total_rounds_played");
            }
        }
        postMessage({"output": output});
    };
    reader.readAsArrayBuffer(event.data.file);
};