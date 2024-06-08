const DEFAULT_N_WORKERS = 8;

document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    // Clear table
    let tableBody = document.getElementById("table").querySelector("tbody");
    tableBody.innerHTML = '';

    var startTime = performance.now();
    const weaponName = document.getElementById('weapon').value;
    const roundType = document.getElementById('roundType').value;
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
        workers[i].postMessage({ file: tasks[fileIdx], "weaponName": weaponName,  "roundType": roundType});
        fileIdx++;
    }

    workers.forEach((worker, index) => {
        worker.onerror = function (e) {
            processedFiles++;
        }
        worker.onmessage = function (e) {
          processedFiles++;
          generateTableFromData(e.data.output);
          document.getElementById('fileCounter').textContent = 'Demos searched: ' + processedFiles + '/' + totalFiles;
          
          // process next demo if any left
          if (fileIdx < totalFiles){
            totalSize += tasks[fileIdx].size;
            worker.postMessage({ file: tasks[fileIdx], "weaponName": weaponName,  "roundType": roundType});

            fileIdx++;
          }else{
            // Check if we are done
            if (processedFiles == totalFiles){
                console.log("DONE")
                var endTime = performance.now();
                document.getElementById('fileCounter').textContent = 'Done in ' + ((endTime - startTime) / 1000).toFixed(2) + 
                ' seconds' + ' (' + (totalSize / 1000000000).toFixed(2) + ' GB)';
                // terminate all workers after we are done.
                workers.forEach((w, index) => {
                    w.terminate();
                });
                return;
            }
          }

        };
    });
    
});

function generateTableFromData(output) {

    let table = document.getElementById("table").querySelector("tbody");
    output.forEach((rowItem, i) => {
        let row = table.insertRow();
        row.insertCell(0).innerHTML = rowItem.name;
        row.insertCell(1).innerHTML = rowItem.round;
        row.insertCell(2).innerHTML = rowItem.tick;
        row.insertCell(3).innerHTML = rowItem.file;
    });
}