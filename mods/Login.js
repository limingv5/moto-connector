"use strict";

const util    = require("util");
const request = require("request");

const Base = require("../Base");

class Login extends Base {
  check(api, email, password) {
    let url = util.format(`https://${this.host}${api}`, this.app, this.secret);

    return new Promise((resolve, reject) => {
      request.post(url, {
        form: {
          email: email,
          password: password
        }
      }, (err, res, content) => {
        if (!err && res && res.statusCode == 200 && content) {
          this.token = content;
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
}

module.exports = Login;
