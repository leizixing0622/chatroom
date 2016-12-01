var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};
//404函数
function send404(response){
	response.writeHead(404,{'Content-Type':'text/plain'});
	response.write('Error404:resource not found.');
	response.end();
}
//读取文件函数
function sendFile(response,filePath,fileContents){
	response.writeHead(200,{"Content-type":mime.lookup(path.basename(filePath))});
	response.end(fileContents);
}
//缓存静态文件
function serveStatic(response,cache,absPath){
	if(cache[absPath]){
		sendFile(response,absPath,cache[absPath]);
	}else{
		fs.exists(absPath,function(exists){
			if(exists){
				fs.readFile(absPath,function(err,data){
					if(err){
						send404(response);
					}else{
						cache[absPath] = data;
						sendFile(response,absPath,data);
					}
				});
			}else{
				send404(response);
			}
		});
	}
}
//创建http服务器
var server = http.createServer(function(request,response){
	var filePath = false;
	if(request.url == '/'){
		filePath = 'public/index.html';
	}else{
		filePath = 'public'+request.url;
	}
	var absPath = './' + filePath;
	serveStatic(response,cache,absPath);
});
server.listen(3000,function(){
	console.log("Server listening on port 3000.");
});
//把http服务器分享给websocket
var chatServer = require('./lib/chat_server');
chatServer.listen(server);