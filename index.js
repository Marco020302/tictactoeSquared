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
let waitingFriend = {};
io.on('connection', (socket) => {
	socket.on("newgame", (nick) => {
		let turn = Math.round(Math.random());
		let s2 = waitingSockets.shift();
		if(s2 != undefined && s2.socket.id != socket.id) {
			let id = socket.id+s2.socket.id;
			socket.join(id);
			s2.socket.join(id);
			socket.emit("start", {yourTurn: turn, nick: s2.nick, id: id});
			s2.socket.emit("start", {yourTurn: 1-turn, nick: nick, id: id});
		} else if(s2 == undefined){
			waitingSockets.push({socket: socket, nick: nick});
		} else {
			waitingSockets.unshift(s2);
		}
	});
	socket.on("invite", (nick) => {
		waitingFriend[socket.id] = {socket: socket, nick: nick};
	});
	socket.on("invited", (data) => {
		let s2 = waitingFriend[data.id];
		if(s2 == undefined) return;
		let turn = Math.round(Math.random());
		let id = socket.id+s2.socket.id;
		socket.join(id);
		s2.socket.join(id);
		socket.emit("start", {yourTurn: turn, nick: s2.nick, id: id});
		s2.socket.emit("start", {yourTurn: 1-turn, nick: data.nick, id: id});
		delete waitingFriend[data.id];
	})
	socket.on("place", (data) => {
		if(socket.rooms.has(data.id)) {
			io.to(data.id).emit("place", data);
		}
	});
	socket.on("disconnecting", () => {
		for(let s in waitingSockets) {
			if(waitingSockets[s].socket.id == socket.id) {
				waitingSockets.splice(s, 1);
				break;
			}
		}
		for(let r of socket.rooms) {
			if(r != socket.id) {
				io.to(r).emit("won");
			}
		}
		if(waitingFriend[socket.id] != undefined) {
			delete waitingFriend[socket.id];
		}
	});
});

//#endregion

/**
let port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => {
	console.log('Server running on port:'+port);
});
/*/
let port = 3000;
server.listen(port, () => {
	console.log('Server running on port:'+port);
});
/**/