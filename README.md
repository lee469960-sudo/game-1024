# game-1024

原生 HTML/CSS/JavaScript 数字合并游戏，无依赖、无需构建。

## 运行

用 Chrome、Safari、Firefox 或 Edge 直接打开 `index.html`，支持本地 `file://`。
也可以运行 `python3 -m http.server 8000 --directory .`，再访问 http://localhost:8000。

## 玩法

使用方向键，或在手机棋盘上滑动。相同数字合并，每个数字每回合只能合并一次，合并结果计入总分。初始有两个数字；有效移动后随机生成一个 2（90%）或 4（10%），无效移动不生成数字。达到 1024 胜利，无合法移动失败，点击“重新开始”重置。刷新页面不保留进度。

## 验证

安装 Node.js 18+ 后执行，无需 npm install：

```sh
npm run check
npm test
```

`game.js` 是浏览器和 Node 共用的纯逻辑；`app.js` 负责界面和输入；`tests/game.test.js` 覆盖四方向移动、合并计分、数字生成、无效操作、胜负及重开。

## 仓库与分支

游戏源码位于 GitHub 的 [game-1024-mvp 分支](https://github.com/lee469960-sudo/game-1024/tree/game-1024-mvp)，尚未合并到 `main`。下载或查看代码时请选择该分支。

已有本地仓库可以运行 `git switch game-1024-mvp` 切换到游戏代码。`5912b40` 是 MVP 实现提交；该提交的语法检查和 10 项核心逻辑测试均已通过。

若 HTTPS 推送返回 403，本机已配置的 SSH 授权可用于推送同一仓库：

```sh
git push git@github.com:lee469960-sudo/game-1024.git game-1024-mvp:refs/heads/game-1024-mvp
```

上述命令只更新游戏分支，不会合并到 `main` 或发布网站。

### 确认是否已同步

本机配置好 GitHub SSH 授权后，可运行 `npm run push:game`。脚本推送已提交的 `game-1024-mvp`，再核对本地和远程的完整提交哈希；不一致或网络、权限失败时返回非零退出码。即使当前处于 detached HEAD，也会推送指定游戏分支。脚本不会暂存文件、创建提交或强制覆盖远程历史。

推送返回 `Everything up-to-date` 表示目标分支已经包含本地提交，并非推送失败。推送本身不修改源码，因此没有源码差异是正常结果，无需创建空提交或重复修改游戏。

可以比较以下两条命令输出的完整提交哈希；一致即表示该分支已同步：

```sh
git rev-parse game-1024-mvp
git ls-remote git@github.com:lee469960-sudo/game-1024.git refs/heads/game-1024-mvp
```

若 GitHub 默认页面只有 README，请选择上方链接中的 `game-1024-mvp` 分支查看完整游戏；推送该分支不会自动更新 `main`。
