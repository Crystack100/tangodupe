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
<link rel="apple-touch-icon" href="apple-touch-icon.png">
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
for f in ["manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]:
    shutil.copy(root / f, root / "mobile/www" / f)
shutil.copy(root / "mobile/sw-app.js", root / "mobile/www/sw.js")
# The app also loads Capacitor's bridge, which the game uses for ads, reminders and sharing.
core = root / "mobile/node_modules/@capacitor/core/dist/capacitor.js"
if core.exists(): shutil.copy(core, root / "mobile/www/capacitor.js")
# No offline worker in the app: its files are already on the phone.
(root / "mobile/www/index.html").write_text(head.replace("<body>\n", '<body>\n<script src="capacitor.js"></script>\n') + game + "\n</body>\n</html>\n")

# CrazyGames build: one file with their SDK (which runs the ads there) and no offline worker.
# Zip the crazygames folder and upload it at developer.crazygames.com.
cg = root / "crazygames"; cg.mkdir(exist_ok=True)
cg_head = head.replace('<link rel="manifest" href="manifest.webmanifest">\n', "").replace('<link rel="icon" href="icon.svg">\n', "").replace('<link rel="apple-touch-icon" href="apple-touch-icon.png">\n', "")
cg_head = cg_head.replace("</head>", '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n</head>')
(cg / "index.html").write_text(cg_head + game + "\n</body>\n</html>\n")
