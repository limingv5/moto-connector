"use strict";

const KLS = require("../index");

let init = new KLS.Init("127.0.0.1:6001", "moto", "1qy18qgiypkpfzh");
try {
  init.create("/api/bridge/%s/scaffold?secret=%s", {
    group:"2017",
    name: "test" + parseInt(10000*Math.random()),
    scaffold: "dolly/pack-scaffold",
    version: "master"
  });
}
catch(err) {
  console.info(err.message)
}
