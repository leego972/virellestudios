import { execFileSync } from "node:child_process";
import fs from "node:fs";

const path = "client/src/pages/WardrobeMarketplacePage.tsx";
const validatedCommit = "8da91d2acf89c1a7edddc9b9bc6c6db58cf4d05e";
let source = execFileSync("git", ["show", `${validatedCommit}:${path}`], { encoding: "utf8" });
const marker = 'function DesignerCard({ profile, onClick }: { profile: any; onClick: () => void }) {\n  const isLamalo = profile.brandName === "Lamalo Fashion";';
const replacement = 'function DesignerCard({ profile, onClick }: { profile: any; onClick: () => void }) {\n  const [imgErr, setImgErr] = useState(false);\n  const isLamalo = profile.brandName === "Lamalo Fashion";';
if (!source.includes(marker)) throw new Error("DesignerCard insertion point was not found in the validated marketplace file.");
source = source.replace(marker, replacement);
fs.writeFileSync(path, source);
console.log(`Restored ${path} from ${validatedCommit} and added isolated logo-error state.`);
