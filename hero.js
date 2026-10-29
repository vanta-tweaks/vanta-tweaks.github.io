// The home page's mark: the Vanta Λ and its red dot, built from about 18,000 points and drawn with WebGL. On load the
// points fly in from a scattered cloud and assemble into the logo, left to right, the dot last. Then it breathes, turns
// to follow the cursor. Reduced motion gets the finished
// mark, still; nothing is drawn while it's off screen. No library: one small shader pair.
(() => {
  const canvas = document.querySelector('[data-mark]'), spot = document.querySelector('[data-mark-spot]');
  const gl = canvas && canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
  if (!gl || getComputedStyle(canvas).display === 'none') return;   // phones don't show the mark (styles.css)   // shortcut: without WebGL (very rare) the hero just has no mark; the page works the same
  const calm = false;   // always animate: tweaked gaming PCs often have Windows animations off, which would hide this gentle motion

  // the Λ and the dot in the icon's own drawing units (design/logos/vanta-icon-square.svg), centred on the whole mark
  const POLY = [[96, 0], [160, 0], [256, 240], [196, 240], [128, 72], [60, 240], [0, 240]];
  const DOT = { x: 312, y: 212, r: 28 };
  const inside = (x, y) => {
    let hit = false;
    for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
      const [xi, yi] = POLY[i], [xj, yj] = POLY[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const data = [];   // per point: home x y z, start x y z, delay, red
  const add = (x, y, z, red) => {
    const a = rand() * Math.PI * 2, b = Math.acos(2 * rand() - 1), r = 160 + rand() * 240;   // somewhere in a wide cloud
    const delay = Math.min(1, Math.max(0, (x + 10) / 360)) * 0.75 + rand() * 0.25;          // left to right, a little loose
    data.push(x - 170 + (rand() - 0.5) * 1.6, y - 120 + (rand() - 0.5) * 1.6, z + (rand() - 0.5) * 2,
              Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r * 0.7, Math.sin(b) * Math.sin(a) * r, red ? 0.85 + rand() * 0.15 : delay, red);
  };
  for (let y = 1.7; y < 240; y += 3.4)
    for (let x = 1.7; x < 256; x += 3.4)
      if (inside(x, y)) for (let z = -36; z <= 36; z += 12) add(x, y, z, 0);
  for (let x = -DOT.r; x <= DOT.r; x += 3.4) for (let y = -DOT.r; y <= DOT.r; y += 3.4) for (let z = -DOT.r; z <= DOT.r; z += 3.4)
    if (x * x + y * y + z * z <= DOT.r * DOT.r) add(DOT.x + x, DOT.y + y, z, 1);
  const COUNT = data.length / 8;

  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, `
    attribute vec3 home, start; attribute float delay, red;
    uniform float t, form, scale, dpr, scan, still;
    uniform vec2 size, turn, pointer, center;
    varying float vAlpha, vRed;
    void main() {
      float d = clamp((form - delay) / 0.55, 0.0, 1.0);
      d = d * d * (3.0 - 2.0 * d);
      vec3 p = mix(start, home, d);
      p += still * d * 1.1 * vec3(sin(t * 0.9 + delay * 40.0), cos(t * 0.7 + home.y * 0.05), sin(t * 0.8 + home.x * 0.05));
      float cy = cos(turn.x), sy = sin(turn.x), cx = cos(turn.y), sx = sin(turn.y);
      vec3 q = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
      q = vec3(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx);
      float k = 760.0 / (760.0 + q.z);
      vec2 s = q.xy * k * scale + center;   // the canvas covers the hero; center puts the mark on its spot
      gl_Position = vec4(s.x / (size.x * 0.5), -s.y / (size.y * 0.5), 0.0, 1.0);
      gl_PointSize = dpr * k * (red > 0.5 ? 2.4 : 2.0);
      float near = clamp((70.0 - q.z) / 140.0, 0.0, 1.0);
      float glint = max(0.0, 1.0 - abs(home.x - scan) / 10.0) * 0.55 * d;
      float depth = red > 0.5 ? 0.75 + 0.25 * near : 0.22 + 0.78 * near;   // the dot stays bright even when it turns away
      vAlpha = min(1.0, depth * mix(0.3, 1.0, d) + glint);
      vRed = red;
    }`));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying float vAlpha, vRed;
    void main() {
      float r = length(gl_PointCoord - 0.5);
      gl_FragColor = vec4(mix(vec3(0.949), vec3(1.0, 0.302, 0.18), vRed), smoothstep(0.5, 0.42, r) * vAlpha);   // a crisp edge: sharp, not soft
    }`));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  [['home', 3, 0], ['start', 3, 3], ['delay', 1, 6], ['red', 1, 7]].forEach(([name, n, at]) => {
    const loc = gl.getAttribLocation(prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 32, at * 4);
  });
  const u = {};
  ['t', 'form', 'scale', 'dpr', 'scan', 'still', 'size', 'turn', 'pointer', 'center'].forEach(n => u[n] = gl.getUniformLocation(prog, n));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  let W = 1, H = 1, dpr = 1, start = 0, running = false, yaw = -0.35, pitch = 0.2;
  let mx = 0, my = 0, px = 1e4, py = 1e4, tx = 1e4, ty = 1e4, lastInput = -1e9;
  function draw(t) {
    const form = calm ? 2 : t / 2.4 * 1.6;                       // all points home after about 2.4 s
    if (!calm) {
      // follows the cursor; with no movement for 3 s it turns slowly on its own
      const idle = performance.now() - lastInput > 3000;
      const fx = idle ? Math.sin(t * 0.35) * 0.35 : mx, fy = idle ? Math.sin(t * 0.27) * 0.12 : my;
      yaw += (-0.1 - fx * 0.9 - yaw) * 0.06;
      pitch += (0.12 + fy * 0.5 - pitch) * 0.06;
      px += (tx - px) * 0.12; py += (ty - py) * 0.12;
    }
    const cycle = (t - 3) % 6.5;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.t, t); gl.uniform1f(u.form, form); gl.uniform1f(u.dpr, dpr);
    const sp = spot.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    gl.uniform1f(u.scale, Math.min(sp.width / 400, sp.height / 330));
    gl.uniform2f(u.center, sp.left + sp.width / 2 - cr.left - cr.width / 2, sp.top + sp.height / 2 - cr.top - cr.height / 2);
    gl.uniform1f(u.scan, !calm && t > 3 && cycle < 2.2 ? cycle / 2.2 * 420 - 220 : -1e4);
    gl.uniform1f(u.still, calm ? 0 : 1);
    gl.uniform2f(u.size, W, H); gl.uniform2f(u.turn, yaw, pitch); gl.uniform2f(u.pointer, px, py);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }
  function loop(now) {
    if (!running) return;
    if (!start) start = now;
    draw((now - start) / 1000);
    requestAnimationFrame(loop);
  }
  const play = on => {
    if (calm) return draw(0);
    if (on && !running) { running = true; requestAnimationFrame(loop); }
    if (!on) running = false;
  };
  new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (calm) draw(0);
  }).observe(canvas);
  new IntersectionObserver(([e]) => play(e.isIntersecting && !document.hidden)).observe(canvas);
  document.addEventListener('visibilitychange', () => play(!document.hidden));
  const aim = (x, y) => { mx = x / innerWidth - 0.5; my = y / innerHeight - 0.5; lastInput = performance.now(); };
  addEventListener('pointermove', e => aim(e.clientX, e.clientY), { passive: true });
})();
