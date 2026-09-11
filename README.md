# 片刻 · 个人空间

一个用来保存照片、代码和小说的个人网站。把相机里的风景、写过的小程序和正在创作的故事放在同一个地方，再用过去 365 天的活跃网格记录自己的使用与创作。

[打开网站](https://pk.k1true.chatgpt.site) · [源码仓库](https://github.com/K1True-1/pianke-personal-space)

## 功能介绍

| 功能 | 可以做什么 |
| --- | --- |
| 照片相册 | 上传、浏览和下载照片；原图完整保存，另生成浏览用预览图 |
| 代码收藏 | 保存常见源文件和 ZIP 压缩包；文本可以分段查看、复制，原文件可以下载 |
| 小说书架 | 上传 TXT、Markdown 小说；按完整字符分段阅读，支持上一段和下一段 |
| 活跃网格 | 展示截至今天的过去 365 天；活动越多，方格颜色越深 |
| 大文件上传 | 三类文件均使用分片上传，提供进度、临时故障重试和取消操作 |
| 作品管理 | 为作品填写名称、简介；查看详情、下载原文件或确认删除 |

上传文件保存在 Cloudflare R2，作品信息和活跃记录保存在 Cloudflare D1。GitHub 仓库保存的是网站源码，**不包含你在网站里上传的照片、代码或小说**。

## 使用帮助

### 登录与访问

打开网站后，使用 ChatGPT 登录即可上传和查看自己的作品。网站整体的访问范围由 Sites 中的分享设置控制；作品、文件和活跃记录会按登录账号隔离。即使网站设为公开访问，其他账号也不会因此看到你的个人文件。

### 上传作品

1. 点击右上角「上传作品」，选择「照片」「代码」或「小说」。
2. 点击选择文件，或将文件拖入上传区域。
3. 填写作品名称，可选填写简介，然后点击「保存作品」。
4. 等待上传和保存完成；照片还会生成独立预览图。

上传期间请保持页面打开。遇到暂时的网络故障会自动重试；如果最终失败，当前页面会保留选中的文件和填写内容，方便再次提交。取消上传后也可以重新开始。刷新或关闭网页后，不保证保留选择的文件或恢复进度。

### 支持的文件类型

| 分类 | 支持格式 |
| --- | --- |
| 照片 | `.jpg`、`.jpeg`、`.png`、`.webp`、`.gif` |
| 代码 | `.js`、`.ts`、`.jsx`、`.tsx`、`.py`、`.html`、`.css`、`.json`、`.sql`、`.sh`、`.go`、`.rs`、`.java`、`.c`、`.cpp`、`.h`、`.vue`、`.svelte`、`.yml`、`.yaml`、`.md`、`.txt`、`.zip` |
| 小说 | `.txt`、`.md`；支持 UTF-8 和 GB18030 文本 |

照片、代码和小说均已取消 10 MB 的应用层文件大小限制。上传以 8 MiB 为基础分片，必要时自动调整；实际可上传大小仍受底层存储的对象/分片规则、托管服务请求限制、网络和设备能力约束，并非无限容量。

相机 RAW、HEIC、TIFF，以及 EPUB、PDF 暂不在当前支持范围内。照片请导出为受支持的图片格式；小说请导出为 TXT 或 Markdown。不要仅修改文件后缀来转换格式。

### 浏览、阅读与下载

- **照片**：点击缩略图打开详情；「下载原文件」下载未经压缩的原图。预览图只用于浏览，不替换原文件。
- **代码**：点击文件卡片查看文本；「复制本段」复制当前显示的内容。较大的文件通过「上一段」「下一段」浏览。ZIP 需要下载后解压查看。
- **小说**：点击书架上的作品开始阅读，用「上一段」「下一段」浏览后续内容。Markdown 当前作为纯文本展示。
- **删除**：在详情中点击「删除」并确认。删除无法撤销，请先下载需要保留的原文件。

上传的代码只用于保存和展示，网站不会执行代码或自动运行 ZIP 内的项目。

### 活跃网格如何计算

- 使用北京时间（Asia/Shanghai），每天一个方格，展示截至今天的过去 365 天。
- 每天首次登录访问记录 **1 次活动**，同一天刷新不会反复增加访问次数。
- 每成功上传一个文件，再记录 **1 次活动**；分片和同次上传的重试不重复计数。
- 删除作品后，已经发生的活跃记录仍然保留。
- 鼠标悬停或点击方格，可以查看当天的日期和活动次数。

## 常见问题

**为什么第一次打开会看到两张样片？**

空相册会展示两张注明摄影师和来源的 Unsplash 样片。上传自己的第一张照片后，样片会自动让位；它们不会计入你的作品数量。

**上传后看不到作品怎么办？**

确认出现「已保存」提示，并使用同一个 ChatGPT 账号访问。检查所在分类是否正确。若页面提示暂时不可用，可点击「重试」；请勿在上传尚未完成时关闭页面。

**小说显示乱码怎么办？**

当前会尝试识别 UTF-8 和 GB18030。编码识别依赖文件开头的内容；遇到乱码时，建议在文本编辑器中将原文件另存为 UTF-8 后重新上传。

**自定义域名显示「未找到站点」怎么办？**

仅添加 A/CNAME 解析并不代表域名已完成启用。请在 Sites 域名设置中核对：网站已发布、DNS 指向与平台要求一致、全部 TXT 验证记录已添加、域名状态为 `active`。证书状态 `active` 与整个域名绑定状态是两回事。记录更新后等待 DNS 生效，再刷新域名验证。根域名与 `www` 子域名需要分别绑定。

**能直接部署到 GitHub Pages 吗？**

不能直接按静态页面部署。本项目包含登录身份读取、文件上传和数据库接口，需要 Cloudflare Workers、D1、R2 以及兼容的认证集成；GitHub 在这里用于保存和管理源码。

## 本地开发

### 环境要求

- Node.js **22.13.0 或更高版本**，以及 npm。
- Git，用于克隆和管理源码。
- 保留仓库中的 `package-lock.json`，按锁定版本安装依赖。

```bash
git clone https://github.com/K1True-1/pianke-personal-space.git
cd pianke-personal-space
npm run install:ci
npm run build
```

首次运行需要初始化本地数据库。按顺序执行以下迁移；如果某个迁移已应用，不要重复执行：

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_luxuriant_marten_broadcloak.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_icy_veda.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_classy_ricochet.sql
npm run dev
```

打开终端显示的本地地址，默认端口为 `5173`。本地开发环境通过 `/signin-with-chatgpt?return_to=/` 模拟登录；这与线上真实 ChatGPT 登录流程不同。本地 D1、R2 数据与线上数据相互独立。

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动支持热更新的开发服务 |
| `npm run build` | 构建 Worker 与静态资源 |
| `npm start` | 在本地运行已构建的 Worker |
| `npm run db:generate` | 修改数据库结构后生成迁移 |
| `npx tsc --noEmit` | 检查 TypeScript 类型 |

### 项目结构

```text
app/                    页面、样式和后端接口
  api/uploads/          分片上传的创建、传输、完成与取消
  api/library/          作品列表、下载、阅读和删除
  api/activity/         每日活跃记录
components/ui/          界面组件
db/                     数据库结构与访问辅助函数
drizzle/                数据库迁移及结构快照
lib/                    上传、分段阅读与存储辅助逻辑
public/                 图标及展示样片
.openai/hosting.json     Sites 项目关联及 DB / BUCKET 逻辑绑定
```

## 发布与维护

通过 Sites 发布时，保留 `.openai/hosting.json` 中当前站点的 `project_id`，以及 `DB`、`BUCKET` 绑定。平台负责配置实际存储资源并应用生产数据库迁移。修改 README 不需要重新发布网站；修改页面或后端功能后，需要重新构建并发布。

如果将这份源码用于一个全新的站点，请先注册新站点并使用其项目标识，不要复用原站点的关联。独立部署到 Cloudflare 时，还需要自行完成资源绑定和真实认证接入；不要直接信任未经可信网关验证的用户身份请求头。

已经应用到生产环境的数据库迁移应保持不变，后续通过新增迁移演进结构。运行时密钥放在平台环境变量中，不要写入源码、Git 远程地址或 README。

## 可以继续扩展的方向

- **旅行地图**：将照片与拍摄地点关联，整理旅行轨迹。
- **项目实验室**：为代码作品增加演示、截图和开发记录。
- **小说连载**：按章节发布，并补充人物设定和创作手记。

这些是后续方向，尚未作为现有功能实现。

## 图片与组件来源

- 海岸展示样片：[Engin Akyurt / Unsplash](https://unsplash.com/it/foto/costa-rocciosa-con-oceano-calmo-sotto-cielo-nuvoloso-LdSnZwPutjY)
- 建筑展示样片：[Declan Sun / Unsplash](https://unsplash.com/photos/modern-building-with-curved-facade-framed-by-trees-HW9PmuGve-M)
- 组件与构建工具的第三方许可保留在 `vendor/`、`build/` 等相应目录中。
