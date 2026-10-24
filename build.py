# Builds artifact.html (Claude preview fragment) and index.html (installable PWA) from src/.
import pathlib
root = pathlib.Path(__file__).parent
game = (root / "src/game.html").read_text().replace("/*CORE*/", (root / "src/core.js").read_text())
# Bundle the font so the app works offline and does not wait on Google Fonts.
import base64
font = base64.b64encode((root / "src/fredoka-latin.woff2").read_bytes()).decode()
face = ('<style>@font-face { font-family: "Fredoka"; font-style: normal; font-weight: 300 700; font-display: swap; '
        'src: url(data:font/woff2;base64,' + font + ') format("woff2"); }</style>')
gfonts = [l for l in game.splitlines() if "fonts.googleapis.com" in l or "fonts.gstatic.com" in l]
for l in gfonts: game = game.replace(l + "\n", "")
game = game.replace("<style>", face + "\n<style>", 1)
(root / "artifact.html").write_text('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + game)
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f5a35b">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg">
<link rel="apple-touch-icon" href="icon.svg">
</head>
<body>
"""
tail = """
<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});</script>
</body>
</html>
"""
(root / "index.html").write_text(head + game + tail)

# Keep the mobile app's web bundle in step with the PWA.
import shutil
for f in ["index.html", "manifest.webmanifest", "icon.svg", "sw.js"]:
    shutil.copy(root / f, root / "mobile/www" / f)
