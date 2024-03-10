const mongo = require("mongodb");

// console.log(MongoClient);
class DBClient {
  constructor() {
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || "files_manager";
    const url = `mongodb://${host}:${port}/${database}`;
    this.client = new mongo.MongoClient(url, { useUnifiedTopology: true });
    this.isConnected = false;
    this.client.connect((err) => {
      if (err) {
        this.isConnected = false;
      } else {
        this.isConnected = true;
      }
    });
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    return this.client.db().collection("users").countDocuments();
  }

  async nbFiles() {
    return this.client.db().collection("files").countDocuments();
  }

  async getUser(dict) {
    const collection = this.client.db().collection("users");
    const result = await collection.findOne(dict);

    if (result) {
      return result;
    }
    return false;
  }

  async getFile(dict) {
    const collection = this.client.db().collection("files");
    const result = await collection.findOne(dict);

    if (result) {
      return result;
    }
    return false;
  }

  getToken(req) {
    const token = req.headers["x-token"];
    if (!token) {
      return false;
    }
    return `auth_${token}`;
  }

  async saveFile(data) {
    const collection = this.client.db().collection("files");
    const pushed = await collection.insertOne(data);
    return pushed;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
