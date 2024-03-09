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
}

const dbClient = new DBClient();
module.exports = dbClient;
