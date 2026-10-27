// Cross-platform (Windows/macOS/Linux) production build for a Node.js host:  npm run build:node
import { spawnSync } from "node:child_process";
const r = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NITRO_PRESET: "node-server" },
});
process.exit(r.status ?? 1);
