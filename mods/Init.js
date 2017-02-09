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

const Base = require("../Base");

class Init extends Base {
  run(api, group, repo, description, scaffold, version, defaultGroup) {
    if (!this.token) {
      throw new Error(0);
    }

    let url = util.format(`https://${this.host}${api}`, this.app, this.secret);

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
            token: this.token,
            platform: "moto"
          }
        }, (err, res, content) => {
          if (!err && res && res.statusCode == 200) {
            try {
              let data = JSON.parse(content);
              if (!data.status) {
                reject(new Error("状态异常：" + JSON.stringify(data, null, 2)));
              }
            }
            catch (err) {
              reject(new Error("JSON解析失败！"));
            }

            resolve(content);
          }
          else {
            reject(new Error("服务端响应异常！"));
          }
        });
      });
    }
    else {
      return Promise.reject(new Error("信息不全！"));
    }
  }

  ws(api, content) {
    return new Promise((resolve, reject) => {
      let ws = new WebSocket(`wss://${this.host}${api}`);

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
            reject(new Error("状态异常：" + JSON.stringify(json, null, 2)));
          }
        }
        catch (err) {
          reject(new Error("数据流异常！"));
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
            reject(new Error(`${relPath} 目录已存在，请手动清理，或加 -f 强制执行！`));
          }
        });
      }
    }).then(() => {
      return new Promise((resolve, reject) => {
        extra.emptyDir(targetFolder, (e) => {
          if (e) {
            reject(e);
          }
          else {
            Git(targetFolder).clone(gitUrl, targetFolder, ["-b", branch], (err) => {
              if (err) {
                reject(new Error(`git clone ${gitUrl} -b ${branch}失败！`));
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
          reject(err);
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
