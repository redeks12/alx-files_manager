const mime = require("mime-types");
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

  static async getShow(req, res) {
    const token = req.header("X-Token") || null;
    if (!token) return res.status(401).send({ error: "Unauthorized" });

    const redisToken = await redisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: "Unauthorized" });

    const user = await dbClient.client
      .db()
      .collection("users")
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: "Unauthorized" });

    const idFile = req.params.id || "";
    // if (!idFile) return res.status(404).send({ error: 'Not found' });

    const fileDocument = await dbClient.client
      .db()
      .collection("files")
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: "Not found" });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.header("X-Token") || null;
    if (!token) return res.status(401).send({ error: "Unauthorized" });

    const redisToken = await redisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: "Unauthorized" });

    const user = await dbClient.client
      .db()
      .collection("users")
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: "Unauthorized" });

    const parentId = req.query.parentId || 0;
    // parentId = parentId === '0' ? 0 : parentId;

    const pagination = req.query.page || 0;
    // pagination = Number.isNaN(pagination) ? 0 : pagination;
    // pagination = pagination < 0 ? 0 : pagination;

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0) {
      aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];
    }

    const files = await dbClient.client
      .db()
      .collection("files")
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return res.send(filesArray);
  }

  static async putPublish(req, res) {
    const token = req.header("X-Token") || null;
    if (!token) return res.status(401).send({ error: "Unauthorized" });

    const redisToken = await redisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: "Unauthorized" });

    const user = await dbClient.client
      .db()
      .collection("users")
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: "Unauthorized" });

    const idFile = req.params.id || "";

    let fileDocument = await dbClient.client
      .db()
      .collection("files")
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: "Not found" });

    await dbClient.client
      .db()
      .collection("files")
      .update({ _id: ObjectId(idFile) }, { $set: { isPublic: true } });
    fileDocument = await dbClient.client
      .db()
      .collection("files")
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.header("X-Token") || null;
    if (!token) return res.status(401).send({ error: "Unauthorized" });

    const redisToken = await redisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: "Unauthorized" });

    const user = await dbClient.client
      .db()
      .collection("users")
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: "Unauthorized" });

    const idFile = req.params.id || "";

    let fileDocument = await dbClient.client
      .db()
      .collection("files")
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: "Not found" });

    await dbClient.client
      .db()
      .collection("files")
      .update(
        { _id: ObjectId(idFile), userId: user._id },
        { $set: { isPublic: false } }
      );
    fileDocument = await dbClient.client
      .db()
      .collection("files")
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  static async getFile(req, res) {
    const idFile = req.params.id || "";
    const size = req.query.size || 0;

    const fileDocument = await dbClient.client
      .db()
      .collection("files")
      .findOne({ _id: ObjectId(idFile) });
    if (!fileDocument) return res.status(404).send({ error: "Not found" });

    const { isPublic } = fileDocument;
    const { userId } = fileDocument;
    const { type } = fileDocument;

    let user = null;
    let owner = false;

    const token = req.header("X-Token") || null;
    if (token) {
      const redisToken = await redisClient.get(`auth_${token}`);
      if (redisToken) {
        user = await dbClient.client
          .db()
          .collection("users")
          .findOne({ _id: ObjectId(redisToken) });
        if (user) owner = user._id.toString() === userId.toString();
      }
    }

    if (!isPublic && !owner) {
      return res.status(404).send({ error: "Not found" });
    }
    if (["folder"].includes(type)) {
      return res.status(400).send({ error: "A folder doesn't have content" });
    }

    const realPath =
      size === 0 ? fileDocument.localPath : `${fileDocument.localPath}_${size}`;

    try {
      const dataFile = fs.readFileSync(realPath);
      const mimeType = mime.contentType(fileDocument.name);
      res.setHeader("Content-Type", mimeType);
      return res.send(dataFile);
    } catch (error) {
      return res.status(404).send({ error: "Not found" });
    }
  }
}

module.exports = FilesController;
