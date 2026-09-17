"""Use the configured Chromium, the tested Linux binary, or Playwright's install."""
from pathlib import Path
import os
def launch(playwright):
    opts={"headless":True,"args":["--no-sandbox"]}
    executable=os.environ.get("CHROMIUM_EXECUTABLE")
    if executable:
        opts["executable_path"]=executable
    elif Path("/usr/bin/chromium").is_file():
        opts["executable_path"]="/usr/bin/chromium"
    return playwright.chromium.launch(**opts)
