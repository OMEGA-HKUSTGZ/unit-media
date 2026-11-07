# AGENTS.md: unit-media

Lab standard: <https://github.com/OMEGA-HKUSTGZ/.github-private/blob/main/STANDARD.md>

## 这是什么

UniT 项目页的点云资源仓库（materials 类），由本仓库的 GitHub Pages 发布在
`https://omega-hkustgz.github.io/unit-media/`，与官网同源并支持 HTTP Range。
项目页和交互在 `unit-page`；本仓库不发布第二份项目页。

## 写在哪里

- `point-clouds/<name>.pnts`：六个已有路径是冻结的 v1，禁止覆盖、改名或删除。
- 新数据放 `point-clouds/<content-version>/`，已发布版本仍不可变。
- `point-clouds-manifest.json`：各版本的来源、Git blob SHA、SHA-256 和字节数。
- `scripts/`：轻量校验；`README.md`：更新、验证与回滚说明。
- `.nojekyll` 保留；Pages 使用 `main` 根目录，无第二套发布工作流。

## 怎么检查

Node 22+，提交前与 CI 使用同一条命令：

```sh
node --test scripts/check-assets.test.mjs && node scripts/check-assets.mjs
```

检查 Git index 中的 blob 身份，支持不下载点云的 sparse checkout；发布后还要
验证六文件的头、中、尾 Range GET 为 206、范围和字节正确，再切换项目页引用。
CI 另传 `--base` 指定 PR 基线或 push 前 SHA，防止多提交推送绕过冻结检查。

## 坑

- 查询参数只隔离缓存，不能代替原始 URL 内容不可变。
- 每次 Pages 部署替换全部产物；保留仍被页面或回滚版本引用的数据，Git 历史不够。
- 文件来自 `unit-page`，上游为 `SC2I-HKUSTGZ/UniT`，具体提交与哈希见清单。
  清单不新增许可证；新增数据需核实来源和发布权利。
- `.pnts` 内含独立 gzip 块，不要重编码、再压缩或改 HTTP Range 字节语义。
- 不使用 Git LFS；Pages 不提供 LFS 数据。少推送大媒体，失败时保留上一成功版。
- 先发布并验证资源，再更新查看器；回滚先恢复官网原资源，再切回本地路径。
