// const fileFeedback = document.querySelector("#custom-file-load-info");
const hiddenFileSelector = document.querySelector("#custom-file");
const fileList = document.querySelector("#file-drop-list");
const fileListTemplate = document.querySelector("#template-selected-file");

let selectedFiles = [];

function addSelectedVillaFile() {
	let version = document.querySelector("#vanilla-version").value;
	let url = `./vanilla/vanilla-1.${version}.zip`;
	let name = `vanilla-1.${version}.zip`;
	let type = "application/x-zip-compressed";
	readFile({ name, url, vanilla: true, type });
}

function fileClick() {
	hiddenFileSelector.click();
}

function chooseFiles() {
	// console.log(hiddenFileSelector.files);
	for (let f of hiddenFileSelector.files) {
		readFile(f);
	}
}

function removeFile(event) {
	let name = event.target.dataset.name;
	if (!name) return;
	for (let i = 0; i < selectedFiles.length; i++) {
		let file = selectedFiles[i];
		if (file.name == name) {
			selectedFiles.splice(i, 1);
			break;
		}
	}
	event.target.parentElement.parentElement.remove();
	// updateFileList();
}

function fileDrop(event) {
	event.preventDefault();

	if (event.dataTransfer.items) {
		// Use DataTransferItemList interface to access the file(s)
		for (let item of event.dataTransfer.items) {
			console.log({ item });
			if (item.kind == "file") {
				let file = item.getAsFile();
				readFile(file);
			}
		}
	} else {
		// Use DataTransfer interface to access the file(s)
		for (let file of event.dataTransfer.files) {
			readFile(file);
		}
	}
}

async function readFile(file) {
	// fileFeedback.innerText = "";
	// console.log({ file });
	// if (file.type != "application/x-zip-compressed") {
	// 	fileFeedback.innerText = "This is not a .zip file. Please only use zip files.";
	// 	return;
	// }
	selectedFiles.push(file);
	updateFileList();

	// console.log(await file.text())
}

async function updateFileList() {
	// remove duplicates
	let filteredArray = selectedFiles.reduce((file, current) => {
		let x = file.find(item => item.name == current.name);
		if (!x) {
			return file.concat([current]);
		}
		return file;
	}, []);
	selectedFiles = filteredArray;

	// update visuals
	for (let file of selectedFiles) {
		let alreadyHasElement = false;
		for (let child of fileList.children) {
			if (child.dataset.name == file.name) {
				alreadyHasElement = true;
				break;
			}
		}
		if (alreadyHasElement) continue;

		let fileEntry = fileListTemplate.content.cloneNode(true);
		fileEntry.querySelector(".file-wrapper").dataset.name = file.name;
		if (!file.name.endsWith(".zip")) {
			fileEntry.querySelector(".file-icon").hidden = true;
			fileEntry.querySelector(".file-icon.wrong-file").hidden = false;
		}
		if (file.vanilla) {
			fileEntry.querySelector(".vanilla").classList.remove("hidden");
		}
		fileEntry.querySelector(".file-name").innerText = file.name;
		let error = await getError(file);
		fileEntry.querySelector(".file-load-info").innerText = error;
		let removebtn = fileEntry.querySelector(".remove-file");
		removebtn.addEventListener("click", removeFile);
		removebtn.dataset.name = file.name;


		let scrambleOptions = fileEntry.querySelector(".file-scramble-options");


		if (error.length == 0) {
			// add selections
			scrambleOptions.innerHTML +=
				`
				<input hidden type="radio" name="scrambleMode" value="all" id="${btoa(file.name)}-scramble-mode-all" selected>
				<label class="fake-btn" for="${btoa(file.name)}-scramble-mode-all">Everything</label>
				<input hidden type="radio" name="scrambleMode" value="folders" id="${btoa(file.name)}-scramble-mode-folders">
				<label class="fake-btn" for="${btoa(file.name)}-scramble-mode-folders">Folder Intern</label>
				`

			// show folders
			let scrambleFolderOptions = fileEntry.querySelector(".folder-scramble-options");
			let zip = await readZipFile(file);
			let folders = [];
			zip.forEach((relativePath, zipEntry) => {
				if (zipEntry.dir && relativePath.match(/^data\/[a-z0-9_]+\/loot_tables\//)) {
					let matches = relativePath.match(/^data\/([a-z0-9_\.]+)\/loot_tables\/([a-z0-9_\.]+)\//);
					if (matches && matches.length == 3) {
						let folderName = `${matches[1]}/${matches[2]}`;
						if (!folders.includes(folderName)) folders.push(folderName);
					}
				}
			});
			for (let f of folders) {
				let elem = document.createElement("input");
				elem.type = "checkbox";
				elem.value = f;
				elem.id = btoa(file.name) + f;
				elem.hidden = true;
				elem.classList.add("folder-scramble-option");
				elem.name = "folder";
				scrambleFolderOptions.appendChild(elem);

				let label = document.createElement("label");
				label.setAttribute("for", btoa(file.name) + f);
				label.innerText = f;

				scrambleFolderOptions.appendChild(label);
			}

		} else {
			scrambleOptions.hidden = true;
		}

		fileList.appendChild(fileEntry);
	}
}

async function getError(file) {
	if (file.type != "application/x-zip-compressed") {
		return "This is not a .zip file";
	}
	try {
		let zip = await readZipFile(file);
		let foundLootTables = false;
		let foundMetaFile = false;
		zip.forEach((relativePath, zipEntry) => {
			if (zipEntry.dir && relativePath.match(/^data\/[a-z0-9_]+\/loot_tables\//)) {
				foundLootTables = true;
			}
			if (relativePath == "pack.mcmeta") {
				foundMetaFile = true;
			}
			if (foundMetaFile && foundLootTables) {
				return;
			}
		});
		if (!foundMetaFile) {
			return "No pack.mcmeta found."
		}
		if (!foundLootTables) {
			return "No loottables found"
		}
	} catch (error) {
		console.log(error);
		return "Couldn't read zip file";
	}

	return "";
}

async function readZipFile(file) {
	if (file.type != "application/x-zip-compressed") {
		throw new Error("trying to read a non-zip file as zip file");
	}
	if (file.vanilla && file.url) {
		let result = await (await fetch(file.url)).blob();
		return JSZip.loadAsync(result);
	}
	return JSZip.loadAsync(file);
}

function prevDefault(event) {
	event.preventDefault();
}

function displayHelp(event) {
	let helptext = event.target.parentElement.querySelector(".help-text");
	helptext.hidden = !helptext.hidden;
}

function selectFolders(event, all) {
	let allFolders = event.target.parentElement.parentElement.querySelectorAll("input.folder-scramble-option");
	for (let folder of allFolders) {
		folder.checked = all;
	}
}

async function scramble(event) {
	let btn = event.target;
	let form = btn.parentElement.parentElement;
	let info = form.querySelector(".scramble-info");
	info.innerText = "";

	let fData = new FormData(form);
	if (!fData.has("scrambleMode")) {
		info.innerText = "Please select a mode.";
		return;
	}
	let mode = fData.get("scrambleMode");
	if (!fData.has("folder")) {
		info.innerText = "Please select at least one folder.";
		return;
	}
	let folders = fData.getAll("folder");
	btn.disabled = true;

	let progressBar = form.querySelector(".scramble-progress-bar");
	let progressSpan = form.querySelector(".scramble-progress");
	progressBar.hidden = false;
	
	let result = await scrambleNow(form.dataset.name, mode, folders, progressSpan, progressBar);
	let blob = await result.generateAsync({type: "blob"});
	let newFileName = form.dataset.name.substring(0, form.dataset.name.length - 4) + "-scrambled.zip"
	saveAs(blob, newFileName);
	
	progressSpan.innerText = "";
	progressBar.hidden = true;
	btn.disabled = false;
}

async function scrambleNow(nameOfInput, mode, folders, pSpan, pBar) {
	pSpan.innerText = "Preparing Scrambling";
	let { zip, files } = await prepScramble(nameOfInput, mode, folders);

	for (let toScramble of files) {
		let total = toScramble.length - 1;
		let current = 0;
		let fileNames = JSON.parse(JSON.stringify(toScramble));
		let fileContents = [];

		for (let file of fileNames) {
			let content = await zip.file(file).async("string");
			fileContents.push(content);
			updateProgress(current++, total, "Reading Files");
		}
		current = 0;
		
		for (let file of fileNames) {
			let randomContent = getRandomArrayEntry(fileContents);
			await zip.file(file, randomContent);
			updateProgress(current++, total);
		}
		console.log("done");
	}

	pBar.max = "";
	pBar.removeAttribute("value");
	pSpan.innerText = "Done. Preparing Download..."

	return zip;

	function updateProgress(current, total, text = "Scrambling Files"){
		pBar.value = current;
		pBar.max = total;
		pSpan.innerText = `${text}: ${current} / ${total}`;
	}
}

/**
 * Returns random array entry and removes it from the array
 * @param {string[]} arr 
 * @returns {string}
 */
function getRandomArrayEntry(arr) {
	let randomIndex = Math.floor(Math.random() * arr.length);
	return arr.splice(randomIndex, 1)[0];
}

/**
 * 
 * @param {string} nameOfInput 
 * @param {"all"|"folders"} mode 
 * @param {string[]} folders 
 * @returns {{zip: JSZip, files: string[][]}}
 */
async function prepScramble(nameOfInput, mode, folders) {
	let file = selectedFiles.find(file => file.name == nameOfInput);
	let zip = await readZipFile(file);

	let files = [];
	if (mode == "all") {
		let allFiles = [];
		zip.forEach((relativePath, zipEntry) => {
			if (zipEntry.dir) return;
			let matches = relativePath.match(/^data\/([a-z0-9_\.]+)\/loot_tables\/([a-z0-9_\.]+)\/.+.json/);
			if (matches && matches.length == 3) {
				let folderName = matches[1] + "/" + matches[2];
				if (folders.includes(folderName)) {
					allFiles.push(relativePath);
				}
			}
		});
		files.push(allFiles);
	} else if (mode == "folders") {
		let map = new Map();
		zip.forEach((relativePath, zipEntry) => {
			if (zipEntry.dir) return;
			let matches = relativePath.match(/^data\/([a-z0-9_\.]+)\/loot_tables\/([a-z0-9_\.]+)\/.+.json/);
			if (matches && matches.length == 3) {
				let folderName = matches[1] + "/" + matches[2];
				if (folders.includes(folderName)) {
					if (!map.has(folderName)) {
						map.set(folderName, []);
					}
					map.get(folderName).push(relativePath);
				}
			}
		});
		for (let f of folders) {
			let fileArray = map.get(f) ?? [];
			files.push(fileArray);
		}
	}

	return { zip, files };
}