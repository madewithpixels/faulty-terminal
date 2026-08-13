import { Renderer, Program, Mesh, Color, Triangle, RenderTarget } from 'ogl';
import css from './faulty-terminal.css';

// ---------------------------------------------------------------------------
// TUNING — baked-in art direction. Paste the debug panel's copy-values output
// here, then rebuild + retag to ship new defaults to every site at once.
// Sites can override any of these at runtime without a rebuild via
// window.FaultyTerminalConfig or a per-element data-ft-opts attribute.
// ---------------------------------------------------------------------------
const TUNING = {
  // ripple
  rippleDuration: 1150,
  rippleColorFalloff: 4.30,
  rippleColorAmbient: 0.34,
  rippleColorStrength: 1.80,
  blendMode: 0, // 0 screen · 1 add · 2 overlay · 3 soft
  rippleBrightness: 0.10,
  rippleBrightnessFalloff: 0.14,
  rippleFadeOut: 375,
  // aftershock
  aftershock: true,
  aftershockTriggerAt: 0.05,
  aftershockDelay: 0,
  aftershockDuration: 1350,
  aftershockStrength: 0.30,
  // ripple fx
  rippleWobble: 1.00,
  rippleWarp: 1.00,
  impactBurst: 2.00,
  // mwp
  mwpColorStrength: 0.47,
  mwpDensity: 0.27,
  mwpFlickerSpeed: 0.10,
  mwpWaveDuration: 1050,
  mwpWaveAt: 0.05,
  heartStrength: 2.00,
  heartScale: 1.00,
  heartFalloff: 1.50,
  mwpLegible: 0.89,
  mwpGlitch: 0.85,
  // field
  brightness: 0.50,
  glyphGamma: 1.80,
  scanlineIntensity: 1.00,
  glitchAmount: 1.90,
  flickerAmount: 1.10,
  noiseAmp: 1.00,
  curvature: 0.30,
  mouseStrength: 0.60,
  timeScale: 0.45,
  digitSize: 1.25,
  tiltStrength: 0.40,
  // field fx
  vignette: 0.30,
  retraceSweep: 1.00,
  noiseDetail: 0.35,
  phosphorOn: true,
  phosphor: 250,
};
// structural params (don't touch unless you know what you're doing)
const DEFAULTS = {
  ...TUNING,
  scale: 2,
  gridMul: [2, 1],
  pause: false,
  chromaticAberration: 0,
  dither: 0,
  tint: '#366777',
  bgColor: '#2b464e',
  mouseReact: true,
  pageLoadAnimation: true,
  pageLoadDelay: 1500,
  targetFPS: 60,
  ripple: true,
  rippleOriginSelector: null,
  rippleEase: true,
  debugPanel: true,
  tiltReact: true,
  dpr: 1,
  maxPixels: 1100000,
  renderScaleMax: 1,
  renderScaleMin: 0.28,
  autoTune: true,
  fpsLow: 24,
  fpsHigh: 30,
};
const SLIDERS = [
  ['rippleDuration', null, 'duration (ms)', 300, 5000, 50, 'RIPPLE'],
  ['rippleColorFalloff', 'uRippleColorFalloff', 'trail curve', 0.1, 6.0, 0.1, 'RIPPLE'],
  ['rippleColorAmbient', 'uRippleColorAmbient', 'trail strength', 0.0, 1.0, 0.01, 'RIPPLE'],
  ['rippleColorStrength', 'uRippleColorStrength', 'colour strength', 0.0, 2.0, 0.05, 'RIPPLE'],
  ['blendMode', 'uBlendMode', 'blend mode', 0, 3, 1, 'RIPPLE', 'select'],
  ['rippleBrightness', 'uRippleBrightness', 'glyph boost', 0.0, 4.0, 0.05, 'RIPPLE'],
  ['rippleBrightnessFalloff','uRippleBrightnessFalloff','glow width', 0.01, 1.5, 0.01, 'RIPPLE'],
  ['rippleFadeOut', null, 'trail fade (ms)', 0, 800, 25, 'RIPPLE'],
  ['aftershock', null, 'enabled', null, null, null, 'AFTERSHOCK', 'bool'],
  ['aftershockTriggerAt', null, 'trigger at', 0.0, 1.0, 0.05, 'AFTERSHOCK'],
  ['aftershockDelay', null, 'delay (ms)', 0, 2000, 25, 'AFTERSHOCK'],
  ['aftershockDuration', null, 'duration (ms)', 100, 3000, 50, 'AFTERSHOCK'],
  ['aftershockStrength', 'uAftershockStrength', 'strength', 0.0, 2.0, 0.05, 'AFTERSHOCK'],
  ['rippleWobble', 'uRippleWobble', 'wave wobble', 0.0, 1.0, 0.05, 'RIPPLE FX'],
  ['rippleWarp', 'uRippleWarp', 'shock warp', 0.0, 1.0, 0.05, 'RIPPLE FX'],
  ['impactBurst', 'uImpactBurst', 'impact burst', 0.0, 2.0, 0.05, 'RIPPLE FX'],
  ['mwpColorStrength', 'uMwpColorStrength', 'colour', 0.0, 1.0, 0.01, 'MWP'],
  ['mwpDensity', 'uMwpDensity', 'density', 0.0, 0.6, 0.01, 'MWP'],
  ['mwpFlickerSpeed', 'uMwpFlicker', 'timing', 0.0, 4.0, 0.05, 'MWP'],
  ['mwpWaveDuration', null, 'wave (ms)', 400, 4000, 50, 'MWP'],
  ['mwpWaveAt', null, 'wave at', 0.0, 1.0, 0.05, 'MWP'],
  ['heartStrength', 'uHeartStrength', 'heart glow', 0.0, 2.0, 0.05, 'MWP'],
  ['heartScale', 'uHeartScale', 'heart size', 0.5, 4.0, 0.25, 'MWP'],
  ['heartFalloff', 'uHeartFalloff', 'heart falloff', 0.0, 2.0, 0.05, 'MWP'],
  ['mwpLegible', 'uMwpLegible', 'legible time', 0.0, 1.0, 0.01, 'MWP'],
  ['mwpGlitch', 'uMwpGlitch', 'decode glitch', 0.0, 1.0, 0.05, 'MWP'],
  ['brightness', 'uBrightness', 'brightness', 0.1, 2.0, 0.05, 'FIELD'],
  ['glyphGamma', 'uGlyphGamma', 'glyph gamma', 0.5, 4.0, 0.1, 'FIELD'],
  ['scanlineIntensity', 'uScanlineIntensity', 'scanlines', 0.0, 2.0, 0.05, 'FIELD'],
  ['glitchAmount', 'uGlitchAmount', 'glitch', 0.0, 4.0, 0.1, 'FIELD'],
  ['flickerAmount', 'uFlickerAmount', 'flicker', 0.0, 2.0, 0.05, 'FIELD'],
  ['noiseAmp', 'uNoiseAmp', 'noise', 0.0, 3.0, 0.05, 'FIELD'],
  ['curvature', 'uCurvature', 'curvature', 0.0, 0.5, 0.01, 'FIELD'],
  ['mouseStrength', 'uMouseStrength', 'mouse', 0.0, 2.0, 0.05, 'FIELD'],
  ['timeScale', null, 'time scale', 0.0, 3.0, 0.05, 'FIELD'],
  ['digitSize', 'uDigitSize', 'digit size', 0.5, 2.5, 0.05, 'FIELD'],
  ['tiltStrength', null, 'tilt strength', 0.0, 1.5, 0.05, 'FIELD'],
  ['vignette', 'uVignette', 'vignette', 0.0, 1.0, 0.05, 'FIELD FX'],
  ['retraceSweep', 'uSweep', 'retrace sweep', 0.0, 1.0, 0.05, 'FIELD FX'],
  ['noiseDetail', 'uNoiseDetail', 'noise detail', 0.0, 1.0, 0.05, 'FIELD FX'],
  ['phosphorOn', null, 'phosphor', null, null, null, 'FIELD FX', 'bool'],
  ['phosphor', null, 'phosphor (ms)', 0, 600, 10, 'FIELD FX'],
];
const SELECT_OPTIONS = {
  blendMode: ['screen','add','overlay','soft'],
};
const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
const fragmentShader = `
precision mediump float;
varying vec2 vUv;
uniform float iTime;
uniform vec3 iResolution;
uniform float uScale;
uniform vec2 uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3 uTint;
uniform vec3 uBgColor;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
uniform float uGlyphGamma;
uniform float uMwpColorStrength;
uniform float uRippleActive;
uniform float uRippleProgress;
uniform vec2  uRippleOrigin;
uniform vec3  uRippleColor0;
uniform vec3  uRippleColor1;
uniform vec3  uRippleColor2;
uniform float uRippleColorFalloff;
uniform float uRippleColorAmbient;
uniform float uRippleColorStrength;
uniform float uRippleBrightness;
uniform float uRippleBrightnessFalloff;
uniform float uAftershockActive;
uniform float uAftershockProgress;
uniform float uAftershockStrength;
uniform float uRippleFade;
uniform float uRippleWobble;
uniform float uRippleWarp;
uniform float uImpactBurst;
uniform float uVignette;
uniform float uSweep;
uniform float uNoiseDetail;
uniform float uBlendMode;
uniform float uMwpDensity;
uniform float uMwpFlicker;
uniform float uMwpReveal;
uniform float uMwpWaveEnv;
uniform float uHeartStrength;
uniform float uHeartScale;
uniform float uHeartFalloff;
uniform float uMwpLegible;
uniform float uMwpGlitch;
float time;
float hash21(vec2 p){ p = fract(p * 234.56); p += dot(p, p + 34.56); return fract(p.x * p.y); }
float ringWobble(vec2 dh){
if(uRippleWobble < 0.001) return 1.0;
float ang = atan(dh.y, dh.x + 0.0001);
return 1.0 + (sin(ang * 5.0 + iTime * 1.7) * 0.6
+ sin(ang * 9.0 - iTime * 2.3) * 0.4) * uRippleWobble * 0.07;
}
vec3 blendGlow(vec3 base, vec3 glow){
if(uBlendMode < 0.5) return 1.0 - (1.0 - base) * (1.0 - glow);
if(uBlendMode < 1.5) return base + glow;
if(uBlendMode < 2.5) return mix(2.0*base*glow, 1.0-2.0*(1.0-base)*(1.0-glow), step(vec3(0.5), base));
return (1.0 - 2.0*glow) * base * base + 2.0 * glow * base;
}
float noise(vec2 p){ return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; }
mat2 rotate(float angle){ float c = cos(angle); float s = sin(angle); return mat2(c,-s,s,c); }
float getCharBit(float charIdx, float row, float col) {
float r0=step(abs(row),0.49),       r1=step(abs(row-1.0),0.49), r2=step(abs(row-2.0),0.49);
float r3=step(abs(row-3.0),0.49),   r4=step(abs(row-4.0),0.49);
float c0=step(abs(col),0.49),       c1=step(abs(col-1.0),0.49), c2=step(abs(col-2.0),0.49);
float c3=step(abs(col-3.0),0.49),   c4=step(abs(col-4.0),0.49);
float any_col = clamp(c0+c1+c2+c3+c4, 0.0, 1.0);
float outer   = clamp(c0+c4, 0.0, 1.0);
float inner   = clamp(c1+c3, 0.0, 1.0);
float mBit = clamp(outer + r1*inner + r2*c2, 0.0, 1.0);
float wBit = clamp((r0+r1+r2+r3)*outer + r2*c2 + (r3+r4)*inner, 0.0, 1.0);
float pBit = clamp((r0+r2)*any_col + r1*outer + (r3+r4)*c0, 0.0, 1.0);
float mSel = step(charIdx, 0.49);
float pSel = step(1.51, charIdx);
return mBit*mSel + wBit*(1.0-mSel-pSel) + pBit*pSel;
}
// second, more angular M/W/P set — row masks, col0 = leftmost = LSB, rows 0..4 top→bottom
float getCharBit2(float charIdx, float row, float col){
float r = row;
float mM = r<0.5?6.0 : r<1.5?15.0 : r<2.5?11.0 : r<3.5?11.0 : r<4.5?10.0 : 0.0;
float mW = r<0.5?20.0 : r<1.5?21.0 : r<2.5?21.0 : r<3.5?5.0  : r<4.5?6.0  : 0.0;
float mP = r<0.5?6.0 : r<1.5?13.0 : r<2.5?13.0 : r<3.5?13.0 : r<4.5?7.0  : 0.0;
float mSel = step(charIdx, 0.49);
float pSel = step(1.51, charIdx);
float m = mM*mSel + mW*(1.0-mSel-pSel) + mP*pSel;
float bit = mod(floor(m / exp2(col) + 0.01), 2.0);
float inRange = step(-0.5, row) * step(row, 4.5) * step(-0.5, col) * step(col, 4.5);
return bit * inRange;
}
// scramble most of the time, glitchily resolve into a letter that flips between the two sets
float mwpDecodedBit(float ci, float row, float col, vec2 s, float ch, float stampW){
float base = getCharBit(ci, row, col);
float alt  = getCharBit2(ci, row, col);
float spd = max(uMwpFlicker, 0.0001);
// slow per-cell legibility envelope — cell is coded unless env falls inside the legible window
float env = fract(iTime * spd * (0.55 + ch * 0.8) + ch * 7.3);
float legible = step(env, uMwpLegible);
// fast glitch clock drives the scramble and the letterform flips
float g = floor(iTime * spd * (8.0 + ch * 8.0) + ch * 23.0);
// coded state: random dot pattern within the cell
float scr = step(0.5, hash21(vec2(col * 3.1 + 1.7, row * 2.7 + 2.3) + s * 0.7 + vec2(g * 0.19, g * 0.07)));
// which letterform this instant — glitchy flip between the angular and rounded sets
float vSel = step(0.5, hash21(s + vec2(g * 0.29, 5.7)));
float letter = mix(base, alt, vSel);
// even while legible, some frames snap back toward scramble for a glitchy resolve
float glitchFrame = step(1.0 - uMwpGlitch * 0.5, hash21(s + vec2(g * 0.41, 9.2)));
float shown = mix(letter, scr, glitchFrame);
float outp = mix(scr, shown, legible);
// heart-wave cells force the clean rounded letterform so the heart reads
return mix(outp, base, clamp(stampW * 1.5, 0.0, 1.0));
}
float mwpGate(vec2 s, float h){
if(uMwpReveal >= 0.999) return 1.0;
if(uMwpReveal < 0.001) return 0.0;
vec2 md = s / uScale - uRippleOrigin;
md.x *= iResolution.z;
return smoothstep(-0.05 - h * 0.3, 0.1, uMwpReveal * 2.5 - length(md));
}
vec2 heartRowMasks(float r){
return r < 0.5 ? vec2(6.0, 192.0)
: r < 1.5 ? vec2(95.0, 496.0)
: r < 3.5 ? vec2(95.0, 500.0)
: r < 4.5 ? vec2(30.0, 244.0)
: r < 5.5 ? vec2(24.0, 56.0)
:           vec2(0.0, 32.0);
}
vec4 heartStamp(vec2 s){
vec2 grid = uGridMul * 15.0;
vec2 cellD = (s - uRippleOrigin * uScale) * grid;
float hx = cellD.x / uHeartScale + 4.5;
float hy = 3.5 - cellD.y / uHeartScale;
vec2 hn = vec2((hx - 4.5) / 4.5, (hy - 3.0) / 3.5);
float hr = length(hn);
float fall = 1.0 - max(hr - 1.0, 0.0) / max(uHeartFalloff, 0.001);
if(fall <= 0.0) return vec4(0.0);
float colI = floor(hx); float rowI = floor(hy);
float code = 0.0;
if(colI >= 0.0 && colI <= 8.0 && rowI >= 0.0 && rowI <= 6.0){
vec2 m = heartRowMasks(rowI);
code = mod(floor(m.x / exp2(colI) + 0.01), 2.0)
+ mod(floor(m.y / exp2(colI) + 0.01), 2.0) * 2.0;
}
float lit = step(0.5, code);
float w = max(lit, clamp(fall, 0.0, 1.0) * 0.55) * uMwpWaveEnv;
float tg = clamp(hx / 9.0, 0.0, 1.0);
vec3 halo = tg < 0.5 ? mix(uRippleColor0, uRippleColor1, tg * 2.0)
: mix(uRippleColor1, uRippleColor2, (tg - 0.5) * 2.0);
float isC = step(2.5, code);
float isT = step(1.5, code) * (1.0 - isC);
float isR = step(0.5, code) * (1.0 - isC - isT);
vec3 pix = uRippleColor0 * isR + uRippleColor2 * isT + uRippleColor1 * isC;
return vec4(mix(halo, pix, lit), w);
}
float fbm(vec2 p){
p *= 1.1; float f = 0.0; float amp = 0.5 * uNoiseAmp;
mat2 m0 = rotate(time * 0.02); f += amp * noise(p); p = m0 * p * 2.0; amp *= 0.454545;
mat2 m1 = rotate(time * 0.02); f += amp * noise(p);
if(uNoiseDetail > 0.001){
p = m1 * p * 2.0;
f += amp * 0.454545 * uNoiseDetail * noise(p);
}
return f;
}
float pattern(vec2 p, out vec2 q, out vec2 r){
vec2 o1 = vec2(1.0); vec2 o0 = vec2(0.0);
mat2 rot01 = rotate(0.1 * time); mat2 rot1 = rotate(0.1);
q = vec2(fbm(p + o1), fbm(rot01 * p + o1));
r = vec2(fbm(rot1 * q + o0), fbm(q + o0));
return fbm(p + r);
}
float digit(vec2 p){
vec2 grid = uGridMul * 15.0;
vec2 s = floor(p * grid) / grid;
p = p * grid;
vec2 q, r;
float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
if(uUseMouse > 0.5){
vec2 mw = uMouse * uScale;
float d = distance(s, mw);
float mi = exp(-d * 8.0) * uMouseStrength * 10.0;
intensity += mi;
intensity += sin(d * 20.0 - iTime * 5.0) * 0.1 * mi;
}
float loadFactor = 1.0;
if (uRippleActive > 0.5) {
vec2 s_uv = s / uScale;
vec2 dh = s_uv - uRippleOrigin;
dh.x *= iResolution.z;
float dist = length(dh);
float radius = uRippleProgress * 2.5 * ringWobble(dh);
float buildHash = hash21(s * 43.7 + vec2(1.23, 4.56));
float edge = radius - dist;
loadFactor = smoothstep(-0.05 - buildHash * 0.35, 0.25, edge);
intensity *= loadFactor;
float ringBoost = step(0.0, edge)
* smoothstep(uRippleBrightnessFalloff, 0.0, edge)
* uRippleBrightness;
intensity *= (1.0 + ringBoost);
} else if (uUsePageLoadAnimation > 0.5) {
float cr = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
float cd = cr * 0.8;
float cp = clamp((uPageLoadProgress - cd) / 0.2, 0.0, 1.0);
loadFactor = smoothstep(0.0, 1.0, cp);
intensity *= loadFactor;
}
p = fract(p); p *= uDigitSize;
float px5 = p.x * 5.0; float py5 = (1.0 - p.y) * 5.0;
float x = fract(px5); float y = fract(py5);
float i = floor(py5) - 2.0; float j = floor(px5) - 2.0;
float cellHash = hash21(s * 71.3 + vec2(5.3, 2.7));
float isLetterCell = step(1.0 - uMwpDensity, cellHash);
float flickerSpeed = (1.2 + cellHash * 2.5) * uMwpFlicker;
float timeStep = floor(iTime * flickerSpeed + cellHash * 19.7);
float flickerRand = hash21(s + vec2(timeStep * 0.097, timeStep * 0.113));
float showChar = isLetterCell * step(0.3, flickerRand) * mwpGate(s, cellHash);
float stampW = 0.0;
if(uMwpWaveEnv > 0.001){
stampW = heartStamp(s).w;
showChar = clamp(showChar + step(0.05, stampW), 0.0, 1.0);
}
float charIdx = clamp(floor(hash21(s * 3.7 + vec2(timeStep * 0.11, 1.23)) * 3.0), 0.0, 2.0);
float charPixel = mwpDecodedBit(charIdx, i + 2.0, j + 2.0, s, cellHash, stampW);
intensity += showChar * (charPixel * (0.7 + stampW * 0.8) - 0.2) * loadFactor;
float n = i * i + j * j; float f = n * 0.0625;
float isOn = step(0.1, intensity - f);
float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}
float onOff(float a, float b, float c){ return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount; }
float displace(vec2 look){
float y = look.y - mod(iTime * 0.25, 1.0);
float window = 1.0 / (1.0 + 50.0 * y * y);
return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}
vec3 getColor(vec2 p){
float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
bar *= uScanlineIntensity;
float disp = displace(p); p.x += disp;
if (uGlitchAmount != 1.0){ p.x += disp * (uGlitchAmount - 1.0); }
if (uImpactBurst > 0.001 && uRippleActive > 0.5 && uRippleProgress < 0.3){
float k = 1.0 - uRippleProgress * 3.3333;
k *= k * uImpactBurst;
float row = floor(p.y * 30.0);
float jt = floor(iTime * 24.0);
float tear = step(0.6, hash21(vec2(jt, row * 0.7)));
p.x += (hash21(vec2(row, jt)) - 0.5) * 0.05 * k * tear;
}
float middle = digit(p);
const float off = 0.002;
float sum = digit(p + vec2(0.0,-off)) + digit(p + vec2(-off,0.0)) +
digit(p + vec2(off,0.0)) + digit(p + vec2(0.0,off));
return vec3(0.9) * middle + sum * 0.18 * vec3(1.0) * bar;
}
vec2 barrel(vec2 uv){ vec2 c = uv * 2.0 - 1.0; float r2 = dot(c,c); c *= 1.0 + uCurvature * r2; return c * 0.5 + 0.5; }
void main(){
time = iTime * 0.333333;
vec2 uv = vUv;
if(uCurvature != 0.0){ uv = barrel(uv); }
if(uRippleWarp > 0.001){
vec2 wdh = uv - uRippleOrigin;
wdh.x *= iResolution.z;
float wdist = max(length(wdh), 0.0001);
float warp = 0.0;
if(uRippleActive > 0.5 && uRippleProgress > 0.001){
float wedge = uRippleProgress * 2.5 * ringWobble(wdh) - wdist;
warp += smoothstep(0.3, 0.0, abs(wedge)) * uRippleFade;
}
if(uAftershockActive > 0.5 && uAftershockProgress > 0.001){
float awedge = uAftershockProgress * 2.5 * ringWobble(wdh) - wdist;
warp += smoothstep(0.25, 0.0, abs(awedge)) * 0.6;
}
if(warp > 0.001){
vec2 dir = wdh / wdist;
dir.x /= iResolution.z;
uv -= dir * warp * uRippleWarp * 0.02;
}
}
vec2 p = uv * uScale;
vec3 col = getColor(p);
if(uChromaticAberration != 0.0){
vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
col.r = getColor(p + ca).r;
col.b = getColor(p - ca).b;
}
float lum = max(col.r, max(col.g, col.b));
lum = pow(clamp(lum, 0.0, 1.0), uGlyphGamma);
float blend = clamp(lum * uBrightness, 0.0, 1.0);
if(uSweep > 0.001){
float sp = fract(iTime * 0.05);
float sd = uv.y - (1.1 - sp * 1.3);
float sband = exp(-sd * sd * 250.0);
blend = clamp(blend + blend * sband * uSweep * 0.9, 0.0, 1.0);
}
col = mix(uBgColor, uTint, blend);
if (uRippleActive > 0.5 && uRippleProgress > 0.001) {
vec2 dh = uv - uRippleOrigin;
dh.x *= iResolution.z;
float dist = length(dh);
float radius = uRippleProgress * 2.5 * ringWobble(dh);
float edge = radius - dist;
float isRevealed = smoothstep(0.05, -0.05, dist - radius);
float ringStr = step(0.0, edge) * smoothstep(uRippleBrightnessFalloff, 0.0, edge);
float colorAge = clamp(dist / max(radius, 0.001), 0.0, 1.0);
float trailStr = pow(1.0 - colorAge, uRippleColorFalloff) * isRevealed * uRippleColorAmbient;
float totalStr = clamp(ringStr + trailStr, 0.0, 1.0) * uRippleColorStrength * uRippleFade;
float yFrac = clamp(uv.y, 0.0, 1.0);
vec3 flashCol = yFrac > 0.5
? mix(uRippleColor1, uRippleColor0, (yFrac - 0.5) * 2.0)
: mix(uRippleColor2, uRippleColor1, yFrac * 2.0);
vec3 screened = blendGlow(col, flashCol * totalStr);
col = mix(col, screened, blend);
col = clamp(col, 0.0, 1.0);
}
if (uAftershockActive > 0.5 && uAftershockProgress > 0.001) {
vec2 adh = uv - uRippleOrigin;
adh.x *= iResolution.z;
float adist = length(adh);
float aradius = uAftershockProgress * 2.5 * ringWobble(adh);
float aedge = aradius - adist;
float aringStr = step(0.0, aedge) * smoothstep(uRippleBrightnessFalloff, 0.0, aedge);
float atotalStr = aringStr * uAftershockStrength;
float yFracA = clamp(uv.y, 0.0, 1.0);
vec3 aflashCol = yFracA > 0.5
? mix(uRippleColor1, uRippleColor0, (yFracA - 0.5) * 2.0)
: mix(uRippleColor2, uRippleColor1, yFracA * 2.0);
vec3 ascreened = blendGlow(col, aflashCol * atotalStr);
col = mix(col, ascreened, blend);
col = clamp(col, 0.0, 1.0);
}
vec2 grid_c = uGridMul * 15.0;
vec2 s_c = floor(p * grid_c) / grid_c;
vec2 pc = fract(p * grid_c) * uDigitSize;
float ic = floor((1.0 - pc.y) * 5.0) - 2.0;
float jc = floor(pc.x * 5.0) - 2.0;
float ch = hash21(s_c * 71.3 + vec2(5.3, 2.7));
float ts = floor(iTime * (1.2 + ch * 2.5) * uMwpFlicker + ch * 19.7);
float sc = step(1.0 - uMwpDensity, ch)
* step(0.3, hash21(s_c + vec2(ts * 0.097, ts * 0.113)))
* mwpGate(s_c, ch);
vec4 stamp = vec4(0.0);
if(uMwpWaveEnv > 0.001) stamp = heartStamp(s_c);
float scEff = clamp(sc + step(0.05, stamp.w), 0.0, 1.0);
float ci = clamp(floor(hash21(s_c * 3.7 + vec2(ts * 0.11, 1.23)) * 3.0), 0.0, 2.0);
float cp = mwpDecodedBit(ci, ic + 2.0, jc + 2.0, s_c, ch, stamp.w);
float ms = step(ci, 0.49); float ps = step(1.51, ci);
vec3 mwpCol = vec3(0.91,0.31,0.36)*ms
+ vec3(0.95,0.53,0.27)*(1.0-ms-ps)
+ vec3(0.24,0.75,0.59)*ps;
mwpCol = mix(mwpCol, stamp.rgb, clamp(stamp.w * 1.5, 0.0, 1.0));
col = mix(col, mix(uBgColor, mwpCol, blend),
clamp(scEff * cp * (uMwpColorStrength + stamp.w * uHeartStrength), 0.0, 1.0));
if(uVignette > 0.001){
vec2 vq = vUv - 0.5;
col *= 1.0 - dot(vq, vq) * uVignette * 1.3;
}
if(uDither > 0.0){ col += (hash21(gl_FragCoord.xy) - 0.5) * (uDither * 0.003922); }
gl_FragColor = vec4(col, 1.0);
}`;
function hexToRgb(hex){
  let h = (hex||'').replace('#','').trim();
  if(h.length===3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h,16);
  return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
}
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
const fmt = (v,step) => step < 1 ? (+v).toFixed(2) : String(Math.round(v));
function createInstance(ctn, opts){
  let bgHex = opts.bgColor;
  if(!bgHex){
    const v = getComputedStyle(ctn).getPropertyValue('--slate').trim();
    bgHex = v||'#2b464e';
  }
  function cssColor(varName,fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
           || getComputedStyle(ctn).getPropertyValue(varName).trim();
    return hexToRgb(v||fallback);
  }
  const rippleC0 = cssColor('--raspberry','#E84F5C');
  const rippleC1 = cssColor('--coral','#F28745');
  const rippleC2 = cssColor('--teal','#3DC096');
  const renderer = new Renderer({ dpr: opts.dpr });
  const gl = renderer.gl;
  const bg = hexToRgb(bgHex);
  gl.clearColor(bg[0],bg[1],bg[2],1);
  const geometry = new Triangle(gl);
  const tint = hexToRgb(opts.tint);
  const mouse = {x:0.5,y:0.5};
  const smoothMouse = {x:0.5,y:0.5};
  const timeOffset = Math.random()*100;
  let loadStart=0, rafId=0, running=false, onScreen=true;
  let tabVisible = !document.hidden;
  let rippleTriggered=false, rippleStartTime=-1;
  let rippleDurationRef = opts.rippleDuration||1500;
  let aftershockTriggered=false, aftershockStartTime=-1, aftershockDurationRef=opts.aftershockDuration||700;
  let aftershockDelayRef=opts.aftershockDelay||0, aftershockTriggerAtRef=opts.aftershockTriggerAt??0.82;
  let rippleFadeStartTime=-1, rippleFadeOutRef=opts.rippleFadeOut??280;
  let mwpWaveStartTime=-1, mwpWaveDurationRef=opts.mwpWaveDuration??1600, mwpWaveAtRef=opts.mwpWaveAt??0.25;
  let phosphorOnRef=opts.phosphorOn!==false, phosphorRef=opts.phosphor??0, rtScene=null, rtA=null, rtB=null, fbProg=null, fbMesh=null, cpProg=null, cpMesh=null, prevT=0;
  let tiltX=0, tiltY=0, tiltTargetX=0, tiltTargetY=0, tiltStrengthRef=opts.tiltStrength??0.4;
  let gyroActive=false;
  let renderScale = opts.renderScaleMax;
  const frameInterval = 1000/(opts.targetFPS||30);
  let lastFrame=0, fpsCount=0, fpsWindowStart=0;
  const program = new Program(gl,{
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      iTime:{value:0},
      iResolution:{value:new Color(1,1,1)},
      uScale:{value:opts.scale},
      uGridMul:{value:new Float32Array(opts.gridMul)},
      uDigitSize:{value:opts.digitSize},
      uScanlineIntensity:{value:opts.scanlineIntensity},
      uGlitchAmount:{value:opts.glitchAmount},
      uFlickerAmount:{value:opts.flickerAmount},
      uNoiseAmp:{value:opts.noiseAmp},
      uChromaticAberration:{value:opts.chromaticAberration},
      uDither:{value:typeof opts.dither==='boolean'?(opts.dither?1:0):opts.dither},
      uCurvature:{value:opts.curvature},
      uTint:{value:new Color(tint[0],tint[1],tint[2])},
      uBgColor:{value:new Color(bg[0],bg[1],bg[2])},
      uMouse:{value:new Float32Array([0.5,0.5])},
      uMouseStrength:{value:opts.mouseStrength},
      uUseMouse:{value:opts.mouseReact?1:0},
      uPageLoadProgress:{value:opts.pageLoadAnimation?0:1},
      uUsePageLoadAnimation:{value:opts.pageLoadAnimation?1:0},
      uBrightness:{value:opts.brightness},
      uGlyphGamma:{value:opts.glyphGamma??1.0},
      uMwpColorStrength:{value:opts.mwpColorStrength??0.5},
      uRippleActive:{value:0},
      uRippleProgress:{value:0},
      uRippleOrigin:{value:new Float32Array([0.5,0.5])},
      uRippleColor0:{value:new Color(rippleC0[0],rippleC0[1],rippleC0[2])},
      uRippleColor1:{value:new Color(rippleC1[0],rippleC1[1],rippleC1[2])},
      uRippleColor2:{value:new Color(rippleC2[0],rippleC2[1],rippleC2[2])},
      uRippleColorFalloff:{value:opts.rippleColorFalloff??1.5},
      uRippleColorAmbient:{value:opts.rippleColorAmbient??0.3},
      uRippleColorStrength:{value:opts.rippleColorStrength??1.2},
      uRippleBrightness:{value:opts.rippleBrightness??1.0},
      uRippleBrightnessFalloff: {value:opts.rippleBrightnessFalloff??0.2},
      uAftershockActive:{value:0},
      uAftershockProgress:{value:0},
      uAftershockStrength:{value:opts.aftershockStrength??0.3},
      uRippleFade:{value:1},
      uRippleWobble:{value:opts.rippleWobble??0},
      uRippleWarp:{value:opts.rippleWarp??0},
      uImpactBurst:{value:opts.impactBurst??0},
      uVignette:{value:opts.vignette??0},
      uSweep:{value:opts.retraceSweep??0},
      uNoiseDetail:{value:opts.noiseDetail??0},
      uBlendMode:{value:opts.blendMode??0},
      uMwpDensity:{value:opts.mwpDensity??0.15},
      uMwpFlicker:{value:opts.mwpFlickerSpeed??1},
      uMwpReveal:{value:opts.ripple?0:1},
      uMwpWaveEnv:{value:0},
      uHeartStrength:{value:opts.heartStrength??1.2},
      uHeartScale:{value:opts.heartScale??1},
      uHeartFalloff:{value:opts.heartFalloff??0.8},
      uMwpLegible:{value:opts.mwpLegible??0.22},
      uMwpGlitch:{value:opts.mwpGlitch??0.5},
    }
  });
  const mesh = new Mesh(gl,{geometry,program});
  function targetScaleForSize(w,h){
    const px = w*h*opts.dpr*opts.dpr;
    let s = opts.renderScaleMax;
    if(px*s*s > opts.maxPixels) s = Math.sqrt(opts.maxPixels/px);
    return clamp(s,opts.renderScaleMin,opts.renderScaleMax);
  }
  function makeRTs(){
    const o={width:gl.canvas.width,height:gl.canvas.height,depth:false};
    rtScene=new RenderTarget(gl,o); rtA=new RenderTarget(gl,o); rtB=new RenderTarget(gl,o);
  }
  function ensurePhosphor(){
    if(fbProg) return;
    fbProg=new Program(gl,{vertex:vertexShader,fragment:'precision mediump float;varying vec2 vUv;uniform sampler2D tS;uniform sampler2D tP;uniform float uDk;void main(){gl_FragColor=vec4(max(texture2D(tS,vUv).rgb,texture2D(tP,vUv).rgb*uDk),1.0);}',
      uniforms:{tS:{value:null},tP:{value:null},uDk:{value:0}}});
    fbMesh=new Mesh(gl,{geometry,program:fbProg});
    cpProg=new Program(gl,{vertex:vertexShader,fragment:'precision mediump float;varying vec2 vUv;uniform sampler2D tM;void main(){gl_FragColor=texture2D(tM,vUv);}',
      uniforms:{tM:{value:null}}});
    cpMesh=new Mesh(gl,{geometry,program:cpProg});
    makeRTs();
  }
  function applySize(){
    const w=Math.max(1,ctn.offsetWidth), h=Math.max(1,ctn.offsetHeight);
    renderer.setSize(Math.max(1,Math.floor(w*renderScale)),Math.max(1,Math.floor(h*renderScale)));
    gl.canvas.style.width='100%'; gl.canvas.style.height='100%';
    program.uniforms.iResolution.value = new Color(gl.canvas.width,gl.canvas.height,gl.canvas.width/gl.canvas.height);
    if(fbProg) makeRTs();
  }
  function resize(){ renderScale=targetScaleForSize(ctn.offsetWidth,ctn.offsetHeight); applySize(); }
  new ResizeObserver(resize).observe(ctn);
  resize();
  if(opts.mouseReact){
    document.addEventListener('mousemove',e=>{
      const r=ctn.getBoundingClientRect();
      mouse.x=(e.clientX-r.left)/r.width;
      mouse.y=1-(e.clientY-r.top)/r.height;
    });
    document.addEventListener('touchmove',e=>{
      if(!opts.tiltReact || gyroActive) return;
      const t=e.touches[0];
      const r=ctn.getBoundingClientRect();
      const tx=((t.clientX-r.left)/r.width-0.5)*2;   // -1..1, amplified
      const ty=((t.clientY-r.top)/r.height-0.5)*2;
      const maxDeg=tiltStrengthRef*10*1.6;             // 1.6× boost vs mouse
      tiltTargetX=-ty*maxDeg;
      tiltTargetY= tx*maxDeg;
    },{passive:true});
    document.addEventListener('touchend',()=>{
      if(!opts.tiltReact || gyroActive){ tiltTargetX=0; tiltTargetY=0; }
    },{passive:true});
  }
  if(opts.tiltReact){
    gl.canvas.style.willChange='transform';
    function applyGyroOrientation(e){
      if(e.gamma==null && e.beta==null) return;
      gyroActive=true;
      const maxDeg=tiltStrengthRef*10;
      const g=Math.max(-45,Math.min(45,e.gamma||0));
      const b=Math.max(-45,Math.min(45,(e.beta||0)-45));
      tiltTargetX=(b/45)*maxDeg;
      tiltTargetY=(g/45)*maxDeg;
    }
    if(typeof DeviceOrientationEvent!=='undefined'){
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        const onTap=()=>{
          DeviceOrientationEvent.requestPermission()
            .then(r=>{ if(r==='granted') window.addEventListener('deviceorientation',applyGyroOrientation); })
            .catch(()=>{});
          ctn.removeEventListener('click',onTap);
        };
        ctn.addEventListener('click',onTap);
      } else {
        window.addEventListener('deviceorientation',applyGyroOrientation);
      }
    }
  }
  const hasRippleClass = () =>
    ctn.classList.contains('--does-ripple')||ctn.classList.contains('does-ripple');
  function triggerRipple(){
    if(rippleTriggered) return;
    rippleTriggered=true;
    const originEl = opts.rippleOriginSelector ? document.querySelector(opts.rippleOriginSelector) : ctn;
    const er=(originEl||ctn).getBoundingClientRect();
    const cr=ctn.getBoundingClientRect();
    program.uniforms.uRippleOrigin.value[0]=Math.max(0,Math.min(1,(er.left+er.width*0.5-cr.left)/cr.width));
    program.uniforms.uRippleOrigin.value[1]=Math.max(0,Math.min(1,1-(er.top+er.height*0.5-cr.top)/cr.height));
    program.uniforms.uRippleActive.value=1;
    program.uniforms.uRippleProgress.value=0;
    rippleStartTime=performance.now();
  }
  if(opts.ripple){
    program.uniforms.uPageLoadProgress.value=0;
    program.uniforms.uUsePageLoadAnimation.value=1;
    if(hasRippleClass()) triggerRipple();
    else new MutationObserver(()=>{ if(hasRippleClass()) triggerRipple(); })
      .observe(ctn,{attributes:true,attributeFilter:['class']});
  }
  function autoTune(now){
    if(!opts.autoTune) return;
    fpsCount++;
    if(fpsWindowStart===0) fpsWindowStart=now;
    const span=now-fpsWindowStart;
    if(span>=1000){
      const fps=(fpsCount*1000)/span;
      fpsCount=0; fpsWindowStart=now;
      let changed=false;
      if(fps<opts.fpsLow && renderScale>opts.renderScaleMin){ renderScale=clamp(renderScale-0.06,opts.renderScaleMin,opts.renderScaleMax); changed=true; }
      else if(fps>opts.fpsHigh && renderScale<opts.renderScaleMax){ renderScale=clamp(renderScale+0.03,opts.renderScaleMin,opts.renderScaleMax); changed=true; }
      renderScale=Math.min(renderScale,targetScaleForSize(ctn.offsetWidth,ctn.offsetHeight));
      if(changed) applySize();
    }
  }
  function update(t){
    rafId=requestAnimationFrame(update);
    if(t-lastFrame<frameInterval) return;
    lastFrame=t;
    autoTune(t);
    if(!opts.pause) program.uniforms.iTime.value=(t*0.001+timeOffset)*opts.timeScale;
    if(opts.ripple && rippleTriggered){
      const rawRp=Math.min((t-rippleStartTime)/rippleDurationRef,1.0);
      const rp=opts.rippleEase!==false
        ?(rawRp<0.5?2*rawRp*rawRp:1-Math.pow(-2*rawRp+2,2)/2)
        :rawRp;
      program.uniforms.uRippleProgress.value=rp;
      if(opts.aftershock && !aftershockTriggered && rp>=aftershockTriggerAtRef){
        aftershockTriggered=true;
        aftershockStartTime=t+aftershockDelayRef;
      }
      if(!opts.aftershock && mwpWaveStartTime<0 && rp>=mwpWaveAtRef) mwpWaveStartTime=t;
      if(rp>=1.0 && rippleFadeStartTime<0){
        rippleFadeStartTime=t;
        program.uniforms.uPageLoadProgress.value=1;
      }
      if(rippleFadeStartTime>=0){
        const fadeElapsed=t-rippleFadeStartTime;
        const fadeFrac=Math.min(fadeElapsed/Math.max(rippleFadeOutRef,1),1.0);
        program.uniforms.uRippleFade.value=1.0-fadeFrac;
        if(fadeFrac>=1.0 && program.uniforms.uRippleActive.value>0.5)
          program.uniforms.uRippleActive.value=0;
      }
    }
    if(opts.aftershock && aftershockTriggered){
      const elapsed=t-aftershockStartTime;
      if(elapsed>=0){
        if(program.uniforms.uAftershockActive.value<0.5)
          program.uniforms.uAftershockActive.value=1;
        const rawAp=Math.min(elapsed/aftershockDurationRef,1.0);
        const ap=rawAp<0.5?2*rawAp*rawAp:1-Math.pow(-2*rawAp+2,2)/2;
        program.uniforms.uAftershockProgress.value=ap;
        if(mwpWaveStartTime<0 && ap>=mwpWaveAtRef) mwpWaveStartTime=t;
        if(ap>=1.0 && program.uniforms.uAftershockActive.value>0.5)
          program.uniforms.uAftershockActive.value=0;
      }
    }
    if(opts.ripple && mwpWaveStartTime>=0 && program.uniforms.uMwpReveal.value<1){
      const wp=Math.min((t-mwpWaveStartTime)/Math.max(mwpWaveDurationRef,1),1);
      program.uniforms.uMwpReveal.value=wp;
      program.uniforms.uMwpWaveEnv.value=
        wp>=1?0:(wp<0.1?wp*10:Math.pow(1-(wp-0.1)/0.9,2));
    }
    if(opts.pageLoadAnimation && !opts.ripple){
      if(loadStart===0) loadStart=t;
      const elapsed=t-loadStart-(opts.pageLoadDelay||0);
      program.uniforms.uPageLoadProgress.value=Math.min(Math.max(elapsed,0)/2000,1);
    }
    if(opts.mouseReact){
      smoothMouse.x+=(mouse.x-smoothMouse.x)*0.08;
      smoothMouse.y+=(mouse.y-smoothMouse.y)*0.08;
      program.uniforms.uMouse.value[0]=smoothMouse.x;
      program.uniforms.uMouse.value[1]=smoothMouse.y;
    }
    if(opts.tiltReact){
      const maxDeg=tiltStrengthRef*10;
      if(!gyroActive){
        tiltTargetX=(0.5-smoothMouse.y)*maxDeg;
        tiltTargetY=(smoothMouse.x-0.5)*maxDeg;
      }
      tiltX+=(tiltTargetX-tiltX)*0.05;
      tiltY+=(tiltTargetY-tiltY)*0.05;
      gl.canvas.style.transform=`perspective(600px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(1.06)`;
    }
    if(phosphorOnRef && phosphorRef>0.5){
      ensurePhosphor();
      renderer.render({scene:mesh,target:rtScene});
      fbProg.uniforms.tS.value=rtScene.texture;
      fbProg.uniforms.tP.value=rtB.texture;
      fbProg.uniforms.uDk.value=Math.exp(-Math.max(t-prevT,1)/phosphorRef);
      renderer.render({scene:fbMesh,target:rtA});
      cpProg.uniforms.tM.value=rtA.texture;
      renderer.render({scene:cpMesh});
      const sw=rtA; rtA=rtB; rtB=sw;
    } else {
      renderer.render({scene:mesh});
    }
    prevT=t;
  }
  function start(){
    if(!running && onScreen && tabVisible){
      running=true; fpsWindowStart=0; fpsCount=0;
      if(opts.ripple && rippleTriggered && program.uniforms.uRippleActive.value>0.5)
        rippleStartTime=performance.now();
      rafId=requestAnimationFrame(update);
    }
  }
  function stop(){ if(running){ running=false; cancelAnimationFrame(rafId); } }
  new IntersectionObserver(entries=>{
    onScreen=entries[0].isIntersecting; onScreen?start():stop();
  },{threshold:0}).observe(ctn);
  document.addEventListener('visibilitychange',()=>{
    tabVisible=!document.hidden; tabVisible?start():stop();
  });
  ctn.appendChild(gl.canvas);
  start();
  const unifMap = Object.fromEntries(
    SLIDERS.filter(d=>d[1]).map(d=>[d[0],d[1]])
  );
  function setParam(key,val){
    const uName=unifMap[key];
    if(uName && program.uniforms[uName]!=null) program.uniforms[uName].value=val;
    if(key==='rippleDuration') rippleDurationRef=val;
    if(key==='rippleFadeOut') rippleFadeOutRef=val;
    if(key==='mwpWaveDuration') mwpWaveDurationRef=val;
    if(key==='mwpWaveAt') mwpWaveAtRef=val;
    if(key==='phosphor') phosphorRef=val;
    if(key==='phosphorOn') phosphorOnRef=!!val;
    if(key==='aftershockDelay') aftershockDelayRef=val;
    if(key==='aftershockDuration') aftershockDurationRef=val;
    if(key==='aftershockTriggerAt') aftershockTriggerAtRef=val;
    if(key==='aftershock') opts.aftershock=val;
    if(key==='tiltStrength') tiltStrengthRef=val;
    if(key==='tiltReact'){ opts.tiltReact=val; if(!val) gl.canvas.style.transform=''; }
    if(key==='timeScale') opts.timeScale=val;
  }
  function getParam(key){
    const uName=unifMap[key];
    if(uName && program.uniforms[uName]!=null) return program.uniforms[uName].value;
    if(key==='rippleDuration') return rippleDurationRef;
    if(key==='rippleFadeOut') return rippleFadeOutRef;
    if(key==='mwpWaveDuration') return mwpWaveDurationRef;
    if(key==='mwpWaveAt') return mwpWaveAtRef;
    if(key==='phosphor') return phosphorRef;
    if(key==='phosphorOn') return phosphorOnRef;
    if(key==='aftershockDelay') return aftershockDelayRef;
    if(key==='aftershockDuration') return aftershockDurationRef;
    if(key==='aftershockTriggerAt') return aftershockTriggerAtRef;
    if(key==='tiltStrength') return tiltStrengthRef;
    if(key==='timeScale') return opts.timeScale;
    return opts[key];
  }
  function retrigger(){
    const originEl = opts.rippleOriginSelector ? document.querySelector(opts.rippleOriginSelector) : ctn;
    const er=(originEl||ctn).getBoundingClientRect();
    const cr=ctn.getBoundingClientRect();
    program.uniforms.uRippleOrigin.value[0]=Math.max(0,Math.min(1,(er.left+er.width*0.5-cr.left)/cr.width));
    program.uniforms.uRippleOrigin.value[1]=Math.max(0,Math.min(1,1-(er.top+er.height*0.5-cr.top)/cr.height));
    program.uniforms.uRippleActive.value=1;
    program.uniforms.uRippleProgress.value=0;
    program.uniforms.uPageLoadProgress.value=0;
    program.uniforms.uAftershockActive.value=0;
    program.uniforms.uAftershockProgress.value=0;
    program.uniforms.uRippleFade.value=1;
    program.uniforms.uMwpReveal.value=0;
    program.uniforms.uMwpWaveEnv.value=0;
    rippleTriggered=true;
    rippleStartTime=performance.now();
    aftershockTriggered=false;
    aftershockStartTime=-1;
    rippleFadeStartTime=-1;
    mwpWaveStartTime=-1;
  }
  return { ctn, opts, setParam, getParam, retrigger, hasRipple: opts.ripple };
}
function buildDebugPanel(instances){
  if(!instances.length) return;
  if(!document.getElementById('ft-debug-styles')){
    const s=document.createElement('style');
    s.id='ft-debug-styles';
    s.textContent=`
#ft-debug{position:fixed;top:16px;right:16px;z-index:99999;width:310px;max-height:88vh;
display:flex;flex-direction:column;background:rgba(8,12,16,0.93);color:#ccc;
font:11px/1.5 monospace;border:1px solid #2a3a40;border-radius:8px;
box-shadow:0 8px 32px rgba(0,0,0,0.6);backdrop-filter:blur(10px);}
#ft-debug.ft-hidden{display:none;}
#ft-dbh{padding:8px 12px;background:rgba(255,255,255,0.05);display:flex;
justify-content:space-between;align-items:center;border-radius:8px 8px 0 0;
border-bottom:1px solid #1a2a30;flex-shrink:0;}
#ft-dbh b{color:#fff;letter-spacing:.04em;}
#ft-dbh small{color:#445;font-size:10px;}
#ft-ibar{padding:6px 12px;display:flex;align-items:center;gap:6px;
border-bottom:1px solid #1a2a30;flex-shrink:0;}
#ft-ibar button{background:rgba(255,255,255,0.07);border:1px solid #333;color:#aaa;
width:22px;height:22px;border-radius:4px;cursor:pointer;font:11px monospace;
display:flex;align-items:center;justify-content:center;padding:0;}
#ft-ibar button:hover{background:rgba(255,255,255,0.14);color:#fff;}
#ft-ilabel{flex:1;text-align:center;color:#7ab;font-size:11px;}
#ft-dbb{flex:1;overflow-y:auto;padding:6px 0;}
#ft-dbb::-webkit-scrollbar{width:4px;}
#ft-dbb::-webkit-scrollbar-track{background:transparent;}
#ft-dbb::-webkit-scrollbar-thumb{background:#2a3a40;border-radius:2px;}
.ft-sec{padding:4px 12px 2px;color:#3dc096;font-size:10px;letter-spacing:.1em;
border-top:1px solid #1a2a30;margin-top:4px;}
.ft-sec:first-child{border-top:none;margin-top:0;}
.ft-row{display:grid;grid-template-columns:100px 1fr 40px;align-items:center;
gap:4px;padding:2px 12px;}
.ft-row label{color:#778;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default;}
.ft-row input[type=range]{accent-color:#3dc096;cursor:pointer;width:100%;}
.ft-row .ftv{color:#ddd;text-align:right;font-size:11px;}
#ft-dbf{padding:8px 12px;display:flex;gap:6px;border-top:1px solid #1a2a30;flex-shrink:0;}
#ft-dbf button{flex:1;padding:5px 0;background:rgba(255,255,255,0.06);color:#bbb;
border:1px solid #2a3a40;border-radius:4px;cursor:pointer;font:11px monospace;
transition:background .15s;}
#ft-dbf button:hover{background:rgba(255,255,255,0.13);color:#fff;}
#ft-retrigger{border-color:#3dc096!important;color:#3dc096!important;}
#ft-retrigger:hover{background:rgba(61,192,150,0.15)!important;}
#ft-retrigger:disabled{opacity:.35;cursor:not-allowed;}
`;
    document.head.appendChild(s);
  }
  const panel=document.createElement('div');
  panel.id='ft-debug';
  document.body.appendChild(panel);
  panel.innerHTML=`
<div id="ft-dbh"><b>🎛 ft debug</b><small>\` toggle</small></div>
<div id="ft-ibar">
<button id="ft-prev">◀</button>
<span id="ft-ilabel">Terminal 1 / ${instances.length}</span>
<button id="ft-next">▶</button>
</div>
<div id="ft-dbb"></div>
<div id="ft-dbf">
<button id="ft-retrigger">↺ re-trigger</button>
<button id="ft-copy">⎘ copy values</button>
</div>`;
  if(instances.length<=1){
    panel.querySelector('#ft-prev').style.visibility='hidden';
    panel.querySelector('#ft-next').style.visibility='hidden';
  }
  const body=panel.querySelector('#ft-dbb');
  const ilabel=panel.querySelector('#ft-ilabel');
  let currentIdx=0;
  const inst=()=>instances[currentIdx];
  const inputs={}; // key → {input, val (span or null)}
  let lastSec=null;
  SLIDERS.forEach(([key,,label,min,max,step,section,type])=>{
    if(section!==lastSec){
      const sec=document.createElement('div');
      sec.className='ft-sec';
      sec.textContent=section;
      body.appendChild(sec);
      lastSec=section;
    }
    const row=document.createElement('div'); row.className='ft-row';
    const lbl=document.createElement('label'); lbl.title=key; lbl.textContent=label;
    if(type==='bool'){
      const inp=document.createElement('input');
      inp.type='checkbox';
      inp.checked=!!(inst().getParam(key)??DEFAULTS[key]);
      inp.style.cssText='width:auto;accent-color:#3dc096;cursor:pointer;';
      inp.addEventListener('change',()=>inst().setParam(key,inp.checked));
      const spacer=document.createElement('span');
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(spacer);
      body.appendChild(row);
      inputs[key]={input:inp,val:null};
    } else if(type==='select'){
      const sel=document.createElement('select');
      sel.style.cssText='width:100%;background:rgba(255,255,255,0.07);color:#ddd;'+
        'border:1px solid #2a3a40;border-radius:4px;font:11px monospace;padding:2px;cursor:pointer;';
      (SELECT_OPTIONS[key]||[]).forEach((name,idx)=>{
        const o=document.createElement('option');
        o.value=idx; o.textContent=name;
        sel.appendChild(o);
      });
      sel.value=Math.round(inst().getParam(key)??DEFAULTS[key]??0);
      sel.addEventListener('change',()=>inst().setParam(key,parseFloat(sel.value)));
      const spacer=document.createElement('span');
      row.appendChild(lbl); row.appendChild(sel); row.appendChild(spacer);
      body.appendChild(row);
      inputs[key]={input:sel,val:null};
    } else {
      const inp=document.createElement('input');
      inp.type='range'; inp.min=min; inp.max=max; inp.step=step;
      inp.value=inst().getParam(key)??DEFAULTS[key]??0;
      const val=document.createElement('span'); val.className='ftv';
      val.textContent=fmt(inp.value,step);
      inp.addEventListener('input',()=>{
        const v=parseFloat(inp.value);
        val.textContent=fmt(v,step);
        inst().setParam(key,v);
      });
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(val);
      body.appendChild(row);
      inputs[key]={input:inp,val};
    }
  });
  function loadInst(idx){
    currentIdx=idx;
    ilabel.textContent=`Terminal ${idx+1} / ${instances.length}`;
    SLIDERS.forEach(([key,,,,,step,,type])=>{
      if(!inputs[key]) return;
      if(type==='bool'){
        inputs[key].input.checked=!!(inst().getParam(key)??DEFAULTS[key]);
      } else if(type==='select'){
        inputs[key].input.value=Math.round(inst().getParam(key)??DEFAULTS[key]??0);
      } else {
        const v=inst().getParam(key)??DEFAULTS[key]??0;
        inputs[key].input.value=v;
        if(inputs[key].val) inputs[key].val.textContent=fmt(v,step);
      }
    });
    const btn=panel.querySelector('#ft-retrigger');
    btn.disabled=!inst().hasRipple;
    btn.title=inst().hasRipple?'':'ripple disabled for this instance';
  }
  panel.querySelector('#ft-prev').addEventListener('click',()=>
    loadInst((currentIdx-1+instances.length)%instances.length));
  panel.querySelector('#ft-next').addEventListener('click',()=>
    loadInst((currentIdx+1)%instances.length));
  panel.querySelector('#ft-retrigger').addEventListener('click',()=>inst().retrigger());
  panel.querySelector('#ft-copy').addEventListener('click',()=>{
    let out='const TUNING = {\n';
    let lastSec=null;
    SLIDERS.forEach(([key,,,,,step,section,type])=>{
      if(section!==lastSec){ out+=`  // ${section.toLowerCase()}\n`; lastSec=section; }
      const v=inst().getParam(key)??DEFAULTS[key];
      out+=type==='bool'
        ? `  ${key}: ${!!v},\n`
        : `  ${key}: ${fmt(v,step)},\n`;
    });
    out+='};';
    navigator.clipboard.writeText(out).catch(()=>console.log(out));
    const btn=panel.querySelector('#ft-copy');
    const orig=btn.textContent;
    btn.textContent='✓ copied!';
    setTimeout(()=>btn.textContent=orig,1500);
  });
  document.addEventListener('keydown',e=>{ if(e.key==='`') panel.classList.toggle('ft-hidden'); });
  panel.classList.add('ft-hidden');
  loadInst(0);
}
// ---------------------------------------------------------------------------
// Public API + boot
// ---------------------------------------------------------------------------
const VERSION = __FT_VERSION__;
const INITED = '__ftInited';
let styleInjected = false;
function injectStyle(){
  if(styleInjected || document.getElementById('ft-base-style')) { styleInjected = true; return; }
  const el = document.createElement('style');
  el.id = 'ft-base-style';
  el.textContent = css;
  document.head.appendChild(el);
  styleInjected = true;
}
// dataset keys that are not option names
const RESERVED_ATTRS = { ftOpts: 1, ftNoRipple: 1, ftDebug: 1 };
// friendlier aliases -> real option key
const ATTR_ALIASES = { ftBg: 'bgColor', ftOrigin: 'rippleOriginSelector' };
// data-ft-ripple-duration -> ftRippleDuration -> rippleDuration
function attrKeyToOption(dataKey){
  if(ATTR_ALIASES[dataKey]) return ATTR_ALIASES[dataKey];
  const k = dataKey.slice(2); // strip the "ft" prefix
  return k.charAt(0).toLowerCase() + k.slice(1);
}
function coerceAttrValue(raw, key){
  const v = String(raw).trim();
  if(v === 'true') return true;
  if(v === 'false') return false;
  if(v === 'null') return null;
  // only coerce to number when the default for this key is numeric, so colour
  // strings and selectors are never mangled
  if(typeof DEFAULTS[key] === 'number' && v !== '' && !isNaN(Number(v))) return Number(v);
  return v;
}
// Config carried in an inert <template data-ft-config> inside the container.
// Each child declares data-ft-k="<optionKey>" and holds the value as its text.
// Template content is never rendered, never styled and never enters the
// accessibility tree, so Webflow component properties can be bound to the text
// without anything reaching the page. The node is removed once it has been read.
function readConfigBlock(ctn){
  const el = ctn.querySelector('[data-ft-config]');
  if(!el) return {};
  // <template> exposes its children on .content; tolerate a plain element too,
  // in case the platform ever emits something other than a real template.
  const root = el.content || el;
  const out = {};
  root.querySelectorAll('[data-ft-k]').forEach(node => {
    const key = (node.getAttribute('data-ft-k') || '').trim();
    const raw = (node.textContent || '').trim();
    if(!key || raw === '') return;          // blank property → fall through to default
    if(key === 'opts'){                     // JSON blob, same rules as data-ft-opts
      try{
        let j = raw; if(!j.startsWith('{')) j = '{' + j + '}';
        Object.assign(out, JSON.parse(j.replace(/'/g, '"')));
      }catch(e){
        console.warn('[faulty-terminal] could not parse config block opts:', raw, e);
      }
      return;
    }
    if(!(key in DEFAULTS)){
      console.warn('[faulty-terminal] unknown option in config block:', key);
      return;
    }
    out[key] = coerceAttrValue(raw, key);
  });
  el.remove();
  return out;
}
function parseAttrOpts(ctn){
  let overrides = {};
  const raw = ctn.getAttribute('data-ft-opts');
  if(raw && raw.trim()){
    try{
      let j = raw.trim();
      if(!j.startsWith('{')) j = '{' + j + '}';
      overrides = JSON.parse(j.replace(/'/g, '"'));
    }catch(e){
      console.warn('[faulty-terminal] could not parse data-ft-opts:', raw, e);
    }
  }
  // Config block sits between the JSON blob and the individual attributes.
  Object.assign(overrides, readConfigBlock(ctn));
  // Any other data-ft-* attribute maps straight onto an option, so every
  // TUNING key can be exposed as a Webflow component property. Empty values
  // are ignored — an unfilled component property renders as an empty string
  // and must not clobber the default.
  Object.keys(ctn.dataset).forEach(dataKey => {
    if(dataKey.slice(0, 2) !== 'ft' || RESERVED_ATTRS[dataKey]) return;
    const raw = ctn.dataset[dataKey];
    if(raw == null || String(raw).trim() === '') return;
    const key = attrKeyToOption(dataKey);
    if(!(key in DEFAULTS)){
      console.warn('[faulty-terminal] unknown option from data-' +
        dataKey.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ':', key);
      return;
    }
    overrides[key] = coerceAttrValue(raw, key);
  });
  if(ctn.hasAttribute('data-ft-no-ripple')) overrides.ripple = false;
  return overrides;
}
function siteConfig(){
  const cfg = (typeof window !== 'undefined' && window.FaultyTerminalConfig) || {};
  return (cfg && typeof cfg === 'object') ? cfg : {};
}
function debugRequested(){
  const cfg = siteConfig();
  // an explicit site-wide setting wins either way
  if(cfg.debugPanel === false) return false;
  if(cfg.debugPanel === true) return true;
  if(DEFAULTS.debugPanel) return true;
  if(typeof location !== 'undefined' && /[?&]ft-debug\b/.test(location.search)) return true;
  return !!document.querySelector('[data-ft-debug]');
}
const instances = [];
let panelBuilt = false;
/**
 * Initialise every uninitialised .faulty-terminal element inside `root`.
 * Safe to call repeatedly — already-running elements are skipped, so it can be
 * called after injecting markup (CMS load, tab switch, Webflow interaction).
 */
function init(root){
  injectStyle();
  const scope = root || document;
  const found = scope.querySelectorAll ? scope.querySelectorAll('.faulty-terminal') : [];
  const fresh = [];
  found.forEach(ctn => {
    if(ctn[INITED]) return;
    ctn[INITED] = true;
    const opts = Object.assign({}, DEFAULTS, siteConfig(), parseAttrOpts(ctn));
    try{
      const inst = createInstance(ctn, opts);
      instances.push(inst);
      fresh.push(inst);
    }catch(e){
      ctn[INITED] = false;
      console.error('[faulty-terminal] init failed for', ctn, e);
    }
  });
  if(!panelBuilt && instances.length && debugRequested()){
    panelBuilt = true;
    buildDebugPanel(instances);
  }
  return fresh;
}
/** Replay the ripple reveal. Pass an element, an index, or nothing for all. */
function retrigger(target){
  if(target === undefined || target === null){ instances.forEach(i => i.retrigger()); return; }
  if(typeof target === 'number'){ instances[target] && instances[target].retrigger(); return; }
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  instances.filter(i => i.ctn === el).forEach(i => i.retrigger());
}
const API = { version: VERSION, init, retrigger, instances, defaults: DEFAULTS, tuning: TUNING };
if(typeof window !== 'undefined'){
  window.FaultyTerminal = Object.assign(window.FaultyTerminal || {}, API);
}
function boot(){ init(document); }
if(typeof document !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
export default API;
export { init, retrigger, instances, VERSION as version };
