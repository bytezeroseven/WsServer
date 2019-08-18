let mainOverlay = document.getElementById("mainOverlay");
let playButton = document.getElementById("playButton");
let nicknameInput = document.getElementById("nicknameInput");
let connectingUrl = document.getElementById("connectingUrl");
let connectingBox = document.getElementById("connectingBox");

function onResize() {
	let scale = Math.min(innerWidth / 1200, innerHeight / 675);
	mainOverlay.style.transform = "translate(-50%, -50%) scale(" + scale + ") translate(50%, 50%)";
	mainOverlay.style.width = innerWidth / scale + "px";
	mainOverlay.style.height = innerHeight / scale + "px";
}
window.onresize = onResize;

function onKeyUp(evt) {
	if (evt.key == "Escape") toggleEle(mainOverlay);
}

document.onkeyup = onKeyUp;

let ws = null;
let oldUrl = null;
let reconnectAttempt = null;
let reconnectAttemptTime = 5E3;

function onWsMessage(msg) {
	netstats.incrementReceived(msg.data.byteLength);
	handleWsMessage(new DataView(msg.data));
}

function handleWsMessage(view) {
	let offset = 0;
	switch (view.getUint8(offset++)) {
		case 10:
			console.log(readString(view, offset));
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
	playButton.disabled = true;
	showEle(connectingBox);
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
	wsUrl = wsUrl.replace("http", "ws");
	oldWsUrl = wsUrl;
	ws = new WebSocket(wsUrl);
	ws.binaryType = "arraybuffer";
	ws.onmessage = onWsMessage;
	ws.onopen = onWsOpen;
	ws.onclose = onWsClose;
	ws.onerror = function () { console.log("websocket error.") }
}

function sendNickname() {
	let view = new DataView(new ArrayBuffer(1+nicknameInput.value.length+1));
	view.setUint8(0, 10);
	writeString(view, 1, nicknameInput.value);
	wsSend(ws, view);
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

onResize();
wsConnect(location.origin);