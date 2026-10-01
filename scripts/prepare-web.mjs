import { cp, mkdir } from "node:fs/promises";
import { build } from "esbuild";

const files = ["index.html", "styles.css", "app.js", "ledger-core.js", "icon.svg"];
await mkdir("www", { recursive: true });
await Promise.all(files.map((file) => cp(file, `www/${file}`)));
await build({ entryPoints: ["scripts/native-entry.js"], outfile: "www/native-bridge.js", bundle: true, minify: true, platform: "browser", target: "es2022" });
