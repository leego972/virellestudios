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
exec(compile(code, str(script_path), "exec"), {"__name__": "__main__", "__file__": str(script_path)})
