# unit-media

Point clouds for the UniT project page
(<https://omega-hkustgz.github.io/projects/unit/>), served from this repo's
GitHub Pages site at <https://omega-hkustgz.github.io/unit-media/>.

That is the same origin as the lab site, and GitHub Pages answers HTTP Range
requests (206), so the page's viewer streams the `.pnts` files from here.
The lab site does not re-publish these files, so its deploys stay small.

| File | Bytes |
|---|---|
| `point-clouds/drift.pnts` | 7523861 |
| `point-clouds/gta_sfm.pnts` | 52650286 |
| `point-clouds/hkust_intr.pnts` | 57847839 |
| `point-clouds/hkust_redbird.pnts` | 16406446 |
| `point-clouds/hkust_toy.pnts` | 18088488 |
| `point-clouds/kitti.pnts` | 28460540 |

From a page under `/projects/unit/`, use `../../unit-media/point-clouds/<file>`.

## Source

The files were copied from `OMEGA-HKUSTGZ/unit-page`,
`assets/media/point-clouds/`. unit-page's `tools/` has no script that builds or
converts these point clouds (its only script, `tools/build_results_data.py`,
builds the results tables from the paper source), so the `.pnts` files
themselves are the originals. Keep a file's name when you replace it.

## Updating

Replace the file under `point-clouds/`, commit, and push to `main`. GitHub Pages
redeploys on its own (a few minutes for large files). Check it with
`curl -sI -r 0-99 https://omega-hkustgz.github.io/unit-media/point-clouds/<file>`:
expect `206` and the new size in `Content-Range`.
