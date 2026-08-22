"""Build a Chrome/Edge release ZIP from the extension source."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "weibo-downloader-chrome.zip"
EXCLUDE_PARTS = {"test", "store", "scripts", "docs", "node_modules", ".git", "_metadata"}
EXCLUDE_NAMES = {
    "HANDOFF.md",
    "CURSOR_COLLABORATION.md",
    ".gitignore",
    "weibo-downloader-chrome.zip",
    "weibo-downloader-firefox.xpi",
}


def should_include(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(part in EXCLUDE_PARTS for part in relative.parts):
        return False
    if relative.name in EXCLUDE_NAMES:
        return False
    return path.is_file() and path != OUT


def main() -> None:
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(ROOT.rglob("*")):
            if not should_include(path):
                continue
            relative = path.relative_to(ROOT).as_posix()
            archive.write(path, relative)
            print("ADD:", relative)
    print("OK ->", OUT)


if __name__ == "__main__":
    main()
