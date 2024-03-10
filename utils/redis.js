const redis = require("redis");
const util = require("util");

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.isConnected = true;
    this.client.on("error", (err) => {
      console.log(err);
      this.isConnected = false;
    });
    this.client.on("connect", () => {
      this.isConnected = true;
    });
  }

  isAlive() {
    return this.isConnected;
  }

  async get(key) {
    return util.promisify(this.client.GET).bind(this.client)(key);
  }

  async set(key, value, duration) {
    util.promisify(this.client.SETEX).bind(this.client)(key, duration, value);
  }

  async del(key) {
    util.promisify(this.client.DEL).bind(this.client)(key);
  }

  async getId(token) {
    const id = await this.get(`auth_${token}`);
    if (id) {
      return id;
    }
    return false;
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
