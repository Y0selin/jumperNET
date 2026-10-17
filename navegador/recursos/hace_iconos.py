from PIL import Image, ImageDraw

def hace(tamano, fichero):
    im = Image.new("RGBA", (tamano, tamano), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    g = tamano // 5
    d.rounded_rectangle([0, 0, tamano - 1, tamano - 1], radius=tamano // 5, fill=(108, 92, 231, 255))
    w = max(2, tamano // 14)
    for fyz in (0.32, 0.50, 0.68):
        y = round(fyz * tamano)
        d.line([(g * 1.1, y), (tamano - g * 1.1, y)], fill="white", width=w)

    im.save(fichero)
    print("ok", fichero)

hace(256, "recursos/jumpernat.png")
hace(128, "recursos/jumpernat-128.png")
hace(32, "recursos/jumpernat-32.png")
img = Image.open("recursos/jumpernat.png")
img.save("recursos/jumpernat.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("ok recursos/jumpernat.ico")
