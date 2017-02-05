"use strict";

const util        = require("util");
const pathLib     = require("path");
const extra       = require("fs-extra");
const co          = require("co");
const request     = require("request");
const npminstall  = require("npminstall");
const gitUrlParse = require("git-url-parse");
const Git         = require("simple-git");
const WebSocket   = require("ws");
const Login       = require("./Login");

class Init {
  constructor(host, app, secret, logger) {
    this.host   = host;
    this.app    = app;
    this.secret = secret;

    this.logger = logger || console;
  }

  run(api, group, repo, description, scaffold, version, defaultGroup) {
    let login = new Login();
    if (!login.token) {
      this.logger.error("尚未验证！");
      throw new Error(0);
    }

    let url = util.format(`http://${this.host}${api}`, this.app, this.secret);

    let _scaffold;
    let parser = gitUrlParse(scaffold);
    if (parser.owner && parser.name) {
      _scaffold = parser.owner + '/' + parser.name;
    }
    else {
      if (parser.name) {
        _scaffold = parser.source + '/' + parser.name;
      }
      else if (defaultGroup) {
        _scaffold = defaultGroup + '/' + parser.source;
      }
    }

    if (_scaffold && group && repo) {
      return new Promise((resolve, reject) => {
        request.post(url, {
          form: {
            group: group,
            name: repo,
            description: description,
            scaffold: _scaffold,
            version: version,
            token: login.token,
            platform: "moto"
          }
        }, (err, res, content) => {
          if (!err && res && res.statusCode == 200) {
            try {
              let data = JSON.parse(content);
              if (!data.status) {
                this.logger.error("状态异常！");
                reject();
              }
            }
            catch (err) {
              reject();
            }

            resolve(content);
          }
          else {
            this.logger.error("服务端响应异常！");
            reject();
          }
        });
      });
    }
    else {
      this.logger.error("信息不全！");
      return Promise.reject();
    }
  }

  ws(api, content) {
    return new Promise((resolve, reject) => {
      let ws = new WebSocket(`ws://${this.host}${api}`);

      ws.on("open", () => {
        ws.send(content);
      });

      ws.on("message", (event) => {
        try {
          let json = JSON.parse(event);
          this.logger.log(json.message);
          if (json.status) {
            if (json.finish && json.git) {
              resolve(json.git);
            }
          }
          else {
            reject();
          }
        }
        catch (err) {
          this.logger.error("数据流异常！");
          reject();
        }
      });
    });
  }

  clone(gitUrl, relPath, options) {
    options = options || {};

    const branch       = options.branch || "master";
    const targetFolder = pathLib.join(options.base || process.cwd(), relPath);

    return new Promise((resolve, reject) => {
      if (options.force) {
        resolve();
      }
      else {
        extra.access(targetFolder, (err) => {
          if (err) {
            resolve();
          }
          else {
            this.logger.error(`${relPath} 目录已存在，请手动清理，或加 -f 强制执行！`);
            reject();
          }
        });
      }
    }).then(() => {
      return new Promise((resolve, reject) => {
        extra.emptyDir(targetFolder, (e) => {
          if (e) {
            reject();
          }
          else {
            Git(targetFolder).clone(gitUrl, targetFolder, ["-b", branch], (err) => {
              if (err) {
                this.logger.error(`git clone ${gitUrl} -b ${branch}失败！`);
                reject();
              }
              else {
                this.logger.info(`git clone ${gitUrl} -b ${branch}`);
                resolve();
              }
            });
          }
        });
      });
    });
  }

  npm(relPath, options) {
    options = options || {};

    const cnpmUrl = "https://registry.npm.taobao.org";
    const tnpmUrl = "http://registry.npm.alibaba-inc.com";
    const targetFolder = pathLib.join(options.base || process.cwd(), relPath);

    return new Promise((resolve, reject) => {
      extra.access(pathLib.join(targetFolder, "package.json"), (err) => {
        if (!err) {
          this.logger.log("探测npm registry...");

          request.head(tnpmUrl, function (e, res) {
            if (!e && res && res.statusCode == 200) {
              resolve(tnpmUrl);
            }
            else {
              resolve(cnpmUrl);
            }
          });
        }
        else {
          reject();
        }
      });
    }).then((registry) => {
      this.logger.info(`从${registry}安装依赖`);

      return co(function*() {
        yield npminstall({
          root: targetFolder,
          registry: registry
        });
      });
    });
  }
}

module.exports = Init;
