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
let mouseMoveX = 0;
let mouseMoveY = 0;
let keys = {};
let screenNodeId = null;

function onResize() {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
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

function onKeyDown(evt) {
	if (!evt.repeat) {
		keys[evt.key] = true;
		sendKeyDown(evt.keyCode);
	}
}

function onKeyUp(evt) {
	if (evt.key == "Escape") toggleEle(mainOverlay);
	delete keys[evt.key];
	sendKeyUp(evt.keyCode);
}

function onMouseMove(evt) {
	mouseMoveX = evt.movementX;
	mouseMoveY = evt.movementY;
	mouseX = evt.clientX;
	mouseY = evt.clientY;
	sendMousePos();
	sendMouseMove();
}

document.onmousemove = onMouseMove;
document.onkeydown = onKeyDown;
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
		case 10: // Random string message
			console.log(readString(view, offset));
			break;
		case 20: // Local player id 
			screenNodeId = view.getInt32(offset);
			break;
		case 25: // Update nodes
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
	view.setUint8(0, 5);
	view.setInt16(1, posX);
	view.setInt16(5, posY);
	wsSend(ws, view);
}

function sendMouseMove() {
	let view = prepareMsg(1+4+4);
	view.setUint8(0, 6);
	view.setInt16(1, mouseMoveX);
	view.setInt16(5, mouseMoveY);
	wsSend(ws, view);
}

function sendKeyDown(keyCode) {
	let view = prepareMsg(1+1);
	view.setUint8(0, 15);
	view.setUint8(1, keyCode);
	wsSend(ws, view);
}

function sendKeyUp(keyCode) {
	let view = prepareMsg(1+1);
	view.setUint8(0, 16);
	view.setUint8(1, keyCode);
	wsSend(ws, view);
}

function gameLoop() {
	requestAnimationFrame(gameLoop);
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
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
	let copyInput = document.createElement("input");
	document.body.appendChild(copyInput);
	copyInput.value = oldWsUrl;
	copyInput.select();
	document.execCommand('copy');
	document.body.removeChild(copyInput);
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

