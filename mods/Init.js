"use strict";

const pathLib     = require("path");
const extra       = require("fs-extra");
const co          = require("co");
const request     = require("request");
const npminstall  = require("npminstall");
const gitUrlParse = require("git-url-parse");
const Git         = require("simple-git");

const findDotGit = require("../libs/findDotGit");

const Base = require("../Base");

const cnpmUrl = "https://registry.npm.taobao.org";
const tnpmUrl = "http://registry.npm.alibaba-inc.com";

class Init extends Base {

  constructor(host, app, secret, logger) {
    super(host, app, secret, logger);
    this.targetFolder = null;
  }

  create(api, options) {
    if (!this.token) {
      throw new ReferenceError("尚未验证！");
    }

    let _scaffold;
    let parser = gitUrlParse(options.scaffold);
    if (parser.owner && parser.name) {
      _scaffold = parser.owner + '/' + parser.name;
    }
    else {
      if (parser.name) {
        _scaffold = parser.source + '/' + parser.name;
      }
    }

    if (_scaffold && options.group && options.name) {
      return this.handShake(api).then((data) => {
        if (data && data.status && data.auth && data.next) {
          return this.ws(data.next, {
            auth: data.auth,
            form: {
              group: options.group,
              name: options.name,
              description: options.description,
              scaffold: _scaffold,
              version: options.version
            }
          });
        }
        else {
          return Promise.reject("服务端数据异常！");
        }
      });
    }
    else {
      return Promise.reject(new Error("信息不全！"));
    }
  }

  setTarget(base, relPath) {
    this.targetFolder = pathLib.join(base || process.cwd(), relPath);
  }

  clone(gitUrl, relPath, options) {
    options = options || {};

    this.setTarget(options.base, relPath);

    return new Promise((resolve, reject) => {
      if (options.force) {
        resolve();
      }
      else {
        extra.access(this.targetFolder, (err) => {
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
        extra.emptyDir(this.targetFolder, (e) => {
          if (e) {
            reject(e);
          }
          else {
            options.branch = options.branch || "master";

            Git(this.targetFolder).clone(gitUrl, this.targetFolder, ["-b", options.branch], (err) => {
              if (err) {
                reject(new Error(`git clone ${gitUrl} -b ${options.branch}失败！`));
              }
              else {
                this.logger.info(`git clone ${gitUrl} -b ${options.branch}`);
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

    return new Promise((resolve, reject) => {
      if (!this.targetFolder) {
        if (relPath) {
          this.setTarget(options.base, relPath);
        }
        else {
          let gitRc = findDotGit();
          if (gitRc) {
            this.targetFolder = pathLib.dirname(gitRc);
          }
        }
      }

      if (this.targetFolder) {
        extra.access(pathLib.join(this.targetFolder, "package.json"), (err) => {
          if (err) {
            reject(err);
          }
          else {
            if (options.registry) {
              resolve(options.registry);
            }
            else {
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
          }
        });
      }
      else {
        reject(new Error("目标位置未知！"));
      }
    }).then((registry) => {
      this.logger.info(`从${registry}安装依赖`);

      let targetFolder = this.targetFolder;
      return co(function*() {
        yield npminstall({
          root: targetFolder,
          registry: registry
        });
      });
    });
  }

  branch(branchName, type) {
    return new Promise((resolve, reject) => {
      if (!this.targetFolder) {
        let gitRc = findDotGit();
        if (gitRc) {
          this.targetFolder = pathLib.dirname(gitRc);
        }
      }

      if (this.targetFolder) {
        let _t = "minor";
        switch (type) {
          case 'x':
            _t = "major";
            break;
          case 'z':
            _t = "patch";
            break;
        }

        let git = Git(this.targetFolder);
        git.fetch().branch((list_err, branchList) => {
          if (list_err) {
            reject(list_err);
          }
          else {
            let newVersion = `${_t}/${branchName}`;
            let history    = branchList.all.map(branch => branch.replace("remotes/origin/", ''));

            if ([...new Set(history)].indexOf(newVersion) == -1) {
              git.checkoutLocalBranch(newVersion, (err) => {
                if (err) {
                  reject(err);
                }
                else {
                  this.logger.info(`切换到新分支: ${newVersion}`);
                  resolve(newVersion);
                }
              });
            }
            else {
              reject(new Error("分支已存在！"));
            }
          }
        });
      }
      else {
        reject(new Error("所在位置非git目录！"));
      }
    });
  }
}

module.exports = Init;
