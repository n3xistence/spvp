import { ipcRenderer } from "electron";
 
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

document.getElementById('submit-user-id').addEventListener('click', () => {
	let div = document.getElementById('user-id-input');
	if (!div.value) return;

	ipcRenderer.send('user-id', div.value);
});

document.getElementById('submit-api-key').addEventListener('click', () => {
	let div = document.getElementById('api-key-input');
	if (!div.value) return;

	ipcRenderer.send('api-key', div.value);
});

document.getElementById('user-id-input').addEventListener("keydown", (event) => {
	if (event.key !== "Enter") return;

	let div = document.getElementById('user-id-input');
	if (!div.value) return;

	ipcRenderer.send('user-id', div.value);
});

document.getElementById('api-key-input').addEventListener("keydown", (event) => {
	if (event.key !== "Enter") return;

	let div = document.getElementById('api-key-input');
	if (!div.value) return;

	ipcRenderer.send('api-key', div.value);
});

ipcRenderer.on('user-id-set', (e, args) => {
	let input = document.getElementById('user-id-input');
	if (args === null) input.placeholder = "Not Set"
	else input.placeholder = args;
});

ipcRenderer.on('api-key-set', (e, args) => {
	let input = document.getElementById('api-key-input');
	if (args === null) input.placeholder = "Not Set"
	else input.placeholder = args;
});