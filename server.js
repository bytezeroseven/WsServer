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

function onWsConnection(ws, req) {
	console.log("New ws connection with ip=" + ws._socket.remoteAddress);
	ws.binaryType = "arraybuffer";
	
	function onWsMessage(msg) {
		handleWsMessage(new DataView(msg.data));
	}

	function onWsClose() {
		
	}

	function handleWsMessage(view) {
		let offset = 0;
		switch (view.getUint8(offset++)) {
			case 10: 
				console.log(readString(view, 1));
				break;
			default: console.log("unknown client msg.");
		}
	}

	let view = new DataView(new ArrayBuffer(1+4));
	view.setUint8(0, 10);
	view.setInt16(1, 6969);
	ws.send(view);

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
}, 3E3);

wss.on("connection", onWsConnection);