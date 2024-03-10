// eslint-disable-next-line import/prefer-default-export
class Helpers {
  static unAuth(res) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  static cantFind(res, options) {
    return res.status(400).json(options);
  }

  static decode(token) {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded;
  }
}
module.exports = Helpers;
