const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express().use(express.static("public"));
const server = createServer(app);
const io = new Server(server);

//#region express

app.get('/', (req, res) => {
	res.redirect("/index.html");
});

//#endregion

//#region socket.io
let waitingSockets = [];
io.on('connection', (socket) => {
	socket.on("newgame", (nick) => {
		let s2 = waitingSockets.shift();
		if(s2 != undefined) {
			let id = socket.id+s2.socket.id;
			socket.join(id);
			s2.socket.join(id);
			socket.emit("start", {yourTurn: 1, nick: s2.nick, id: id});
			s2.socket.emit("start", {yourTurn: 0, nick: nick, id: id});
		} else {
			waitingSockets.push({socket: socket, nick: nick});
		}
	});
	socket.on("place", (data) => {
		if(socket.rooms.has(data.id)) {
			io.to(data.id).emit("place", data);
		}
	});
	socket.on("disconnecting", () => {
		for(let s in waitingSockets) {
			if(waitingSockets[s].socket == socket.id) {
				waitingSockets.splice(s, 1);
				break;
			}
		}
		for(let r of socket.rooms) {
			if(r != socket.id) {
				io.to(r).emit("won");
			}
		}
	});
});

//#endregion

let port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
	console.log('Server running on port:'+port);
});