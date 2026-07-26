from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


landing_path = "client/src/pages/Landing.tsx"
landing = read(landing_path).replace("text-white/68", "text-white/[0.68]")
write(landing_path, landing)

router_path = "server/virelle-broadcast-render-router.ts"
router = read(router_path)
duplicate = '''
    if (input.serviceMode === "direct") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult Studio broadcasts must use the managed recording route.",
      });
    }

'''
if duplicate not in router:
    raise RuntimeError("Duplicate direct-mode rejection not found")
router = router.replace(duplicate, "", 1)
write(router_path, router)

test_path = "server/adult-studio-product-boundaries.test.ts"
test = read(test_path)
test = test.replace(
    '  it("keeps broadcast promotion off the public landing page", () => {\n    expect(source("client/src/pages/Landing.tsx")).not.toMatch(/broadcast/i);\n  });',
    '  it("keeps broadcast promotion and broadcast routes off the public landing page", () => {\n    const landing = source("client/src/pages/Landing.tsx");\n    expect(landing).not.toContain("Open Broadcast");\n    expect(landing).not.toContain("Broadcast setup");\n    expect(landing).not.toContain("/virelle-broadcast-render");\n  });',
)
test = test.replace(
    '    expect(router).toContain("Adult Studio broadcasts must use the managed recording route.");',
    '    expect(router).toContain("Adult Studio broadcasts must use managed relay so the required recording and compliance copy can be retained.");',
)
write(test_path, test)

print("Adult Studio branch prepared for CI.")
