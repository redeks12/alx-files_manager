const sha1 = require("sha1");

const { v4 } = require("uuid");
const dbClient = require("../utils/db");
const redisClient = require("../utils/redis");

class AuthController {
  static async getConnect(req, res) {
    const { authorization } = req.headers;
    if (!authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [tokType, token] = authorization.split(" ");
    if (!tokType === "Basic") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = Buffer.from(token, "base64").toString("utf-8");

    const [email, password] = decoded.split(":");
    if (!email || !password) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const collection = dbClient.client.db().collection("users");
    const result = await collection.findOne({ email });
    if (!result) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const hashed = sha1(password);
    if (hashed !== result.password) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const newId = v4();
    const key = `auth_${newId}`;

    redisClient.client.setex(key, 86400, result._id);
    return res.status(200).json({ token: newId });
  }

  static async getDisconnect(req, res) {
    const token = req.headers["x-token"];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const id = await redisClient.get(`auth_${token}`);

    if (!id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await redisClient.del(`auth_${token}`);
    return res.status(204).end();
  }
}

module.exports = AuthController;
