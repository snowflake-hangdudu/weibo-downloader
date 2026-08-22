"""打包 Firefox 发布包（XPI）"""
import json
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "weibo-downloader-firefox.xpi")

INCLUDE = [
    "background.js",
    "content/page-agent.js",
    "content/weibo-runtime.js",
    "content/weibo-dom.js",
    "content/weibo-remote-content.js",
    "content/weibo-media.js",
    "content/weibo-queue.js",
    "content/weibo-platform.js",
    "content/weibo-panel.js",
    "content/weibo-panel.css",
    "content/content.css",
    "content/debug.js",
    "content/platform-adapter.js",
    "content/media-saver.js",
    "content/content.js",
    "popup/popup.html",
    "popup/popup.js",
    "popup/popup.css",
    "offscreen/offscreen.html",
    "offscreen/offscreen.js",
    "rules/cdn-headers.json",
    "icons/icon16.png",
    "icons/icon32.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "README.md",
]


def build_manifest():
    with open(os.path.join(ROOT, "manifest.json"), "r", encoding="utf-8") as f:
        manifest = json.load(f)
    permissions = [item for item in manifest.get("permissions", []) if item != "offscreen"]
    manifest["permissions"] = permissions
    manifest["background"] = {"scripts": ["background.js"]}
    manifest["browser_specific_settings"] = {
        "gecko": {
            "id": "weibo-downloader@hangdudu.local",
            "data_collection_permissions": {"required": ["none"]},
            "strict_min_version": "121.0",
        }
    }
    return json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"


def main():
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", build_manifest().encode("utf-8"))
        print("ADD: manifest.json (firefox)")
        for rel in INCLUDE:
            path = os.path.join(ROOT, rel.replace("/", os.sep))
            if not os.path.isfile(path):
                print("SKIP (missing):", rel)
                continue
            zf.write(path, rel.replace("\\", "/"))
            print("ADD:", rel)
    print("OK ->", OUT)


if __name__ == "__main__":
    main()
