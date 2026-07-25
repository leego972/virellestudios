import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = { image: undefined, metadata: undefined };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--image") args.image = path.resolve(argv[++i]);
    else if (argv[i] === "--metadata") args.metadata = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!args.image || !args.metadata) throw new Error("Provide --image and --metadata.");
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const python = process.env.LAMALO_PYTHON_BIN || "python";
  const result = spawnSync(python, [
    "scripts/lamalo360/free/local_visual_review.py",
    "--mode", "source",
    "--image", args.image,
    "--metadata", args.metadata,
  ], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Local source review exited with ${result.status}.`);
  console.log(args.metadata);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
}
