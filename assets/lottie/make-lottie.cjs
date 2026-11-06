// Generates Tutoki's small Lottie animations. Run: node assets/lottie/make-lottie.cjs
const fs = require('fs');
const path = require('path');

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
const still = k => ({ a: 0, k });
const ease = { i: { x: [0.25], y: [1] }, o: { x: [0.5], y: [0] } };
const pop = { i: { x: [0.3], y: [1.5] }, o: { x: [0.4], y: [0] } };
// keys: [[frame, value, curve?], ...]; values are wrapped as arrays as Lottie expects.
const anim = (keys, curve = ease) => ({ a: 1, k: keys.map(([t, v, c], i) => i === keys.length - 1 ? { t, s: [].concat(v) } : { t, s: [].concat(v), ...(c || curve) }) });
const transform = (o = {}) => ({ ty: 'tr', p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100), ...o });
const ellipse = size => ({ ty: 'el', p: still([0, 0]), s: still([size, size]), d: 1 });
const fill = hex => ({ ty: 'fl', c: still(rgb(hex)), o: still(100), r: 1 });
const stroke = (hex, w) => ({ ty: 'st', c: still(rgb(hex)), o: still(100), w: still(w), lc: 2, lj: 2 });
const pathShape = (v, closed = false) => ({ ty: 'sh', ks: still({ i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c: closed }) });
const group = (...it) => ({ ty: 'gr', it });
const layer = (ind, nm, ks, shapes, op) => ({
  ddd: 0, ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op, st: 0, bm: 0, shapes,
  ks: { o: still(100), r: still(0), p: still([100, 100, 0]), a: still([0, 0, 0]), s: still([100, 100, 100]), ...ks },
});
const file = (nm, op, layers) => ({ v: '5.7.4', fr: 60, ip: 0, op, w: 200, h: 200, nm, ddd: 0, assets: [], layers });

const PURPLE = '#8125b5', ORANGE = '#ffb34f', LILAC = '#d9a8f5', WHITE = '#ffffff';

function success() {
  const op = 70;
  const burst = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2, far = 88;
    return layer(10 + i, `dot${i}`, {
      p: anim([[6, [100, 100, 0]], [34, [100 + Math.cos(angle) * far, 100 + Math.sin(angle) * far, 0]]]),
      o: anim([[20, 100], [40, 0]]),
      s: anim([[6, [40, 40, 100]], [20, [120, 120, 100]], [40, [60, 60, 100]]]),
    }, [group(ellipse(14), fill(i % 2 ? ORANGE : LILAC), transform())], op);
  });
  const circle = layer(2, 'circle', { s: anim([[0, [0, 0, 100], pop], [22, [100, 100, 100]]]) },
    [group(ellipse(124), fill(PURPLE), transform())], op);
  const check = layer(1, 'check', {}, [group(
    pathShape([[-30, 2], [-9, 23], [32, -20]]),
    { ty: 'tm', s: still(0), e: anim([[16, 0], [40, 100]]), o: still(0), m: 1 },
    stroke(WHITE, 14), transform())], op);
  return file('success', op, [check, circle, ...burst]);
}

function thinking() {
  const op = 72;
  const dots = [0, 1, 2].map(i => layer(i + 1, `dot${i}`, {
    p: anim([[i * 8, [60 + i * 40, 110, 0]], [i * 8 + 16, [60 + i * 40, 82, 0]], [i * 8 + 32, [60 + i * 40, 110, 0]], [op, [60 + i * 40, 110, 0]]]),
    o: anim([[i * 8, 45], [i * 8 + 16, 100], [i * 8 + 32, 45]]),
  }, [group(ellipse(26), fill(i === 1 ? ORANGE : PURPLE), transform())], op));
  return file('thinking', op, dots);
}

function spark() {
  const op = 120;
  const star = (size, hex) => group(pathShape([[0, -size], [size * 0.22, -size * 0.22], [size, 0], [size * 0.22, size * 0.22], [0, size], [-size * 0.22, size * 0.22], [-size, 0], [-size * 0.22, -size * 0.22]], true), fill(hex), transform());
  const main = layer(1, 'star', {
    r: anim([[0, 0], [op, 90]]),
    s: anim([[0, [90, 90, 100]], [60, [110, 110, 100]], [op, [90, 90, 100]]]),
  }, [star(62, PURPLE)], op);
  const small = layer(2, 'mini', {
    p: still([150, 52, 0]),
    s: anim([[0, [0, 0, 100]], [30, [100, 100, 100]], [60, [0, 0, 100]], [op, [0, 0, 100]]]),
  }, [star(20, ORANGE)], op);
  return file('spark', op, [main, small]);
}

for (const [name, data] of Object.entries({ success: success(), thinking: thinking(), spark: spark() })) {
  fs.writeFileSync(path.join(__dirname, `${name}.json`), JSON.stringify(data));
  console.log(`assets/lottie/${name}.json`);
}
