"""Amplía ×4 la referencia del hero con superresolución (EDSR) para generar
cLoak Studios/Diseño/principal-x4.webp, la fuente nítida de las capas del hero.

Requisitos (una sola vez, fuera del proyecto):
  python3 -m venv .sr && .sr/bin/pip install opencv-contrib-python-headless
  curl -LO https://raw.githubusercontent.com/Saafke/EDSR_Tensorflow/master/models/EDSR_x4.pb
Uso:
  .sr/bin/python scripts/upscale-reference.py "cLoak Studios/Diseño/principal.jpeg" EDSR_x4.pb principal-x4.png
  (después se convierte a WebP; tarda unos minutos en CPU)
"""
import cv2, sys, time
src, model, out = sys.argv[1:4]
sr = cv2.dnn_superres.DnnSuperResImpl_create()
sr.readModel(model)
sr.setModel('edsr', 4)
img = cv2.imread(src)
t = time.time()
# Por bloques con solape para no agotar memoria.
h, w = img.shape[:2]
T, O = 200, 16
res = None
import numpy as np
res = np.zeros((h * 4, w * 4, 3), np.uint8)
for y in range(0, h, T):
    for x in range(0, w, T):
        y0, x0 = max(0, y - O), max(0, x - O)
        y1, x1 = min(h, y + T + O), min(w, x + T + O)
        up = sr.upsample(img[y0:y1, x0:x1])
        ty, tx = (y - y0) * 4, (x - x0) * 4
        hh, ww = (min(y + T, h) - y) * 4, (min(x + T, w) - x) * 4
        res[y * 4:y * 4 + hh, x * 4:x * 4 + ww] = up[ty:ty + hh, tx:tx + ww]
    print('fila', y, round(time.time() - t), 's', flush=True)
cv2.imwrite(out, res)
print('ok', res.shape, round(time.time() - t), 's')
