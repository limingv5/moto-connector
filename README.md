# moto-connector

```js
const MotoConnector = require("moto-connector");
```

## Init

> 项目初始化

```js
let init = new MotoConnector.Init(FEB, APPNAME, SECRET, console);
// APPNAME, SECRET请上FEB平台申请
```

##### 创建仓库

> 返回类型为Promise（内含gitlab地址信息），可与yield或async/await搭配使用

```js
init.create("/api/bridge/%s/scaffold?secret=%s", {
  group: "gitlab分组名",
  name: "gitlab仓库名",
  description: "描述",
  scaffold: "模板[分组名/仓库名]路径，如dolly/moto-scaffold",
  version: "模板版本，默认为master",
  passRender: 是否渲染，默认开启为true
}, [headers]);
```

##### clone仓库到本地

```js
init.clone("gitlab地址", "本地目录名", {
  base: "基准路径",
  branch: "clone的分支，默认为master",
  depth: clone层数，默认为完整clone,
  force: 如果目录已存在，是否强制清空？
});
```

##### 分支是否存在

```js
init.isExists("分支名", "目标git目录");
```

##### 切换分支

> 第二个参数为分支类型（可选值为'x'、'y'、'z'），对应版本号x.y.z的三个位置

```js
init.branch("分支名称", "x/y/z三选一", "目标git目录");
```

##### 安装npm依赖

```js
init.npm("package.json所在目录", {
  registry: "registry地址，默认可不填"
});
```

## Deploy

> 部署到CDN

```js
let deploy = new MotoConnector.Deploy(FEB, APPNAME, SECRET, console);
// APPNAME, SECRET请上FEB平台申请

deploy.push("/api/bridge/%s/publish?secret=%s", "提交内容commit注释", {
  dir: "本地git目录",
  dist: "目标发布目录，比如build、dist目录",
  email: "gitlab Email",
  user: "gitlab User",
  publish: 是否正式发布，默认为false
});
```

## Login

> 用户登录

```js
let login = new MotoConnector.Login(FEB, APPNAME, SECRET, console);
// APPNAME, SECRET请上FEB平台申请

login.check("/api/validate/%s/gituser?secret=%s", "gitlab邮箱", "密码");
```