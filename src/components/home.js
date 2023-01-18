import { ipcRenderer, remote } from "electron";
 
let windowState = "flex";
document.getElementById("exit-button").addEventListener("click", () => {
	ipcRenderer.send("close-window");
});

document.getElementById("maximize-button").addEventListener("click", () => {
	let button = document.getElementById("maximize-button");

	if (windowState === "flex") {
		windowState = "maximized";
		button.innerHTML = `<i class="fa-solid fa-window-restore" style="font-size: 15px"></i>`;
		ipcRenderer.send("maximize-window");
	} else {
		windowState = "flex";
		button.innerHTML = `<i class="fa-solid fa-window-maximize" style="font-size: 15px"></i>`;
		ipcRenderer.send("restore-window");
	}
});

document.getElementById("minimize-button").addEventListener("click", () => {
	ipcRenderer.send("minimize-window");
});

document.getElementById("menu-toggle").addEventListener("click", () => {
	let parent = document.getElementById("menu-toggle");
	parent.classList.toggle("change");

	let menuItems = document.getElementsByClassName("menu-item");
	let menu = document.getElementById("menu");
	let mainContent = document.getElementById("main-content");

	for (let elem of menuItems) {
		if (elem.style.display === "none" || elem.style.display === "")
			elem.style.display = "block";
		else elem.style.display = "none";
	}

	if (menu.style.left === "" || menu.style.left === "-200px") {
		menu.style.left = "0";
		mainContent.style.left = "200px";
	} else {
		menu.style.left = "-200px";
		mainContent.style.left = "0";
	}
});

document.getElementById("home-menu-item").addEventListener("click", () => {
	ipcRenderer.send("open-home-page");
});

document.getElementById("settings-menu-item").addEventListener("click", () => {
	ipcRenderer.send("open-settings-page");
});

let combatWindow;
document.getElementById('enter-combat').addEventListener('click', () => {
	combatWindow = new remote.BrowserWindow({
		frame: true, backgroundColor: '#2c313e'
	});
	combatWindow.loadURL('https://web.simple-mmo.com/');
	ipcRenderer.send('window-is-null', false);

	combatWindow.on('close', () => {
		combatWindow = null;
		ipcRenderer.send('window-is-null', true);
	})
});

let targetList = []
ipcRenderer.on('target-list-data', (e, args) => {
	targetList = targetList.concat(args);
})

let targetIndex = 0;
document.getElementById('enter-combat').addEventListener('click', () => {
	console.log(targetList)
	if (!targetList[0]) ipcRenderer.send('refresh-target-list');
})

document.getElementById('next-target').addEventListener('click', () => {
	console.log(targetList)
	if (!targetList[0]) ipcRenderer.send('refresh-target-list');
	if (targetIndex > targetList.length - 1) return;
	
	let url = `https://web.simple-mmo.com/user/attack/${targetList[targetIndex]}`
	combatWindow.loadURL(url);
	ipcRenderer.send('target-hit', targetList[targetIndex]);
	targetIndex++;

	validateTargetList(targetList, targetIndex);
});

document.getElementById('submit-max-level').addEventListener('click', () => {
	let div = document.getElementById('max-level-input');
	if (!div.value) return;

	ipcRenderer.send('submit-max-level', div.value);
});


document.getElementById('max-level-input').addEventListener("keydown", (event) => {
	if (event.key !== "Enter") return;

	let div = document.getElementById('max-level-input');
	if (!div.value) return;

	ipcRenderer.send('submit-max-level', div.value);
});

const validateTargetList = (list, counter) => {
	if (counter / list.length > 0.8){
		ipcRenderer.send('refresh-target-list');
		ipcRenderer.send('guild-hit');
	}
}