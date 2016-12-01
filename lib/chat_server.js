var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};
//启动socket.io服务器
exports.listen = function(server){
	io = socketio.listen(server);//搭载到已有的http服务上
	io.set('log level',1);
	//开始每个链接的处理逻辑
	io.sockets.on('connection',function(socket){
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);//赋予访客名
		joinRoom(socket,'Lobby');
		handleMessageBroadcasting(socket,nickNames);
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		handleRoomJoining(socket);
		socket.on('rooms',function(){
			socket.emit('rooms',io.sockets.manager.rooms);
		});
		handleClientDisconnection(socket,nickNames,namesUsed);
	});
}
function assignGuestName(socket, guestNumber, nickNames, nameUsed) {
	  var name = 'Guest' + guestNumber;
	  nickNames[socket.id] = name;
	  socket.emit('nameResult', {
	    success: true,
	    name: name
	  });
	  nameUsed.push(name);
	  return guestNumber + 1;
}
function joinRoom(socket, room) {
	  socket.join(room);
	  currentRoom[socket.id] = room;
	  socket.emit('joinResult', {room: room});
	  socket.broadcast.to(room).emit('message', {
	    text: nickNames[socket.id] + ' has joined ' + room + '.'
	  });
	  var usersInRoom = io.sockets.clients(room);
	  if (usersInRoom.length > 1) {
	    var usersInRoomSummary = 'Users currently in ' + room + ': ';
	    for (var index in usersInRoom) {
	      var userSocketId = usersInRoom[index].id;
	      usersInRoomSummary + nickNames[userSocketId] + ' ';
	    }
	  }
	  socket.emit('message', {text: usersInRoomSummary});
}
function handleNameChangeAttempts(socket, nickNames, nameUsed) {
	  socket.on('nameAttempt', function(name) {
	    if (name.indexOf('Guest') == 0) {
	      socket.emit('nameResult', {
	        success: false,
	        message: 'Name cant begin with Guest'
	      });
	    } else {
	    if (namesUsed.indexOf(name) == -1) {
	      var previousName = nickNames[socket.id];
	      var previousNameIndex = namesUsed.indexOf(previousName);
	      namesUsed.push(name);
	      nickNames[socket.id] = name;
	      delete namesUsed[previousNameIndex];
	      socket.emit('nameResult', {
	        success: true,
	        name: name
	      });
	    } else {
	      socket.emit('nameResult', {
	        success: false,
	        message: 'Name already used.'
	      });
	    }
	    }
	  });
}
function handleMessageBroadcasting(socket) {
  socket.on('message', function(message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + ': ' + message.text
    });
  });
}
function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}
function handleClientDisconnection(socket) {
  socket.on('disconnect', function() {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  })
}