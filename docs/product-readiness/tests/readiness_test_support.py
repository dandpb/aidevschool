import importlib.util
import sys
from pathlib import Path


READINESS_ROOT = Path(__file__).resolve().parents[1]
TOOLS_ROOT = READINESS_ROOT / "tools"
PACKAGE_NAME = "product_readiness_tools"


def register_tools_package() -> None:
    if PACKAGE_NAME in sys.modules:
        return
    spec = importlib.util.spec_from_file_location(
        PACKAGE_NAME,
        TOOLS_ROOT / "__init__.py",
        submodule_search_locations=[str(TOOLS_ROOT)],
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[PACKAGE_NAME] = module
    spec.loader.exec_module(module)
