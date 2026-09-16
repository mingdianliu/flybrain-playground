# Uploading this repository to GitHub

Suggested name: **flybrain-playground**.

Suggested description:

> Interactive fly-brain playground with the MaleCNS connectome, simplified spiking neurons, movable stimuli and 3D neural activity.

Suggested topics: `drosophila`, `connectomics`, `neuroscience`, `simulation`,
`threejs`, `visualization`, `spiking-neural-networks`.

## Existing local repository

The project is published at https://github.com/mingdianliu/flybrain-playground.
The commands below are a maintainer reference for publishing a separate copy
from a local Git repository without a remote. After signing in with GitHub CLI:

```sh
gh repo create flybrain-playground --public --source=. --remote=origin --push
```

Run this inside the `flybrain-playground` folder. This command publishes the
source on your GitHub account.

If using GitHub's website instead, create an **empty** repository without adding
a README, license or `.gitignore`, then use the remote URL shown by GitHub:

```sh
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/flybrain-playground.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your actual account name. If you already have
an `origin`, inspect it first rather than adding or replacing it blindly.

## Starting from the source ZIP

The source ZIP contains the same tracked files, including `.github/`, but no Git
history. Extract it, enter its root and run:

```sh
git init -b main
git add .
git commit -m "Initial reproducible Flybrain Playground release"
```

Then follow either upload method above. Configure your own Git author identity
if Git asks; no real email or authentication credential is required in the files.

## Optional prepared data release

Attach `malecns-v1.0-model.zip` and `SHA256SUMS.txt` as **Release assets**, rather
than committing them. A maintainer can create a release in the GitHub UI or use:

```sh
gh release create v0.1.0 /path/to/malecns-v1.0-model.zip /path/to/SHA256SUMS.txt --target main --title "Flybrain Playground v0.1.0" --notes-file docs/RELEASE_NOTES.md
```

The prepared model retains MaleCNS CC BY 4.0 attribution. The independent official
download/export route remains available even if a Release asset is unavailable.
Keep raw tables, `work/`, `dist/` and recordings outside the Git history.

After uploading, inspect the Actions tab for the fast CI results. Full data
reproduction is optional through **Run workflow → full_model**. No workflow
deploys a website or requires access to the original demo's hosting account.
