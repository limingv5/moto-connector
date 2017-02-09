"use strict";

const fs   = require("fs");
const path = require("path");

const dir = fs.readdirSync(__dirname + "/mods");
dir.forEach(function (i) {
  let name      = path.basename(i, ".js");
  exports[name] = require("./mods/" + name);
});
