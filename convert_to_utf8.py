# convert_to_utf8.py
import os

FILES = [
    "TITLE_PAGE.htm",
    "CHAPTER_2_clean_stitched_formatted.htm",
]

for path in FILES:
    if not os.path.exists(path):
        print(f"SKIP: {path} not found in current folder")
        continue

    print(f"Converting {path}...")

    # Read as Windows-1252 (what Word used)
    with open(path, "r", encoding="cp1252", errors="strict") as f:
        text = f.read()

    # Fix meta charset to utf-8
    text = (
        text.replace("charset=windows-1252", "charset=utf-8")
            .replace("charset=Windows-1252", "charset=utf-8")
            .replace("charset=unicode", "charset=utf-8")
    )

    # Write back as real UTF-8
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)

    print(f"✅ Converted {path} to UTF-8")
