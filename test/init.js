"use strict";

const KLS = require("../index");

let init = new KLS.Init("127.0.0.1:6001", "moto", "2ra2vszrp1iypa4deq");
try {
  init.run("/api/compose/%s/scaffold?secret=%s", "2017", "test"+parseInt(10000*Math.random()), '', "dolly/pack-scaffold", "master", "dolly");
}
catch(err) {
  console.info(err.message)
}
