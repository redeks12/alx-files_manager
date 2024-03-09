const mongo = require("mongodb");

const crypto = require("crypto");
const dbClient = require("../utils/db");

class UsersController {
  static async postNew(req, res) {
    // console.log(req.body);
    const { email, password } = req.body;
    // console.log(email, password);
    // res.status(200).json({ error: "Missing email" });
    //     console.log(req.body);
    if (!email) {
      res.status(400).json({ error: "Missing email" });
    }
    if (!password) {
      res.status(400).json({ error: "Missing password" });
    }
    const collection = dbClient.client.db().collection("users");
    const result = await collection.find({ email }).toArray();
    if (result.length > 0) {
      res.status(400).json({ error: "Already exist" });
    }
    const hashed = crypto.createHash("sha1").update(password).digest("hex");
    // console.log(hashed);
    const id = new mongo.ObjectId();
    const data = { email, password: hashed, id };
    const pushed = await collection.insertOne(data);
    // console.log(pushed);
    res.status(201).json({ id, email });
  }
}

module.exports = UsersController;
