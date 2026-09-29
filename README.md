# Udhaari Tracker

A private, responsive lending tracker that runs entirely in the browser. Add money you need to receive or pay, see the net balance for each person, review the complete history, and download/restore JSON backups.

**Live website:** <https://mohddayaaz07.github.io/udhaari-tracker/>

## Run locally

You can double-click `index.html`, or run a small local server from this folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Data and privacy

Records are stored in the browser's `localStorage`. They remain available on the same browser and device, but do not automatically sync elsewhere. Use **Backup & restore** to download a JSON backup before clearing browser data or changing devices.

## Publish

The website is published automatically with GitHub Pages from the `main` branch.

No build command, package installation, or server is required. Push changes to `main` to update the live website.

> Important: publishing the site does not publish your ledger entries. Every visitor has a separate empty ledger stored in their own browser.
