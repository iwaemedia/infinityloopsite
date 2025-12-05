import os
import shutil
import codecs
import re
from pathlib import Path

# ====== CONFIGURE THIS ======
ROOT_DIR = r"C:\Users\apss2\InfinityLoopBook\InfinityLoopSite\InfinityLoopSite"
BACKUP_FOLDER_NAME = "_backup_original_encoding"
# ============================

HTML_EXTENSIONS = {".htm", ".html"}


def detect_and_read(path: Path) -> str:
    """
    Try reading a file as UTF-8 first.
    If that fails, fall back to Windows-1252 (cp1252).
    Returns the decoded text.
    """
    raw = path.read_bytes()

    # 1) Try UTF-8
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        pass

    # 2) Fallback to Windows-1252 (common for Word exports / old HTML)
    try:
        print(f"[INFO] {path.name}: decoding as cp1252")
        return raw.decode("cp1252")
    except UnicodeDecodeError:
        # 3) Last-resort “latin-1” (never fails, but may keep weird chars)
        print(f"[WARN] {path.name}: decoding as latin-1 (last resort)")
        return raw.decode("latin-1")


def ensure_utf8_meta(html: str) -> str:
    """
    Make sure the HTML has a proper <meta charset="UTF-8"> inside <head>.
    - Replace any existing charset meta
    - Or insert a new one if missing
    """
    # Normalize line endings
    html = html.replace("\r\n", "\n").replace("\r", "\n")

    # 1) Replace <meta charset="...">
    meta_charset_re = re.compile(
        r'<meta\s+charset=["\']?[^"\'>]+["\']?\s*/?>',
        re.IGNORECASE
    )

    if meta_charset_re.search(html):
        html = meta_charset_re.sub('<meta charset="UTF-8">', html)
    else:
        # 2) Replace <meta http-equiv="content-type" content="text/html; charset=...">
        meta_http_equiv_re = re.compile(
            r'<meta\s+http-equiv=["\']content-type["\']\s+content=["\']text/html;\s*charset=[^"\']+["\']\s*/?>',
            re.IGNORECASE
        )
        if meta_http_equiv_re.search(html):
            html = meta_http_equiv_re.sub(
                '<meta charset="UTF-8">', html
            )
        else:
            # 3) Insert a new meta tag right after <head> if none found
            head_re = re.compile(r"<head([^>]*)>", re.IGNORECASE)
            if head_re.search(html):
                html = head_re.sub(
                    r"<head\1>\n  <meta charset=\"UTF-8\">",
                    html,
                    count=1
                )
            else:
                # If there's no <head>, just leave content as is
                pass

    return html


def backup_file(path: Path, backup_root: Path):
    """
    Copy a file to backup folder, preserving relative path.
    """
    rel_path = path.relative_to(ROOT_DIR)
    backup_path = backup_root / rel_path
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup_path)


def convert_file(path: Path, backup_root: Path):
    """
    Convert a single .htm/.html file to UTF-8 and normalize <meta charset>.
    """
    print(f"[PROCESS] {path}")
    backup_file(path, backup_root)

    # Read with detection
    text = detect_and_read(path)

    # Ensure proper <meta charset="UTF-8">
    text = ensure_utf8_meta(text)

    # Write back as UTF-8 (no BOM)
    with codecs.open(path, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"[OK] Converted to UTF-8: {path.name}")


def main():
    root = Path(ROOT_DIR)
    if not root.exists():
        print(f"[ERROR] Root folder does not exist: {ROOT_DIR}")
        return

    backup_root = root / BACKUP_FOLDER_NAME
    backup_root.mkdir(exist_ok=True)

    print(f"[START] Converting HTML files under:\n  {ROOT_DIR}")
    print(f"[BACKUP] Original files will be copied to:\n  {backup_root}\n")

    count = 0
    for dirpath, dirnames, filenames in os.walk(root):
        for name in filenames:
            path = Path(dirpath) / name
            if path.suffix.lower() in HTML_EXTENSIONS:
                convert_file(path, backup_root)
                count += 1

    print(f"\n[DONE] Processed {count} HTML/HTM files.")
    print("[NOTE] All files are now saved as UTF-8 with a UTF-8 <meta> tag.")


if __name__ == "__main__":
    main()
