const DEFAULT_N_WORKERS = 8;

document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var startTime = performance.now();
    const weaponName = document.getElementById('weapon').value;
    const nRoundKills = document.getElementById('kills').value;
    const files = document.getElementById('demoFiles').files;
    let totalFiles = files.length;
    let totalSize = 0;
    let processedFiles = 0;
    document.getElementById('fileCounter').textContent = 'Demos searched: ' + processedFiles + '/' + totalFiles;

    // Some web worker stuff
    const numWorkers = Math.min(DEFAULT_N_WORKERS, files.length);
    const workers = [];
    for (let i = 0; i < numWorkers; i++) {
        workers.push(new Worker('./worker.js'));
    }
    let tasks = []
    for (let i = 0; i < files.length; i++){
        tasks.push(files[i])
    }
    let fileIdx = 0;
    for (let i = 0; i < numWorkers; i++){
        totalSize += tasks[fileIdx].size;
        workers[i].postMessage({ file: tasks[i] });
        fileIdx++;
    }

    workers.forEach((worker, index) => {
        worker.onerror = function (e) {
            processedFiles++;
        }
        worker.onmessage = function (e) {
          processedFiles++;
          generateTableFromData(e.data.json, weaponName, nRoundKills, e.data.file);
          document.getElementById('fileCounter').textContent = 'Demos searched: ' + processedFiles + '/' + totalFiles;
          
          // process next demo if any left
          if (fileIdx < totalFiles){
            totalSize += tasks[fileIdx].size;
            worker.postMessage({ file: tasks[fileIdx] });
            fileIdx++;
          }
          // Check if we are done
          if (processedFiles == totalFiles){
            var endTime = performance.now();
            document.getElementById('fileCounter').textContent = 'Done in ' + ((endTime - startTime) / 1000).toFixed(2) + 
            ' seconds' + ' (' + (totalSize / 1000000000).toFixed(2) + ' GB)';
            // terminate all workers after we are done.
            workers.forEach((w, index) => {
                w.terminate();
            });
            return;
          }
        };
    });
});

function generateTableFromData(eventsNotFiltered, weaponName, nRoundKills, fileName) {
    let events = eventsNotFiltered.filter(e => e.get("is_warmup_period") == false);
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
                    wantedRows.push({"name": key, "kills": value, "round": round + 1, "file": fileName, "tick": wantedKills[0].get("tick")});
                }
            }
        }
    }
    let table = document.getElementById("table").querySelector("tbody");
    wantedRows.forEach((rowItem, i) => {
        let row = table.insertRow();
        row.insertCell(0).innerHTML = rowItem.name;
        row.insertCell(1).innerHTML = rowItem.kills;
        row.insertCell(2).innerHTML = rowItem.round;
        row.insertCell(3).innerHTML = rowItem.tick;
        row.insertCell(4).innerHTML = rowItem.file;
    });
}