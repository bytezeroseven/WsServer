
function onWsConnection(ws, req) {
	console.log("New ws connection with ip=" + ws._socket.remoteAddress);
	ws.binaryType = "arraybuffer";

	let node = new Node();
	node.ws = ws;
	nodes.push(node);
	
	function onWsMessage(msg) {
		netstats.incrementReceived(msg.data.byteLength);
		handleWsMessage(new DataView(msg.data));
	}

	function onWsClose() {
		let i = nodes.indexOf(node);
		if (i > -1) nodes.splice(i, 1);
	}

	function handleWsMessage(view) {
		let offset = 0;
		switch (view.getUint8(offset++)) {
			case 10: 
				console.log("STR MSG:", readString(view, offset));
				break;
			case 11:
				node.nickname = readString(view, offset);
				offset += node.nickname.length+1;
				node.isPlaying = true;
				break;
			case 2:
				let posX = view.getInt16(offset); offset += 4;
				let posY = view.getInt16(offset); offset += 4;
				node.mouseX = posX;
				node.mouseY = posY;
				break; 
			default: console.log("unknown client msg.");
		}
	}

	let str = "Test server message!!";
	sendString(ws, str);

	ws.isAlive = true;
	ws.on("pong", function() { ws.isAlive = true; });
	ws.onmessage = onWsMessage;
	ws.onclose = onWsClose;
}

function gameTick() {
	let nicknameBytes = 0;
	nodes.forEach(node => (nicknameBytes += node.nickname.length+1))
	let view = prepareMsg(1+4+nodes.length*12+nicknameBytes+4);
	let offset = 0;
	view.setUint8(offset++, 5);
	view.setInt32(offset, nodes.length); 
	offset += 4;
	for (let i = 0; i < nodes.length; i++) {
		let node = nodes[i];
		if (node.isPlaying == false) continue;
		node.move();
		node.x < 0 && (node.x = 0);
		node.x > 500 && (node.x = 500);
		node.y < 0 && (node.y = 0);
		node.y > 500 && (node.y = 500);
		
		let nodeId = node.id;
		view.setInt32(offset, nodeId); offset += 4;
		view.setInt32(offset, node.x); offset += 4;
		view.setInt32(offset, node.y); offset += 4;
		offset = writeString(view, offset, node.nickname);
	}
	view.setInt32(offset, 0);
	nodes.forEach(node => wsSend(node.ws, view))
}

let nodes = [];
let gameInterval = setInterval(gameTick, 1000 / 20);


let WebSocket = require("ws");
let express = require("express");
let app = express();

global.WebSocket = WebSocket;

let utils = require("./utils.js");
utils.modifyGlobal();

app.use("/", express.static("public"));
app.use("/utils.js", express.static("utils.js"));

let port = process.env.PORT || 7000;
let server = app.listen(port, function done() {
	console.log("Server listening on port=" + port);
});

let wss = new WebSocket.Server({ server });

let pingCheckInterval = setInterval(function () {
	wss.clients.forEach(function (ws) {
		if (ws.isAlive == false) ws.close();
		ws.isAlive = false;
		ws.ping();
	});	
}, 30E3);

wss.on("connection", onWsConnection);
