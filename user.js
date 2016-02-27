function User(sock,redis){
  var self = this;
  self.sock = sock;
  self.redis = redis;

  self.id = self.sock.id;
  self.name = "User #" + Date.now().toString().slice(-3);

  // redis event
  self.onRedis = function(ch,json){
    //console.log('onRedis');
    var msg = JSON.parse(json);
    switch(msg.action){
      case "message":
        self.onRedisMessage(msg);
        break;
      case "pm":
        self.onRedisPM(msg);
        break;
      case "user_join":
        self.onRedisUserJoin(msg);
        break;
      case "user_left":
        self.onRedisUserLeft(msg);
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

  self.sock.on('data',self.onSock);

  self.sock.on('close',function(){
    self.left();
    self.redis.off(self.onRedis);
  });

  self.join();
}

User.prototype.pub = function(msg){
  msg.id = this.id;
  msg.name = this.name;
  this.redis.pub(msg);
};

User.prototype.write = function(msg){
  this.sock.write(JSON.stringify(msg));
};

User.prototype.join = function(){
  this.pub({ action: "user_join" });
}

User.prototype.left = function(){
  this.pub({ action: "user_left" });
}

// sock event
User.prototype.onSockMessage = function(msg){
  this.pub(msg);
}

User.prototype.onSockPM = function(msg){
  this.pub(msg);
  // echo back
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

User.prototype.onRedisUserJoin = function(msg){
  if(msg.id == this.id){
    msg.action = "user_info";
  }
  this.write(msg);
}

User.prototype.onRedisUserLeft = function(msg){
  this.write(msg);
}


module.exports = User;