// Compile/render the generated shaders in Chrome and check archive/site parity.
// TD and ISF use small host-uniform shims here, not their native applications.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = p => readFileSync(path.join(root, p), 'utf8');
const meta = JSON.parse(read('shaders.json'));
const baselineRef = process.argv.find(a => a.startsWith('--baseline='))?.slice(11) ?? 'HEAD';
for (const slug of ['hero-grid', 'wave-lines']) {
  assert.deepEqual(meta.find(m => m.slug === slug).mouseDefault, [0, 0],
    `${slug}: automatic motion must be the ISF default`);
}
assert.deepEqual(meta.find(m => m.slug === 'data-rain-interactive').mouseDefault, [0.5, 0.5]);
const cases = [];
for (const target of ['webgl', 'touchdesigner', 'isf']) {
  const ext = target === 'isf' ? '.fs' : '.frag';
  assert.deepEqual(readdirSync(path.join(root, 'build', target)).sort(),
    meta.map(m => m.slug + ext).sort(), `${target}: unexpected or missing files`);
  for (const m of meta) {
    const source = read(`build/${target}/${m.slug}${ext}`);
    assert.ok(source.includes(read(`src/${m.slug}.frag`).trim()), 'stale source');
    if (target === 'isf') {
      const header = JSON.parse(source.match(/^\/\*([\s\S]*?)\*\//)[1]);
      assert.equal(header.ISFVSN, '2.0');
      assert.equal(header.INPUTS.length, m.usesMouse ? 1 : 0);
      if (m.usesMouse) {
        assert.deepEqual(header.INPUTS[0], {NAME:'mouse', TYPE:'point2D',
          DEFAULT:m.mouseDefault, MIN:[0,0], MAX:[1,1]});
      }
    }
    const baseline = execFileSync('git', ['show', `${baselineRef}:build/webgl/${m.slug}.frag`],
      {cwd:root, encoding:'utf8'});
    cases.push({target, slug:m.slug, source, baseline, usesMouse:m.usesMouse,
      mouseDefault:m.mouseDefault ?? [0,0]});
  }
}

function runBrowser(cases) {
  const results = [], errors = [];
  const canvases = [document.createElement('canvas'), document.createElement('canvas')];
  const contexts = [canvases[0].getContext('webgl'), canvases[1].getContext('webgl2')];
  function compile(gl, source, es3) {
    if (!gl) throw new Error('WebGL context unavailable');
    const shader = (type, code) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, code); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const v = shader(gl.VERTEX_SHADER, (es3 ? '#version 300 es\nin' : 'attribute') +
      ' vec2 p; void main(){gl_Position=vec4(p,0.,1.);}');
    const f = shader(gl.FRAGMENT_SHADER, source);
    const p = gl.createProgram(); gl.attachShader(p,v); gl.attachShader(p,f); gl.linkProgram(p);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function render(gl,p,w,h,t,mouse) {
    gl.canvas.width=w; gl.canvas.height=h; gl.viewport(0,0,w,h); gl.useProgram(p);
    const u = name => gl.getUniformLocation(p,name);
    gl.uniform3f(u('iResolution'),w,h,1); gl.uniform1f(u('iTime'),t);
    gl.uniform4f(u('iMouse'),mouse[0]*w,mouse[1]*h,0,0);
    gl.uniform1i(u('iFrame'),Math.floor(t*60));
    gl.uniform1f(u('TIME'),t); gl.uniform2f(u('RENDERSIZE'),w,h);
    gl.uniform2fv(u('mouse'),mouse);
    gl.uniform1f(u('uTime'),t); gl.uniform4f(u('uMouse'),...mouse,0,0);
    gl.uniform4f(u('uTDOutputInfo.res'),1/w,1/h,w,h);
    const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(p,'p'); gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0); gl.drawArrays(gl.TRIANGLES,0,3);
    const pixels=new Uint8Array(w*h*4); gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    gl.deleteBuffer(b);
    if(gl.getError()!==gl.NO_ERROR) throw new Error('GL render error');
    let min=255,max=0;
    for(let i=0;i<pixels.length;i+=4) {
      min=Math.min(min,pixels[i]); max=Math.max(max,pixels[i]);
      if(pixels[i]!==pixels[i+1] || pixels[i]!==pixels[i+2] || pixels[i+3]!==255)
        throw new Error('non-grayscale or non-opaque output');
    }
    if(min===max) throw new Error('blank/flat frame');
    return pixels;
  }
  function difference(a,b) {
    let max=0;
    for(let i=0;i<a.length;i++) max=Math.max(max,Math.abs(a[i]-b[i]));
    return max;
  }
  for (const c of cases) {
    try {
      const es3=c.target==='touchdesigner', gl=contexts[es3?1:0];
      let source=c.source;
      if(es3) source='#version 300 es\nprecision highp float;\n'+
        'struct TDInfo {vec4 res;}; uniform TDInfo uTDOutputInfo;\n'+
        'vec4 TDOutputSwizzle(vec4 c){return c;}\n'+source;
      if(c.target==='isf') source='precision highp float;\nuniform float TIME;\n'+
        'uniform vec2 RENDERSIZE;\n'+(c.usesMouse?'uniform vec2 mouse;\n':'')+source;
      const p=compile(gl,source,es3);
      let baseline=c.baseline;
      if(es3) baseline='#version 300 es\n'+baseline.replace('precision highp float;',
        'precision highp float;\nlayout(location=0) out vec4 qaColor;').replaceAll('gl_FragColor','qaColor');
      const old=compile(gl,baseline,es3);
      let samples=0, maxDelta=0;
      for(const [w,h] of [[320,180],[180,320],[512,512]]) {
        for(const t of [0,1.25,37]) {
          for(const mouse of [[0,0],[0.5,0.5],[1,1]]) {
            const pixels=render(gl,p,w,h,t,mouse);
            maxDelta=Math.max(maxDelta,difference(pixels,render(gl,old,w,h,t,mouse)));
            samples++;
          }
        }
      }
      if(maxDelta>1) throw new Error(`visual regression: max byte delta ${maxDelta}`);
      const a=render(gl,p,320,180,0,c.mouseDefault);
      const b=render(gl,p,320,180,3,c.mouseDefault);
      if(!difference(a,b)) throw new Error('animation is static');
      if(c.usesMouse && !difference(b,render(gl,p,320,180,3,[0.9,0.9])))
        throw new Error('mouse input has no effect');
      results.push({target:c.target,slug:c.slug,samples,maxDelta,status:'PASS'});
      gl.deleteProgram(p); gl.deleteProgram(old);
    } catch(e) { errors.push(`${c.target}/${c.slug}: ${e.message}`); }
  }
  document.body.textContent=JSON.stringify({results,errors});
}

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
assert.ok(existsSync(chrome), 'Set CHROME_PATH to a Chromium executable');
const temp = mkdtempSync(path.join(tmpdir(), 'shader-qa-'));
const page=path.join(temp,'verify.html');
writeFileSync(page, '<!doctype html><body><script>('+runBrowser.toString()+')('+
  JSON.stringify(cases).replaceAll('<','\\u003c')+');</script></body>');
const html=execFileSync(chrome,['--headless','--no-first-run','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',`--user-data-dir=${path.join(temp,'profile')}`,
  '--dump-dom',pathToFileURL(page).href],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024,
  stdio:['ignore','pipe','pipe']});
const report=JSON.parse(html.match(/<body>([\s\S]*?)<\/body>/)[1]
  .replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&'));
for(const r of report.results) console.log(`${r.status} ${r.target}/${r.slug}: ${r.samples} frames, baseline delta ${r.maxDelta}`);
assert.deepEqual(report.errors, [], 'shader compilation/rendering failures');

if(process.argv.includes('--published')) {
  const zip=readFileSync(path.join(root,'downloads/unapaulogetic-shaders.zip'));
  let offset=0,count=0;
  while(zip.readUInt32LE(offset)===0x04034b50) {
    const method=zip.readUInt16LE(offset+8),size=zip.readUInt32LE(offset+18);
    const n=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28);
    const name=zip.subarray(offset+30,offset+30+n).toString();
    const start=offset+30+n+extra, compressed=zip.subarray(start,start+size);
    const data=method===8?inflateRawSync(compressed):compressed;
    assert.equal(data.length,zip.readUInt32LE(offset+22));
    if(name!=='README.txt') assert.deepEqual(data,readFileSync(path.join(root,'build',name)),name);
    else {
      assert.ok(data.toString().includes('ISF-source'));
      assert.ok(data.toString().includes('RESOLUME WIRE'));
    }
    count++; offset=start+size;
  }
  assert.equal(count,19);
  const site=path.resolve(root,'../../HOME PAGE/dist/lab/shaders');
  const compare=rel=>{
    for(const f of readdirSync(path.join(root,rel),{withFileTypes:true})) {
      const p=path.join(rel,f.name);
      if(f.isDirectory()) compare(p);
      else assert.deepEqual(readFileSync(path.join(root,p)),readFileSync(path.join(site,p)),p);
    }
  };
  for(const dir of ['build','downloads','src']) compare(dir);
  assert.equal(readFileSync(path.join(site,'shaders.json'),'utf8'),read('shaders.json'));
  console.log('PASS 19 ZIP entries and all published assets match the repository.');
}
console.log('Native TouchDesigner/ISF applications still require in-host testing.');
