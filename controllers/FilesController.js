const fs = require("fs");
const { v4 } = require("uuid");
const dbClient = require("../utils/db");
const redisClient = require("../utils/redis");

const Helpers = require("../utils/helpers");

class FilesController {
  static async postUpload(req, res) {
    const token = dbClient.getToken(req);
    if (!token) {
      return Helpers.unAuth(res);
    }

    const userId = redisClient.getId(token);
    const user = await dbClient.getUser(userId);

    if (!user) {
      return Helpers.unAuth(res);
    }

    const uid = user._id;

    const { name, type, data } = req.body;
    let { parentId, isPublic } = req.body;
    const accepted = ["folder", "file", "image"];
    if (!name) {
      return Helpers.cantFind(res, { error: "Missing name" });
    }
    if (!type || !accepted.includes(type)) {
      return Helpers.cantFind(res, { error: "Missing type" });
    }
    if (!data && type !== "folder") {
      return Helpers.cantFind(res, { error: "Missing data" });
    }
    if (!isPublic) {
      isPublic = false;
    }
    if (parentId) {
      const parentFile = await dbClient.getFile(parentId);
      if (!parentFile) {
        return Helpers.cantFind(res, { error: "Parent not found" });
      }
      if (parentFile.type !== "folder") {
        return Helpers.cantFind(res, { error: "Parent is not a folder" });
      }
    } else {
      parentId = 0;
    }
    if (type === "folder") {
      const saved = await dbClient.saveFile({
        userId: uid,
        name,
        type,
        parentId,
        isPublic,
      });
      return res.status(201).json(saved.ops[0]);
    }
    const folderPath = process.env.FOLDER_PATH || "/tmp/files_manager";
    // const bb = await dbClient.getFile({ name, type });
    const uuid1 = v4();
    const fullPath = `${folderPath}/${uuid1}`;

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    fs.writeFile(fullPath, Helpers.decode(data), (err) => {
      if (err) {
        console.log(err);
      }
    });
    const fullSaved = await dbClient.saveFile({
      userId: uid,
      name,
      type,
      parentId,
      isPublic,
      localPath: fullPath,
    });
    return res.status(201).json(fullSaved.ops[0]);
  }
}

module.exports = FilesController;
