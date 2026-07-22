import fs from "node:fs";

function replaceExact(path, from, to, label) {
  const content = fs.readFileSync(path, "utf8");
  const matches = content.split(from).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected one match, found ${matches}`);
  }
  fs.writeFileSync(path, content.replace(from, to));
}

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  "  const submitRender = async () => {  const submitRender = async () => {",
  "  const submitRender = async () => {",
  "duplicate submitRender declaration",
);

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  "  const cancel = async (id: number) => {  const cancel = async (id: number) => {",
  "  const cancel = async (id: number) => {",
  "duplicate cancel declaration",
);

replaceExact(
  "client/src/pages/VirelleBroadcastRender.tsx",
  "\n        <Card className={subtleCard}>          </Card>\n        </div>\n\n        <Card className={subtleCard}>",
  "\n\n        <Card className={subtleCard}>",
  "orphan broadcast card closing block",
);

replaceExact(
  "server/virelle-broadcast-render-router.ts",
  "  BROADCAST_MINUTE_PACKS,\n",
  "",
  "unused broadcast pack import",
);

replaceExact(
  "server/virelle-broadcast-render-router.ts",
  "      && (!resolved.consentConfirmed || !resolved.allSubjectsAdultsConfirmed)\n",
  "      && ((!resolved.consentConfirmed && !resolved.aiGeneratedCharactersOnly)\n        || !resolved.allSubjectsAdultsConfirmed)\n",
  "adult broadcast consent condition",
);

console.log("Broadcast integration compile cleanup applied.");
