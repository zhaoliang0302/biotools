# 分子生物学实验助手 (Cell Bio Tools)

这是一个专为分子生物学实验设计的网页计算工具，目前主要包含 **siRNA 转染配置计算器 (Lipofectamine 3000)**。

## 🧪 功能特点

*   **灵活的体系配置**：
    *   内置“六孔板”和“60mm中皿”预设。
    *   支持**完全自定义**单孔试剂用量（Opti-MEM, Lipo3000, siRNA 等），适配各种转染条件。
*   **智能双重富裕量计算**：
    *   **分组富裕 (Group Excess)**：针对每个实验组单独增加配制量，确保加样到孔时体积充足。
    *   **总管富裕 (Tube A Excess)**：针对 Lipo3000 Master Mix 总管增加配制量，确保分装到各组时能够抵消移液损耗。
    *   **透明计算**：结果面板清晰展示每一部分体积的构成来源。
*   **实验流程自动生成**：
    *   根据设定参数，一键生成包含具体体积数值的实验操作步骤。
    *   支持一键复制，方便粘贴到电子实验记录本中。
*   **完全本地化**：纯 HTML/JS/CSS 实现，无后端，可直接在浏览器打开使用，安全且保护隐私。

## 🚀 如何部署到 GitHub Pages (免费在线使用)

你可以通过 GitHub Pages 免费托管这个工具，使其可以通过网址在线访问，方便在实验室的任何设备（手机/iPad）上使用。

### 方法一：直接上传 (最简单)

1.  登录 [GitHub](https://github.com/)。
2.  点击右上角的 **+** 号，选择 **New repository**。
3.  输入仓库名称 (例如 `transfection-calculator`)，点击 **Create repository**。
4.  在创建好的页面中，点击 **uploading an existing file** 链接。
5.  将本文件夹中的 `index.html`, `script.js`, `style.css` 和 `README.md` 全选并拖拽到上传区域。
6.  等待上传完成，点击底部的 **Commit changes**。
7.  进入仓库的 **Settings** (设置) -> 左侧菜单 **Pages**。
8.  在 **Build and deployment** -> **Branch** 中，选择 `main` 分支，文件夹保持 `/ (root)`，点击 **Save**。
9.  等待约 1-3 分钟，刷新页面，顶部会显示你的在线网站地址 (例如 `https://你的用户名.github.io/transfection-calculator/`)。

### 方法二：命令行推送 (推荐)

如果你已在本地初始化了 Git (如下方步骤)，可以按以下方式推送：

1.  在 GitHub 创建新仓库 (同上，不要初始化 README)。
2.  复制仓库的 HTTPS 或 SSH 地址。
3.  在终端执行：
    ```bash
    git remote add origin <你的仓库地址>
    git branch -M main
    git push -u origin main
    ```
4.  按上述步骤 7-9 开启 GitHub Pages。

## 💻 本地使用

直接双击打开 `index.html` 即可在默认浏览器中离线使用。
