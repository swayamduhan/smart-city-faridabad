// The transition is modelled on Surajkund itself: a semicircular stepped tank.
// Each new photo rises through concentric stone terraces that open from below the frame,
// with a band of water refraction and sun-glint along the moving edge.

export const VERT = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform vec2 uSizeA, uSizeB, uFocusA, uFocusB, uRes, uMouse;
uniform float uP, uTime, uZoomA, uZoomB, uMouseV;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// object-fit: cover, with a focal point and zoom
vec2 cover(vec2 uv, vec2 size, vec2 focus, float zoom) {
  float rs = uRes.x / uRes.y, ri = size.x / size.y;
  vec2 scale = rs < ri ? vec2(ri / rs, 1.0) : vec2(1.0, rs / ri);
  scale *= zoom;
  vec2 slack = 0.5 - 0.5 / scale;
  vec2 offset = (focus - 0.5) * 2.0 * slack;
  return (uv - 0.5) / scale + 0.5 + offset;
}

void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = (vUv - vec2(0.5, -0.14)) * asp;
  float d = length(p);
  float reach = length(vec2(0.5, 1.14) * asp) + 0.3;

  float wobble = (fbm(vUv * asp * 3.2 + uTime * 0.03) - 0.5) * 0.16;
  float dn = d + wobble;

  // Terraces: the reveal advances in steps rather than a smooth circle.
  float steps = 9.0;
  float terrace = floor(dn * steps) / steps;
  float wave = uP * reach - 0.1;
  float reveal = 1.0 - smoothstep(wave - 0.008, wave + 0.008, terrace);

  float band = exp(-pow((dn - wave) * 5.0, 2.0)) * sin(3.14159 * clamp(uP, 0.0, 1.0));

  vec2 dir = d > 0.001 ? (p / d) / asp : vec2(0.0);
  float ripple = 0.65 + 0.35 * sin(dn * 26.0 - uTime * 3.0);
  vec2 disp = dir * band * 0.05 * ripple;

  // Quiet ripple following the pointer.
  vec2 toMouse = vUv - uMouse;
  float md = length(toMouse * asp);
  disp += toMouse * exp(-md * 8.0) * sin(md * 42.0 - uTime * 5.0) * 0.05 * uMouseV;

  vec2 ca = dir * band * 0.0028;
  vec2 uvA = vUv + disp;
  vec2 uvB = vUv - disp * 0.65;

  vec3 a = vec3(
    texture2D(uA, cover(uvA + ca, uSizeA, uFocusA, uZoomA)).r,
    texture2D(uA, cover(uvA, uSizeA, uFocusA, uZoomA)).g,
    texture2D(uA, cover(uvA - ca, uSizeA, uFocusA, uZoomA)).b);
  vec3 b = vec3(
    texture2D(uB, cover(uvB + ca, uSizeB, uFocusB, uZoomB)).r,
    texture2D(uB, cover(uvB, uSizeB, uFocusB, uZoomB)).g,
    texture2D(uB, cover(uvB - ca, uSizeB, uFocusB, uZoomB)).b);

  vec3 col = mix(a, b, reveal);

  // Each step throws a shadow at its riser, but only near the moving edge.
  float riser = smoothstep(0.0, 0.2, fract(dn * steps));
  float lip = smoothstep(0.86, 1.0, fract(dn * steps));
  col *= mix(1.0, 0.5 + 0.5 * riser + 0.16 * lip, band);

  // Sun glint on the water line.
  col += vec3(1.0, 0.78, 0.17) * pow(band, 9.0) * 0.2;

  gl_FragColor = vec4(col, 1.0);
}`;

export interface KundRenderer {
  draw: (u: { a: number; b: number; p: number; time: number; zoomA: number; zoomB: number; mouse: [number, number]; mouseV: number }) => void;
  resize: () => void;
  destroy: () => void;
}

export function createKundRenderer(canvas: HTMLCanvasElement, images: { src: string; size: [number, number]; focus: [number, number] }[], onReady: () => void): KundRenderer | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uni = { A: U("uA"), B: U("uB"), sizeA: U("uSizeA"), sizeB: U("uSizeB"), focusA: U("uFocusA"), focusB: U("uFocusB"), res: U("uRes"), mouse: U("uMouse"), p: U("uP"), time: U("uTime"), zoomA: U("uZoomA"), zoomB: U("uZoomB"), mouseV: U("uMouseV") };
  gl.uniform1i(uni.A, 0);
  gl.uniform1i(uni.B, 1);

  // Photos stream in; until one has loaded, a neighbour stands in for it.
  const textures: (WebGLTexture | null)[] = images.map(() => null);
  let destroyed = false;
  let notified = false;
  images.forEach((img, i) => {
    const el = new Image();
    el.onload = () => {
      if (destroyed) return;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, el);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      textures[i] = t;
      if (i === 0 && !notified) {
        notified = true;
        onReady();
      }
    };
    el.src = img.src;
  });

  const nearestLoaded = (i: number) => {
    for (let k = 0; k < images.length; k++) {
      if (textures[i - k]) return i - k;
      if (textures[i + k]) return i + k;
    }
    return -1;
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 800 ? 1.25 : 1.5);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uni.res, w, h);
  };
  resize();

  return {
    resize,
    draw({ a, b, p, time, zoomA, zoomB, mouse, mouseV }) {
      const ia = nearestLoaded(a);
      const ib = nearestLoaded(b);
      if (ia < 0 || ib < 0) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[ia]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures[ib]);
      const A = images[ia];
      const B = images[ib];
      gl.uniform2f(uni.sizeA, A.size[0], A.size[1]);
      gl.uniform2f(uni.sizeB, B.size[0], B.size[1]);
      gl.uniform2f(uni.focusA, A.focus[0], 1 - A.focus[1]);
      gl.uniform2f(uni.focusB, B.focus[0], 1 - B.focus[1]);
      gl.uniform1f(uni.p, p);
      gl.uniform1f(uni.time, time);
      gl.uniform1f(uni.zoomA, zoomA);
      gl.uniform1f(uni.zoomB, zoomB);
      gl.uniform2f(uni.mouse, mouse[0], mouse[1]);
      gl.uniform1f(uni.mouseV, mouseV);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      destroyed = true;
      textures.forEach((t) => t && gl.deleteTexture(t));
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    },
  };
}
