"""Extract source illustrations by changing alpha only; never redraw mascot pixels."""
from hashlib import sha256
import json
from math import sin, pi
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'toki'
POSES = {
    'teacher': ('02-grupos.png', (515, 110, 765, 450)),
    'detective': ('05-detective.png', (95, 195, 405, 425)),
    'think': ('06-primero-tu.png', (35, 345, 395, 610)),
    'wave': ('04-entrada-estudiante.png', (80, 190, 375, 447)),
    'celebrate': ('11-avance-familias.png', (525, 355, 825, 559)),
    'plant': ('09-reto-comunidad.png', (35, 190, 402, 455)),
    'speak': ('08-defiendelo.png', (60, 170, 410, 458)),
    'debate': ('07-duelo.png', (65, 294, 415, 542)),
}


def extract(source, box):
    rgb = np.array(Image.open(ROOT / source).convert('RGB').crop(box))
    red, green, blue = rgb.transpose(2, 0, 1).astype(float)
    low = rgb.min(axis=2)
    spread = rgb.max(axis=2).astype(int) - low
    # Flood from the exterior so pale eyes, teeth and enclosed glass lenses survive.
    pale = (low > 218) & (spread < 30)
    lavender = (blue > red * .98) & (blue > green * 1.06) & (red > 130) & (green > 110)
    candidate = pale | lavender
    if source == '07-duelo.png':
        # The sign's white outline joins its pastel fill to the exterior color class.
        # Trace only its original silhouette to protect it from the background flood.
        protection = Image.new('1', (rgb.shape[1], rgb.shape[0]))
        outline = [(75,403),(78,395),(84,391),(155,377),(162,377),(168,381),
                   (172,387),(184,441),(184,448),(181,456),(174,460),(103,469),
                   (95,469),(88,465),(83,457),(75,412)]
        ImageDraw.Draw(protection).polygon([(x-box[0], y-box[1]) for x,y in outline], fill=1)
        candidate &= ~np.array(protection, dtype=bool)
    border = np.zeros(candidate.shape, bool)
    border[[0, -1], :] = candidate[[0, -1], :]
    border[:, [0, -1]] = candidate[:, [0, -1]]
    if source == '07-duelo.png':
        border[480-box[1], 170-box[0]] = True
    background = ndimage.binary_propagation(border, mask=candidate)
    foreground = ~background
    labels, total = ndimage.label(foreground)
    # Tiny disconnected screenshot fragments are not part of the illustration.
    counts = np.bincount(labels.ravel())
    foreground &= counts[labels] >= 25
    alpha = foreground.astype('uint8') * 255
    image = Image.fromarray(np.dstack((rgb, alpha)), 'RGBA')
    bounds = image.getbbox()
    bounds = (max(0, bounds[0]-4), max(0, bounds[1]-4),
              min(image.width, bounds[2]+4), min(image.height, bounds[3]+4))
    image = image.crop(bounds)
    offset = (box[0] + bounds[0], box[1] + bounds[1])
    return image, offset


def main():
    OUTPUT.mkdir(exist_ok=True)
    metadata = {}
    for pose, (source, box) in POSES.items():
        image, offset = extract(source, box)
        destination = OUTPUT / f'{pose}.png'
        image.save(destination)
        original = Image.open(ROOT / source).convert('RGB')
        sample = original.crop((*offset, offset[0] + image.width, offset[1] + image.height))
        assert np.array_equal(np.array(sample), np.array(image)[:, :, :3])
        metadata[pose] = {'source': source, 'offset': offset, 'size': image.size,
                          'source_sha256': sha256((ROOT / source).read_bytes()).hexdigest(),
                          'rgb_preserved': True}
    (OUTPUT / 'sources.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    panorama()


def panorama():
    """One continuous quiet learning trail; the original mascot remains the focal point."""
    scene = Image.new('RGBA', (1500, 500))
    draw = ImageDraw.Draw(scene)
    purple = (137, 95, 174, 110)
    path = [(x, int(395 + 28*sin(x*pi/340))) for x in range(20, 1481, 3)]
    draw.line(path, fill=purple, width=5)
    # Restrained surrounding motifs keep all five panorama slices connected.
    draw.line([(105,265),(105,175),(165,190),(165,280),(105,265)], fill=purple, width=5)
    draw.line([(165,190),(225,175),(225,265),(165,280)], fill=purple, width=5)
    draw.line([(120,200),(149,207)], fill=purple, width=3)
    draw.line([(180,208),(210,201)], fill=purple, width=3)
    draw.ellipse((350,180,415,245), outline=purple, width=5)
    draw.line((405,236,438,270), fill=purple, width=6)
    draw.line([(1150,280),(1150,215)], fill=purple, width=5)
    draw.arc((1095,180,1155,230), 0, 180, fill=purple, width=5)
    draw.arc((1145,165,1205,215), 0, 180, fill=purple, width=5)
    draw.arc((1095,180,1155,230), 180, 360, fill=purple, width=5)
    draw.arc((1145,165,1205,215), 180, 360, fill=purple, width=5)
    draw.line([(1115,285),(1185,285),(1172,320),(1128,320),(1115,285)], fill=purple, width=5)
    draw.line([(1340,205),(1355,175),(1370,205),(1400,210),(1378,230),
               (1383,260),(1355,245),(1327,260),(1332,230),(1310,210),(1340,205)],
              fill=purple, width=4)
    mascot = Image.open(OUTPUT / 'wave.png')
    height = 440
    mascot = mascot.resize((round(mascot.width*height/mascot.height), height), Image.Resampling.LANCZOS)
    scene.alpha_composite(mascot, ((scene.width-mascot.width)//2, 24))
    scene.save(OUTPUT / 'activity-panorama.png')


if __name__ == '__main__':
    main()
