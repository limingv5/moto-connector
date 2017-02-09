"use strict";

const Path = require("path");
const Fs   = require("fs");

const internals = {};

internals.checkPaths = function (paths, index) {
  index = index || 0;
  if (internals.isDirectory(paths[index])) {
    return paths[index];
  }

  if (++index === paths.length) {
    return;
  }

  return internals.checkPaths(paths, index);
};

internals.isDirectory = function (filePath) {
  try {
    const stat = Fs.statSync(filePath);
    return stat.isDirectory();
  }
  catch (err) {
    return false;
  }
};

internals.dirPaths = function (directory, filename) {
  const filePaths = [];
  const pathRoot  = Path.parse(directory).root;

  do {
    filePaths.push(Path.join(directory, filename));
    directory = Path.dirname(directory);
  } while (directory !== pathRoot);

  return filePaths;
};

module.exports = function () {
  const dirPaths = internals.dirPaths(process.cwd(), ".git");

  let _p = internals.checkPaths(dirPaths);
  if (_p) {
    return _p;
  }
  else {
    return null;
  }
};
