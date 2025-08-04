#!/usr/bin/env python3
"""
croc_remove_bg.py  –  Professional chroma-key removal (pink #ff66c4)

• Source :  ~/ANIMATION/(NEW) CROC LOADING.mov
• Output :  ~/ANIMATION/CROC_LOADING_noBG_PRO.mov
• Codec  :  ProRes 4444 (alpha preserved)
"""

import os, sys, shutil, subprocess

HOME   = os.path.expanduser("~")
SRC    = os.path.join(HOME, "ANIMATION", "(NEW) CROC LOADING.mov")
DEST   = os.path.join(HOME, "ANIMATION", "CROC_LOADING_noBG_PRO.mov")

# Matte parameters
KEY        = "0xff66c4"   # pink
SIMILARITY = "0.07"       # threshold
BLEND      = "0.15"       # edge softness
DESPILL    = "0.05"       # spill suppression

def abort(msg):
    sys.stderr.write(f"❌  {msg}\n"); sys.exit(1)

def main():
    if not shutil.which("ffmpeg"):
        abort("ffmpeg not found – install it first (e.g. `brew install ffmpeg`).")
    if not os.path.isfile(SRC):
        abort(f"Source file missing: {SRC}")

    vf = (
        f"chromakey={KEY}:{SIMILARITY}:{BLEND},"
        f"colorhold={KEY}:{DESPILL}:0:1,"
        "format=yuva444p"
    )

    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "info",
        "-i", SRC,
        "-vf", vf,
        "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le",
        "-c:a", "copy",
        DEST
    ]

    print("▶︎  Removing background…")
    subprocess.run(cmd, check=True)
    print(f"✔︎  Finished → {DEST}")

if __name__ == "__main__":
    main()
