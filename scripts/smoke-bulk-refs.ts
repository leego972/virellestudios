type Ref = { url?: string; b64Json?: string; mimeType: string; key: string; priority: number };
const REF_CAP = 4;

function makeBuildSceneRefs(characters: any[], anchorMap: Record<string, { b64Json: string; mimeType: string }>) {
  const getBulkActorRef = (id: string) => anchorMap[id];
  return (sceneCharacterIds: number[]) => {
    const refs: Ref[] = [];
    const seen = new Set<string>();
    const addChar = (char: any, scenePriority: number) => {
      const aiActorId = char?.aiActorId as string | undefined;
      if (aiActorId) {
        const key = `anchor:${aiActorId}`;
        if (!seen.has(key)) {
          const ref = getBulkActorRef(aiActorId);
          if (ref) {
            refs.push({ b64Json: ref.b64Json, mimeType: ref.mimeType, key, priority: scenePriority * 10 + 1 });
            seen.add(key);
          }
        }
      }
      if (char?.photoUrl) {
        const key = `photo:${char.photoUrl}`;
        if (!seen.has(key)) {
          refs.push({ url: char.photoUrl, mimeType: "image/jpeg", key, priority: scenePriority * 10 + 2 });
          seen.add(key);
        }
      }
    };
    for (const cid of sceneCharacterIds) {
      const char = characters.find(c => c.id === cid);
      if (char) addChar(char, 0);
    }
    for (const char of characters) addChar(char, 1);
    refs.sort((a, b) => a.priority - b.priority);
    return refs.slice(0, REF_CAP);
  };
}

let pass = 0, fail = 0;
const t = (name: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else    { fail++; console.log(`  FAIL  ${name} — ${detail}`); }
};

// ---------- Scenario A: 6-char project, scene uses 5 ----------
{
  const chars = [
    { id: 1, name: "Lead",   aiActorId: "anc-lead",   photoUrl: "p1.jpg" },
    { id: 2, name: "Second", aiActorId: "anc-second", photoUrl: null     },
    { id: 3, name: "Third",  aiActorId: null,         photoUrl: "p3.jpg" },
    { id: 4, name: "Fourth", aiActorId: "anc-fourth", photoUrl: "p4.jpg" },
    { id: 5, name: "Fifth",  aiActorId: null,         photoUrl: "p5.jpg" },
    { id: 6, name: "Sixth",  aiActorId: "anc-sixth",  photoUrl: null     },
  ];
  const anchors = {
    "anc-lead":   { b64Json: "L", mimeType: "image/png" },
    "anc-second": { b64Json: "S", mimeType: "image/png" },
    "anc-fourth": { b64Json: "F", mimeType: "image/png" },
    "anc-sixth":  { b64Json: "X", mimeType: "image/png" },
  };
  const build = makeBuildSceneRefs(chars, anchors);
  const out = build([1, 2, 3, 4, 5]);
  console.log("\nScenario A: 6-char project, scene uses 5 (expect 4 refs, all scene-cast, anchors first):");
  t("returns exactly 4 refs", out.length === 4, `got ${out.length}`);
  t("first ref is scene-cast anchor (anc-lead)", out[0]?.key === "anchor:anc-lead", `got ${out[0]?.key}`);
  t("contains anc-second anchor", out.some(r => r.key === "anchor:anc-second"));
  t("contains anc-fourth anchor", out.some(r => r.key === "anchor:anc-fourth"));
  t("does NOT contain Sixth (not in scene cast)", !out.some(r => r.key === "anchor:anc-sixth"));
  t("anchors fill before photos when both available", out.filter(r => r.key.startsWith("anchor:")).length >= 3);
}

// ---------- Scenario B: scene with 2 chars, project has 6 (backfill required) ----------
{
  const chars = [
    { id: 1, name: "A", aiActorId: "anc-a", photoUrl: "a.jpg" },
    { id: 2, name: "B", aiActorId: null,    photoUrl: "b.jpg" },
    { id: 3, name: "C", aiActorId: "anc-c", photoUrl: null    },
    { id: 4, name: "D", aiActorId: "anc-d", photoUrl: "d.jpg" },
    { id: 5, name: "E", aiActorId: null,    photoUrl: "e.jpg" },
    { id: 6, name: "F", aiActorId: "anc-f", photoUrl: null    },
  ];
  const anchors = {
    "anc-a": { b64Json: "A", mimeType: "image/png" },
    "anc-c": { b64Json: "C", mimeType: "image/png" },
    "anc-d": { b64Json: "D", mimeType: "image/png" },
    "anc-f": { b64Json: "F", mimeType: "image/png" },
  };
  const build = makeBuildSceneRefs(chars, anchors);
  const out = build([1, 2]);
  console.log("\nScenario B: scene 2 chars, project 6 (expect scene first, then backfill, capped 4):");
  t("returns exactly 4 refs", out.length === 4, `got ${out.length}`);
  t("scene cast first: A anchor at [0]", out[0]?.key === "anchor:anc-a");
  t("scene cast first: A photo or B photo in [1]", out[1]?.key === "photo:a.jpg" || out[1]?.key === "photo:b.jpg");
  t("scene cast (priority<10) drains before any backfill (priority>=10)", out.slice(0,3).every(r => r.priority < 10) && out[3]?.priority >= 10);
}

// ---------- Scenario C: dedup — char in scene cast also encountered in backfill ----------
{
  const chars = [
    { id: 1, name: "A", aiActorId: "anc-a", photoUrl: "a.jpg" },
    { id: 2, name: "B", aiActorId: "anc-b", photoUrl: "b.jpg" },
  ];
  const anchors = {
    "anc-a": { b64Json: "A", mimeType: "image/png" },
    "anc-b": { b64Json: "B", mimeType: "image/png" },
  };
  const build = makeBuildSceneRefs(chars, anchors);
  const out = build([1]);
  console.log("\nScenario C: dedup — scene char 1, backfill includes 1 again (expect no dup):");
  t("no duplicate anchor:anc-a", out.filter(r => r.key === "anchor:anc-a").length === 1);
  t("no duplicate photo:a.jpg", out.filter(r => r.key === "photo:a.jpg").length === 1);
  t("contains B from backfill", out.some(r => r.key === "anchor:anc-b"));
}

// ---------- Scenario D: empty scene cast — fall back entirely to project ----------
{
  const chars = [
    { id: 1, name: "A", aiActorId: "anc-a", photoUrl: null },
    { id: 2, name: "B", aiActorId: null, photoUrl: "b.jpg" },
  ];
  const anchors = { "anc-a": { b64Json: "A", mimeType: "image/png" } };
  const build = makeBuildSceneRefs(chars, anchors);
  const out = build([]);
  console.log("\nScenario D: empty scene cast — fallback to project (expect 2 refs):");
  t("returns 2 refs", out.length === 2, `got ${out.length}`);
  t("contains anc-a anchor", out.some(r => r.key === "anchor:anc-a"));
  t("contains b.jpg photo", out.some(r => r.key === "photo:b.jpg"));
}

// ---------- Scenario E: anchor priority over photo within same scene priority ----------
{
  const chars = [
    { id: 1, name: "A", aiActorId: "anc-a", photoUrl: "a.jpg" },
  ];
  const anchors = { "anc-a": { b64Json: "A", mimeType: "image/png" } };
  const build = makeBuildSceneRefs(chars, anchors);
  const out = build([1]);
  console.log("\nScenario E: single char with both anchor + photo (expect anchor before photo):");
  t("anchor first", out[0]?.key === "anchor:anc-a");
  t("photo second", out[1]?.key === "photo:a.jpg");
}

// ---------- Scenario F: missing anchor mapping (aiActorId set but no ref returned) ----------
{
  const chars = [
    { id: 1, name: "A", aiActorId: "anc-missing", photoUrl: "a.jpg" },
  ];
  const anchors = {} as Record<string, { b64Json: string; mimeType: string }>;
  const build = makeBuildSceneRefs(chars, anchors);
  const out = build([1]);
  console.log("\nScenario F: aiActorId present but no anchor in map (expect photo only, no crash):");
  t("returns 1 ref (photo only)", out.length === 1);
  t("photo present", out[0]?.key === "photo:a.jpg");
  t("no anchor leaked", !out.some(r => r.key.startsWith("anchor:")));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
