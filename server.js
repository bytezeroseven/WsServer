

function onWsConnection(ws, req) {
	!true && console.log("New ws connection with ip=" + ws._socket.remoteAddress);
	ws.binaryType = "arraybuffer";

	let node = new Node();
	node.ws = ws;

	let view = prepareMsg(1+4);
	view.setUint8(0, 20);
	view.setInt32(1, node.id);
	wsSend(ws, view);

	sendString(ws, "hippityy hoopity!!");
	
	function onWsMessage(msg) {
		handleWsMessage(new DataView(msg.data));
	}

	function onWsClose() {

	}

	function handleWsMessage(view) {
		let offset = 0;
		switch (view.getUint8(offset++)) {
			case 10: // Random string message
				console.log(readString(view, offset));
				break;
			case 11: // Player nickname
				node.nickname = readString(view, offset);
				offset += node.nickname.length+1;
				node.isPlaying = true;
				break;
			case 5: // Move position
				node.mouseX = view.getInt16(offset); offset += 4;
				node.mouseY = view.getInt16(offset); offset += 4;
				break;
			case 6: // Mouse movement
				node.mouseMoveX = view.getInt16(offset); offset += 4;
				node.mouseMoveY = view.getInt16(offset); offset += 4;
				break;
			case 15: // Key pressed
				node.keys[view.getUint8(offset++)] = true;
				console.log(node.keys);
				break;
			case 16: // Key released
				delete node.keys[view.getUint8(offset++)];
					console.log(node.keys);
				break;
			default: 
				console.log("unknown client msg. closing websocket for security purposes.");
				ws.close();
		}
	}

	ws.isAlive = true;
	ws.on("pong", function() { ws.isAlive = true; });
	ws.onmessage = onWsMessage;
	ws.onclose = onWsClose;
}

function gameTick() {
	// ID 25
}

let tickRate = 50;
let gameTickInterval = setInterval(gameTick, tickRate);

let WebSocket = require("ws");
let express = require("express");

global.WebSocket = WebSocket;

let utils = require("./utils.js");
utils.modifyGlobal();

let app = express();
app.use("/", express.static("public"));
app.use("/utils.js", express.static("utils.js"));

let port = process.env.PORT || 7000;
let server = app.listen(port, function () {
	console.log("Server listening on port=" + port);
});
let wss = new WebSocket.Server({ server });

let connectionCheckInterval = setInterval(function () {
	wss.clients.forEach(function (ws) {
		if (ws.isAlive == false) ws.close();
		ws.isAlive = false;
		ws.ping();
	});	
}, 30E3);
wss.on("connection", onWsConnection);

