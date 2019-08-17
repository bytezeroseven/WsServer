let express = require("express");
let app = express();

app.use("/", express.static("public"));

let port = process.env.PORT || 7000;
let server = app.listen(port, function done() {
	console.log("Server listening on port=" + port);
});

let WebSocket = require("ws");
let wss = new WebSocket.Server({ server });

function isWsOpen(ws) {
	return ws && ws.statusCode == WebSocket.OPEN;
}

function onWsConnection(ws) {
	console.log("New ws connection");
	ws.binaryType = "arraybuffer";
	
	function onWsMessage(msg) {
		handleWsMessage(new DataView(msg.data));
	}

	function onWsClose() {
		console.log("ws connection closed.");
	}

	function handleWsMessage(view) {
		let offset = 0;
		switch (view.getUint8(offset++)) {
			case 22: 
				console.log(view.getInt16(offset));
				break;
			default: console.log("unknown client msg.");
		}
	}

	let view = new DataView(new ArrayBuffer(1+4));
	view.setUint8(0, 44);
	view.setInt16(1, 6969);
	ws.send(view);

	ws.isAlive = true;
	ws.on("pong", function() {
		ws.isAlive = true;
	});

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