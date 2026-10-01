# 实验配置助手

Lipo3000 转染、TIC 配置、qPCR 配置与实验方案导出工具。

在线地址：https://zhaoliang0302.github.io/biotools/

## 密码访问

在线页面需要输入专用访问密码才能解锁。部署内容使用 PBKDF2-SHA256（600,000 次迭代）派生密钥，并用 AES-256-GCM 加密完整 HTML、CSS 和计算脚本。密码不包含在发布文件或 Git 仓库中。登录后的内容仅保留在当前页面内存中，刷新后需要重新登录；闲置 30 分钟会自动锁定。退出和自动锁定会丢弃尚未导出的实验配置，请先导出需要保留的内容。

这是静态站点的密码解密方案，没有服务器账号系统，也不能阻止离线猜测密码。请使用独立的强密码。源码和历史记录仍在公开 GitHub 仓库中，任何人仍可下载源码并自行运行，本方案仅保护在线发布的工具内容。GitHub Pages 不提供个人账号的原生私有站点功能。

## 本地维护与发布

原始工具保留在根目录的 `index.html`、`style.css`、`script.js`，可用本地 HTTP 服务直接预览。在线发布目录为 `private-site/`，只包含登录页和加密文件；工作流不会上传根目录源码或本地密码。

专用密码保存在 `.local/access-password.txt`（已被 `.gitignore` 排除）。请将它保存到密码管理器并妥善备份，不要提交到 GitHub。

修改工具后，在项目目录运行：

```sh
node tools/build-private-site.mjs
node --test tools/private-site.test.mjs
node tools/build-private-site.mjs --check
```

然后将源码修改与 `private-site/` 的更新一起提交并推送到 `main`。GitHub Actions 会检查加密文件是否对应最新源码；未重新构建时会阻止发布，避免意外上线旧版本或未加密源码。

在新电脑首次设置时，将已备份的密码写入 `.local/access-password.txt`。如需改密，将这个文件替换为至少 16 个字符的新密码，再重新构建、提交并推送。也可以在该文件不存在时执行 `node tools/build-private-site.mjs --generate-password` 生成新的随机密码；生成器不会覆盖已有密码文件。

改密只影响新的发布版本。已解锁页面以及已下载的旧加密文件不能被远程撤回，旧文件仍可用旧密码解密。
