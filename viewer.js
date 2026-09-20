/**
 * The gallery.
 *
 * Each card compiles its shader into its own WebGL context and runs it only
 * while it is on screen — a page of simultaneous full-rate fragment shaders
 * will heat a laptop and stop a phone.
 *
 * Reduced motion is taken seriously here rather than nodded at: these are
 * optical illusions built to make your eyes misfire, which is close to the
 * top of the list of things that setting exists to prevent. Those visitors
 * get the first frame, still, and a button if they want it moving.
 */
const VERTEX = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const stillness = matchMedia('(prefers-reduced-motion: reduce)');

const shaders = await fetch('shaders.json').then(r => r.json());
const grid = document.getElementById('grid');

for (const meta of shaders) {
  grid.appendChild(await card(meta));
}

async function card(meta) {
  const el = document.createElement('article');
  el.className = 'card';

  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.dataset.live = 'false';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);

  /* These are made to be thrown at a wall, and a card is 330px wide. The
     canvas resizes itself every frame from clientWidth, so going fullscreen
     needs nothing beyond the request. */
  if (document.fullscreenEnabled) {
    const expand = document.createElement('button');
    expand.className = 'expand';
    expand.type = 'button';
    expand.textContent = 'Full screen';
    expand.setAttribute('aria-label', `Show ${meta.name} full screen`);
    expand.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === stage) await document.exitFullscreen();
        else await stage.requestFullscreen();
      } catch { /* refused, e.g. not from a real gesture. Leave the card be. */ }
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === stage;
      expand.textContent = on ? 'Close' : 'Full screen';
    });
    stage.appendChild(expand);
  }

  const tags = [
    ...(meta.usesMouse ? ['<span class="tag live">follows the pointer</span>'] : []),
    ...meta.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`),
  ].join('');

  const body = document.createElement('div');
  body.className = 'body';
  body.innerHTML = `
    <h2 class="name">${meta.name}</h2>
    <p class="desc">${meta.description || ''}</p>
    <p class="tags">${tags}</p>
    <div class="gets">
      <a class="get" href="build/touchdesigner/${meta.slug}.frag" download>TouchDesigner</a>
      <a class="get" href="build/isf/${meta.slug}.fs" download>ISF</a>
      <a class="get" href="build/webgl/${meta.slug}.frag" download>WebGL</a>
      ${/* Not every shader is on Shadertoy. An empty id would otherwise
            render a link to the Shadertoy 404 page. */
        meta.shadertoy
          ? `<a class="get" href="https://www.shadertoy.com/view/${meta.shadertoy}" target="_blank" rel="noopener">Shadertoy &#8599;</a>`
          : ''}
    </div>`;

  el.append(stage, body);
  run(canvas, stage, meta);
  return el;
}

async function run(canvas, stage, meta) {
  const source = await fetch(`build/webgl/${meta.slug}.frag`).then(r => r.text());
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false });
  if (!gl) return fail(stage, 'This browser will not give the page WebGL.');

  const program = build(gl, source);
  if (typeof program === 'string') return fail(stage, program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);

  const u = n => gl.getUniformLocation(program, n);
  const uRes = u('iResolution'), uTime = u('iTime'), uMouse = u('iMouse'), uFrame = u('iFrame');

  const mouse = { x: 0.5, y: 0.5, down: 0 };
  if (meta.usesMouse) {
    const at = e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
    };
    stage.addEventListener('pointermove', at);
    stage.addEventListener('pointerdown', e => { mouse.down = 1; at(e); });
    stage.addEventListener('pointerup', () => { mouse.down = 0; });
    stage.style.touchAction = 'none';
  }

  let frame = 0, raf = 0, running = false, start = performance.now();

  function size() {
    /* Capped: a retina canvas at full rate for four shaders at once is more
       pixels than any of this is worth. */
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function draw(now) {
    size();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uRes) gl.uniform3f(uRes, canvas.width, canvas.height, 1);
    if (uTime) gl.uniform1f(uTime, (now - start) / 1000);
    if (uMouse) gl.uniform4f(uMouse, mouse.x * canvas.width, mouse.y * canvas.height, mouse.down, 0);
    if (uFrame) gl.uniform1i(uFrame, frame++);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const loop = now => { draw(now); raf = requestAnimationFrame(loop); };
  const play = () => {
    if (running) return;
    running = true; stage.dataset.live = 'true';
    start = performance.now() - frame * 16.7;
    raf = requestAnimationFrame(loop);
  };
  const pause = () => { running = false; stage.dataset.live = 'false'; cancelAnimationFrame(raf); };

  /* One still frame either way, so a card is never an empty black box. */
  requestAnimationFrame(now => draw(now));

  if (stillness.matches) {
    const go = document.createElement('button');
    go.className = 'get';
    go.style.cssText = 'position:absolute;inset:auto 10px 10px auto;background:#090909cc';
    go.textContent = 'Play';
    go.addEventListener('click', () => { running ? pause() : play(); go.textContent = running ? 'Pause' : 'Play'; });
    stage.appendChild(go);
    return;
  }

  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0.15 })
    .observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : null));
}

function build(gl, fragment) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s) || 'unknown';
      gl.deleteShader(s);
      return log;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  if (typeof vs === 'string') return `Vertex shader: ${vs}`;
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  /* Say which shader and why, rather than leaving a black rectangle. */
  if (typeof fs === 'string') return `Would not compile — ${fs.split('\n')[0]}`;

  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return gl.getProgramInfoLog(program) || 'link failed';
  return program;
}

function fail(stage, message) {
  const p = document.createElement('p');
  p.className = 'fail';
  p.textContent = message;
  stage.appendChild(p);
  stage.dataset.live = 'false';
}
