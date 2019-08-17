let ws = null;
let oldUrl = null;
let reconnectAttempt = null;
let reconnectAttemptTime = 5E3;

wsConnect(location.origin);

function onWsMessage(msg) {
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
	let str = "my name is jeff";
	let view = new DataView(new ArrayBuffer(1+str.length+1));
	view.setUint8(0, 10);
	writeString(view, 1, str);
	ws.send(view);
}

function wsConnect(wsUrl) {
	if (ws) {
		ws.onmessage = null;
		ws.onopen = null;
		ws.onclose = null;
		ws.close();
		ws = null;
	}
	console.log("Connecting to " + wsUrl + "...");
	wsUrl = wsUrl.replace("http", "ws");
	oldWsUrl = wsUrl;
	ws = new WebSocket(wsUrl);
	ws.binaryType = "arraybuffer";
	ws.onmessage = onWsMessage;
	ws.onopen = onWsOpen;
	ws.onclose = onWsClose;
	ws.onerror = function () { console.oog("websocket error.") }
}


