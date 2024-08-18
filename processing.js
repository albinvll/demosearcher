const DEFAULT_N_WORKERS = 8;

export const processDemo = (
	weaponName,
	roundType,
	files,
	sendMessage,
	showResult
) => {
	var startTime = performance.now();
	let totalFiles = files.length;
	let totalSize = 0;
	let processedFiles = 0;
	document.getElementById("fileCounter").textContent =
		"Demos searched: " + processedFiles + "/" + totalFiles;

	// Some web worker stuff
	const numWorkers = Math.min(DEFAULT_N_WORKERS, files.length);
	const workers = [];
	for (let i = 0; i < numWorkers; i++) {
		workers.push(new Worker("./worker.js"));
	}
	let tasks = [];
	for (let i = 0; i < files.length; i++) {
		tasks.push(files[i]);
	}
	let fileIdx = 0;
	for (let i = 0; i < numWorkers; i++) {
		totalSize += tasks[fileIdx].size;
		workers[i].postMessage({
			file: tasks[fileIdx],
			weaponName: weaponName,
			roundType: roundType,
		});
		fileIdx++;
	}

	workers.forEach((worker, index) => {
		worker.onerror = function (e) {
			processedFiles++;
		};
		worker.onmessage = function (e) {
			processedFiles++;
			generateDataArrayFromData(e.data.output, showResult);
			const responseText =
				"Demos searched: " + processedFiles + "/" + totalFiles;
			sendMessage(responseText);

			// process next demo if any left
			if (fileIdx < totalFiles) {
				totalSize += tasks[fileIdx].size;
				worker.postMessage({
					file: tasks[fileIdx],
					weaponName: weaponName,
					roundType: roundType,
				});

				fileIdx++;
			} else {
				// Check if we are done
				if (processedFiles == totalFiles) {
					var endTime = performance.now();
					const responseText =
						"Done in " +
						((endTime - startTime) / 1000).toFixed(2) +
						" seconds" +
						" (" +
						(totalSize / 1000000000).toFixed(2) +
						" GB)";
					sendMessage(responseText);
					workers.forEach((w, index) => {
						w.terminate();
					});
					return;
				}
			}
		};
	});
};

function generateDataArrayFromData(output, showData) {
	let dataArray = [];

	output.forEach((rowItem) => {
		// Create an object for each row and push it into the dataArray
		let dataObject = {
			name: rowItem.name,
			round: rowItem.round,
			tick: rowItem.tick,
			file: rowItem.file,
		};
		dataArray.push(dataObject);
	});
	showData(dataArray);
	return dataArray;
}
