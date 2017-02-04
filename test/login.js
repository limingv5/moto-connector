"use strict";

const KLS = require("../index");

let login = new KLS.Login("gitlab.alibaba-inc.com");
console.info(login.token)
