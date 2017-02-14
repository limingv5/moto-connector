"use strict";

const fsLib       = require("fs-extra");
const pathLib     = require("path");
const Git         = require("simple-git");
const findDotGit  = require("../libs/findDotGit");

const Base = require("../Base");

class Deploy extends Base {
  constructor(host, app, secret, logger) {
    super(host, app, secret, logger);
    this.Git           = null;
    this.currentBranch = null;
  }

  pull(branch, list) {
    return new Promise((resolve, reject) => {
      if (branch !== "master" && list.indexOf(`remotes/origin/${branch}`) == -1) {
        this.logger.warn(`远程${branch}分支不存在，提交时将创建`);
        resolve();
      }
      else {
        this.Git.pull("origin", branch, (err, ps) => {
          if (err) {
            if (/remote ref/.test(err)) {
              reject(new Error(`远程${branch}分支已删除，请新建分支！`));
            }
            else {
              reject(new Error(`与远程${branch}分支合并有冲突，请手工解决！`));
            }
          }
          else {
            if (ps.files.length) {
              reject(new Error(`远程${branch}分支有更新，请重新检查后再提交！`));
            }
            else {
              this.logger.info(`无需与远程${branch}分支合并`);
              resolve();
            }
          }
        });
      }
    });
  }

  /**
   *
   * @param api
   * @param message
   * @param options[dir, email, user, publish]
   * @returns {Promise.<TResult>}
   */
  push(api, message, options) {
    return new Promise((resolve, reject) => {
      let gitRc = findDotGit(options.dir);
      if (gitRc) {
        this.Git = Git(pathLib.dirname(gitRc));

        if (options.email) {
          this.Git.addConfig("user.email", options.email);
        }
        if (options.user) {
          this.Git.addConfig("user.name", options.user);
        }

        this.Git.branch((e, summary) => {
          if (e || !summary) {
            reject(new Error("获取分支信息失败！"));
          }
          else {
            resolve(summary);
          }
        });
      }
      else {
        reject(new Error("所在目录并非git项目！"));
      }
    }).then((summary) => {
      this.currentBranch = summary.current;

      if (this.currentBranch == "master") {
        return Promise.reject(new ReferenceError("master分支为保护分支！"));
      }
      else {
        let branchList = summary.all;
        return this.pull("master", branchList).then(() => {
          return this.pull(this.currentBranch, branchList);
        });
      }
    }).then(() => {
      return new Promise((resolve, reject) => {
        message = message || `Push Commit`;

        this.Git.add("./*").commit(message, (err, commit) => {
          if (err) {
            reject(err);
          }
          else {
            if (commit.commit) {
              this.logger.log("变更信息:", message);
            }
            else {
              this.logger.log("没有变更信息");
            }
            resolve();
          }
        });
      });
    }).then(() => {
      return new Promise((resolve, reject) => {
        this.Git.push("origin", this.currentBranch, (err) => {
          if (err) {
            reject(new Error(`${this.currentBranch}分支push失败！`));
          }
          else {
            this.logger.info(`git push origin ${this.currentBranch}`);
            resolve();
          }
        });
      });
    }).then(() => {
      return new Promise((resolve, reject) => {
        this.Git.revparse(["HEAD"], (revp_err, hash) => {
          if (revp_err) {
            reject(err);
          }
          else {
            this.Git.raw(["remote", "-v"], (remote_err, str) => {
              if (remote_err) {
                reject(remote_err);
              }
              else {
                let m = str.match(/:([^\s]*?)\.git/);
                if (m && m[1]) {
                  resolve({
                    project: m[1],
                    branch: this.currentBranch,
                    hash: hash.replace(/\n|\r/gm, ''),
                    isTag: options.publish,
                    dist: options.dist
                  });
                }
                else {
                  reject(new Error("远程仓库信息未获取！"));
                }
              }
            })
          }
        });
      }).then((form) => {
        return this.handShake(api).then((data) => {
          if (data && data.status && data.auth && data.next) {
            return this.ws(data.next, {
              auth: data.auth,
              form: form
            });
          }
          else {
            return Promise.reject(new Error("服务端数据异常！"));
          }
        });
      }).then((ret) => {
        if (options.publish) {
          return new Promise((resolve) => {
            this.Git.checkout("master", () => {
              this.Git.pull("origin", "master", () => {
                resolve(ret);
              });
            });
          });
        }
        else {
          return Promise.resolve(ret);
        }
      });
    });
  }
}

module.exports = Deploy;
