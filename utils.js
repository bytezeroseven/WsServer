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

function wsSend(ws, view) {
	if (isWsOpen(ws)) { 
		ws.send(view);
		netstats.incrementSent(view.byteLength);
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
		};
	}
})();
	