let express = require("express");
let app = express();

app.use("/", express.static("public"));
app.use("/utils.js", express.static("utils.js"));

let port = process.env.PORT || 7000;
let server = app.listen(port, function done() {
	console.log("Server listening on port=" + port);
});

let WebSocket = require("ws");
let wss = new WebSocket.Server({ server });

global.WebSocket = WebSocket;

let utils = require("./utils.js");
utils.modifyGlobal();

function onWsConnection(ws, req) {
	console.log("New ws connection with ip=" + ws._socket.remoteAddress);
	ws.binaryType = "arraybuffer";
	
	function onWsMessage(msg) {
		netstats.incrementReceived(msg.data.byteLength);
		handleWsMessage(new DataView(msg.data));
	}

	function onWsClose() {
		
	}

	function handleWsMessage(view) {
		let offset = 0;
		switch (view.getUint8(offset++)) {
			case 10: 
				console.log("STR:", readString(view, 1));
				break;
			default: console.log("unknown client msg.");
		}
	}

	let str = "Test server message!!";
	let view = new DataView(new ArrayBuffer(1+str.length+1));
	view.setUint8(0, 10);
	writeString(view, 1, str);
	wsSend(ws, view);

	ws.isAlive = true;
	ws.on("pong", function() { ws.isAlive = true; });
	ws.onmessage = onWsMessage;
	ws.onclose = onWsClose;
}

let pingCheckInterval = setInterval(function () {
	wss.clients.forEach(function (ws) {
		if (ws.isAlive == false) ws.close();
		ws.isAlive = false;
		ws.ping();
	});	
}, 30E3);

wss.on("connection", onWsConnection);