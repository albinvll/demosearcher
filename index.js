import { processDemo } from "./processing.js";
const sendMessage = (responseText) => {
	document.getElementById("fileCounter").textContent = responseText;
};
const main = () => {
	// Clear table
	let tableBody = document.getElementById("table").querySelector("tbody");
	tableBody.innerHTML = "";

	const weaponName = document.getElementById("weapon").value;
	const roundType = document.getElementById("roundType").value;
	const files = document.getElementById("demoFiles").files;
	processDemo(
		weaponName,
		roundType,
		files,
		sendMessage,
		generateTableFromData
	);
};

document.getElementById("searchForm").addEventListener("submit", main);


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
