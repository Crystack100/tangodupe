# Builds artifact.html (Claude preview fragment) and index.html (installable PWA) from src/.
import pathlib
root = pathlib.Path(__file__).parent
game = (root / "src/game.html").read_text().replace("/*CORE*/", (root / "src/core.js").read_text())
(root / "artifact.html").write_text(game)
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ff8a5c">
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
