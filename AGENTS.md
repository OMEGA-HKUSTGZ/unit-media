# AGENTS.md: unit-media

Lab standard: <https://github.com/OMEGA-HKUSTGZ/.github-private/blob/main/STANDARD.md>

## 这是什么

UniT 项目页 (`https://omega-hkustgz.github.io/projects/unit/`) 的点云文件，
由本仓库自己的 GitHub Pages 发布在 `https://omega-hkustgz.github.io/unit-media/`。
与实验室网站同源，Pages 支持 HTTP Range (206)，查看器按 Range 流式读取 `.pnts`。
实验室网站不再重新发布这些文件。属于标准里的 materials 类仓库。

## 写在哪里

- `point-clouds/<name>.pnts`：点云本体。改名会让项目页的链接失效。
- `README.md`：给人看的说明和文件清单（含字节数），换文件时一起更新。
- `.nojekyll`：保留，Pages 按原样发布文件。
- 项目页用的相对路径：`../../unit-media/point-clouds/<file>`（在 unit-page 里改，不在这里）。

## 怎么检查

```sh
for f in point-clouds/*.pnts; do
  n=$(stat -f %z "$f" 2>/dev/null || stat -c %s "$f")
  curl -s -o /dev/null -D - -r 0-99 "https://omega-hkustgz.github.io/unit-media/$f" \
    | grep -i '^content-range' | grep -q "/$n" && echo "ok $f" || echo "FAIL $f"
done
```

推送后等 Pages 部署完成（大文件需要几分钟）再跑。

## 坑

- 来源是 `OMEGA-HKUSTGZ/unit-page` 的 `assets/media/point-clouds/`；unit-page 的 `tools/`
  里没有生成或转换点云的脚本（只有 `build_results_data.py`，生成结果表），
  所以 `.pnts` 本身就是原件。
- 单个文件不能超过 100 MB（GitHub 限制）；Pages 站点总大小建议不超过 1 GB。
- 推送大文件用 SSH（`git@github.com:OMEGA-HKUSTGZ/unit-media.git`），HTTPS 容易超时。
- Pages 用的是 legacy 构建（`main` 分支根目录），没有 Actions 工作流。
