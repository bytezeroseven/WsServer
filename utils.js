function isWsOpen(ws) {
	return ws && ws.statusCode == WebSocket.OPEN;
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

(function () {
	if (typeof global == "object") {
		global.isWsOpen = isWsOpen;
		global.writeString = writeString;
		global.readString = readString;
	}
	if (typeof module != "undefined" && typeof module.exports == "object") {
		module.exports = {
			isWsOpen, 
			readString,
			readString
		};
	}
})();
	