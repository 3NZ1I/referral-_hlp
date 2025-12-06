# Simple local check to verify backend.api functions exist and to load backend safely.
import os, sys, importlib, traceback

# Ensure repo root is in path
cwd = os.getcwd()
if cwd not in sys.path:
    sys.path.insert(0, cwd)

# Avoid forcing postgres driver during import
os.environ.setdefault("DATABASE_URL", "sqlite:///test.db")

try:
    mod = importlib.import_module("backend.api")
    print("Imported backend.api OK")
    print("helpers exist:", hasattr(mod, "_promote_wrapper_fields_in_raw"), hasattr(mod, "_flatten_raw_wrapper"))
    # Quick sanity check: call the helper with a sample raw wrapper
    raw = {"body": {"family": [{"name": "Alice"}], "caseNumber": "123", "_submission_time": "2020-01-01 00:00:00"}}
    promoted = mod._promote_wrapper_fields_in_raw(dict(raw))
    flattened = mod._flatten_raw_wrapper(dict(raw))
    print("promoted keys:", [k for k in promoted.keys() if k in ('family', 'formFields', 'caseNumber', '_submission_time')])
    print("flattened keys present:", 'family' in flattened, 'caseNumber' in flattened, '_submission_time' in flattened)
except Exception:
    traceback.print_exc()
    sys.exit(1)
