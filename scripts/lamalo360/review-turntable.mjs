import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { pack: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--pack") args.pack = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.pack) throw new Error("Provide --pack <turntable-pack.json>.");
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const python = process.env.LAMALO_PYTHON_BIN || "python";
  const result = spawnSync(python, [
    "scripts/lamalo360/free/local_visual_review.py",
    "--mode", "turntable",
    "--pack", args.pack,
  ], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local turntable review exited with ${result.status}.`);
  console.log(path.join(path.dirname(args.pack), "visual-approval.json"));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
