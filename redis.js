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
