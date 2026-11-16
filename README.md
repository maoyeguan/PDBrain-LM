# PDBrain-LM website

Project page for PDBrain-LM, a whole-brain light-sheet microscopy and MRI dataset
with multimodal learning benchmarks for a mouse model of Parkinson's disease.

The site is one static page: plain HTML, CSS and JavaScript. There is nothing to
install and nothing to build, and it makes no requests to other servers (fonts
are bundled).

## Preview on your computer

From this folder:

```
python -m http.server 4321
```

then open <http://localhost:4321>. Reload the browser after editing a file.
Opening `index.html` by double-click also works.

## What is where

```
index.html                 all text, tables and links
assets/css/site.css        design (colours, type, layout)
assets/css/fonts.css       font declarations (IBM Plex)
assets/js/site.js          behaviour: rotation pause, section explorer, copy buttons
assets/js/media-manifest.js   image sizes, written by tools/prepare_media.py
assets/img/rotation/       rotating whole-brain GIFs and their first frames
assets/img/sections/       section images for the explorer (lossless WebP)
assets/img/acquisition/    workflow figure from the source study
assets/fonts/              IBM Plex Sans and Mono (woff2)
tools/prepare_media.py     rebuilds assets/img from the visualization folder
```

## Editing the content

Everything is in `index.html`. Places that are meant to be edited carry a
comment in capitals:

| Comment | What it marks |
|---|---|
| `AUTHORS` | names and affiliations in the header (hidden during double-blind review) |
| `LINKS` | Paper / Dataset / Evaluation protocols buttons; how to turn a "soon" button into a link |
| `FIGURE` | the workflow figure from the source study |
| `RESULTS` | the two result tables in the Tasks section |
| `RELEASE` | the status table in the Access section |
| `CONTACT` | contact line |
| `CITATION` | the BibTeX entry of the dataset paper |

In the AUC table each cell also carries its value as `style="--v:0.82"`; that
number sets the length of the bar, so change it together with the printed value.

## Replacing or adding images

The images are generated from the visualization folder. After changing the
figures there, run

```
python tools/prepare_media.py --viz ../visualization_PDBrain-LM_v2
```

It copies the rotation GIFs unchanged, saves their first frame as a still, and
re-encodes the section images as lossless WebP (same pixels, about half the
size of the PNG files). It needs Pillow.

The explorer expects, for each of the two animals, three planes × three levels
× three channels, named `<plane>-<level>-<channel>.webp`. The level labels shown
on the buttons are set near the top of the explorer code in `assets/js/site.js`.

## Publishing with GitHub Pages

1. Create an empty repository on GitHub.
2. Commit and push this folder:

   ```
   git add .
   git commit -m "PDBrain-LM website"
   git remote add origin https://github.com/<user>/<repository>.git
   git push -u origin main
   ```

3. On GitHub open **Settings → Pages**. Under *Build and deployment* choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, and save.
4. After about a minute the site is at `https://<user>.github.io/<repository>/`.
   Every later push updates it.

All paths in the site are relative, so the repository name does not matter and a
custom domain (Settings → Pages → Custom domain) needs no change to the files.
The empty `.nojekyll` file tells GitHub to serve the files as they are.

## Credits and licences

- Images on the page are from the PDBrain-LM dataset.
- `assets/img/acquisition/source-study-fig1.png` is Figure 1 of Combes, Dong
  et al., *Multiscale brain-wide mapping of α-synuclein-driven dopaminergic
  degeneration and white matter impairment in α-synucleinopathy mice*, bioRxiv,
  doi:[10.64898/2025.12.05.692595](https://doi.org/10.64898/2025.12.05.692595),
  reproduced unchanged under CC BY-NC-ND 4.0.
- IBM Plex Sans and IBM Plex Mono are licensed under the SIL Open Font License
  1.1 (`assets/fonts/LICENSE-IBM-Plex.txt`).
