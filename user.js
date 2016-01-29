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