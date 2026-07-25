import process from "node:process";
import { spawnSync } from "node:child_process";

function main() {
  const python = process.env.LAMALO_PYTHON_BIN || "python";
  const args = process.argv.slice(2);
  const result = spawnSync(python, [
    "scripts/lamalo360/free/generate_geometry.py",
    ...args,
  ], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local 3D generation exited with ${result.status}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
