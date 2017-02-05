"use strict";

const fsLib   = require("fs-extra");
const pathLib = require("path");
const util    = require("util");
const request = require("request");

class Login {
  constructor(host, app, secret, logger) {
    this.tokenPath = pathLib.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH, ".moto-connector/token");

    this.host   = host;
    this.app    = app;
    this.secret = secret;
    this.logger = logger || console;
  }

  check(api, email, password) {
    let url = util.format(`http://${this.host}${api}`, this.app, this.secret);

    return new Promise((resolve, reject) => {
      request.post(url, {
        form: {
          email: email,
          password: password
        }
      }, (err, res, content) => {
        if (!err && res && res.statusCode == 200 && content) {
          fsLib.outputFile(this.tokenPath, content);
          this.logger.info("验证通过！");
          resolve(true);
        }
        else {
          this.reset();
          this.logger.error("验证错误！");
          resolve(false);
        }
      });
    });
  }

  get token() {
    try {
      return fsLib.readFileSync(this.tokenPath);
    }
    catch (err) {
      return null;
    }
  }

  reset() {
    fsLib.remove(this.tokenPath);
  }
}

module.exports = Login;
