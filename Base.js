"use strict";

const util    = require("util");
const pathLib = require("path");
const request = require("request");
const fsLib   = require("fs-extra");

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
      form          = form || {};
      form.token    = this.token;
      form.platform = form.platform || "moto-connector";

      request.post(this.apiURL(api), {form: form}, (err, res, content) => {
        if (!err && res && res.statusCode == 200) {
          try {
            let data = JSON.parse(content);
            if (!data.status) {
              reject(new Error("状态异常：" + JSON.stringify(data, null, 2)));
            }
          }
          catch (err) {
            reject(new Error("JSON解析失败！"));
          }

          resolve(content);
        }
        else {
          reject(new Error("服务端响应异常！"));
        }
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
