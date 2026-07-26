from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "client/src/components/ProjectToolHub.tsx"
text = path.read_text(encoding="utf-8")
old = '''          <Link href="/virelle-broadcast-render">
            <Button variant="outline" className="whitespace-nowrap border-amber-500/30 hover:bg-amber-500/10">
              <RadioTower className="mr-2 h-4 w-4" />
              Swappys & Broadcast
            </Button>
          </Link>
'''
if old not in text:
    raise RuntimeError("Final standard broadcast control was not found")
path.write_text(text.replace(old, "", 1), encoding="utf-8")
print("Removed final standard broadcast control.")
