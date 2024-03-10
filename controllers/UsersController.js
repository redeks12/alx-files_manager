const sha1 = require("sha1");
const { ObjectId } = require("mongodb");
const dbClient = require("../utils/db");
const redisClient = require("../utils/redis");

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }
    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }
    const collection = dbClient.client.db().collection("users");
    const result = await collection.findOne({ email });
    if (result) {
      return res.status(400).json({ error: "Already exist" });
    }
    const hashed = sha1(password);
    const data = { email, password: hashed };
    const pushed = await collection.insertOne(data);
    return res.status(201).json({ id: pushed.ops[0]._id, email });
  }

  static async getMe(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tok = await redisClient.get(`auth_${token}`);
    const collection = dbClient.client.db().collection("users");
    const result = await collection.findOne({ _id: ObjectId(tok) });
    if (!result) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { email, _id } = result;
    return res.status(200).json({ email, id: _id });
  }
}

module.exports = UsersController;
