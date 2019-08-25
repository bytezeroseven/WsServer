
let nodes = [];
let removedNodes = [];
let gameInterval = setInterval(gameTick, 1000 / 20);

function onWsConnection(ws, req) {
	!true && console.log("New ws connection with ip=" + ws._socket.remoteAddress);
	ws.binaryType = "arraybuffer";

	let node = new Node();
	node.ws = ws;
	node.isPlaying = false;
	nodes.push(node);

	let view = prepareMsg(1+4);
	view.setUint8(0, 8);
	view.setInt32(1, node.id);
	wsSend(ws, view);
	
	function onWsMessage(msg) {
		handleWsMessage(new DataView(msg.data));
	}

	function onWsClose() {
		let i = nodes.indexOf(node);
		if (i > -1) nodes.splice(i, 1);
		removedNodes.push(node);
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
			default: 
				console.log("unknown client msg. closing websocket for security purposes.");
				ws.close();
		}
	}

	let str = "hippityy hoopity!!";
	sendString(ws, str);

	ws.isAlive = true;
	ws.on("pong", function() { ws.isAlive = true; });
	ws.onmessage = onWsMessage;
	ws.onclose = onWsClose;
}

function gameTick() {
	let n = nodes.filter(node => node.isPlaying);
	let nicknameBytes = 0;
	n.forEach(node => (nicknameBytes += node.nickname.length+1))
	let view = prepareMsg(1+4+n.length*12+nicknameBytes+4+removedNodes.length*4);
	let offset = 0;
	view.setUint8(offset++, 5);
	view.setInt32(offset, n.length); 
	offset += 4;
	for (let i = 0; i < n.length; i++) {
		let node = n[i];
		node.move();
		let nodeId = node.id;
		view.setInt32(offset, nodeId); offset += 4;
		view.setInt32(offset, node.x); offset += 4;
		view.setInt32(offset, node.y); offset += 4;
		offset = writeString(view, offset, node.nickname);
	}
	view.setInt32(offset, removedNodes.length);
	offset += 4; 
	removedNodes.forEach(node => {
		view.setInt32(offset, node.id);
		offset += 4;
	});
	nodes.forEach(node => wsSend(node.ws, view));
	removedNodes = [];
}

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

let pingpongInterval = setInterval(function () {
	wss.clients.forEach(function (ws) {
		if (ws.isAlive == false) ws.close();
		ws.isAlive = false;
		ws.ping();
	});	
}, 30E3);

wss.on("connection", onWsConnection);
