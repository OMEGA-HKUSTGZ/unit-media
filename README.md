# unit-media

Point clouds for the [UniT project page](https://omega-hkustgz.github.io/projects/unit/),
served by this repository's [GitHub Pages site](https://omega-hkustgz.github.io/unit-media/).
Both sites have the same origin. The viewer reads the files with HTTP Range
requests; routine lab-site releases can exclude the 180,977,460 bytes of point clouds.

## Frozen v1 resources

The six existing `point-clouds/<scene>.pnts` paths are **immutable v1**. Do not
replace, rename, or delete them. This preserves existing links without uploading
a duplicate 181 MB version directory. The viewer can append the data version
`?v=0e1438880f2957264dab2b617f9d36d15db4d9ec`; a query parameter separates caches,
but only preserving the bytes makes a URL immutable.

`point-clouds-manifest.json` records each file's byte length, Git blob SHA and
SHA-256, plus its source revisions. The Git hashes match the originals in both
`OMEGA-HKUSTGZ/unit-page` and `SC2I-HKUSTGZ/UniT`.

| File | Bytes |
| --- | ---: |
| `point-clouds/drift.pnts` | 7,523,861 |
| `point-clouds/gta_sfm.pnts` | 52,650,286 |
| `point-clouds/hkust_intr.pnts` | 57,847,839 |
| `point-clouds/hkust_redbird.pnts` | 16,406,446 |
| `point-clouds/hkust_toy.pnts` | 18,088,488 |
| `point-clouds/kitti.pnts` | 28,460,540 |

The files were already published by the UniT authors and copied here from
`unit-page/assets/media/point-clouds/`. This manifest records provenance; it does
not assign a new license or claim that third-party scene data has a blanket
redistribution license. Preserve existing attribution and establish the rights
for any new data before publishing it. No point-cloud generator is present in
`unit-page/tools/`; keep the original binaries as the recovery source.

## Checks

Use Node 22 or later:

```sh
node --test scripts/check-assets.test.mjs && node scripts/check-assets.mjs
```

The check compares the Git index against the manifest without reading or
downloading the large blobs, so it also works in a sparse checkout. It rejects
missing, altered, undeclared, or conflicted point clouds and unstaged changes to
materialized point-cloud files. CI also passes `--base <commit-sha>` using the
pull request's base SHA or the push event's `before` SHA, fetched explicitly.
This keeps the published baseline even when one push contains several commits;
checking only the latest commit's parent would miss earlier mutations. When intentionally
adding a new release, calculate its full SHA-256 and byte length from the actual
files before adding the release to the manifest.

After a resource deployment, test real GET requests for the header, a middle
range and the tail of every file. Require `206`, exact `Content-Range` and exact
response bytes; a successful full-file `200` is not a streaming pass. Preserve
binary bytes without HTTP content encoding or transformations. The project
viewer must also pass mobile, scene-switch/resume and cache-version checks.

## Future releases and rollback

1. Put changed data under a new `point-clouds/<content-version>/` directory;
   never overwrite a previously published path, including v1.
2. Add that release to the manifest, keeping all earlier entries. Retain every
   version referenced by a live or rollback page. Pages replaces the published
   tree on each deployment; Git history alone does not keep old URLs online.
3. Check and publish the resources, then verify all Range responses **before**
   switching the viewer's resource version. Keep resource pushes infrequent.
4. Update the viewer in `unit-page`; its existing workflow notifies the lab site.
   The page URL and interaction design remain in `unit-page`.

Pages currently builds from `main` at `/` (`legacy` source, `.nojekyll` retained).
The Actions workflow checks repository shape and assets; it does not create a
second publisher. Documentation pushes also trigger Pages, so wait for a
successful deployment rather than assuming a commit is live.

To undo the lab-site separation, first restore point clouds to the lab site's
publish output, verify their original URLs, and then restore the viewer's local
resource base with a new script/cache version. Keep this media site and frozen
files available for visitors still running the migrated viewer. The complete
cross-repository rollback procedure belongs to `omega-lab-site/docs/publishing.md`.

The checks are validation feedback and a required maintainer pre-push procedure,
not a branch-protection or Pages deployment gate: legacy Pages runs in parallel
and can publish even if an Actions check fails. Run the checks before committing
and do not merge failing changes. This keeps the existing publishing architecture.
