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
		netstats.incrementSent(view.byteLength);
	}
}

function sendString(ws, str) {
	let view = prepareMsg(1+str.length+1);
	view.setUint8(0, 10);
	writeString(view, 1, str);
	wsSend(ws, view);
}

let netstats = { 
	throughput: 0,
	totalUp: 0,
	totalDown: 0, 
	total: 0, 
	upRate: 0, 
	downRate: 0, 
	timeElapsed: 0,
	tickTimeout: null,
	tick: function(func) {
		this.text = "T: " + this.throughput + "B/s " + "D: " + this.downRate + "B/s " + "S: " + this.upRate + "B/s";
		this.throughput = 0;
		this.upRate = 0;
		this.downRate = 0;
		this.timeElapsed += 1;
		this.stopTick();
		if (func) func(this.text);
		this.tickTimeout = setTimeout(() => { this.tick(func); }, 1E3);
	},
	stopTick: function() {
		clearTimeout(this.tickTimeout);
		this.tickTimeout = null;
	},
	incrementSent: function(b) {
		this.throughput += b;
		this.total += b;
		this.totalUp += b;
		this.upRate += b;
	},
	incrementReceived: function(b) {
		this.throughput += b;
		this.total += b;
		this.totalDown += b;
		this.downRate += b;
	}
};

netstats.tick();

class Node {
	constructor() {
		this.ws = null;
		this.id = Math.round(Math.random() * 1E5);
		this.x = 0;
		this.y = 0;
		this.nickname = "";
		this.newX = this.oldX = this.x;
		this.newY = this.oldY = this.y;
		this.updateTime = 0;
		this.mouseX = 0;
		this.mouseY = 0;
		this.isPlaying = false;
	}
	updatePos() {
		let t = Math.min((timestamp - this.updateTime) / animDelay, 1);
		this.x = this.oldX + (this.newX - this.oldX) * t;
		this.y = this.oldY + (this.newY - this.oldY) * t;
	}
	move() {
		let d = Math.hypot(this.mouseX, this.mouseY) || 1;
		this.x += this.mouseX / d * 3;
		this.y += this.mouseY / d * 3;
	}
	draw() {
		ctx.beginPath();
		ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
		ctx.closePath();
		ctx.lineWidth = 4;
		ctx.strokeStyle = "#e24413";
		ctx.fillStyle = "#ff5722";
		ctx.fill();
		ctx.stroke();
		ctx.lineWidth = 1;
		ctx.fillStyle = "white";
		ctx.strokeStyle = "black";
		ctx.textBaseline = "bottom";
		ctx.textAlign = "center";
		ctx.font = "bolder 28px arial";
		ctx.fillText(this.nickname, this.x, this.y - 20 - 5);
		ctx.strokeText(this.nickname, this.x, this.y - 25);
	}
}

(function () {
	function modifyGlobal() {
		if (typeof global == "object") {
			global.isWsOpen = isWsOpen;
			global.writeString = writeString;
			global.readString = readString;
			global.wsSend = wsSend;
			global.netstats = netstats;
			global.prepareMsg = prepareMsg;
			global.sendString = sendString;
			global.Node = Node;
		}
	}
	if (typeof module != "undefined" && typeof module.exports == "object") {
		module.exports = {
			isWsOpen, 
			readString,
			readString,
			wsSend,
			netstats,
			modifyGlobal,
			prepareMsg,
			sendString,
			Node: Node
		};
	}
})();
	