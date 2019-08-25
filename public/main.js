let mainOverlay = document.getElementById("mainOverlay");
let playButton = document.getElementById("playButton");
let nicknameInput = document.getElementById("nicknameInput");
let connectingUrl = document.getElementById("connectingUrl");
let connectingBox = document.getElementById("connectingBox");
let inviteButton = document.getElementById("inviteButton");
let joinButton = document.getElementById("joinButton");
let gameCanvas = document.getElementById("gameCanvas");
let ctx = gameCanvas.getContext("2d");
let canvasWidth = 0;
let canvasHeight = 0;
let scale = 1;
let nodes = [];
let animDelay = 120;
let timestamp = 0;
let mouseX = 0;
let mouseY = 0;
let screenNodeId = null;
let nodeX = 0;
let nodeY = 0;

function onResize() {
	canvasWidth = innerWidth;
	canvasHeight = innerHeight;
	gameCanvas.width = canvasWidth;
	gameCanvas.height = canvasHeight;
	scale = Math.min(innerWidth / 1200, innerHeight / 675);
	mainOverlay.style.transform = "translate(-50%, -50%) scale(" + scale + ") translate(50%, 50%)";
	mainOverlay.style.width = innerWidth / scale + "px";
	mainOverlay.style.height = innerHeight / scale + "px";
}
window.onresize = onResize;

function onKeyUp(evt) {
	if (evt.key == "Escape") toggleEle(mainOverlay);
}

function onMouseMove(evt) {
	mouseX = evt.clientX;
	mouseY = evt.clientY;
	sendMousePos();
}

document.onmousemove = onMouseMove;
document.onkeyup = onKeyUp;

let ws = null;
let oldWsUrl = null;
let reconnectAttempt = null;
let reconnectAttemptTime = 5E3;

function onWsMessage(msg) {
	handleWsMessage(new DataView(msg.data));
}

function handleWsMessage(view) {
	let offset = 0;
	switch (view.getUint8(offset++)) {
		case 10:
			console.log(readString(view, offset));
			break;
		case 5:
			let nodeId = 0;
			let posX = 0;
			let posY = 0;
			let nickname = null;
			let length = view.getInt32(offset); offset += 4;
			for (let i = 0; i < length; i++) {
				nodeId = view.getInt32(offset); offset += 4;
				posX = view.getInt32(offset); offset += 4;
				posY = view.getInt32(offset); offset += 4;
				nickname = readString(view, offset);
				offset += nickname.length+1;
				let node = nodes.find(node => node.id == nodeId);
				if (!node) {
					node = new Node();
					node.id = nodeId;
					node.x = posX;
					node.y = posY;
					nodes.push(node);
				} else {
					node.oldX = node.x;
					node.oldY = node.y;
					node.newX = posX;
					node.newY = posY;
					node.updateTime = timestamp;
				}
				node.nickname = nickname;
			}
			length = view.getInt32(offset); offset += 4;
			for (let i = 0; i < length; i++) {
				nodeId = view.getInt32(offset); offset += 4;
				let index = nodes.findIndex(node => node.id == nodeId);
				if (index > -1) nodes.splice(index, 1);
			}
			break;
		case 8: 
			screenNodeId = view.getInt32(offset);
			break;
		default: console.log("unknown server msg.");
	}
}

function onWsClose() {
	console.log("Disconnected. Reconnecting in " + reconnectAttemptTime + "ms");
	reconnectAttempt = setTimeout(function () {
		wsConnect(oldWsUrl);
		clearTimeout(reconnectAttempt);
	}, reconnectAttemptTime);
}

function onWsOpen() {
	console.log("Connected!");
	playButton.disabled = false;
	hideEle(connectingBox);
}

function wsConnect(wsUrl) {
	console.log("Connecting to " + wsUrl + "...");
	showEle(connectingBox);
	playButton.disabled = true;
	connectingUrl.innerHTML = wsUrl;
	if (reconnectAttempt) {
		clearTimeout(reconnectAttempt);
		reconnectAttempt = null;
	}
	if (ws) {
		ws.onmessage = null;
		ws.onopen = null;
		ws.onclose = null;
		ws.close();
		ws = null;
	}
	oldWsUrl = wsUrl;
	wsUrl = wsUrl.replace("http", "ws");
	ws = new WebSocket(wsUrl);
	ws.binaryType = "arraybuffer";
	ws.onmessage = onWsMessage;
	ws.onopen = onWsOpen;
	ws.onclose = onWsClose;
	ws.onerror = function () { console.log("websocket error.") }
	nodes = [];
}

function sendNickname() {
	let view = new DataView(new ArrayBuffer(1+nicknameInput.value.length+1));
	view.setUint8(0, 11);
	writeString(view, 1, nicknameInput.value);
	wsSend(ws, view);
}

function sendMousePos() {
	let posX = mouseX - canvasWidth / 2,
		posY = mouseY - canvasHeight / 2;
	let view = prepareMsg(1+4+4);
	view.setUint8(0, 2);
	view.setInt16(1, posX);
	view.setInt16(5, posY);
	wsSend(ws, view);
}

function gameLoop() {
	requestAnimationFrame(gameLoop);
	timestamp = Date.now();
	ctx.fillStyle = "#ddd";
	ctx.fillRect(0, 0, canvasWidth, canvasHeight);

	let screenNode = nodes.find(node => node.id == screenNodeId);
	if (screenNode) {
		nodeX = screenNode.x;
		nodeY = screenNode.y;
	}
	ctx.save();
	ctx.translate(-nodeX + canvasWidth / 2, -nodeY + canvasHeight / 2);
	nodes.forEach(node => {
		node.updatePos();
		node.draw();
	});
	ctx.restore();
}

function isHidden(ele) {
	return ele.getBoundingClientRect().height == 0;
}

function showEle(ele) {
	ele.style.display = "block";
}

function hideEle(ele) {
	ele.style.display = "none";
}

function toggleEle(ele) {
	if (isHidden(ele)) showEle(ele);
	else hideEle(ele);
}

playButton.onclick = function() {
	sendNickname();
	hideEle(mainOverlay);
}

inviteButton.onclick = function() {
	let input = document.createElement("input");
	document.body.appendChild(input);
	input.value = oldWsUrl;
	input.select();
	document.execCommand('copy');
	document.body.removeChild(input);
	inviteButton.innerHTML = "Copied!";
	let timeoutId = setTimeout(function() { 
		inviteButton.innerHTML = "Invite"; 
		clearTimeout(timeoutId);
		timeoutId = null;
	}, 3E3);
}

joinButton.onclick = function() {
	let url = prompt("Enter url:", "http://localhost:7000");
	url && wsConnect(url);
}

onResize();
gameLoop();
wsConnect(location.origin);

