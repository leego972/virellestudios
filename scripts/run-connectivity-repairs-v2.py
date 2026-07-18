from pathlib import Path

script_path = Path("scripts/apply-connectivity-repairs.py")
code = script_path.read_text()
code = code.replace(
    "setLocation(`/projects/${projectId}/approvals`)",
    "setLocation(`/projects/${project.id}/approvals`)",
)
code = code.replace(
    "setLocation(`/projects/${projectId}/approval-chain`)",
    "setLocation(`/projects/${project.id}/approval-chain`)",
)
code = code.replace(
    '''patch("client/src/pages/VFXStudio.tsx", 'setLocation("/settings/api-keys")', 'setLocation("/settings/byok")')''',
    '''patch("client/src/pages/VFXStudio.tsx", '<a href="/settings/api-keys" className="text-amber-400 underline">Settings → API Keys</a>', '<a href="/settings/byok" className="text-amber-400 underline">Settings → API Keys</a>')''',
)
exec(compile(code, str(script_path), "exec"), {"__name__": "__main__", "__file__": str(script_path)})
