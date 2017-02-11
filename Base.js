"use strict";

const util      = require("util");
const pathLib   = require("path");
const request   = require("request");
const fsLib     = require("fs-extra");
const WebSocket = require("ws");

class Base {
  constructor(host, app, secret, logger) {
    this.tokenPath = pathLib.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH, ".moto-connector/token");

    this.host   = host;
    this.app    = app;
    this.secret = secret;
    this.logger = logger || console;
  }

  apiURL(api) {
    return util.format(`http://${this.host}${api}`, this.app, this.secret);
  }

  wsURL(api) {
    return `ws://${this.host}${api}`;
  }

  handShake(api, form) {
    return new Promise((resolve, reject) => {
      request.post(this.apiURL(api), {
        form: Object.assign({}, {
          token: this.token,
          platform: this.app
        }, form || {})
      }, (err, res, content) => {
        if (!err && res && res.statusCode == 200) {
          try {
            let data = JSON.parse(content);
            if (!data.status) {
              reject(new Error("状态异常：" + JSON.stringify(data, null, 2)));
            }
            else {
              resolve(data);
            }
          }
          catch (err) {
            reject(new Error("JSON解析失败！"));
          }
        }
        else {
          reject(new Error("服务端响应异常！"));
        }
      });
    });
  }

  ws(api, data) {
    return new Promise((resolve, reject) => {
      let ws = new WebSocket(this.wsURL(api));

      ws.on("open", () => {
        ws.send(JSON.stringify(data));
      });

      ws.on("message", (event) => {
        try {
          let json = JSON.parse(event);
          this.logger.log(json.message);
          if (json.status) {
            if (json.finish) {
              resolve(json);
            }
          }
          else {
            reject(new Error("状态异常：" + JSON.stringify(json, null, 2)));
          }
        }
        catch (err) {
          reject(new Error("数据流异常！"));
        }
      });

      ws.on("error", (err) => {
        reject(err);
      });
    });
  }

  get token() {
    try {
      return fsLib.readFileSync(this.tokenPath, {encoding: "utf8"});
    }
    catch (err) {
      return null;
    }
  }

  set token(cstr) {
    fsLib.outputFile(this.tokenPath, cstr.replace(/\n|\r/gm, ''), {encoding: "utf8"});
  }

  reset() {
    fsLib.remove(this.tokenPath);
  }
}

module.exports = Base;
