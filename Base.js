"use strict";

const pathLib = require("path");
const fsLib   = require("fs-extra");

class Base {
  constructor(host, app, secret, logger) {
    this.tokenPath = pathLib.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH, ".moto-connector/token");

    this.host   = host;
    this.app    = app;
    this.secret = secret;
    this.logger = logger || console;
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
