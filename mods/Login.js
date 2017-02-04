"use strict";

const fsLib     = require("fs-extra");
const pathLib   = require("path");
const request   = require("request");
const crypto    = require("crypto");
const algorithm = "aes-256-ctr";

function encrypt(text, password) {
  let cipher  = crypto.createCipher(algorithm, password);
  let crypted = cipher.update(text, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
}

function decrypt(text, password) {
  let decipher = crypto.createDecipher(algorithm, password);
  let dec      = decipher.update(text, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

class Login {
  constructor(host, logger) {
    let USERPATH    = process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH;
    this.configPath = pathLib.join(USERPATH, ".moto-connector/gitlab.json");

    try {
      this.config = require(this.configPath);
    }
    catch (err) {
    }

    this.host   = host;
    this.logger = logger || console;
  }

  check(api, email, password) {
    return new Promise((resolve, reject) => {
      request.post(`http://${this.host}${api}`, {
        form: {
          email: email,
          password: password
        }
      }, (err, res, content) => {
        if (err) {
          this.logger.error("登录失败");
          resolve(false);
        }
        if (!content) {
          this.logger.error("用户名或密码错误");
          resolve(false);
        }
        let userInfo;
        try {
          userInfo = JSON.parse(content);
        } catch (e) {
        }

        if (!userInfo || !userInfo.username || !userInfo.state || userInfo.state !== "active") {
          this.logger.error("用户名或密码错误");
          resolve(false);
        }
        else {
          userInfo.private_token = encrypt(userInfo.private_token, userInfo.username);

          this.config = userInfo;
          fsLib.outputJson(this.configPath, userInfo);
          this.logger.info("验证通过");
          resolve(true);
        }
      });
    });
  }

  get token() {
    if (this.config && this.config.private_token && this.config.username) {
      return decrypt(this.config.private_token, this.config.username);
    }
    else {
      return null;
    }
  }

  reset() {
    this.config = null;
    fsLib.remove(this.configPath);
  }
}

module.exports = Login;
