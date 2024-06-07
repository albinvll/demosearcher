document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const weaponName = document.getElementById('weapon').value;
    const nRoundKills = document.getElementById('kills').value;
    const files = document.getElementById('demoFiles').files;
    let totalFiles = files.length;
    let totalSize = 0;
    let processedFiles = 0;
    document.getElementById('fileCounter').textContent = 'Demos searched: ' + processedFiles + '/' + totalFiles;

    var startTime = performance.now();
    for (const file of files) {
        totalSize += file.size;

        const worker = new Worker('worker.js');
        worker.onmessage = function(event) {
            processedFiles++;

            generateTableFromData(event.data, weaponName, nRoundKills, file.name);
            document.getElementById('fileCounter').textContent = 'Demos searched: ' + processedFiles + '/' + totalFiles;
            worker.terminate();
            
            if (processedFiles == totalFiles){
                var endTime = performance.now();
                document.getElementById('fileCounter').textContent = 'Done in ' + ((endTime - startTime) / 1000).toFixed(2) + 
                ' seconds' + ' (' + (totalSize / 1000000000).toFixed(2) + ' GB)';
            }
        };
        
        const reader = new FileReader();
        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            worker.postMessage({ file: arrayBuffer });
        };
        reader.readAsArrayBuffer(file);
    }
});

function generateTableFromData(events, weaponName, nRoundKills, fileName) {
    let maxRound = Math.max(...events.map(event => event.get("total_rounds_played")));
    const wantedRows = [];
    for (let round = 0; round <= maxRound; round++) {
        const killsPerPlayer = {};
        let killsThisRound = events.filter(kill => kill.get("total_rounds_played") == round);

        killsThisRound.forEach(item => {
            const attackerName = item.get("attacker_name");
            const kills = killsPerPlayer[attackerName] || 0;
            if (item.get("weapon") === weaponName || weaponName == "Any") {
                killsPerPlayer[attackerName] = kills + 1;
            }
        });

        for (let [key, value] of Object.entries(killsPerPlayer)) {
            if (value == nRoundKills) {
                wantedRows.push({"name": key, "kills": value, "round": round, "file": fileName, "tick": killsThisRound[0].get("tick")});
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