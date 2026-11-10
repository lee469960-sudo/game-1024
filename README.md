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

本次 PATCH 恢复了工作目录中缺失的游戏文件，解决只有说明、没有代码变更的问题。修改仅保留在工作目录，不执行 git commit、push、merge 或发布。
