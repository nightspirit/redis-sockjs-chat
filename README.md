# redis-sockjs-chat
Build a simple chat server with redis and sockjs

## 1. Build a websocket server to broadcast messages
![](https://dl.dropboxusercontent.com/u/7604339/redis-sockjs-chat/single.png)

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

>  Here I won't address client side script too much. you can find it [here ](https://github.com/nightspirit/redis-sockjs-chat/blob/sockjs/index.html)

## 2. Scale your application with Redis Pub/Sub
![](https://dl.dropboxusercontent.com/u/7604339/redis-sockjs-chat/multi.png)

In order to use redis, we will create a singleton for each process. The singleton contain two redis client instances. One is for publishing anthoer is for subscribtion. Here is a simple class for the redis singleton.

```javascript
var redis = require('redis');
var cfg = {
  host: "127.0.0.1",
  port: "6379",
  channel: "chat"
};

function Redis(){
  this.publisher = redis.createClient(cfg.port,cfg.host);
  this.subscriber = redis.createClient(cfg.port,cfg.host);
  this.subscriber.subscribe(cfg.channel);
}

Redis.prototype.pub = function(msg){
  this.publisher.publish(cfg.channel, JSON.stringify(msg));
}

Redis.prototype.on = function(callback){
  this.subscriber.on('message',callback);
}

Redis.prototype.off = function(callback){
  this.subscriber.removeListener('message',callback);
}

module.exports = Redis;
```

For each websocket, I'd like a write a wrpper class to encapsulate the event and logic. I will name it as User.

```javascript
function User(sock,redis){
  var self = this;
  self.sock = sock;
  self.redis = redis;

  // redis event
  self.onRedis = function(ch,json){
    var msg = JSON.parse(json);
    self.write(msg);
  };

  self.redis.on(self.onRedis);

  // sock event
  self.onSock = function(json){
    var msg = JSON.parse(json);
    self.pub(msg);
  };

  self.sock.on('data',self.onSock);

  self.sock.on('close',function(){
    self.redis.off(self.onRedis);
  });

}

User.prototype.pub = function(msg){
  this.redis.pub(msg);
};

User.prototype.write = function(msg){
  this.sock.write(JSON.stringify(msg));
};

module.exports = User;
```

Back to the server.js, then we can modify exisiting code like this.

```javascript
// CLASS
var Redis = require('./redis');
var User = require('./user');

// instance
var redis = new Redis();
var users = {};

sock_server.on('connection', function(sock) {
  users[sock.id] = new User(sock,redis);
  sock.on('close', function() {
    console.log(sock.id + " closed");
    delete users[sock.id];
  });
});

```

> Try launch two applications in different port. With redis, they can still talk to each others.

## 3. Add more features, start making complex chat application

In order to add more features, we have to send different action of message. According to message action that we direct them into different handler. Here are examples how you define your message.

```javascript
{
  action: "message",
  message: "hello"
}

{
  action: "pm",
  target: {
    id: 12345,
    name: "foo"
  }
  message: "How are you"
}
```

The most important part is the _action_ parameter, basically I use this to direct to different handler. We will modify the exsiting event for sock and redis like this;

```javascript
  // redis event
  self.onRedis = function(ch,json){
    var msg = JSON.parse(json);
    switch(msg.action){
      case "message":
        self.onRedisMessage(msg);
        break;
      case "pm":
        self.onRedisPM(msg);
        break;
    }
  };

  self.redis.on(self.onRedis);

  // sock event
  self.onSock = function(json){
    var msg = JSON.parse(json);
    switch(msg.action){
      case "message":
        self.onSockMessage(msg);
        break;
      case "pm":
        self.onSockPM(msg);
        break;
    }
  };
```

As you can see when the event been triggered, I simply use switch/case to call corresponding handler. And we define those handlers like this.

```javascript
// sock event
User.prototype.onSockMessage = function(msg){
  this.pub(msg);
}

User.prototype.onSockPM = function(msg){
  this.pub(msg);
  msg.action = "pm_sent";
  this.write(msg);
}

// redis event
User.prototype.onRedisMessage = function(msg){
  this.write(msg);
}

User.prototype.onRedisPM = function(msg){
  if(msg.target.id == this.id){
    this.write(msg);
  }
}
```

> Again, the client side need to be changed to fit the server side. I won't address that but you can find the source [here](https://github.com/nightspirit/redis-sockjs-chat/blob/master/index.html)
