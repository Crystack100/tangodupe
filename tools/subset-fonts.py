# Shrinks the two bundled fonts to the characters and weights the game uses.
# Run after adding text with new characters (the unit tests say when):
#   pip install fonttools brotli && python3 tools/subset-fonts.py
import json, pathlib
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

root = pathlib.Path(__file__).resolve().parent.parent
cfg = json.loads((root / "src/font-subset.json").read_text())
unicodes = [cp for lo, hi in cfg["ranges"] for cp in range(int(lo, 16), int(hi, 16) + 1)]
for f in cfg["fonts"]:
    font = TTFont(root / "src" / f["from"])
    # Keep only the weights the CSS asks for.
    font = instancer.instantiateVariableFont(font, {"wght": tuple(f["weights"])})
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt", "tnum", "case"]
    opts.name_IDs = ["*"]
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)
    out = root / "src" / f["to"]
    font.flavor = "woff2"
    font.save(out)
    print(f["from"], (root / "src" / f["from"]).stat().st_size, "->", f["to"], out.stat().st_size, "bytes")
