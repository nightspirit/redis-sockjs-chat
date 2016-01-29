var express = require('express');
var sockjs = require('sockjs');
var http = require('http');

var sock_server = sockjs.createServer({sockjs_url: "http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js"});

// single process without redis
var users = {};

sock_server.on('connection', function(sock) {
  users[sock.id] = sock;
  sock.on('data',function(json){
    Object.keys(users).forEach(function(k){
      users[k].write(json);
    });
  });
  sock.on('close', function() {
    console.log(sock.id + " closed");
    delete users[sock.id];
  });
});


// Express server
var app = express();
var server = http.createServer(app);
var PORT = 3000;

if (process.env && process.env.PORT) {
  PORT = process.env.PORT;
}

sock_server.installHandlers(server,{prefix:'/sock'});

app.get('/',function(req,res){
  res.sendFile(__dirname + '/index.html');
});

console.log('Listening on ' + PORT );
server.listen(PORT);
