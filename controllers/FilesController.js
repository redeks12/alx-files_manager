const fs = require("fs");
const { ObjectId } = require("mongodb");
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
      const parentFile = await dbClient.getFile({ _id: ObjectId(parentId) });
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

  static async getShow(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const fileId = request.params.id;
    const files = dbClient.db.collection("files");
    const idObject = new ObjectId(fileId);
    const file = await files.findOne({ _id: idObject, userId: user._id });
    if (!file) {
      return response.status(404).json({ error: "Not found" });
    }
    return response.status(200).json(file);
  }

  static async getIndex(request, response) {
    const user = await FilesController.getUser(request);
    if (!user) {
      return response.status(401).json({ error: "Unauthorized" });
    }
    const { parentId, page } = request.query;
    const pageNum = page || 0;
    const files = dbClient.db.collection("files");
    let query;
    if (!parentId) {
      query = { userId: user._id };
    } else {
      query = { userId: user._id, parentId: ObjectId(parentId) };
    }
    files
      .aggregate([
        { $match: query },
        { $sort: { _id: -1 } },
        {
          $facet: {
            metadata: [
              { $count: "total" },
              { $addFields: { page: parseInt(pageNum, 10) } },
            ],
            data: [{ $skip: 20 * parseInt(pageNum, 10) }, { $limit: 20 }],
          },
        },
      ])
      .toArray((err, result) => {
        if (result) {
          const final = result[0].data.map((file) => {
            const tmpFile = {
              ...file,
              id: file._id,
            };
            delete tmpFile._id;
            delete tmpFile.localPath;
            return tmpFile;
          });
          // console.log(final);
          return response.status(200).json(final);
        }
        console.log("Error occured");
        return response.status(404).json({ error: "Not found" });
      });
    return null;
  }
}

module.exports = FilesController;
