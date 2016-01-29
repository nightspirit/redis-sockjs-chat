# redis-sockjs-chat
Build a simple chat server with redis and sockjs

## 1. Build a websocket server to broadcast messages

First of all we need these packages as dependency.
```javascript
var express = require('express');
var sockjs = require('sockjs');
var http = require('http');
```

Then we create a sockjs server instance.
```javascript
var sock_server = sockjs.createServer({sockjs_url: "http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js"});
```

When _connection_ event happen, we store the socket instance to users object.

For each socket we bind _data_ event and _close_ event to it.
- on _data_ event : Simply iterate through users object and write the message to client side.
- on _close_ event : Remove the sock instance from users object.

```javascript
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

```

Create a http server and use express router to serve the index.html. Also bind the sockjs handler to the http server.
```javascript
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
```

>  Here I won't address client side script too much. you can find it in [source code](https://github.com/nightspirit/redis-sockjs-chat/blob/sockjs/index.html)
