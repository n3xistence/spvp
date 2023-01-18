import { app, BrowserWindow, ipcMain, dialog, globalShortcut } from "electron";
import fs from 'fs';
import ini from 'ini';
import axios from "axios";

import tailwind from "tailwindcss";
module.exports = {
	plugins: [tailwind("./tailwind.config.js")],
};

let mainWindow;
let combatWindowIsNull = true;
let pageURL;

const createMainWindow = () => {
	mainWindow = new BrowserWindow({
		width: 600,
		height: 200,
		movable: true,
		titlebar: "customButtonsOnHover",
		backgroundColor: '#2c313e',
		frame: false,
		show: false,
		nodeIntegration: true,
		webPreferences: {
			nodeIntegration: true,
		},
	});

    //initialize window
	mainWindow.loadURL(`file://${__dirname}/components/home.html`);
	// mainWindow.webContents.openDevTools();

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	mainWindow.on('blur', () => {
		if (combatWindowIsNull) return;

		// forcefully focus the main window when there is a running combat instance
		mainWindow.focus();
	});

	mainWindow.webContents.on('did-finish-load', (window) => {
		let history = window.sender.history;
		let pages = history[history.length - 1].split("/");
		pageURL = pages[pages.length - 1];

		switch (pageURL){
			case "settings.html":
				let settings = ini.parse(fs.readFileSync('./data/settings.ini', 'utf-8'))
				
				if (settings.user.id == -1){
					mainWindow.webContents.send('user-id-set', null);
				} else {
					mainWindow.webContents.send('user-id-set', settings.user.id);
				}

				if (settings.user.key == -1){
					mainWindow.webContents.send('api-key-set', null);
				} else {
					mainWindow.webContents.send('api-key-set', settings.user.key);
				}
				break;
			case "home.html":
				validateDataStructure();
				reshuffleGuildEntries();
				break;
			default:
				return;
		}
	})
}

ipcMain.on("close-window", () => {
	mainWindow.close();
});

ipcMain.on("maximize-window", () => {
	mainWindow.maximize();
});

ipcMain.on("restore-window", () => {
	mainWindow.unmaximize();
});

ipcMain.on("minimize-window", () => {
	mainWindow.minimize();
});

ipcMain.on('open-home-page', () => {
	mainWindow.loadURL(`file://${__dirname}/components/home.html`);
})

ipcMain.on('open-settings-page', () => {
	mainWindow.loadURL(`file://${__dirname}/components/settings.html`);
})

ipcMain.on('user-id', async (e, args) => {
	let config = JSON.parse(fs.readFileSync('./data/config.json'));
	let settings = ini.parse(fs.readFileSync('./data/settings.ini', 'utf-8'))

	if (settings.user.key == -1) return dialog.showMessageBox({
		type: "error",
		title: "No API Key set.",
		message:
			`You have not set an API Key in the settings. \nThis value needs to be provided before you set your user id so the app can fetch your data.`,
	});

	try{
		let userdata = await axios.post(
			`https://api.simple-mmo.com/v1/player/info/${args}`, 
			{ api_key: settings.user.key }
		);
		userdata = userdata.data;

		config.userid = userdata.id;
		config.guildid = userdata.guild.id;

		let wars = await axios.post(
			`https://api.simple-mmo.com/v1/guilds/wars/${userdata.guild.id}/1`,
			{ api_key: settings.user.key }
		);
		wars = wars.data;

		for (let i = 0;i < wars.length;i++){
			if (config.active_wars.some(
				obj => obj.guild_1.id === wars[i].guild_1.id &&
						obj.guild_2.id === wars[i].guild_2.id
			)) continue;

			config.active_wars.push(
				{
					"guild_1": {
						"id": wars[i].guild_1.id,
						"name": wars[i].guild_1.name,
					},
					"guild_2": {
						"id": wars[i].guild_2.id,
						"name": wars[i].guild_2.name,
					}
				}
			)
		}

		fs.writeFileSync('./data/config.json', JSON.stringify(config, null, "\t"));
		
		settings.user.id = args;
		fs.writeFileSync('./data/settings.ini', ini.stringify(settings))
		
		dialog.showMessageBox({
			type: "info",
			title: "ID Set",
			message:
				`Successfully set your User ID to ${userdata.id}`,
		});
	} catch(e){ 
		console.log(e) 
	}
})

ipcMain.on('api-key', async (e, args) => {
	let settings = ini.parse(fs.readFileSync('./data/settings.ini', 'utf-8'))
	settings.user.key = args;
	fs.writeFileSync('./data/settings.ini', ini.stringify(settings))

	return dialog.showMessageBox({
		type: "info",
		title: "API Key Set",
		message:
			`Successfully set your API Key to ${args}`,
	});
});

let guild_index = 0;
ipcMain.on('refresh-target-list', async (e) => {
	let guildid = fetchGuildID();
	let targets = await getGuildTargets(guildid, max_level);
		
	e.sender.send('target-list-data', targets);
})

ipcMain.on('target-hit', (e, args) => {
	let targets = JSON.parse(fs.readFileSync('./data/targets.json'));

	for (let i = 0;i < targets.userlist.length;i++){
		if (targets.userlist[i].id !== args) continue;

		targets.userlist[i].hits += 1;
		return fs.writeFileSync('./data/targets.json', JSON.stringify(targets, null, "\t"));
	}

	targets.userlist.push({
		"id": args,
		"hits": 1,
		"first_hit": getStamp()
	})

	fs.writeFileSync('./data/targets.json', JSON.stringify(targets, null, "\t"));
})

ipcMain.on('guild-hit', () => {
	let config = JSON.parse(fs.readFileSync('./data/config.json'));
	let war = config.active_wars[guild_index];
	let enemyGuild = (war.guild_1.id === config.guildid) 
		? war.guild_2.id
		: war.guild_1.id

	let targets = JSON.parse(fs.readFileSync('./data/targets.json'));
	if (targets.guild_ids.includes(enemyGuild)) return;

	targets.guild_ids.push(enemyGuild);
	fs.writeFileSync('./data/targets.json', JSON.stringify(targets, null, "\t"));
});

let max_level;
ipcMain.on('submit-max-level', (e, args) => {
	args = parseInt(args);
	if (!Number.isInteger(args)) return dialog.showMessageBox({
		type: "error",
		title: "Not a number",
		message:
			`Please provide a valid level.`,
	});

	max_level = args;
	return dialog.showMessageBox({
		type: "info",
		title: "Level set",
		message:
			`Successfully set max level filter to ${args}.`,
	});
})

ipcMain.on('window-is-null', (e, arg) => {
	combatWindowIsNull = arg;
});

app.on("ready", () => {
	createMainWindow();

	// remove for production
	globalShortcut.register("CommandOrControl+Shift+I", () => {
		mainWindow.webContents.toggleDevTools();
	});
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (mainWindow === null) createMainWindow();
});


// remove any user from the list which has been hit 24h ago
setInterval(() => {
	fs.readFile('./data/targets.json', 'utf-8', (err, data) => {
		if (err) throw err;

		let targets = JSON.parse(data);
		for (let i = 0;i < targets.length;i++){
			if (getStamp() - targets.first_hit >= 86400) targets.splice(i, 1);

			fs.writeFile('./data/targets.json', JSON.stringify(targets, null, "\t"), 'utf8', (err) => {
				if (err) throw err;
			});
		}
	});
}, 10000);

const getStamp = () => Math.floor(new Date() / 1000);

const getGuildTargets = async (guildID, max_level) => {
	let settings = ini.parse(fs.readFileSync('./data/settings.ini', 'utf-8'))
	if (settings.user.id == -1) return dialog.showMessageBox({
		type: "error",
		title: "No API Key",
		message:
			`Please set an API Key in the settings.`,
	});

	let targets = JSON.parse(fs.readFileSync('./data/targets.json'));
	let isValid = false;
	while (!isValid){
		try{
			var res = await axios.post(
			`https://api.simple-mmo.com/v1/guilds/members/${guildID}`,
			{ api_key: settings.user.key }
		
			);
		} catch(e){ 
			console.log(e); 
			continue; 
		}
		
		let filtered = res.data
			.filter(obj => 
				obj.safe_mode === 0 && 
				obj.current_hp / obj.max_hp >= 0.5 && 
				(max_level ? obj.level <= max_level : true)
			)

		for (let i = 0;i < filtered.length;i++){
			if (targets.userlist.some(obj => obj.id === filtered[i].id)){
				if (targets[i].hits < 3) continue;

				if (targets[i].hits == 3 ) {
					if (getStamp() - targets[i].first_hit > 43200) continue;
					else targets.splice(i, 1);
				} else targets.splice(i, 1);
			}
		}
		
		var list = filtered.map(obj => obj.user_id);

		if (list[0]) isValid = true;
		if (!isValid) guildID = fetchGuildID();
	}
	return list;
}

const fetchGuildID = () => {
	let config = JSON.parse(fs.readFileSync('./data/config.json'));
	if (guild_index >= config.active_wars.length) return dialog.showMessageBox({
		type: "error",
		title: "No more targets.",
		message:
			`There are no more targets for you to attack.`,
	});

	let war = config.active_wars[guild_index];
	let enemyGuild = (war.guild_1.id === config.guildid) 
		? war.guild_2.id
		: war.guild_1.id
	guild_index++;
	return enemyGuild;
}

const reshuffleGuildEntries = () => {
	let config = JSON.parse(fs.readFileSync('./data/config.json'));
	let list = config.active_wars;

	for (let i = list.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1));
		[list[i], list[j]] = [list[j], list[i]];
	}
	config.active_wars = list;
	fs.writeFileSync('./data/config.json', JSON.stringify(config, null, "\t"));
}

const validateDataStructure = () => {
	if (!fs.existsSync('./data')){
		fs.mkdirSync('./data')
	}

	if (!fs.existsSync('./data/config.json')){
		let template = {
			"userid": -1,
			"guildid": -1,
			"active_wars": []
		}
		fs.writeFileSync('./data/config.json', JSON.stringify(template, null, '\t'))
	}

	if (!fs.existsSync('./data/targets.json')){
		let template = {
			"guild_ids": [],
			"userlist": []
		}
		fs.writeFileSync('./data/targets.json', JSON.stringify(template, null, '\t'))
	}

	if (!fs.existsSync('./data/settings.ini')){
		let template = {
			user: {
				id: -1,
				key: -1
			}
		}
		fs.writeFileSync('./data/settings.ini', ini.stringify(template))
	}
}