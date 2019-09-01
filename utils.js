function isWsOpen(ws) {
	return ws && ws.readyState == WebSocket.OPEN;
}

function writeString(view, offset, str) {
	let code = null, i = 0;
	while ((code = str.charCodeAt(i))) {
		view.setUint8(offset++, code);
		i++;
	}
	view.setUint8(offset++, 0);
	return offset;
}

function readString(view, offset) {
	let str = "", code = null;
	while ((code = view.getUint8(offset++))) {
		str += String.fromCharCode(code);
	}
	return str;
}

function prepareMsg(b) {
	return new DataView(new ArrayBuffer(b));
}

function wsSend(ws, view) {
	if (isWsOpen(ws)) { 
		ws.send(view);
	}
}

function sendString(ws, str) {
	let view = prepareMsg(1+str.length+1);
	view.setUint8(0, 10);
	writeString(view, 1, str);
	wsSend(ws, view);
}

class Node {
	constructor() {
		this.id = Math.round(Math.random() * 1E5);
		this.x = 0;
		this.y = 0;
		this.ws = null;
		this.nickname = new String();
		this.newX = this.oldX = this.x;
		this.newY = this.oldY = this.y;
		this.updateTime = 0;
		this.mouseX = 0;
		this.mouseY = 0;
		this.mouseMoveX = 0;
		this.mouseMoveY = 0;
		this.keys = {};
	}
	updatePos() {
		let t = Math.min((timestamp - this.updateTime) / animDelay, 1);
		this.x = this.oldX + (this.newX - this.oldX) * t;
		this.y = this.oldY + (this.newY - this.oldY) * t;
	}
}

(function () {
	let obj = {
		isWsOpen: 		isWsOpen, 
		wsSend: 		wsSend,
		prepareMsg: 	prepareMsg,
		readString: 	readString,
		writeString: 	writeString,
		sendString: 	sendString,
		modifyGlobal: 	modifyGlobal,
		Node: 			Node,
	}
	function modifyGlobal() {
		if (typeof global == "object") {
			for (let key in obj) {
				global[key] = obj[key];
			}
		}
	}
	if (typeof module != "undefined" && typeof module.exports == "object") {
		module.exports = obj;
	}
})();
	