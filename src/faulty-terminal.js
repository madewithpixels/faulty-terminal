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
  rippleCurve: 1, // 0 linear · 1 ease in-out · 2 ease out · 3 expo out · 4 cubic in-out
  rippleReach: 2.50,
  // ripple shape
  rippleRingWidth: 0.31,
  rippleAspect: 1.23,
  rippleWobbleFreq: 2.85,
  rippleGlass: 0.00,
  rippleEdgeSoft: 0.09,
  rippleInnerFalloff: 0.42,
  rippleHotCore: 0.05,
  rippleEchoes: 1,
  rippleEchoGap: 0.17,
  rippleEchoDecay: 0.55,
  // ripple colour
  rippleColorMode: 0, // 0 vertical · 1 horizontal · 2 radial bands · 3 around origin · 4 over time · 5 per glyph
  rippleColorScale: 1.05,
  rippleColorOffset: 0.00,
  rippleColorSpin: 0.00,
  rippleColorBlend: 0.57,
  // aftershock
  aftershock: true,
  aftershockTriggerAt: 0.05,
  aftershockDelay: 0,
  aftershockDuration: 1350,
  aftershockStrength: 0.30,
  aftershockReach: 0,
  aftershockWidth: 0,
  aftershockTrail: 0.23,
  aftershockColorShift: 0,
  // ripple fx
  rippleWobble: 1.00,
  rippleWarp: 1.00,
  impactBurst: 2.00,
  // pulse
  pulseAttackMs: 380,
  pulseHoldMs: 250,
  pulseDecayMs: 1500,
  rasterBloom: 0.019,
  // mwp
  mwpColorStrength: 0.46,
  mwpDensity: 0.19,
  mwpFlickerSpeed: 0.25,
  mwpWaveDuration: 1050,
  mwpWaveAt: 0.05,
  heartStrength: 2.00,
  heartScale: 2.25,
  heartFalloff: 1.50,
  mwpLegible: 0.89,
  mwpGlitch: 0.85,
  // reveal safety net — ms to wait for does-ripple before fading in anyway (0 = never)
  revealFallback: 2500,
  // brand cycle
  brandMode: 3, // 0 off · 1 whole field · 2 gradient sweep · 3 per glyph
  brandStrength: 0.16,
  brandSpeed: 0.91,
  brandSoftness: 0.06,
  brandScale: 4.00,
  brandAngle: 0.15,
  // field
  brightness: 0.10,
  glyphGamma: 3.60,
  scanlineIntensity: 0.80,
  glitchAmount: 0.70,
  flickerAmount: 1.55,
  noiseAmp: 1.00,
  curvature: 0.20,
  mouseStrength: 0.60,
  timeScale: 0.45,
  digitSize: 1.25,
  tiltStrength: 0.65,
  // field fx
  vignette: 0.35,
  retraceSweep: 0.50,
  noiseDetail: 0.35,
  phosphorOn: true,
  phosphor: 560,
  chromaticAberration: 0.00,
  dither: 1.20,
  overscanMargin: 0.020,
};
// The pulse peak from the first lift-resolve session (24 Nov 2026). Not on by
// default: the panel's "load preset" puts it in pulsePeak to tune from.
const PULSE_PRESET = {
    mwpColorStrength: 0.83,
    mwpDensity: 0.48,
    brandStrength: 0.96,
    brandSoftness: 0.38,
    brandAngle: 0.93,
    brightness: 2.00,
    glyphGamma: 3.80,
    scanlineIntensity: 0.55,
    glitchAmount: 2.20,
    flickerAmount: 0.15,
    noiseAmp: 0.70,
};
// structural params (don't touch unless you know what you're doing)
const DEFAULTS = {
  ...TUNING,
  scale: 2,
  gridMul: [2, 1],
  pause: false,
  tint: '#366777',
  bgColor: '#2b464e',
  mouseReact: true,
  pageLoadAnimation: true,
  pageLoadDelay: 1500,
  pageLoadDuration: 2000,
  // How the field arrives. '' = derive from ripple/pageLoadAnimation (pre-1.9
  // behaviour). 'ripple' waits for does-ripple · 'fade' fades in after
  // pageLoadDelay over pageLoadDuration · 'instant' is at full strength on the
  // first frame. Wins over ripple/pageLoadAnimation when set.
  reveal: '',
  // Paint bgColor on the container itself so there is no flash of whatever is
  // behind it before WebGL draws its first frame. Skipped if the container
  // already has a background of its own.
  paintBackground: true,
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
  // --- paint-safe start (v1.10.0). Each one set to false restores the exact
  // v1.9.1 behaviour for that part. ---
  // Software WebGL (SwiftShader, llvmpipe… — headless Chrome, GPU-blocklisted
  // machines) or no WebGL at all: skip the renderer, keep the painted
  // background, add .ft-static to the container.
  softwareFallback: true,
  // While a ripple reveal is armed, draw one frame (so faulty-terminal:ready
  // still fires) and hold the render loop until does-ripple or revealFallback.
  deferLoop: true,
  // Opt-in (off since v1.10.1 — it softened the start of the ripple reveal and
  // made no difference to PageSpeed, where softwareFallback does the work).
  // For the first warmStartMs of page life run at ≤0.5 render scale and ≤30fps,
  // then restore full quality if the device kept up. A first measurement
  // window below fpsLow drops straight to renderScaleMin.
  warmStart: false,
  warmStartMs: 2000,
  // --- logo resolve (v1.11.0). Everything here is off by default; with
  // gridLock null, logoResolve false and rippleGate true the renderer is
  // v1.10.1's, frame for frame. ---
  // Lock the field's cells to an element (a CSS selector): square cells of
  // gridLockCellPx CSS px, with a cell edge on the element's left and on its
  // top minus one logo gap. 0 = logoPitch × logoPixelsPerCell.
  gridLock: null,
  gridLockCellPx: 0,
  // Resolve the MWP heart out of the field inside the gridLock element's
  // footprint. Needs gridLock. Driven by setLogoProgress / setDegaussProgress
  // from the site's timeline, or by resolveLogo().
  logoResolve: false,
  logoPitch: 18,            // logo pixel pitch, CSS px (site passes device-px-exact values)
  logoSize: 16,             // logo pixel size, CSS px
  logoPixelsPerCell: 2,     // logo pixels per glyph, each way (1 or 2)
  logoSpread: 0.31,         // pixel stagger of the resolve (4×4 ordered)
  logoSlot: 0.96,           // pixel size before the degauss, fraction of final
  degaussAmp: 1.1,            // degauss strength
  degaussDecay: 2.75,        // degauss settle speed
  // resolveLogo() timeline, ms (approved 30 Oct 2026)
  logoFieldMs: 550,         // field fade-in
  logoHoldMs: 50,            // hold before the resolve starts
  logoResolveMs: 400,       // resolve progress 0→1
  degaussOffset: -70,       // degauss starts this long after the resolve ends (negative = before)
  degaussMs: 420,           // degauss progress 0→1
  logoHandOffset: -140,     // hand-off this long after the degauss ends (negative = before)
  // Render at renderScaleMax with autoTune paused from the start of the
  // resolve until the hand-off (uneven pixel columns below full scale).
  logoFullScale: true,
  // v1.12.0: faulty-terminal also runs the hand-off. logoFlare hides the logo
  // element until the hand-off and flares its pixels (4x4 ordered stagger);
  // logoRipple fires the ripple logoRippleAt ms after the hand-off. Off = the
  // site does both, as in v1.11.0.
  logoFlare: false,
  logoRipple: false,
  logoPixels: null,         // selector for the lit pixels, in grid order (default: the heart mask's cells)
  logoFlareMs: 270,         // flare length per pixel
  logoFlareSpread: 160,     // flare stagger across the pixels
  logoRippleAt: 70,         // ripple, ms after the hand-off
  logoFlareIntensity: 0.35, // flare peak brightness above normal (0.65 = ×1.65)
  logoFlareBlur: 10,        // flare glow radius at its peak, px
  // false: the ripple ring pulses (brightness, colour, warp) over a field that
  // is already showing, without the reveal front hiding glyphs or letters.
  rippleGate: true,
  // --- v1.13.0-dev ---
  // overscan: the canvas is drawn larger than the container so the tilt never
  // shows its edge and the vignette sits on what you see. 'auto' = just enough
  // to cover the maximum tilt (+ overscanMargin); a number ≥ 1 = that scale;
  // false = v1.12 (canvas at the container size, scale(1.06)).
  overscan: 'auto',
  // Lift resolve: the heart forms from the field's own cells (decode → fill),
  // each pixel lifts off the glass (M, W, P in turn), glides to the HTML
  // heart's pixel and the HTML takes over on a frame where the two are the
  // same. logoLift = selector of the HTML heart (a 9×7 grid of pixel elements).
  logoLift: null,
  // (Michael's tuning, 25 Nov 2026; the timings it shares with the v1.11
  // resolve are in LIFT_DEFAULTS, applied only when logoLift is set)
  logoOrigin: 'target',     // 'target' forms beside the HTML heart · 'centre' forms mid-field
  logoPinMs: 890,           // decode the letters and fill the cells
  logoLiftHoldMs: 60,       // beat between the fill and the first lift
  logoLiftMs: 920,          // a pixel leaving the glass
  logoStaggerMs: 180,       // M → W → P
  logoRowStagger: 46,       // per row inside a colour
  logoTravelMs: 520,        // glide to the HTML pixel (critically damped, no overshoot)
  logoDepth: 0.17,          // how much a lifted pixel grows toward you
  logoBloom: 1.5,          // phosphor bloom while off the glass (gone by the landing)
  logoQuiet: 0.46,          // calm the field cells around the forming heart
  degaussPurity: 1.3,       // colour-purity blotches during the degauss
  // flat start: the glass is flat while the heart forms, then curves
  logoCurveRamp: true,
  logoCurveFrom: 0,         // curvature at the start
  logoCurveOffset: -150,       // ramp start, ms from the first lift
  logoCurveMs: 1680,         // ramp length
  // Pulse: on the ripple impact the field ramps to pulsePeak (an object of any
  // slider keys) and decays back to where it was. null = no pulse.
  pulsePeak: null,
};
// Lift-resolve values for the options it shares with the v1.11 resolve, so
// the shipped resolve keeps its approved timings.
const LIFT_DEFAULTS = { logoFieldMs: 270, logoHoldMs: 0, degaussOffset: -400, degaussMs: 2570,
  degaussAmp: 1.6, degaussDecay: 7.1, logoRippleAt: -540 };
const SLIDERS = [
  ['rippleDuration', null, 'duration (ms)', 300, 5000, 50, 'RIPPLE'],
  ['rippleColorFalloff', 'uRippleColorFalloff', 'trail curve', 0.1, 6.0, 0.1, 'RIPPLE'],
  ['rippleColorAmbient', 'uRippleColorAmbient', 'trail strength', 0.0, 1.0, 0.01, 'RIPPLE'],
  ['rippleColorStrength', 'uRippleColorStrength', 'colour strength', 0.0, 4.0, 0.05, 'RIPPLE'],
  ['blendMode', 'uBlendMode', 'blend mode', 0, 3, 1, 'RIPPLE', 'select'],
  ['rippleBrightness', 'uRippleBrightness', 'glyph boost', 0.0, 4.0, 0.05, 'RIPPLE'],
  ['rippleBrightnessFalloff','uRippleBrightnessFalloff','glow width', 0.01, 1.5, 0.01, 'RIPPLE'],
  ['rippleFadeOut', null, 'trail fade (ms)', 0, 800, 25, 'RIPPLE'],
  ['rippleCurve', null, 'speed curve', 0, 4, 1, 'RIPPLE', 'select'],
  ['rippleReach', 'uRippleReach', 'reach', 0.5, 5.0, 0.05, 'RIPPLE'],
  ['rippleRingWidth', 'uRippleRingWidth', 'colour ring width', 0.0, 1.5, 0.01, 'RIPPLE SHAPE'],
  ['rippleAspect', 'uRippleAspect', 'shape (wide ↔ tall)', 0.3, 3.0, 0.01, 'RIPPLE SHAPE'],
  ['rippleWobbleFreq', 'uRippleWobbleFreq', 'wobble lobes', 0.2, 4.0, 0.05, 'RIPPLE SHAPE'],
  ['rippleGlass', 'uRippleGlass', 'glow on glass', 0.0, 1.0, 0.01, 'RIPPLE SHAPE'],
  ['rippleEdgeSoft', 'uRippleEdgeSoft', 'outer edge soft', 0.0, 0.5, 0.01, 'RIPPLE SHAPE'],
  ['rippleInnerFalloff', 'uRippleInnerFalloff', 'inner edge soft', 0.0, 1.0, 0.01, 'RIPPLE SHAPE'],
  ['rippleHotCore', 'uRippleHotCore', 'hot core', 0.0, 1.0, 0.01, 'RIPPLE SHAPE'],
  ['rippleEchoes', 'uRippleEchoes', 'echo rings', 0, 3, 1, 'RIPPLE SHAPE'],
  ['rippleEchoGap', 'uRippleEchoGap', 'echo gap', 0.02, 0.8, 0.01, 'RIPPLE SHAPE'],
  ['rippleEchoDecay', 'uRippleEchoDecay', 'echo fade', 0.0, 1.0, 0.01, 'RIPPLE SHAPE'],
  ['rippleColorMode', 'uRippleColorMode', 'distribution', 0, 5, 1, 'RIPPLE COLOUR', 'select'],
  ['rippleColorScale', 'uRippleColorScale', 'colour spread', 0.1, 4.0, 0.05, 'RIPPLE COLOUR'],
  ['rippleColorOffset', 'uRippleColorOffset', 'palette shift', 0.0, 1.0, 0.01, 'RIPPLE COLOUR'],
  ['rippleColorSpin', 'uRippleColorSpin', 'colour cycle', 0.0, 3.0, 0.05, 'RIPPLE COLOUR'],
  ['rippleColorBlend', 'uRippleColorBlend', 'band blend', 0.0, 1.0, 0.01, 'RIPPLE COLOUR'],
  ['aftershock', null, 'enabled', null, null, null, 'AFTERSHOCK', 'bool'],
  ['aftershockTriggerAt', null, 'trigger at', 0.0, 1.0, 0.05, 'AFTERSHOCK'],
  ['aftershockDelay', null, 'delay (ms)', 0, 2000, 25, 'AFTERSHOCK'],
  ['aftershockDuration', null, 'duration (ms)', 100, 3000, 50, 'AFTERSHOCK'],
  ['aftershockStrength', 'uAftershockStrength', 'strength', 0.0, 2.0, 0.05, 'AFTERSHOCK'],
  ['aftershockReach', 'uAftershockReach', 'reach (0 = ripple)', 0.0, 5.0, 0.05, 'AFTERSHOCK'],
  ['aftershockWidth', 'uAftershockWidth', 'ring width (0 = ripple)', 0.0, 1.5, 0.01, 'AFTERSHOCK'],
  ['aftershockTrail', 'uAftershockTrail', 'trail', 0.0, 1.0, 0.01, 'AFTERSHOCK'],
  ['aftershockColorShift', 'uAftershockColorShift', 'palette shift', 0.0, 1.0, 0.01, 'AFTERSHOCK'],
  ['rippleWobble', 'uRippleWobble', 'wave wobble', 0.0, 1.0, 0.05, 'RIPPLE FX'],
  ['rippleWarp', 'uRippleWarp', 'shock warp', 0.0, 1.0, 0.05, 'RIPPLE FX'],
  ['impactBurst', 'uImpactBurst', 'impact burst', 0.0, 4.0, 0.05, 'RIPPLE FX'],
  ['pulseAttackMs', null, 'attack (ms)', 0, 800, 10, 'PULSE'],
  ['pulseHoldMs', null, 'hold (ms)', 0, 2000, 10, 'PULSE'],
  ['pulseDecayMs', null, 'decay (ms)', 100, 5000, 50, 'PULSE'],
  ['rasterBloom', null, 'raster bloom', 0.0, 0.04, 0.001, 'PULSE'],
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
  ['brandMode', 'uBrandMode', 'mode', 0, 3, 1, 'BRAND', 'select'],
  ['brandStrength', 'uBrandStrength', 'opacity', 0.0, 1.0, 0.01, 'BRAND'],
  ['brandSpeed', 'uBrandSpeed', 'speed', 0.0, 2.0, 0.01, 'BRAND'],
  ['brandSoftness', 'uBrandSoftness', 'crossfade', 0.0, 1.0, 0.01, 'BRAND'],
  ['brandScale', 'uBrandScale', 'sweep scale', 0.0, 4.0, 0.05, 'BRAND'],
  ['brandAngle', 'uBrandAngle', 'sweep angle', 0.0, 1.0, 0.01, 'BRAND'],
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
  ['chromaticAberration', 'uChromaticAberration', 'chroma split', 0.0, 4.0, 0.05, 'FIELD FX'],
  ['dither', 'uDither', 'dither', 0.0, 4.0, 0.1, 'FIELD FX'],
  ['overscanMargin', null, 'overscan margin', 0.0, 0.3, 0.005, 'FIELD FX'],
];
const SELECT_OPTIONS = {
  blendMode: ['screen','add','overlay','soft'],
  brandMode: ['off','whole field','gradient sweep','per glyph'],
  rippleCurve: ['linear','ease in-out','ease out','expo out','cubic in-out'],
  rippleColorMode: ['vertical','horizontal','radial bands','around origin','over time','per glyph'],
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
uniform float uBrandMode;
uniform float uBrandStrength;
uniform float uBrandSpeed;
uniform float uBrandSoftness;
uniform float uBrandScale;
uniform float uBrandAngle;
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
uniform float uRippleReach;
uniform float uRippleRingWidth;
uniform float uRippleEdgeSoft;
uniform float uRippleHotCore;
uniform float uRippleEchoes;
uniform float uRippleEchoGap;
uniform float uRippleEchoDecay;
uniform float uRippleColorMode;
uniform float uRippleColorScale;
uniform float uRippleColorOffset;
uniform float uRippleColorSpin;
uniform float uRippleColorBlend;
uniform float uRippleAspect;
uniform float uRippleInnerFalloff;
uniform float uRippleWobbleFreq;
uniform float uRippleGlass;
uniform float uAftershockReach;
uniform float uAftershockWidth;
uniform float uAftershockTrail;
uniform float uAftershockColorShift;
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
return 1.0 + (sin(ang * 5.0 * uRippleWobbleFreq + iTime * 1.7) * 0.6
+ sin(ang * 9.0 * uRippleWobbleFreq - iTime * 2.3) * 0.4) * uRippleWobble * 0.07;
}
vec3 blendGlow(vec3 base, vec3 glow){
if(uBlendMode < 0.5) return 1.0 - (1.0 - base) * (1.0 - glow);
if(uBlendMode < 1.5) return base + glow;
if(uBlendMode < 2.5) return mix(2.0*base*glow, 1.0-2.0*(1.0-base)*(1.0-glow), step(vec3(0.5), base));
return (1.0 - 2.0*glow) * base * base + 2.0 * glow * base;
}
// v1.13.0-dev ripple shape + colour. Defaults reproduce the v1.12 ring.
float rippleLead(float edge){
return uRippleEdgeSoft > 0.0001 ? smoothstep(-uRippleEdgeSoft, 0.0, edge) : step(0.0, edge);
}
float rippleRingW(float edge, float w){
float rw = w > 0.0001 ? w : (uRippleRingWidth > 0.0001 ? uRippleRingWidth : uRippleBrightnessFalloff);
float ib = rw * (1.0 - clamp(uRippleInnerFalloff, 0.0, 1.0));
float r = rippleLead(edge) * (1.0 - smoothstep(ib, rw + 0.0001, edge));
for(int n = 1; n <= 3; n++){
if(float(n) > uRippleEchoes + 0.5) break;
float e = edge - float(n) * uRippleEchoGap;
r += rippleLead(e) * (1.0 - smoothstep(ib, rw + 0.0001, e)) * pow(uRippleEchoDecay, float(n));
}
return r;
}
float rippleRing(float edge){ return rippleRingW(edge, 0.0); }
vec3 palette3(float t){
float tt = mod(t, 3.0);
float i = floor(tt); float f = tt - i;
float b = uRippleColorBlend;
float w = clamp((f - 0.5 * (1.0 - b)) / max(b, 0.001), 0.0, 1.0);
vec3 a = i < 0.5 ? uRippleColor0 : (i < 1.5 ? uRippleColor1 : uRippleColor2);
vec3 c = i < 0.5 ? uRippleColor1 : (i < 1.5 ? uRippleColor2 : uRippleColor0);
return mix(a, c, w);
}
vec3 rippleTint(vec2 uv, float dist, float prog, float ring, float shift){
float t;
if(uRippleColorMode < 0.5) t = 2.0 - 2.0 * clamp(uv.y, 0.0, 1.0);
else if(uRippleColorMode < 1.5) t = 2.0 * clamp(uv.x, 0.0, 1.0);
else if(uRippleColorMode < 2.5) t = dist * 3.0;
else if(uRippleColorMode < 3.5){ vec2 d = uv - uRippleOrigin; d.x *= iResolution.z; d.y *= uRippleAspect; t = (atan(d.y, d.x + 0.0001) / 6.2831853 + 0.5) * 3.0; }
else if(uRippleColorMode < 4.5) t = prog * 3.0;
else { vec2 pg = uGridMul * 15.0; vec2 cs = floor(uv * uScale * pg) / pg; t = floor(hash21(cs * 5.31 + 0.7) * 3.0); }
t = t * uRippleColorScale + (uRippleColorOffset + shift) * 3.0 + iTime * uRippleColorSpin;
return mix(palette3(t), vec3(1.0), clamp(ring, 0.0, 1.0) * uRippleHotCore);
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
dh.y *= uRippleAspect;
float dist = length(dh);
float radius = uRippleProgress * uRippleReach * ringWobble(dh);
float buildHash = hash21(s * 43.7 + vec2(1.23, 4.56));
float edge = radius - dist;
loadFactor = smoothstep(-0.05 - buildHash * 0.35, 0.25, edge);
intensity *= loadFactor;
float ringBoost = rippleLead(edge)
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
// Cycles raspberry -> coral -> teal -> raspberry. phase advances by 1 per
// colour; uBrandSoftness controls how much of each step is spent crossfading
// (0 = hard cuts, 1 = continuous blend).
vec3 brandColor(float phase){
float t = fract(phase / 3.0) * 3.0;
float i = floor(t);
float f = t - i;
float soft = max(uBrandSoftness, 0.001);
float w = smoothstep(0.0, 1.0, clamp((f - (1.0 - soft)) / soft, 0.0, 1.0));
vec3 a = i < 0.5 ? uRippleColor0 : (i < 1.5 ? uRippleColor1 : uRippleColor2);
vec3 b = i < 0.5 ? uRippleColor1 : (i < 1.5 ? uRippleColor2 : uRippleColor0);
return mix(a, b, w);
}
void main(){
time = iTime * 0.333333;
vec2 uv = vUv;
if(uCurvature != 0.0){ uv = barrel(uv); }
if(uRippleWarp > 0.001){
vec2 wdh = uv - uRippleOrigin;
wdh.x *= iResolution.z;
wdh.y *= uRippleAspect;
float wdist = max(length(wdh), 0.0001);
float warp = 0.0;
if(uRippleActive > 0.5 && uRippleProgress > 0.001){
float wedge = uRippleProgress * uRippleReach * ringWobble(wdh) - wdist;
warp += smoothstep(0.3, 0.0, abs(wedge)) * uRippleFade;
}
if(uAftershockActive > 0.5 && uAftershockProgress > 0.001){
float awedge = uAftershockProgress * (uAftershockReach > 0.0001 ? uAftershockReach : uRippleReach) * ringWobble(wdh) - wdist;
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
if (uBrandMode > 0.5 && uBrandStrength > 0.001) {
float bt = iTime * uBrandSpeed;
float phase;
if (uBrandMode < 1.5) {
phase = bt;                                   // whole field
} else if (uBrandMode < 2.5) {
float ang = uBrandAngle * 6.2831853;
vec2 bdir = vec2(cos(ang), sin(ang));
vec2 bo = uv - 0.5; bo.x *= iResolution.z;
phase = bt + dot(bo, bdir) * uBrandScale * 3.0;   // gradient sweep
} else {
vec2 bgrid = uGridMul * 15.0;
vec2 bs = floor(uv * uScale * bgrid) / bgrid;
phase = bt + fract(sin(dot(bs, vec2(12.9898, 78.233))) * 43758.5453) * 3.0;
}
col = mix(col, mix(uBgColor, brandColor(phase), blend), uBrandStrength);
}
if (uRippleActive > 0.5 && uRippleProgress > 0.001) {
vec2 dh = uv - uRippleOrigin;
dh.x *= iResolution.z;
dh.y *= uRippleAspect;
float dist = length(dh);
float radius = uRippleProgress * uRippleReach * ringWobble(dh);
float edge = radius - dist;
float isRevealed = smoothstep(0.05, -0.05, dist - radius);
float ringStr = rippleRing(edge);
float colorAge = clamp(dist / max(radius, 0.001), 0.0, 1.0);
float trailStr = pow(1.0 - colorAge, uRippleColorFalloff) * isRevealed * uRippleColorAmbient;
float totalStr = clamp(ringStr + trailStr, 0.0, 1.0) * uRippleColorStrength * uRippleFade;
vec3 flashCol = rippleTint(uv, dist, uRippleProgress, ringStr, 0.0);
vec3 screened = blendGlow(col, flashCol * totalStr);
col = mix(col, screened, max(blend, uRippleGlass));
col = clamp(col, 0.0, 1.0);
}
if (uAftershockActive > 0.5 && uAftershockProgress > 0.001) {
vec2 adh = uv - uRippleOrigin;
adh.x *= iResolution.z;
adh.y *= uRippleAspect;
float adist = length(adh);
float aradius = uAftershockProgress * (uAftershockReach > 0.0001 ? uAftershockReach : uRippleReach) * ringWobble(adh);
float aedge = aradius - adist;
float aringStr = rippleRingW(aedge, uAftershockWidth);
float aage = clamp(adist / max(aradius, 0.001), 0.0, 1.0);
float atrail = pow(1.0 - aage, uRippleColorFalloff) * smoothstep(0.05, -0.05, adist - aradius) * uAftershockTrail;
float atotalStr = clamp(aringStr + atrail, 0.0, 1.0) * uAftershockStrength;
vec3 aflashCol = rippleTint(uv, adist, uAftershockProgress, aringStr, uAftershockColorShift);
vec3 ascreened = blendGlow(col, aflashCol * atotalStr);
col = mix(col, ascreened, max(blend, uRippleGlass));
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
// ---------------------------------------------------------------------------
// v1.11.0 shader features: grid lock, ungated ripple, logo resolve.
// They are spliced into the v1.10.1 source above only when an option asks for
// them. With every new option off the program is built from fragmentShader
// unchanged, character for character, so the frames are v1.10.1's.
// ---------------------------------------------------------------------------
const LOGO_UNIFORMS = `uniform float uLogoOn;
uniform float uLogoP;
uniform float uLogoD;
uniform float uLogoPPC;
uniform vec2  uLogoOrigin;
uniform float uLogoCellPx;
uniform float uLogoPitch;
uniform float uLogoSize;
uniform float uLogoSpread;
uniform float uDegAmp;
uniform float uDegDecay;
uniform float uSlotScale;`;
// The logo resolve, productised from the approved prototype patch
// (Claude outputs/heart-resolve-prototype.patch). pf is the field position in
// grid-shifted units; uLogoOrigin is the top-left of the cell holding the
// heart's top-left pixel, in the same units. Lengths in CSS px.
const LOGO_GLSL = `
// 4x4 ordered stagger. This is the prototype's formula as approved; note its
// values repeat (it is not a strict Bayer permutation), which is part of the
// approved timing feel at logoSpread 0.41.
float bayer4(vec2 c){
vec2 a = mod(floor(c), 4.0);
float x = a.x, y = a.y;
float b = mod(x,2.0)*2.0 + mod(y,2.0)*3.0 - 2.0*mod(x,2.0)*mod(y,2.0);
float b2 = mod(floor(x/2.0),2.0)*2.0 + mod(floor(y/2.0),2.0)*3.0 - 2.0*mod(floor(x/2.0),2.0)*mod(floor(y/2.0),2.0);
return (b*4.0 + b2) / 16.0;
}
float heartCode(float col, float row){
if(col < 0.0 || col > 8.0 || row < 0.0 || row > 6.0) return 0.0;
vec2 m = heartRowMasks(row);
return mod(floor(m.x / exp2(col) + 0.01), 2.0) + mod(floor(m.y / exp2(col) + 0.01), 2.0) * 2.0;
}
vec3 codeColor(float code){
return code > 2.5 ? uRippleColor1 : (code > 1.5 ? uRippleColor2 : uRippleColor0);
}
float rboxCov(vec2 p, vec2 a, vec2 b, float r, float aa){
vec2 c = (a + b) * 0.5; vec2 h = max((b - a) * 0.5, vec2(0.0));
r = min(r, min(h.x, h.y));
vec2 q = abs(p - c) - h + r;
float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
return 1.0 - smoothstep(-aa, aa, d);
}
float pixQ(float col, float row){
float spread = uLogoSpread;
float d = bayer4(vec2(col, row)) * spread + hash21(vec2(col, row) * 3.7) * 0.03;
return clamp((uLogoP - d) / max(1.0 - spread - 0.03, 0.05), 0.0, 1.0);
}
vec3 logoPass(vec2 pf, vec3 fieldCol){
vec2 grid = uGridMul * 15.0;
vec2 g = pf * grid; vec2 o = uLogoOrigin * grid;
vec2 cd = vec2(g.x - o.x, o.y - g.y);
float ppc = uLogoPPC;
float lGap = uLogoPitch - uLogoSize;
float cellsW = ceil((9.0 * uLogoPitch - lGap) / uLogoCellPx), cellsH = ceil((7.0 * uLogoPitch) / uLogoCellPx);
if(cd.x < 0.0 || cd.y < 0.0 || cd.x >= cellsW || cd.y >= cellsH) return fieldCol;
vec2 cell = floor(cd); vec2 lc = cd - cell;
float pxU = 1.0 / uLogoCellPx;
float anyH = 0.0, qSum = 0.0;
for(int a = 0; a < 2; a++) for(int b = 0; b < 2; b++){
if(float(a) < ppc && float(b) < ppc){
float cc = cell.x * ppc + float(a), rr = cell.y * ppc + float(b);
if(heartCode(cc, rr) > 0.5){ anyH += 1.0; qSum += pixQ(cc, rr); }
}
}
if(anyH < 0.5) return fieldCol;
float qCell = qSum / anyH;
float jx = clamp(floor(lc.x * uLogoCellPx / uLogoPitch), 0.0, ppc - 1.0);
float jy = clamp(floor((lc.y * uLogoCellPx - lGap) / uLogoPitch), 0.0, ppc - 1.0);
float col = cell.x * ppc + jx, row = cell.y * ppc + jy;
float code = heartCode(col, row);
float isH = step(0.5, code);
float q = isH > 0.5 ? pixQ(col, row) : qCell;
float lock = smoothstep(0.0, 0.20, q);
float on   = smoothstep(0.15, 0.55, q);
float fill = smoothstep(0.50, 0.90, q);
float colT = smoothstep(0.30, 1.00, q);
float dt   = clamp(uLogoD, 0.0, 1.0);
float dEnv = exp(-uDegDecay * dt) * (1.0 - dt) * step(0.0001, dt) * uDegAmp;
float osc  = mix(1.0, cos(dt * 3.14159 * 4.5), clamp(uDegAmp, 0.0, 1.0));
float morph = dt <= 0.0 ? 0.0 : clamp(1.0 - exp(-uDegDecay * 1.5 * dt) * osc * (1.0 - dt), 0.0, 1.6);
float hy = cell.y * ppc + lc.y * ppc;
float hx = cell.x * ppc + lc.x * ppc;
lc.x += sin(hy * 1.7 - dt * 26.0) * dEnv * 3.0 * pxU;
lc.y += sin(hx * 1.3 + dt * 19.0) * dEnv * 1.5 * pxU;
vec2 tMin = vec2(jx * uLogoPitch, lGap + jy * uLogoPitch) * pxU;
vec2 tMax = tMin + uLogoSize * pxU;
vec2 tc = (tMin + tMax) * 0.5, th = (tMax - tMin) * 0.5;
vec2 sMin = tc - th * uSlotScale, sMax = tc + th * uSlotScale;
vec2 mn = mix(sMin, tMin, morph), mx = mix(sMax, tMax, morph);
vec2 u = (lc - sMin) / max(sMax - sMin, vec2(1e-4));
float px5 = lc.x * uDigitSize * 5.0;
float py5 = (lc.y - (1.0 - 1.0 / uDigitSize)) * uDigitSize * 5.0;
float pxN = isH > 0.5 ? u.x * 3.0 : px5;
float pyN = isH > 0.5 ? u.y * 3.0 : py5;
float nMax = isH > 0.5 ? 2.0 : 4.0;
float j = floor(pxN), i = floor(pyN);
float x = fract(pxN), y = fract(pyN);
float inGlyph = step(0.0, j) * step(j, nMax) * step(0.0, i) * step(i, nMax);
float tick = floor(iTime * 9.0);
float lit = step(hash21(vec2(col, row) * 5.17 + cell * 7.13 + vec2(i, j) * 1.31 + vec2(tick * 0.37, tick * 0.11)), mix(0.35, 1.0, on));
float dotB = mix((0.2 + y * 0.8) * (0.75 + x * 0.25), 1.0, fill) * lit * inGlyph;
float rad = 3.0 * pxU * mix(fill * 0.5, 1.0, clamp(morph, 0.0, 1.0)), aa = 0.8 * pxU;
vec2 ca = vec2(cos(dt * 31.0), sin(dt * 23.0)) * dEnv * 4.0 * pxU;
float covR = rboxCov(lc + ca, mn, mx, rad, aa);
float covG = rboxCov(lc, mn, mx, rad, aa);
float covB = rboxCov(lc - ca, mn, mx, rad, aa);
float inSub = step(sMin.x, lc.x) * step(lc.x, sMax.x) * step(sMin.y, lc.y) * step(lc.y, sMax.y);
vec3 shape = mix(vec3(dotB * inSub), vec3(covR, covG, covB), fill);
vec3 dimC = uTint * 1.7;
vec3 brand = codeColor(code);
vec3 nb = codeColor(code > 2.5 ? 2.0 : (code > 1.5 ? 1.0 : 3.0));
brand = mix(brand, nb, clamp(sin(dt * 17.0 + hx * 0.6) * dEnv * 0.9, 0.0, 1.0));
float lev = mix(0.22, 1.0, colT);
vec3 tgt = mix(dimC, brand, colT);
vec3 mine = uBgColor + (tgt - uBgColor) * shape * lev;
vec3 empty = mix(uBgColor, dimC, dotB * 0.22 * (1.0 - on));
vec3 res = isH > 0.5 ? mine : empty;
return mix(fieldCol, res, lock);
}
`;
const LIFT_UNIFORMS = `uniform float uLiftOn;
uniform vec2  uLiftCell;
uniform float uLiftPin;
uniform float uLiftT;
uniform vec2  uLiftStag;
uniform float uLiftQuiet;
uniform float uDegEnv;
uniform float uDegPh;
uniform float uDegPur;`;
// v1.13.0-dev lift resolve, field side. uLiftCell = grid cell of the heart's
// top-left pixel (rows count down, so row r sits in cell y = uLiftCell.y - r).
// Each heart pixel is one field cell: it decodes to its letter (M raspberry,
// W coral, P teal), fills solid, then goes dark the moment it lifts — the
// phosphor buffer keeps its ghost. The degauss shakes the glass and blots its
// colour purity; lifted pixels (drawn off the glass) are spared both.
const LIFT_GLSL = `
vec2 degaussShift(vec2 v){
float f = uDegPh * 0.045;
float dx = sin(v.y * 31.0 + f) * 0.0045 + sin(v.y * 7.0 - f * 0.41) * 0.0035;
float dy = sin(v.x * 11.0 + f * 0.53) * 0.0018;
return vec2(dx, dy) * uDegEnv;
}
vec3 degaussPurity(vec2 v, vec3 c){
if(uDegEnv < 0.0001 || uDegPur < 0.001) return c;
vec2 q = v * vec2(2.6, 1.7);
float ph = uDegPh * 0.0016;
vec3 b = vec3(sin(q.x * 1.9 + ph + sin(q.y * 2.3 - ph * 0.7) * 1.3),
sin(q.y * 2.1 - ph * 0.8 + 2.1 + sin(q.x * 1.7) * 1.1),
sin((q.x - q.y) * 1.6 + ph * 0.6 + 4.2)) * 0.5 + 0.5;
b /= max(dot(b, vec3(0.33333)), 0.001);
float k = clamp(uDegEnv * uDegPur, 0.0, 1.2);
vec3 lit = c - uBgColor;
return clamp(uBgColor * (1.0 + (b - 1.0) * k * 0.08) + lit * mix(vec3(1.0), b * 1.2, k * 0.8), 0.0, 1.0);
}
float liftCode(float col, float row){
if(col < 0.0 || col > 8.0 || row < 0.0 || row > 6.0) return 0.0;
vec2 m = heartRowMasks(row);
return mod(floor(m.x / exp2(col) + 0.01), 2.0) + mod(floor(m.y / exp2(col) + 0.01), 2.0) * 2.0;
}
vec3 liftPass(vec2 pf, vec3 fieldCol){
vec2 grid = uGridMul * 15.0;
vec2 g = pf * grid;
vec2 cell = floor(g);
float col = cell.x - uLiftCell.x;
float row = uLiftCell.y - cell.y;
if(col < -1.0 || col > 9.0 || row < -1.0 || row > 7.0) return fieldCol;
vec3 quiet = mix(fieldCol, uBgColor, uLiftQuiet);
float code = liftCode(col, row);
if(code < 0.5) return quiet;
float grp = code > 2.5 ? 1.0 : (code > 1.5 ? 2.0 : 0.0);
if(uLiftT >= grp * uLiftStag.x + row * uLiftStag.y) return quiet;
float d = hash21(vec2(col, row) * 3.7) * 0.25 + col / 8.0 * 0.2;
float q = clamp((uLiftPin - d) / 0.55, 0.0, 1.0);
if(q <= 0.0) return quiet;
vec2 gp = (g - cell) * uDigitSize;
float inG = step(gp.x, 1.0) * step(gp.y, 1.0);
float px5 = gp.x * 5.0, py5 = (1.0 - gp.y) * 5.0;
float j = floor(px5), i = floor(py5);
float x = fract(px5), y = fract(py5);
float decode = smoothstep(0.0, 0.45, q);
float fill = smoothstep(0.45, 1.0, q);
float tick = floor(iTime * 40.0);
float scr = step(0.5, hash21(vec2(i, j) * 1.7 + cell * 0.31 + vec2(tick * 0.13, tick * 0.07)));
float letter = getCharBit(grp, i, j);
float bit = mix(scr, letter, step(hash21(cell * 1.31 + vec2(tick * 0.071, 3.1)), decode * 1.15));
bit = max(bit, step(hash21(vec2(i, j) * 2.3 + cell * 0.7), fill * 1.1));
float dotB = mix((0.2 + y * 0.8) * (0.75 + x * 0.25), 1.0, fill) * bit;
float shape = mix(dotB, 1.0, smoothstep(0.8, 1.0, fill)) * inG;
vec3 brand = code > 2.5 ? uRippleColor1 : (code > 1.5 ? uRippleColor2 : uRippleColor0);
vec3 tgt = mix(uTint * 1.6, brand, smoothstep(0.15, 0.7, q));
float lev = mix(0.35, 1.0, decode);
float scan = 1.0 - 0.38 * step(mod(gl_FragCoord.y, 3.0), 1.0) * fill;
vec3 base = mix(fieldCol, uBgColor, max(uLiftQuiet, smoothstep(0.0, 0.25, q)));
return mix(base, tgt * scan, clamp(shape * lev, 0.0, 1.0));
}
`;
function spliceShader(src, anchor, replacement){
  if(src.indexOf(anchor) < 0) throw new Error('[faulty-terminal] shader anchor not found: ' + anchor.slice(0, 48));
  return src.replace(anchor, () => replacement);
}
// f: { grid, gate, logo } — which features this instance compiles in.
function buildFragmentShader(f){
  if(!f.grid && !f.gate && !f.logo && !f.lift && !f.overscan) return fragmentShader;
  let s = fragmentShader;
  const decl = [];
  if(f.grid) decl.push('uniform vec2  uGridShift;');
  if(f.gate) decl.push('uniform float uRippleGate;');
  if(f.logo) decl.push(LOGO_UNIFORMS);
  if(f.lift) decl.push(LIFT_UNIFORMS);
  if(f.overscan) decl.push('uniform float uOverscan;');
  s = spliceShader(s, 'uniform float uMwpGlitch;\n', 'uniform float uMwpGlitch;\n' + decl.join('\n') + '\n');
  if(f.grid){
    // Cell edges move with uGridShift. digit() and the MWP-letter overlay
    // sample the same shifted p; the per-glyph brand colour follows the same
    // cells so a glyph never splits into two colours.
    s = spliceShader(s, 'float digit(vec2 p){\n', 'float digit(vec2 p){\np += uGridShift;\n');
    s = spliceShader(s, 'vec2 s_c = floor(p * grid_c) / grid_c;\nvec2 pc = fract(p * grid_c) * uDigitSize;',
      'vec2 pS = p + uGridShift;\nvec2 s_c = floor(pS * grid_c) / grid_c;\nvec2 pc = fract(pS * grid_c) * uDigitSize;');
    s = spliceShader(s, 'vec2 bs = floor(uv * uScale * bgrid) / bgrid;',
      'vec2 bs = floor((uv * uScale + uGridShift) * bgrid) / bgrid;');
  }
  if(f.gate){
    // uRippleGate 1 = the v1.10.1 reveal; 0 = the ring pulses over a field
    // that is already showing (no reveal front on glyphs or MWP letters).
    s = spliceShader(s, 'loadFactor = smoothstep(-0.05 - buildHash * 0.35, 0.25, edge);',
      'loadFactor = mix(1.0, smoothstep(-0.05 - buildHash * 0.35, 0.25, edge), uRippleGate);');
    s = spliceShader(s, 'if(uMwpReveal >= 0.999) return 1.0;',
      'if(uMwpReveal >= 0.999 || uRippleGate < 0.5) return 1.0;');
  }
  if(f.logo){
    s = spliceShader(s, '\nvoid main(){\n', LOGO_GLSL + 'void main(){\n');
    s = spliceShader(s, 'if(uVignette > 0.001){\nvec2 vq',
      'if(uLogoOn > 0.5) col = logoPass(' + (f.grid ? 'p + uGridShift' : 'p') + ', col);\nif(uVignette > 0.001){\nvec2 vq');
  }
  if(f.lift){
    s = spliceShader(s, '\nvoid main(){\n', LIFT_GLSL + 'void main(){\n');
    s = spliceShader(s, 'vec2 uv = vUv;\n', 'vec2 uv = vUv;\nif(uDegEnv > 0.0001) uv += degaussShift(vUv);\n');
    s = spliceShader(s, 'if(uVignette > 0.001){\nvec2 vq',
      'if(uLiftOn > 0.5) col = liftPass(' + (f.grid ? 'p + uGridShift' : 'p') + ', col);\ncol = degaussPurity(vUv, col);\nif(uVignette > 0.001){\nvec2 vq');
  }
  if(f.overscan){
    // vignette on the visible area, not the oversized canvas
    s = spliceShader(s, 'vec2 vq = vUv - 0.5;', 'vec2 vq = (vUv - 0.5) * uOverscan;');
  }
  return s;
}
// Barrel mapping shared with the shader: screen uv -> sampled uv.
function barrelUv(u, v, k){
  const cx = u * 2 - 1, cy = v * 2 - 1, r2 = cx * cx + cy * cy;
  return [(cx * (1 + k * r2)) * 0.5 + 0.5, (cy * (1 + k * r2)) * 0.5 + 0.5];
}
// The tilt transform scales the canvas by 1.06 about its centre.
const TILT_SCALE = 1.06;
// setParam keys for the v1.11.0 uniforms (only present when compiled in).
// Logo-resolve options the debug panel may change live.
const LOGO_OPTION_KEYS = { logoFieldMs:1, logoHoldMs:1, logoResolveMs:1, logoSpread:1, degaussOffset:1,
  degaussMs:1, degaussAmp:1, degaussDecay:1, logoSlot:1, logoHandOffset:1, logoFlareMs:1,
  logoFlareSpread:1, logoRippleAt:1, logoFlareIntensity:1, logoFlareBlur:1 };
function safeQueryAll(root, sel){
  try{ return [].slice.call(root.querySelectorAll(sel)); }
  catch(e){ console.warn('[faulty-terminal] ignoring invalid selector:', sel); return null; }
}
// Lift-resolve options the debug panel / demo may change live.
const LIFT_OPTION_KEYS = { logoCurveRamp:1, logoCurveFrom:1, logoCurveOffset:1, logoCurveMs:1, logoOrigin:1, logoFieldMs:1, logoHoldMs:1, logoPinMs:1, logoLiftHoldMs:1, logoLiftMs:1,
  logoStaggerMs:1, logoRowStagger:1, logoTravelMs:1, logoDepth:1, logoBloom:1, logoQuiet:1, degaussOffset:1,
  degaussMs:1, degaussAmp:1, degaussDecay:1, degaussPurity:1, logoRippleAt:1 };
const FEATURE_PARAMS = { rippleGate: 'uRippleGate', logoSpread: 'uLogoSpread', logoSlot: 'uSlotScale',
  degaussAmp: 'uDegAmp', degaussDecay: 'uDegDecay' };
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function hexToRgb(hex, fallback){
  let h = (hex||'').replace('#','').trim();
  if(!HEX_RE.test(h)){
    // A malformed colour used to reach parseInt and yield NaN, which the shader
    // rendered as a black field. Refuse it instead.
    if(hex) console.warn('[faulty-terminal] ignoring invalid colour:', hex);
    return hexToRgb(fallback || '#000000');
  }
  if(h.length===3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h,16);
  return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
}
// A CSS selector that does not parse throws inside querySelector. One bad value
// must not take the whole reveal down with it.
function safeQuery(sel){
  if(!sel) return null;
  try{ return document.querySelector(sel); }
  catch(e){ console.warn('[faulty-terminal] ignoring invalid selector:', sel); return null; }
}
const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,v));
const fmt = (v,step) => step < 1 ? (+v).toFixed(2) : String(Math.round(v));
// softwareFallback: WebGL implemented on the CPU. Lighthouse / PageSpeed and
// Googlebot render headless with no GPU, which lands here — as does any real
// visitor whose GPU is blocklisted, who would get a few fps at best.
const SOFTWARE_GL_RE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
function softwareRendererName(gl){
  if(!gl) return 'no WebGL context';
  let name = '';
  try{
    name = String(gl.getParameter(gl.RENDERER) || '');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if(ext) name += ' | ' + String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
  }catch(e){}
  return SOFTWARE_GL_RE.test(name) ? name : '';
}
let staticNoticeShown = false;
// A static instance keeps the public instance shape; every method is a no-op.
function createStaticInstance(ctn, opts, reason, bg){
  ctn.classList.add('ft-static');
  if(!staticNoticeShown){
    staticNoticeShown = true;
    console.info('[faulty-terminal] software WebGL (' + reason + ') — showing the static background. ' +
      'Set softwareFallback: false to render anyway.');
  }
  const api = {
    ctn, opts, static: true, hasRipple: false,
    setParam(key, val){ opts[key] = val; },
    getParam(key){ return opts[key]; },
    retrigger(){},
    ready: null,
    // v1.11.0 API: no-ops. resolveLogo still resolves and fires its event so a
    // site timeline waiting on it carries on (with its HTML logo showing).
    relayout(){}, setFieldProgress(){}, setLogoProgress(){}, setDegaussProgress(){},
    setLogoVisible(){}, holdFullScale(){},
    resolveLogo(){
      return new Promise(resolve => setTimeout(() => {
        const detail = { instance: api, static: true, reducedMotion: false, skipped: true };
        ctn.dispatchEvent(new CustomEvent('faulty-terminal:logo-resolved', { bubbles: true, detail }));
        resolve(detail);
      }, 0));
    },
  };
  api.ready = new Promise(resolve => {
    // Async, like the animated path, so listeners added right after init() see it.
    setTimeout(() => {
      resolve(api);
      ctn.dispatchEvent(new CustomEvent('faulty-terminal:ready',
        { bubbles: true, detail: { instance: api, static: true } }));
    }, 0);
  });
  return api;
}
function createInstance(ctn, opts){
  let bgHex = opts.bgColor;
  if(!bgHex){
    const v = getComputedStyle(ctn).getPropertyValue('--slate').trim();
    bgHex = v||'#2b464e';
  }
  function cssColor(varName,fallback){
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
           || getComputedStyle(ctn).getPropertyValue(varName).trim();
    return hexToRgb(v||fallback, fallback);
  }
  const rippleC0 = cssColor('--raspberry','#E84F5C');
  const rippleC1 = cssColor('--coral','#F28745');
  const rippleC2 = cssColor('--teal','#3DC096');
  const bg = hexToRgb(bgHex, '#2b464e');
  function paintBg(){
    if(opts.paintBackground===false) return;
    const cur=getComputedStyle(ctn).backgroundColor;
    if(!cur || cur==='transparent' || /^rgba\(.*,\s*0\)$/.test(cur))
      ctn.style.backgroundColor=`rgb(${bg.map(c=>Math.round(c*255)).join(',')})`;
  }
  let renderer, gl;
  if(opts.softwareFallback!==false){
    try{ renderer = new Renderer({ dpr: opts.dpr }); gl = renderer.gl; }
    catch(e){ gl = null; }
    const soft = softwareRendererName(gl);
    if(soft){
      try{ const lose = gl && gl.getExtension('WEBGL_lose_context'); if(lose) lose.loseContext(); }catch(e){}
      paintBg();
      return createStaticInstance(ctn, opts, soft, bg);
    }
  } else {
    renderer = new Renderer({ dpr: opts.dpr });
    gl = renderer.gl;
  }
  gl.clearColor(bg[0],bg[1],bg[2],1);
  paintBg();
  // Resolves (and fires faulty-terminal:ready on the container) once the first
  // frame has been drawn — hook GSAP or page reveals onto this.
  let markReady;
  const ready = new Promise(r=>{ markReady=r; });
  let isReady=false;
  const geometry = new Triangle(gl);
  const tint = hexToRgb(opts.tint, '#366777');
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
  // v1.12.2: 2ms slack, as warmInterval has. Without it a frame that arrives a
  // hair early (16.6ms at 60Hz) was skipped, a dropped frame; at 120Hz the cap
  // could fall to every third frame (40fps) instead of every second (60fps).
  const frameInterval = Math.max(0, 1000/(opts.targetFPS||30) - 2);
  let lastFrame=0, fpsCount=0, fpsWindowStart=0;
  // warmStart state. warmActive: capped/low-res phase in force. warmUntil is
  // measured from init (page life), not from loop start: a loop held back by
  // deferLoop until after it runs at full quality from its first frame.
  const warmOn = opts.warmStart!==false;
  let warmActive = warmOn;
  const warmUntil = performance.now() + Math.max(0, Number(opts.warmStartMs)||0);
  const warmFps = Math.min(30, opts.targetFPS||30);
  // -2ms slack so a 30fps cap lands on every other vsync, not every third.
  const warmInterval = 1000/warmFps - 2;
  const WARM_WINDOW = 500;
  let firstWindow = warmOn;   // next autoTune window is the first — fast back-off
  const warmScale = () => Math.max(opts.renderScaleMin, 0.5);
  // v1.11.0 features. Each one is compiled in only when its option asks for
  // it (see buildFragmentShader), so with all of them off nothing changes.
  const gridOn = !!opts.gridLock;
  let gridEl = gridOn ? safeQuery(opts.gridLock) : null;
  if(gridOn && !gridEl) console.warn('[faulty-terminal] gridLock: no element matches', opts.gridLock, '— the grid locks once relayout() finds it.');
  let logoOn = !!opts.logoResolve;
  if(logoOn && !gridOn){
    console.warn('[faulty-terminal] logoResolve needs gridLock (the logo element) — logo resolve is off.');
    logoOn = false;
  }
  // v1.13.0-dev lift resolve: needs only the HTML heart. The field is already
  // up when the ripple fires, so the ring pulses without the reveal front.
  const liftOn = !!opts.logoLift && !logoOn;
  if(opts.logoLift && logoOn) console.warn('[faulty-terminal] logoLift and logoResolve are both set — using logoResolve.');
  const overscanOn = !(opts.overscan===false || opts.overscan===0 || /^(false|off|0|)$/i.test(String(opts.overscan)));
  let osScale = 1;
  const LIFT={ S:null, e:0, base:0, tStart:-1, speed:1, playing:false, landed:false, rippled:false,
    startedAt:0, el:null, pix:null, cell:[0,0], anchor:[0,0], cv:null, ctx:null, dpr:1, W:0, H:0, promise:null, done:null };
  const gateOn = opts.rippleGate === false || logoOn || liftOn;
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const featureUniforms = {};
  if(gridOn) featureUniforms.uGridShift = {value:new Float32Array([0,0])};
  if(gateOn) featureUniforms.uRippleGate = {value:(opts.rippleGate === false || liftOn) ? 0 : 1};
  if(liftOn) Object.assign(featureUniforms, {
    uLiftOn:{value:0}, uLiftCell:{value:new Float32Array([0,0])}, uLiftPin:{value:0}, uLiftT:{value:-1},
    uLiftStag:{value:new Float32Array([0,0])}, uLiftQuiet:{value:0},
    uDegEnv:{value:0}, uDegPh:{value:0}, uDegPur:{value:opts.degaussPurity??0.6},
  });
  if(overscanOn) featureUniforms.uOverscan = {value:1};
  if(logoOn) Object.assign(featureUniforms, {
    uLogoOn:{value:0},
    uLogoP:{value:0},
    uLogoD:{value:0},
    uLogoPPC:{value:2},
    uLogoOrigin:{value:new Float32Array([0,0])},
    uLogoCellPx:{value:36},
    uLogoPitch:{value:18},
    uLogoSize:{value:16},
    uLogoSpread:{value:opts.logoSpread},
    uDegAmp:{value:opts.degaussAmp},
    uDegDecay:{value:opts.degaussDecay},
    uSlotScale:{value:opts.logoSlot},
  });
  const program = new Program(gl,{
    vertex: vertexShader,
    fragment: buildFragmentShader({ grid: gridOn, gate: gateOn, logo: logoOn, lift: liftOn, overscan: overscanOn }),
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
      uBrandMode:{value:opts.brandMode??0},
      uBrandStrength:{value:opts.brandStrength??0.6},
      uBrandSpeed:{value:opts.brandSpeed??0.15},
      uBrandSoftness:{value:opts.brandSoftness??0.6},
      uBrandScale:{value:opts.brandScale??1},
      uBrandAngle:{value:opts.brandAngle??0.25},
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
      uRippleReach:{value:opts.rippleReach??2.5},
      uRippleRingWidth:{value:opts.rippleRingWidth??0},
      uRippleEdgeSoft:{value:opts.rippleEdgeSoft??0},
      uRippleHotCore:{value:opts.rippleHotCore??0},
      uRippleEchoes:{value:opts.rippleEchoes??0},
      uRippleEchoGap:{value:opts.rippleEchoGap??0.18},
      uRippleEchoDecay:{value:opts.rippleEchoDecay??0.55},
      uRippleColorMode:{value:opts.rippleColorMode??0},
      uRippleColorScale:{value:opts.rippleColorScale??1},
      uRippleColorOffset:{value:opts.rippleColorOffset??0},
      uRippleColorSpin:{value:opts.rippleColorSpin??0},
      uRippleColorBlend:{value:opts.rippleColorBlend??1},
      uRippleAspect:{value:opts.rippleAspect??1},
      uRippleInnerFalloff:{value:opts.rippleInnerFalloff??1},
      uRippleWobbleFreq:{value:opts.rippleWobbleFreq??1},
      uRippleGlass:{value:opts.rippleGlass??0},
      uAftershockReach:{value:opts.aftershockReach??0},
      uAftershockWidth:{value:opts.aftershockWidth??0},
      uAftershockTrail:{value:opts.aftershockTrail??0},
      uAftershockColorShift:{value:opts.aftershockColorShift??0},
      ...featureUniforms,
    }
  });
  const mesh = new Mesh(gl,{geometry,program});
  function targetScaleForSize(w,h){
    const px = w*h*opts.dpr*opts.dpr;
    let s = opts.renderScaleMax;
    if(px*s*s > opts.maxPixels) s = Math.sqrt(opts.maxPixels/px);
    return clamp(s,opts.renderScaleMin,opts.renderScaleMax);
  }
  // v1.12.2: free the old targets before making new ones (they used to leak on
  // every size change, three full-size textures at a time).
  function freeRT(rt){
    if(!rt) return;
    try{
      (rt.textures||[rt.texture]).forEach(t=>{ if(t && t.texture) gl.deleteTexture(t.texture); });
      if(rt.buffer) gl.deleteFramebuffer(rt.buffer);
      if(rt.depthBuffer) gl.deleteRenderbuffer(rt.depthBuffer);
      if(rt.stencilBuffer) gl.deleteRenderbuffer(rt.stencilBuffer);
      if(rt.depthStencilBuffer) gl.deleteRenderbuffer(rt.depthStencilBuffer);
    }catch(e){}
  }
  function makeRTs(){
    const o={width:gl.canvas.width,height:gl.canvas.height,depth:false};
    freeRT(rtScene); freeRT(rtA); freeRT(rtB);
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
  // v1.12.2: a no-op when the drawing size is unchanged. Re-setting the canvas
  // size reallocates its buffer (and makeRTs three more) even at the same size,
  // which cost a visible frame in Safari.
  let sizedW=-1, sizedH=-1, sizedS=-1;
  // overscan 'auto': the smallest canvas scale whose tilted, perspective-
  // projected outline still covers the whole container at the maximum tilt.
  function coverScale(w,h,deg){
    if(!(deg>0)) return 1;
    const P=600, a=deg*Math.PI/180, hw=w/2, hh=h/2;
    function covers(S){
      for(const sx of [-1,1]) for(const sy of [-1,1]){
        const ax=a*sx, ay=a*sy, cX=Math.cos(ax), sX=Math.sin(ax), cY=Math.cos(ay), sY=Math.sin(ay);
        const q=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{
          const x=u*hw*S, y=v*hh*S;
          const x1=x*cY, z1=-x*sY;                 // rotateY
          const y2=y*cX-z1*sX, z2=y*sX+z1*cX;      // rotateX
          const k=P/(P-z2);                        // perspective
          return [x1*k, y2*k];
        });
        for(const [px,py] of [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]){
          for(let i=0;i<4;i++){
            const A=q[i], B=q[(i+1)%4];
            if((B[0]-A[0])*(py-A[1])-(B[1]-A[1])*(px-A[0]) < 0) return false;
          }
        }
      }
      return true;
    }
    let lo=1, hi=2.5;
    if(!covers(hi)) return hi;
    for(let n=0;n<18;n++){ const m=(lo+hi)/2; covers(m)?hi=m:lo=m; }
    return hi;
  }
  function overscanFor(w,h){
    const n=Number(opts.overscan);
    if(isFinite(n) && n>=1) return n;
    const coarse=typeof matchMedia==='function' && matchMedia('(pointer: coarse)').matches;
    const maxDeg=opts.tiltReact ? (tiltStrengthRef*10)*(coarse?1:0.5) : 0;
    return coverScale(w,h,maxDeg) + Math.max(0, Number(opts.overscanMargin)||0);
  }
  // The canvas's scale about the container centre: the overscan, or v1.12's
  // tilt scale(1.06).
  const canvasScale = () => overscanOn ? osScale : (opts.tiltReact ? TILT_SCALE : 1);
  // container 0..1 uv (y up) -> canvas vUv
  const ctnToCanvasUv = (u,v) => overscanOn ? [0.5+(u-0.5)/osScale, 0.5+(v-0.5)/osScale] : [u,v];
  function applySize(){
    const w=Math.max(1,ctn.offsetWidth), h=Math.max(1,ctn.offsetHeight);
    if(overscanOn) osScale=overscanFor(w,h);
    const S=overscanOn?osScale:1;
    const sw=Math.max(1,Math.floor(w*S*renderScale)), sh=Math.max(1,Math.floor(h*S*renderScale));
    if(sw===sizedW && sh===sizedH && S===sizedS) return;
    sizedW=sw; sizedH=sh; sizedS=S;
    renderer.setSize(sw,sh);
    if(overscanOn){
      const cs=gl.canvas.style, pc=(S*100).toFixed(4)+'%', off=(-(S-1)*50).toFixed(4)+'%';
      cs.position='absolute'; cs.width=pc; cs.height=pc; cs.left=off; cs.top=off; cs.maxWidth='none';
      // same on-screen cell pitch as v1.12's scale(1.06) canvas
      program.uniforms.uScale.value=opts.scale*S/TILT_SCALE;
      program.uniforms.uOverscan.value=S;
    } else {
      gl.canvas.style.width='100%'; gl.canvas.style.height='100%';
    }
    program.uniforms.iResolution.value = new Color(gl.canvas.width,gl.canvas.height,gl.canvas.width/gl.canvas.height);
    if(fbProg) makeRTs();
  }
  // logoFullScale: full render scale, autoTune paused, from the start of the
  // logo resolve until the hand-off.
  let fullHold=false;
  function holdFullScale(on){
    on=!!on;
    if(on===fullHold) return;
    fullHold=on;
    if(on){ warmActive=false; renderScale=opts.renderScaleMax; }
    else {
      renderScale=targetScaleForSize(ctn.offsetWidth,ctn.offsetHeight);
      fpsCount=0; fpsWindowStart=0; firstWindow=false;
    }
    applySize();
  }
  function resize(){
    renderScale=targetScaleForSize(ctn.offsetWidth,ctn.offsetHeight);
    if(warmActive) renderScale=Math.min(renderScale,warmScale());
    if(fullHold) renderScale=opts.renderScaleMax;
    applySize();
    if(gridOn) relayout();
    if(liftOn && LIFT.S) liftLayout();
  }
  // gridLock: square cells of gridLockCellPx CSS px on screen, a cell edge on
  // (element left, element top − logo gap). Accounts for the tilt transform's
  // 1.06 scale and the barrel magnification at the element's centre.
  function relayout(geom){
    if(!gridOn) return;
    if(geom && typeof geom==='object'){
      const keys={pitch:'logoPitch',size:'logoSize',cellPx:'gridLockCellPx',pixelsPerCell:'logoPixelsPerCell'};
      Object.keys(keys).forEach(k=>{
        const v=Number(geom[k]!=null?geom[k]:geom[keys[k]]);
        if(isFinite(v) && v>0) opts[keys[k]]=v;
      });
    }
    if(!gridEl || !gridEl.isConnected){
      gridEl=safeQuery(opts.gridLock);
      if(gridEl && gridRO) gridRO.observe(gridEl);
    }
    if(!gridEl) return;
    const cr=ctn.getBoundingClientRect(), er=gridEl.getBoundingClientRect();
    if(cr.width<1 || cr.height<1) return;
    const ts=canvasScale();
    const W=cr.width*ts, H=cr.height*ts;
    const left=cr.left+(cr.width-W)/2, top=cr.top+(cr.height-H)/2;
    const pitch=Number(opts.logoPitch)>0?Number(opts.logoPitch):18;
    const size=Number(opts.logoSize)>0?Math.min(Number(opts.logoSize),pitch):pitch;
    const gap=pitch-size;
    const ppc=Number(opts.logoPixelsPerCell)>=1.5?2:1;
    const cellPx=Number(opts.gridLockCellPx)>0?Number(opts.gridLockCellPx):pitch*ppc;
    const k=Number(program.uniforms.uCurvature.value)||0;
    const sc=Number(program.uniforms.uScale.value)||1;
    const cx=((er.left+er.width/2-left)/W)*2-1, cy=(1-(er.top+er.height/2-top)/H)*2-1;
    const gm=program.uniforms.uGridMul.value;
    gm[0]=W/(sc*15*cellPx*(1+k*(3*cx*cx+cy*cy)));
    gm[1]=H/(sc*15*cellPx*(1+k*(cx*cx+3*cy*cy)));
    const tu=(er.left-left)/W, tv=1-(er.top-gap-top)/H;
    const b=k?barrelUv(tu,tv,k):[tu,tv];
    const gx=b[0]*sc*gm[0]*15, gy=b[1]*sc*gm[1]*15;
    const rx=Math.round(gx), ry=Math.round(gy);
    const sh=program.uniforms.uGridShift.value;
    sh[0]=(rx-gx)/(gm[0]*15); sh[1]=(ry-gy)/(gm[1]*15);
    if(logoOn){
      const u=program.uniforms;
      u.uLogoOrigin.value[0]=rx/(gm[0]*15); u.uLogoOrigin.value[1]=ry/(gm[1]*15);
      u.uLogoCellPx.value=cellPx; u.uLogoPitch.value=pitch; u.uLogoSize.value=size; u.uLogoPPC.value=ppc;
    }
  }
  const gridRO = gridOn ? new ResizeObserver(()=>relayout()) : null;
  if(gridRO && gridEl) gridRO.observe(gridEl);
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
  // The reveal class may be namespaced (…--does-ripple), and it may be applied to
  // an ANCESTOR rather than the container itself. A Webflow interaction targets
  // by class, and a Library install renames the component's own class — so the
  // only stable thing to target is a wrapper the site owns. Accept either.
  const isRippleClass = n =>
    !!n && !!n.classList &&
    [...n.classList].some(c => c === 'does-ripple' || c.endsWith('--does-ripple'));
  const rippleChain = () => {
    const chain = [];
    for(let n = ctn; n && n !== document.documentElement; n = n.parentElement) chain.push(n);
    return chain;
  };
  const hasRippleClass = () => rippleChain().some(isRippleClass);
  function triggerRipple(){
    if(rippleTriggered) return;
    rippleTriggered=true;
    setRippleOrigin();
    program.uniforms.uRippleActive.value=1;
    program.uniforms.uRippleProgress.value=0;
    rippleStartTime=performance.now();
    pulseStart(rippleStartTime);
    releaseLoop();
  }
  function setRippleOrigin(){
    const originEl = safeQuery(opts.rippleOriginSelector) || (liftOn && liftEl()) || ctn;
    const er=(originEl||ctn).getBoundingClientRect();
    const cr=ctn.getBoundingClientRect();
    const o=ctnToCanvasUv((er.left+er.width*0.5-cr.left)/cr.width, 1-(er.top+er.height*0.5-cr.top)/cr.height);
    program.uniforms.uRippleOrigin.value[0]=Math.max(0,Math.min(1,o[0]));
    program.uniforms.uRippleOrigin.value[1]=Math.max(0,Math.min(1,o[1]));
  }
  // Pulse envelope (v1.13.0-dev): on the impact the field ramps to
  // opts.pulsePeak and decays back to the values it had before.
  const PULSE={ on:false, t0:0, keys:[], rest:{}, peak:{}, k:0 };
  function pulseRestore(){
    PULSE.keys.forEach(k=>{ program.uniforms[unifMap[k]].value=PULSE.rest[k]; });
    PULSE.on=false; PULSE.k=0;
  }
  // Hold the field at the peak (the panel's "editing: peak" mode).
  function previewKey(k){
    if(!unifMap[k] || !program.uniforms[unifMap[k]] || !opts.pulsePeak || !isFinite(Number(opts.pulsePeak[k]))) return;
    if(!(k in PULSE.rest)){ const o=Number(opts[k]); PULSE.rest[k]=isFinite(o)?o:Number(program.uniforms[unifMap[k]].value); PULSE.keys.push(k); }
    program.uniforms[unifMap[k]].value=Number(opts.pulsePeak[k]);
  }
  function pulsePreview(on){
    on=!!on;
    if(on===!!PULSE.preview) return;
    if(PULSE.on) pulseRestore();
    PULSE.preview=on;
    if(on){ PULSE.keys=[]; PULSE.rest={}; Object.keys(opts.pulsePeak||{}).forEach(previewKey); PULSE.k=1; }
    else { pulseRestore(); PULSE.keys=[]; PULSE.rest={}; }
  }
  function setPulsePeak(k,v){
    opts.pulsePeak=Object.assign({}, opts.pulsePeak||{});
    if(v===null || v===undefined) delete opts.pulsePeak[k]; else opts.pulsePeak[k]=Number(v);
    if(PULSE.preview){
      if(v===null || v===undefined){ if(k in PULSE.rest){ program.uniforms[unifMap[k]].value=PULSE.rest[k]; delete PULSE.rest[k]; PULSE.keys=PULSE.keys.filter(x=>x!==k); } }
      else previewKey(k);
    }
  }
  function getPulsePeak(k){
    const pk=opts.pulsePeak;
    return pk && isFinite(Number(pk[k])) ? Number(pk[k]) : null;
  }
  function pulseStart(t){
    const pk=opts.pulsePeak;
    if(!pk || typeof pk!=='object' || reducedMotion || PULSE.preview) return;
    if(!PULSE.on){
      PULSE.keys=Object.keys(pk).filter(k=>unifMap[k] && program.uniforms[unifMap[k]] && isFinite(Number(pk[k])));
      PULSE.rest={}; PULSE.keys.forEach(k=>{ const o=Number(opts[k]); PULSE.rest[k]=isFinite(o)?o:Number(program.uniforms[unifMap[k]].value); });
    }
    PULSE.peak={}; PULSE.keys.forEach(k=>{ PULSE.peak[k]=Number(pk[k]); });
    PULSE.on=PULSE.keys.length>0; PULSE.t0=t;
  }
  const PULSE_STEPPED={ brandMode:1, blendMode:1 };
  function pulseStep(t){
    if(!PULSE.on || PULSE.preview) return;
    const A=Math.max(1,Number(opts.pulseAttackMs)||0), Hd=Math.max(0,Number(opts.pulseHoldMs)||0), D=Math.max(1,Number(opts.pulseDecayMs)||0);
    const e=Math.max(0,t-PULSE.t0);   // rAF time can trail performance.now()
    let k;
    if(e<A){ const a=e/A; k=1-(1-a)*(1-a); }
    else if(e<A+Hd) k=1;
    else if(e<A+Hd+D) k=Math.exp(-(e-A-Hd)/(D/3))*(1-(e-A-Hd)/D);
    else k=0;
    PULSE.k=k;
    PULSE.keys.forEach(key=>{
      const r=PULSE.rest[key], pk=PULSE.peak[key];
      program.uniforms[unifMap[key]].value = PULSE_STEPPED[key] ? (k>0.5?pk:r) : r+(pk-r)*k;
    });
    if(e>=A+Hd+D) PULSE.on=false;
  }
  // deferLoop: true while the reveal is armed and the loop is held. start()
  // still lets exactly one frame through so ready fires and the canvas holds
  // a real (background) frame; releaseLoop() lets the loop run for good.
  let deferred=false;
  function releaseLoop(){ if(deferred){ deferred=false; start(); } }
  let pageLoadFallback=false;
  // setFieldProgress(): the site drives the field fade; the built-in page-load
  // timing and the revealFallback stand down.
  let fieldDriven=false;
  function setFieldProgress(p){
    p=clamp(Number(p)||0,0,1);
    if(reducedMotion && p>0) p=1;
    fieldDriven=true;
    program.uniforms.uUsePageLoadAnimation.value=1;
    program.uniforms.uPageLoadProgress.value=p;
    releaseLoop();
  }
  // Logo resolve state. logoActive: the shader heart is on screen (between the
  // first setLogoProgress > 0 and the hand-off).
  let logoActive=false, logoHidden=false, logoHandoffPending=false;
  let logoPromise=null, logoResolveFn=null, logoWarned=false;
  function logoAvailable(){
    if(logoOn) return true;
    if(!logoWarned){
      logoWarned=true;
      console.warn('[faulty-terminal] logo resolve is off for this instance — set logoResolve: true and gridLock.');
    }
    return false;
  }
  function setLogoProgress(p){
    if(!logoAvailable()) return;
    p=clamp(Number(p)||0,0,1);
    program.uniforms.uLogoP.value=p;
    if(reducedMotion || logoHidden) return;   // reduced motion: no resolve, the site's logo is just there
    if(p>0 && !logoActive){
      logoActive=true;
      program.uniforms.uLogoOn.value=1;
      if(opts.logoFullScale!==false) holdFullScale(true);
    }
    releaseLoop();
  }
  function setDegaussProgress(d){
    if(!logoAvailable()) return;
    program.uniforms.uLogoD.value=clamp(Number(d)||0,0,1);
  }
  // false on the hand-off frame: the site's HTML heart takes over.
  function setLogoVisible(v){
    if(!logoAvailable()) return;
    if(v){ logoHidden=false; setLogoProgress(program.uniforms.uLogoP.value); return; }
    logoHidden=true;
    logoActive=false;
    program.uniforms.uLogoOn.value=0;
    holdFullScale(false);
  }
  function finishLogo(skipped){
    const detail={ instance: api, static: false, reducedMotion, skipped: !!skipped };
    ctn.dispatchEvent(new CustomEvent('faulty-terminal:logo-resolved',{bubbles:true,detail}));
    const done=logoResolveFn; logoResolveFn=null; logoPromise=null;
    if(done) done(detail);
  }
  // The logo timeline (v1.12.0): one seekable clock, in ms from the start of
  // the field fade. resolveLogo() plays it; the debug panel can pause, scrub
  // and replay it. With logoFlare / logoRipple on, faulty-terminal also hides
  // and flares the site's logo element and fires the ripple, so the whole
  // sequence is on one clock and every timing is tweakable from the panel.
  const LT={ S:null, e:0, base:0, tStart:-1, speed:1, playing:false, handed:false, rippled:false,
    ghost:false, startedAt:0, pixels:null, vis:null, op:null };
  const LOGO_TIMING_KEYS={ fieldMs:'logoFieldMs', holdMs:'logoHoldMs', resolveMs:'logoResolveMs',
    degOffset:'degaussOffset', degMs:'degaussMs', handOffset:'logoHandOffset', spread:'logoSpread',
    degAmp:'degaussAmp', degDecay:'degaussDecay', slot:'logoSlot', flareMs:'logoFlareMs',
    flareSpread:'logoFlareSpread', rippleAt:'logoRippleAt' };
  function logoTimings(){
    const T={};
    Object.keys(LOGO_TIMING_KEYS).forEach(k=>{ T[k]=Number(opts[LOGO_TIMING_KEYS[k]])||0; });
    return T;
  }
  function logoSchedule(T){
    const f1=Math.max(0,T.fieldMs), r0=f1+Math.max(0,T.holdMs), rMs=Math.max(1,T.resolveMs), r1=r0+rMs;
    const d0=r1+T.degOffset, dMs=Math.max(1,T.degMs), d1=d0+dMs;
    const h=Math.max(r0, d1+T.handOffset);
    const fx=Math.max(1,T.flareMs), fs=Math.max(0,T.flareSpread);
    const x1=h+fx+fs, rp=Math.max(h, h+T.rippleAt);
    return { f1, r0, rMs, r1, d0, dMs, d1, h, fx, fs, x1, rp, done:Math.max(x1, rp) };
  }
  const BAYER4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const isClear=c=>!c || c==='transparent' || /rgba?\([^)]*,\s*0\)$/.test(c.replace(/\s+/g,' '));
  // The logo element's lit pixels: grid children at the heart mask's cells (or
  // logoPixels, if set), each the first descendant that carries a colour.
  function logoPixels(){
    if(LT.pixels) return LT.pixels;
    const out=[];
    if(!gridEl) return out;
    const sel=opts.logoPixels ? safeQueryAll(gridEl, opts.logoPixels) : null;
    const masks=[[6,192],[95,496],[95,500],[95,500],[30,244],[24,56],[0,32]];
    const kids=sel || [].slice.call(gridEl.children);
    kids.forEach((c,i)=>{
      const col=i%9, row=Math.floor(i/9);
      if(!sel && (row>6 || !(((masks[row][0]|masks[row][1])>>col)&1))) return;
      let t=c;
      if(isClear(getComputedStyle(c).backgroundColor)){
        t=[].find.call(c.querySelectorAll('*'), x=>!isClear(getComputedStyle(x).backgroundColor)) || c;
      }
      out.push({ el:t, b:BAYER4[(row%4)*4+col%4]/16, glow:null, f:'' });
    });
    return (LT.pixels=out);
  }
  function setLogoEl(vis, op){
    if(!gridEl) return;
    if(vis!==LT.vis){ LT.vis=vis; gridEl.style.visibility=vis; }
    if(op!==LT.op){ LT.op=op; gridEl.style.opacity=op; }
  }
  function logoRender(){
    const S=LT.S, e=LT.e, u=program.uniforms;
    setFieldProgress(S.f1>0 ? e/S.f1 : 1);
    u.uLogoP.value=clamp((e-S.r0)/S.rMs,0,1);
    u.uLogoD.value=clamp((e-S.d0)/S.dMs,0,1);
    const handed=e>=S.h, active=!handed && e>S.r0;
    u.uLogoOn.value=active?1:0;
    logoHidden=handed;
    // v1.12.2: the full-scale hold is no longer switched here (at the resolve
    // start and the hand-off) — it is taken in logoPlay() while the field is
    // still invisible, and released once the ripple has finished.
    logoActive=active;
    if(!opts.logoFlare) return;
    setLogoEl(handed||LT.ghost ? '' : 'hidden', !handed&&LT.ghost ? '0.45' : '');
    const ft=e-S.h;
    logoPixels().forEach(p=>{
      let f='';
      const t=(ft-p.b*S.fs)/S.fx;
      if(handed && t>=0 && t<1){
        if(!p.glow) p.glow=getComputedStyle(p.el).backgroundColor;
        const k=Math.exp(-t*S.fx/180);
        const bi=Math.max(0,Number(opts.logoFlareIntensity)||0), br=Math.max(0,Number(opts.logoFlareBlur)||0);
        f='brightness('+(1+bi*k).toFixed(3)+')'+(br>0?' drop-shadow(0 0 '+(br*k).toFixed(1)+'px '+p.glow+')':'');
      }
      if(f!==p.f){ p.f=f; p.el.style.filter=f; }
    });
  }
  function stepLogo(t){
    if(LT.tStart<0) LT.tStart=t;
    LT.e=LT.base+(t-LT.tStart)*LT.speed;
    const S=LT.S;
    logoRender();
    if(!LT.handed && LT.e>=S.h){ LT.handed=true; logoHandoffPending=true; }   // event fires once this frame is drawn
    if(opts.logoRipple && !LT.rippled && LT.e>=S.rp){ LT.rippled=true; retrigger(); }
    if(LT.e>=S.done){ LT.playing=false; LT.e=S.done; LT.base=LT.e; LT.tStart=-1; fullReleasePending=true; }
  }
  // v1.12.2: release the full-scale hold after the timeline, once the ripple
  // (if any) has faded, so the size change never lands mid-animation.
  let fullReleasePending=false;
  function maybeReleaseFull(){
    if(!fullReleasePending || LT.playing || LIFT.playing) return;
    if(opts.ripple && program.uniforms.uRippleActive.value>0.5) return;
    fullReleasePending=false;
    holdFullScale(false);
  }
  // v1.12.2: first-run warm-up. Safari stalled for a frame the first time the
  // resolve and the degauss ran (never on replays): one offscreen draw with the
  // logo on, mid-resolve and mid-degauss, makes the browser do that first-use
  // work at the start of the timeline, while the field is still invisible.
  // The logo element's pixels and colours are read here too, not on the
  // hand-off frame.
  let logoWarmed=false;
  function warmLogo(){
    if(logoWarmed) return;
    logoWarmed=true;
    if(opts.logoFlare) logoPixels().forEach(p=>{ if(!p.glow) p.glow=getComputedStyle(p.el).backgroundColor; });
    let rt=null;
    const u=program.uniforms, keep=[u.uLogoOn.value,u.uLogoP.value,u.uLogoD.value];
    try{
      rt=new RenderTarget(gl,{width:gl.canvas.width,height:gl.canvas.height,depth:false});
      u.uLogoOn.value=1; u.uLogoP.value=0.6; u.uLogoD.value=0.3;
      renderer.render({scene:mesh,target:rt});
      if(fbProg){ fbProg.uniforms.tS.value=rt.texture; fbProg.uniforms.tP.value=rt.texture; renderer.render({scene:fbMesh,target:rtA}); }
      gl.flush();
    }catch(e){}
    u.uLogoOn.value=keep[0]; u.uLogoP.value=keep[1]; u.uLogoD.value=keep[2];
    freeRT(rt);
  }
  function logoPlay(){
    LT.S=logoSchedule(logoTimings());
    LT.e=0; LT.base=0; LT.tStart=-1; LT.handed=false; LT.rippled=false; LT.playing=true;
    LT.startedAt=performance.now();
    const u=program.uniforms;
    u.uLogoSpread.value=opts.logoSpread; u.uDegAmp.value=opts.degaussAmp;
    u.uDegDecay.value=opts.degaussDecay; u.uSlotScale.value=opts.logoSlot;
    u.uLogoP.value=0; u.uLogoD.value=0;
    relayout();
    logoHidden=false;
    if(opts.logoFlare) setLogoEl('hidden','');
    fullReleasePending=false;
    if(opts.logoFullScale!==false && !reducedMotion) holdFullScale(true);
    warmLogo();
    setFieldProgress(LT.S.f1>0?0:1);   // also releases a deferred loop
  }
  // Convenience: the whole FT side of the resolve on the approved timings.
  // Resolves (and fires faulty-terminal:logo-resolved) on the hand-off frame.
  function resolveLogo(timings){
    if(liftOn) return playLift();
    if(logoPromise) return logoPromise;
    logoPromise=new Promise(r=>{ logoResolveFn=r; });
    if(timings && typeof timings==='object') Object.keys(LOGO_TIMING_KEYS).forEach(k=>{
      const v=Number(timings[k]);
      if(timings[k]!=null && isFinite(v)) opts[LOGO_TIMING_KEYS[k]]=v;
    });
    if(!logoAvailable() || reducedMotion){
      setFieldProgress(1);
      setTimeout(()=>finishLogo(true),0);
      return logoPromise;
    }
    logoPlay();
    return logoPromise;
  }
  // Debug-panel handle on the clock. Replays don't resolve the promise again,
  // but each hand-off fires faulty-terminal:logo-resolved.
  const logoTimeline = logoOn ? {
    get schedule(){ return LT.S || logoSchedule(logoTimings()); },
    get time(){ return LT.e; },
    get playing(){ return LT.playing; },
    get startedAt(){ return LT.startedAt; },
    get speed(){ return LT.speed; },
    get ghost(){ return LT.ghost; },
    play(){
      const u=program.uniforms;
      u.uRippleActive.value=0; u.uAftershockActive.value=0; u.uRippleProgress.value=0;
      logoPlay();
    },
    pause(){ if(LT.playing){ LT.playing=false; LT.base=LT.e; LT.tStart=-1; } },
    seek(ms){
      if(!LT.S) LT.S=logoSchedule(logoTimings());
      LT.playing=false; LT.e=clamp(Number(ms)||0,0,LT.S.done); LT.base=LT.e; LT.tStart=-1;
      LT.handed=LT.e>=LT.S.h; LT.rippled=LT.e>=LT.S.rp;
      if(LT.e>=LT.S.done) fullReleasePending=true;
      else if(opts.logoFullScale!==false && !reducedMotion){ fullReleasePending=false; holdFullScale(true); }
      logoRender();
    },
    setSpeed(x){ LT.base=LT.e; LT.tStart=-1; LT.speed=Math.max(0.01, Number(x)||1); },
    setGhost(on){ LT.ghost=!!on; if(LT.S) logoRender(); },
    refresh(){
      LT.S=logoSchedule(logoTimings());
      const u=program.uniforms;
      u.uLogoSpread.value=opts.logoSpread; u.uDegAmp.value=opts.degaussAmp;
      u.uDegDecay.value=opts.degaussDecay; u.uSlotScale.value=opts.logoSlot;
      LT.e=Math.min(LT.e, LT.S.done);
      if(!LT.playing) logoRender();
    },
  } : null;

  // ---------------------------------------------------------------------------
  // Lift resolve (v1.13.0-dev). One clock, ms from the start of the field fade:
  //   field fade → pin (cells decode to M/W/P and fill) → beat → lift, M then W
  //   then P (each pixel goes dark on the glass, leaving its phosphor ghost,
  //   and is drawn off the glass on a DPR canvas) → critically damped glide
  //   to its HTML pixel → swap on a frame where the two are identical →
  //   ripple from the heart + pulse envelope.
  // The degauss runs from the first lift: the glass wobbles and its colour
  // purity blots; a pixel is spared in proportion to how far it has lifted.
  // ---------------------------------------------------------------------------
  const LIFT_MASKS=[[6,192],[95,496],[95,500],[95,500],[30,244],[24,56],[0,32]];
  function liftEl(){
    if(LIFT.el && LIFT.el.isConnected) return LIFT.el;
    LIFT.el=safeQuery(opts.logoLift); LIFT.pix=null;
    return LIFT.el;
  }
  function liftPixels(){
    if(LIFT.pix) return LIFT.pix;
    const el=liftEl(), out=[];
    if(!el) return out;
    [].slice.call(el.children).forEach((c,i)=>{
      const col=i%9, row=Math.floor(i/9);
      if(row>6) return;
      const m=LIFT_MASKS[row], code=((m[0]>>col)&1)+(((m[1]>>col)&1)*2);
      if(!code) return;
      let t=c;
      if(isClear(getComputedStyle(c).backgroundColor))
        t=[].find.call(c.querySelectorAll('*'), x=>!isClear(getComputedStyle(x).backgroundColor)) || c;
      const cs=getComputedStyle(t);
      out.push({ el:t, col, row, code, grp: code===3?1:(code===2?2:0), color: cs.backgroundColor,
        radius: parseFloat(cs.borderTopLeftRadius)||0, s:null, t:null });
    });
    return (LIFT.pix=out);
  }
  function liftSchedule(){
    const n=v=>Math.max(0,Number(v)||0);
    const f1=n(opts.logoFieldMs), p0=f1+n(opts.logoHoldMs), pMs=Math.max(1,n(opts.logoPinMs)), p1=p0+pMs;
    const l0=p1+n(opts.logoLiftHoldMs), st=n(opts.logoStaggerMs), rs=n(opts.logoRowStagger);
    const lMs=Math.max(1,n(opts.logoLiftMs)), tMs=Math.max(1,n(opts.logoTravelMs));
    const lastLift=l0+2*st+6*rs;
    const land=lastLift+lMs*0.5+tMs;
    const d0=l0+(Number(opts.degaussOffset)||0), dMs=Math.max(1,n(opts.degaussMs)), d1=d0+dMs;
    const rp=land+(Number(opts.logoRippleAt)||0);
    const cOn=opts.logoCurveRamp!==false && opts.logoCurveRamp!=='false';
    const c0=l0+(Number(opts.logoCurveOffset)||0), cMs=Math.max(1,n(opts.logoCurveMs)), c1=c0+cMs;
    return { f1, p0, pMs, p1, l0, st, rs, lMs, tMs, lastLift, land, d0, dMs, d1, rp, cOn, c0, cMs, c1,
      done:Math.max(land, rp, d1, cOn?c1:0)+20 };
  }
  // the glass curvature at timeline time e (flat start ramps to opts.curvature)
  function curveAt(e,S){
    const rest=Number(opts.curvature)||0;
    if(!S || !S.cOn) return rest;
    const from=Number(opts.logoCurveFrom)||0;
    const t=clamp((e-S.c0)/S.cMs,0,1), w=t*t*(3-2*t);
    return from+(rest-from)*w;
  }
  // geometry: container px (y down) <-> canvas vUv <-> sampled uv <-> cells
  // (k = the curvature to map with; defaults to the current one)
  function curvNow(k){ return k==null ? (Number(program.uniforms.uCurvature.value)||0) : k; }
  function invBarrel(su,sv,kk){
    const k=curvNow(kk);
    if(!k) return [su,sv];
    const tx=su*2-1, ty=sv*2-1; let cx=tx, cy=ty;
    for(let i=0;i<10;i++){ const f=1+k*(cx*cx+cy*cy); cx=tx/f; cy=ty/f; }
    return [cx*0.5+0.5, cy*0.5+0.5];
  }
  function gridCells(){ const gm=program.uniforms.uGridMul.value, sc=Number(program.uniforms.uScale.value)||1; return [sc*gm[0]*15, sc*gm[1]*15]; }
  function gridShift(){ return gridOn ? program.uniforms.uGridShift.value : [0,0]; }
  function ctnToCell(x,y,kk){
    const S=canvasScale(), W=LIFT.W, H=LIFT.H;
    const u=0.5+(x-W/2)/(S*W), v=0.5-(y-H/2)/(S*H);
    const k=curvNow(kk);
    const b=k?barrelUv(u,v,k):[u,v];
    const g=gridCells(), sh=gridShift(), gm=program.uniforms.uGridMul.value;
    return [Math.floor(b[0]*g[0]+sh[0]*gm[0]*15), Math.floor(b[1]*g[1]+sh[1]*gm[1]*15)];
  }
  function cellPtToCtn(cx,cy,kk){   // a point in cell units (y up) -> container px
    const g=gridCells(), sh=gridShift(), gm=program.uniforms.uGridMul.value;
    const su=(cx-sh[0]*gm[0]*15)/g[0], sv=(cy-sh[1]*gm[1]*15)/g[1];
    const v=invBarrel(su,sv,kk), S=canvasScale();
    return [(v[0]-0.5)*S*LIFT.W+LIFT.W/2, (0.5-v[1])*S*LIFT.H+LIFT.H/2];
  }
  // the glyph area of a cell: x 0..1/digitSize, y 0..1/digitSize from its bottom-left
  function glyphRect(cx,cy,k){
    const ds=Math.max(0.01,Number(program.uniforms.uDigitSize.value)||1), e=1/ds;
    const a=cellPtToCtn(cx,cy+e,k), b=cellPtToCtn(cx+e,cy,k), c=cellPtToCtn(cx,cy,k), d=cellPtToCtn(cx+e,cy+e,k);
    const x0=Math.min(a[0],c[0]), x1=Math.max(b[0],d[0]), y0=Math.min(a[1],d[1]), y1=Math.max(b[1],c[1]);
    return { x:x0, y:y0, w:x1-x0, h:y1-y0 };
  }
  function liftLayout(){
    const cr=ctn.getBoundingClientRect();
    LIFT.W=cr.width; LIFT.H=cr.height;
    const pix=liftPixels();
    if(!pix.length) return;
    let bx0=1e9, by0=1e9, bx1=-1e9, by1=-1e9;
    pix.forEach(p=>{
      const r=p.el.getBoundingClientRect();
      p.t={ x:r.left-cr.left, y:r.top-cr.top, w:r.width, h:r.height };
      bx0=Math.min(bx0,p.t.x); by0=Math.min(by0,p.t.y); bx1=Math.max(bx1,p.t.x+p.t.w); by1=Math.max(by1,p.t.y+p.t.h);
    });
    let ax, ay;
    if(String(opts.logoOrigin).toLowerCase()==='target'){ ax=(bx0+bx1)/2; ay=(by0+by1)/2; }
    else { ax=LIFT.W/2; ay=LIFT.H/2; }
    // cells are chosen on the glass as it is while the heart forms
    const S=LIFT.S, kPin=curveAt(S?S.p0:0,S);
    // keep the 9×7 footprint (and a cell of margin) on screen
    for(let it=0;it<2;it++){
      const c=ctnToCell(ax,ay,kPin), p0=cellPtToCtn(c[0],c[1],kPin), p1=cellPtToCtn(c[0]+1,c[1]-1,kPin);
      const cw=Math.abs(p1[0]-p0[0]), ch=Math.abs(p1[1]-p0[1]);
      ax=clamp(ax, 5.5*cw, Math.max(5.5*cw, LIFT.W-5.5*cw));
      ay=clamp(ay, 4.5*ch, Math.max(4.5*ch, LIFT.H-4.5*ch));
    }
    const c=ctnToCell(ax,ay,kPin);
    LIFT.cell=[c[0]-4, c[1]+3];
    LIFT.anchor=[ax,ay];
    const u=program.uniforms.uLiftCell.value; u[0]=LIFT.cell[0]; u[1]=LIFT.cell[1];
    // each pixel leaves from where its cell is on the glass at its own lift moment
    pix.forEach(p=>{
      const k=S ? curveAt(S.l0+p.grp*S.st+p.row*S.rs, S) : null;
      p.s=glyphRect(LIFT.cell[0]+p.col, LIFT.cell[1]-p.row, k);
    });
    if(LIFT.cv) sizeLiftCanvas();
  }
  function liftCanvas(){
    if(LIFT.cv) return LIFT.cv;
    if(getComputedStyle(ctn).position==='static') ctn.style.position='relative';
    const cv=document.createElement('canvas');
    cv.className='ft-lift';
    cv.setAttribute('aria-hidden','true');
    Object.assign(cv.style,{ position:'absolute', left:'0', top:'0', width:'100%', height:'100%', pointerEvents:'none', zIndex:'1', transform:'none' });
    ctn.appendChild(cv);
    LIFT.cv=cv; LIFT.ctx=cv.getContext('2d');
    sizeLiftCanvas();
    return cv;
  }
  function sizeLiftCanvas(){
    const d=window.devicePixelRatio||1, w=Math.max(1,Math.round(LIFT.W*d)), h=Math.max(1,Math.round(LIFT.H*d));
    LIFT.dpr=d;
    if(LIFT.cv.width!==w || LIFT.cv.height!==h){ LIFT.cv.width=w; LIFT.cv.height=h; }
  }
  const lerp=(a,b,t)=>a+(b-a)*t;
  function degaussEnv(e,S){
    if(e<S.d0) return 0;
    const dt=(e-S.d0)/S.dMs;
    if(dt>=1) return 0;
    return Math.exp(-(Number(opts.degaussDecay)||0)*dt)*(1-dt)*(Number(opts.degaussAmp)||0);
  }
  function damp(t){   // critically damped 0→1, zero start velocity, no overshoot
    if(t<=0) return 0; if(t>=1) return 1;
    const w=7; return (1-(1+w*t)*Math.exp(-w*t))/(1-(1+w)*Math.exp(-w));
  }
  function setHeartVisible(v){
    const el=liftEl(); if(!el) return;
    const vis=(v||LIFT.ghost)?'':'hidden', op=(!v&&LIFT.ghost)?'0.45':'';
    if(el.style.visibility!==vis) el.style.visibility=vis;
    if(el.style.opacity!==op) el.style.opacity=op;
  }
  function liftRender(){
    const S=LIFT.S, e=LIFT.e, u=program.uniforms;
    if(!S) return;
    setFieldProgress(S.f1>0 ? e/S.f1 : 1);
    const landed=e>=S.land;
    if(S.cOn && !PULSE.on) u.uCurvature.value=curveAt(e,S);
    u.uLiftOn.value=(e>=S.p0 && !landed)?1:0;
    u.uLiftPin.value=clamp((e-S.p0)/S.pMs,0,1);
    u.uLiftT.value=e>=S.l0 ? e-S.l0 : -1;
    u.uLiftStag.value[0]=S.st; u.uLiftStag.value[1]=S.rs;
    const sm=(a,b,x)=>{ const t=clamp((x-a)/Math.max(1e-3,b-a),0,1); return t*t*(3-2*t); };
    u.uLiftQuiet.value=(Number(opts.logoQuiet)||0)*sm(S.p0,S.p0+S.pMs*0.5,e)*(1-sm(S.l0,S.land,e));
    const env=degaussEnv(e,S);
    u.uDegEnv.value=env; u.uDegPh.value=Math.max(0,e-S.d0);
    setHeartVisible(landed);
    drawLift(e,S,env,landed);
  }
  function drawLift(e,S,env,landed){
    const pix=liftPixels();
    if(landed || e<S.l0 || !pix.length){
      if(LIFT.cv && LIFT.cv.style.display!=='none'){ LIFT.ctx.clearRect(0,0,LIFT.cv.width,LIFT.cv.height); LIFT.cv.style.display='none'; }
      return;
    }
    liftCanvas();
    if(LIFT.cv.style.display==='none') LIFT.cv.style.display='';
    const ctx=LIFT.ctx, d=LIFT.dpr, Sc=canvasScale();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,LIFT.cv.width,LIFT.cv.height);
    ctx.setTransform(d,0,0,d,0,0);
    const depthAmt=Number(opts.logoDepth)||0, bloomAmt=Number(opts.logoBloom)||0;
    const ph=Math.max(0,e-S.d0)*0.045;
    pix.forEach(p=>{
      if(!p.s || !p.t) return;
      const ls=e-(S.l0+p.grp*S.st+p.row*S.rs);
      if(ls<0) return;   // still on the glass: the shader draws it
      const a=Math.min(ls/S.lMs,1), depth=1-Math.pow(1-a,3);
      const tr=damp((ls-S.lMs*0.5)/S.tMs);
      const g=1+depthAmt*depth*(1-tr);
      const sw=p.s.w*g, sh=p.s.h*g;
      const scx=p.s.x+p.s.w/2, scy=p.s.y+p.s.h/2;
      let cx=lerp(scx, p.t.x+p.t.w/2, tr), cy=lerp(scy, p.t.y+p.t.h/2, tr);
      const w=lerp(sw, p.t.w, tr), h=lerp(sh, p.t.h, tr);
      // the glass's degauss shake, felt less the further the pixel has lifted
      if(env>0){
        const vy=0.5-(cy-LIFT.H/2)/(Sc*LIFT.H), vx=0.5+(cx-LIFT.W/2)/(Sc*LIFT.W);
        const dx=(Math.sin(vy*31+ph)*0.0045+Math.sin(vy*7-ph*0.41)*0.0035)*env;
        const dy=Math.sin(vx*11+ph*0.53)*0.0018*env;
        const off=1-depth;
        cx-=dx*Sc*LIFT.W*off; cy+=dy*Sc*LIFT.H*off;
      }
      let x=cx-w/2, y=cy-h/2;
      // land on the device-pixel grid the browser draws the HTML pixel on
      x=lerp(x, Math.round(x*d)/d, tr); y=lerp(y, Math.round(y*d)/d, tr);
      const r=Math.min(w,h)/2, rad=Math.min(r, lerp(Math.min(2,r), p.radius, tr));
      const lift=depth*(1-tr);
      ctx.save();
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x,y,w,h,rad); else ctx.rect(x,y,w,h);
      if(bloomAmt>0 && lift>0.001){ ctx.shadowColor=p.color; ctx.shadowBlur=bloomAmt*14*lift*d; }
      ctx.fillStyle=p.color;
      ctx.fill();
      ctx.shadowBlur=0;
      ctx.clip();
      const glow=0.12*lift;
      if(glow>0.002){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,255,255,'+glow.toFixed(3)+')'; ctx.fillRect(x,y,w,h); ctx.globalCompositeOperation='source-over'; }
      const scan=0.38*(1-depth);
      if(scan>0.004){
        ctx.fillStyle='rgba(0,0,0,'+scan.toFixed(3)+')';
        for(let yy=Math.floor(y/3)*3; yy<y+h; yy+=3) ctx.fillRect(x, yy, w, 1);
      }
      ctx.restore();
    });
  }
  function stepLift(t){
    if(LIFT.tStart<0) LIFT.tStart=t;
    LIFT.e=LIFT.base+(t-LIFT.tStart)*LIFT.speed;
    const S=LIFT.S;
    if(LIFT.e>=S.done) LIFT.e=S.done;
    liftRender();
    if(!LIFT.landed && LIFT.e>=S.land){
      LIFT.landed=true;
      const done=LIFT.done; LIFT.done=null; LIFT.promise=null;
      const detail={ instance: api, static:false, reducedMotion, skipped:false };
      ctn.dispatchEvent(new CustomEvent('faulty-terminal:logo-resolved',{bubbles:true,detail}));
      if(done) done(detail);
    }
    if(!LIFT.rippled && LIFT.e>=S.rp && opts.ripple!==false){ LIFT.rippled=true; retrigger(); }
    if(LIFT.e>=S.done){ LIFT.playing=false; LIFT.base=LIFT.e; LIFT.tStart=-1; fullReleasePending=true; }
  }
  function liftPlay(){
    LIFT.S=liftSchedule();
    LIFT.e=0; LIFT.base=0; LIFT.tStart=-1; LIFT.landed=false; LIFT.rippled=false; LIFT.playing=true;
    LIFT.startedAt=performance.now();
    const u=program.uniforms;
    u.uRippleActive.value=0; u.uAftershockActive.value=0; u.uRippleProgress.value=0;
    u.uMwpReveal.value=1; u.uMwpWaveEnv.value=0;
    if(PULSE.on && !PULSE.preview) pulseRestore();
    tiltX=tiltY=tiltTargetX=tiltTargetY=0;   // the field is still invisible
    LIFT.pix=null;
    liftLayout();
    setHeartVisible(false);
    fullReleasePending=false;
    if(opts.logoFullScale!==false) holdFullScale(true);
    liftRender();
    releaseLoop();
  }
  function playLift(){
    if(!LIFT.promise) LIFT.promise=new Promise(r=>{ LIFT.done=r; });
    const p=LIFT.promise;
    if(reducedMotion || !liftEl()){
      setFieldProgress(1); setHeartVisible(true);
      const done=LIFT.done; LIFT.done=null; LIFT.promise=null;
      setTimeout(()=>{
        const detail={ instance: api, static:false, reducedMotion, skipped:true };
        ctn.dispatchEvent(new CustomEvent('faulty-terminal:logo-resolved',{bubbles:true,detail}));
        if(done) done(detail);
      },0);
      return p;
    }
    liftPlay();
    return p;
  }
  const liftTimeline = liftOn ? {
    get schedule(){ return LIFT.S || liftSchedule(); },
    get time(){ return LIFT.e; },
    get playing(){ return LIFT.playing; },
    get speed(){ return LIFT.speed; },
    play: playLift,
    pause(){ if(LIFT.playing){ LIFT.playing=false; LIFT.base=LIFT.e; LIFT.tStart=-1; } },
    resume(){ if(LIFT.S && !LIFT.playing && LIFT.e<LIFT.S.done){ LIFT.playing=true; LIFT.tStart=-1; releaseLoop(); } },
    seek(ms){
      if(!LIFT.S){ LIFT.S=liftSchedule(); liftLayout(); }
      LIFT.playing=false; LIFT.e=clamp(Number(ms)||0,0,LIFT.S.done); LIFT.base=LIFT.e; LIFT.tStart=-1;
      LIFT.landed=LIFT.e>=LIFT.S.land; LIFT.rippled=LIFT.e>=LIFT.S.rp;
      if(opts.logoFullScale!==false) holdFullScale(true);
      liftRender(); releaseLoop();
    },
    setSpeed(x){ LIFT.base=LIFT.e; LIFT.tStart=-1; LIFT.speed=Math.max(0.01, Number(x)||1); },
    get ghost(){ return !!LIFT.ghost; },
    get startedAt(){ return LIFT.startedAt; },
    setGhost(on){ LIFT.ghost=!!on; if(LIFT.S) liftRender(); },
    refresh(){ if(LIFT.S){ LIFT.S=liftSchedule(); LIFT.e=Math.min(LIFT.e, LIFT.S.done); if(!LIFT.playing) liftRender(); } },
    relayout(){ LIFT.pix=null; if(LIFT.S){ liftLayout(); if(!LIFT.playing) liftRender(); } },
  } : null;
  let fadeDelay=opts.pageLoadDelay||0;
  const fadeDuration=Math.max(0, Number(opts.pageLoadDuration)||0);
  if(opts.ripple){
    program.uniforms.uPageLoadProgress.value=0;
    program.uniforms.uUsePageLoadAnimation.value=1;
    if(hasRippleClass()) triggerRipple();
    else {
      const mo=new MutationObserver(()=>{ if(hasRippleClass()) triggerRipple(); });
      rippleChain().forEach(n=>mo.observe(n,{attributes:true,attributeFilter:['class']}));
      // With the reveal armed and nothing ever adding does-ripple, the field
      // renders nothing at all — a missing interaction looks identical to a
      // broken component. Fade in instead, so it reads as un-animated.
      if(opts.revealFallback>0) setTimeout(()=>{
        if(rippleTriggered || fieldDriven) return;
        // The fallback has already waited revealFallback ms — don't stack
        // pageLoadDelay on top of it.
        pageLoadFallback=true; loadStart=0; fadeDelay=0;
        console.warn('[faulty-terminal] no does-ripple after '+opts.revealFallback+
          'ms — fading in without the reveal. Add the interaction, or set ripple=false.');
        releaseLoop();
      }, opts.revealFallback);
      deferred = opts.deferLoop!==false;
    }
  }
  function endWarm(scale){
    warmActive=false;
    renderScale=clamp(Math.min(scale,targetScaleForSize(ctn.offsetWidth,ctn.offsetHeight)),opts.renderScaleMin,opts.renderScaleMax);
    fpsCount=0; fpsWindowStart=0;
    applySize();
  }
  // Warm phase: short windows so a slow device is caught inside the first
  // second. Leaves the phase once warmUntil has passed and the device held
  // the cap — straight back to the full v1.9.1 scale, no slow climb.
  function warmTune(now){
    fpsCount++;
    if(fpsWindowStart===0) fpsWindowStart=now;
    const span=now-fpsWindowStart;
    if(span<WARM_WINDOW) return;
    const fps=(fpsCount*1000)/span;
    fpsCount=0; fpsWindowStart=now;
    if(opts.autoTune && firstWindow && fps<opts.fpsLow){ firstWindow=false; endWarm(opts.renderScaleMin); return; }
    firstWindow=false;
    if(now<warmUntil) return;
    const held = fps>=warmFps*0.9;
    endWarm(held || !opts.autoTune ? opts.renderScaleMax : renderScale);
  }
  function autoTune(now){
    if(fullHold) return;
    if(warmActive){ warmTune(now); return; }
    if(!opts.autoTune) return;
    fpsCount++;
    if(fpsWindowStart===0) fpsWindowStart=now;
    const span=now-fpsWindowStart;
    if(span>=1000){
      const fps=(fpsCount*1000)/span;
      fpsCount=0; fpsWindowStart=now;
      let changed=false;
      if(firstWindow){
        firstWindow=false;
        if(fps<opts.fpsLow && renderScale>opts.renderScaleMin){ renderScale=opts.renderScaleMin; applySize(); return; }
      }
      if(fps<opts.fpsLow && renderScale>opts.renderScaleMin){ renderScale=clamp(renderScale-0.06,opts.renderScaleMin,opts.renderScaleMax); changed=true; }
      else if(fps>opts.fpsHigh && renderScale<opts.renderScaleMax){ renderScale=clamp(renderScale+0.03,opts.renderScaleMin,opts.renderScaleMax); changed=true; }
      renderScale=Math.min(renderScale,targetScaleForSize(ctn.offsetWidth,ctn.offsetHeight));
      if(changed) applySize();
    }
  }
  // ripple speed curve: 0 linear · 1 ease in-out (v1.12) · 2 ease out · 3 expo out · 4 cubic in-out
  function rippleEaseFn(x){
    if(opts.rippleEase===false) return x;
    const c=Math.round(Number(opts.rippleCurve??1));
    if(c===0) return x;
    if(c===2) return 1-Math.pow(1-x,3);
    if(c===3) return x>=1?1:1-Math.pow(2,-10*x);
    if(c===4) return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
    return x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  }
  let lastTf=null;
  function update(t){
    rafId=requestAnimationFrame(update);
    if(t-lastFrame<(warmActive?(lastFrame?warmInterval:0):frameInterval)) return;
    lastFrame=t;
    autoTune(t);
    if(!opts.pause) program.uniforms.iTime.value=(t*0.001+timeOffset)*opts.timeScale;
    if(opts.ripple && rippleTriggered){
      const rawRp=Math.min((t-rippleStartTime)/rippleDurationRef,1.0);
      const rp=rippleEaseFn(rawRp);
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
        const ap=rippleEaseFn(rawAp);
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
    if(LT.playing) stepLogo(t);
    if(LIFT.playing) stepLift(t);
    pulseStep(t);
    maybeReleaseFull();
    if(opts.pageLoadAnimation && (!opts.ripple || pageLoadFallback) && !fieldDriven){
      if(loadStart===0) loadStart=t;
      const elapsed=t-loadStart-fadeDelay;
      program.uniforms.uPageLoadProgress.value=
        fadeDuration>0 ? Math.min(Math.max(elapsed,0)/fadeDuration,1) : (elapsed>=0?1:0);
    }
    if(opts.mouseReact){
      smoothMouse.x+=(mouse.x-smoothMouse.x)*0.08;
      smoothMouse.y+=(mouse.y-smoothMouse.y)*0.08;
      const mu=ctnToCanvasUv(smoothMouse.x, smoothMouse.y);
      program.uniforms.uMouse.value[0]=mu[0];
      program.uniforms.uMouse.value[1]=mu[1];
    }
    if(opts.tiltReact){
      const maxDeg=tiltStrengthRef*10;
      if(!gyroActive){
        tiltTargetX=(0.5-smoothMouse.y)*maxDeg;
        tiltTargetY=(smoothMouse.x-0.5)*maxDeg;
      }
      if(logoActive || (LIFT.playing && !LIFT.landed)){ tiltTargetX=0; tiltTargetY=0; }   // shader heart and HTML heart must line up
      tiltX+=(tiltTargetX-tiltX)*0.05;
      tiltY+=(tiltTargetY-tiltY)*0.05;
    }
    {
      const bloom=1+(Number(opts.rasterBloom)||0)*PULSE.k;
      const sc=(overscanOn?1:TILT_SCALE)*bloom;
      const tf=opts.tiltReact
        ? `perspective(600px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale(${sc.toFixed(4)})`
        : (bloom!==1 ? `scale(${bloom.toFixed(4)})` : '');
      if(tf!==lastTf){ lastTf=tf; gl.canvas.style.transform=tf; }
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
    if(!isReady){
      isReady=true;
      markReady(api);
      ctn.dispatchEvent(new CustomEvent('faulty-terminal:ready',{bubbles:true,detail:{instance:api}}));
    }
    if(logoHandoffPending){ logoHandoffPending=false; finishLogo(false); }
    if(deferred) stop();   // deferLoop: that was the one primer frame
  }
  function start(){
    if(deferred && isReady) return;
    if(!running && onScreen && tabVisible){
      running=true; fpsWindowStart=0; fpsCount=0;
      // Loop first starts after the warm window (e.g. held by deferLoop):
      // go straight to full quality; the first window still gets fast back-off.
      if(warmActive && !deferred && performance.now()>=warmUntil) endWarm(opts.renderScaleMax);
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
    opts[key]=val;
    if((PULSE.on || PULSE.preview) && (key in PULSE.rest)){
      PULSE.rest[key]=Number(val);            // the pulse settles back to the new value
      if(PULSE.preview) return;               // the peak stays on screen while previewing
    }
    if(uName && program.uniforms[uName]!=null) program.uniforms[uName].value=val;
    if(key==='overscanMargin' && overscanOn){ applySize(); if(liftOn && LIFT.S) liftLayout(); }
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
    if(key==='tiltStrength'){ tiltStrengthRef=val; if(overscanOn){ applySize(); if(liftOn && LIFT.S) liftLayout(); } }
    if(LIFT_OPTION_KEYS[key]){ opts[key]=val; if(key==='degaussPurity' && program.uniforms.uDegPur) program.uniforms.uDegPur.value=val; if(LIFT.S){ LIFT.S=liftSchedule(); liftLayout(); if(!LIFT.playing) liftRender(); } }
    if(key==='curvature' && liftOn && LIFT.S){ liftLayout(); if(!LIFT.playing) liftRender(); }
    if(key==='tiltReact'){ opts.tiltReact=val; if(!val) gl.canvas.style.transform=''; }
    if(key==='timeScale') opts.timeScale=val;
    if(LOGO_OPTION_KEYS[key]){ opts[key]=val; if(logoTimeline && !FEATURE_PARAMS[key]) logoTimeline.refresh(); }
    const xu=FEATURE_PARAMS[key];
    if(xu && program.uniforms[xu]){
      opts[key]=val;
      program.uniforms[xu].value = key==='rippleGate' ? (val===false?0:1) : val;
      if(logoTimeline && LOGO_OPTION_KEYS[key]) logoTimeline.refresh();
    }
  }
  function getParam(key){
    if((PULSE.on || PULSE.preview) && (key in PULSE.rest)) return PULSE.rest[key];
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
    setRippleOrigin();
    pulseStart(performance.now());
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
    if(liftOn && LIFT.S && !LIFT.playing) program.uniforms.uPageLoadProgress.value=1;
    releaseLoop();
    aftershockTriggered=false;
    aftershockStartTime=-1;
    rippleFadeStartTime=-1;
    mwpWaveStartTime=-1;
  }
  const api = { ctn, opts, setParam, getParam, retrigger, ready, hasRipple: opts.ripple,
    relayout, setFieldProgress, setLogoProgress, setDegaussProgress, setLogoVisible, resolveLogo,
    holdFullScale, reducedMotion, logoTimeline, liftTimeline,
    pulsePreview, setPulsePeak, getPulsePeak, get overscanScale(){ return overscanOn ? osScale : 0; },
    get pulseLevel(){ return PULSE.k; } };
  return api;
}
// One line per control, shown in the panel's help bar on hover / focus.
const HELP = {
  // ripple
  rippleDuration: 'How long the ring takes to travel its full reach. Longer = slower, more stately.',
  rippleCurve: 'The ring\'s speed over its life. ease in-out (default) starts and ends slow; ease out / expo out leave fast and decelerate like a real shockwave; linear is constant.',
  rippleReach: 'How far the ring travels before it ends, in screen heights from the origin (2.5 clears most screens from a corner).',
  rippleColorFalloff: 'Trail curve: how fast the coloured wash behind the ring fades toward the origin. Higher = the colour hugs the ring; lower = a broad wash.',
  rippleColorAmbient: 'Trail strength: how much colour is left inside the ring after it passes. 0 = only the ring itself is coloured.',
  rippleColorStrength: 'Overall intensity of the ripple\'s colour (ring + trail). Above 1 it drives into the blend mode.',
  blendMode: 'How the ripple colour mixes with the glyphs: screen (soft, never clips), add (hot, clips to white), overlay (contrasty), soft (gentle).',
  rippleBrightness: 'Glyph boost: extra brightness on the glyphs right at the ring front.',
  rippleBrightnessFalloff: 'Glow width: how thick the bright band at the ring front is. Also the colour ring\'s width unless colour ring width is set.',
  rippleFadeOut: 'Once the ring reaches its end, how long its colour takes to fade away.',
  rippleRingWidth: 'Donut thickness: how wide the band of colour is. 0 = follow glow width (the v1.12 behaviour).',
  rippleEdgeSoft: 'Donut outer edge: 0 = a hard wavefront; higher = it arrives as a soft swell (the softening sits just ahead of the ring).',
  rippleInnerFalloff: 'Donut inner edge: 1 = the colour fades all the way across the band from the front (v1.12, a thin bright line); lower = a solid band of full colour with a sharper inner edge, so the intense colour shows through as it sweeps. 0 = a hard-edged band.',
  rippleHotCore: 'Pushes the crest of the ring toward white, like an over-driven phosphor. 0 = pure brand colour.',
  rippleAspect: 'Squashes the ring into an ellipse. 1 = circle, below 1 = taller, above 1 = wider (a CRT-style horizontal sweep).',
  rippleWobbleFreq: 'How many lobes the wobble has around the ring: low = a gentle egg shape, high = a rippling, frilled edge. Needs wave wobble above 0.',
  rippleGlass: 'Lets the ring colour light the slate between the glyphs, not only the lit glyphs. At 0 the ripple shows only where glyphs are lit, so a dark resting field hides it.',
  aftershockReach: 'How far the aftershock travels. 0 = the same as the ripple.',
  aftershockWidth: 'The aftershock ring\'s thickness. 0 = the same as the ripple\'s colour ring.',
  aftershockTrail: 'Colour left inside the aftershock ring (uses the ripple\'s trail curve). 0 = just the ring.',
  aftershockColorShift: 'Rotates the aftershock\'s colours against the ripple\'s, so the two rings read as different colours.',
  logoCurveRamp: 'Flat start: the glass begins flat so the heart forms on a straight grid, then curves to its normal curvature on the curvature lane.',
  logoCurveFrom: 'Curvature at the start of the resolve (0 = perfectly flat). It ramps from here to the field curvature.',
  logoCurveOffset: 'When the curvature ramp starts, relative to the first lift (negative = before).',
  logoCurveMs: 'How long the glass takes to curve to its normal shape.',
  rippleEchoes: 'Extra rings trailing the main one (0–3). Also applies to the aftershock.',
  rippleEchoGap: 'Distance between the main ring and each echo.',
  rippleEchoDecay: 'How much each echo is dimmer than the one before (1 = as bright, 0 = invisible).',
  rippleColorMode: 'How the three brand colours are laid through the ripple: vertical (v1.12: teal bottom → coral → raspberry top), horizontal, radial bands (rings of colour by distance), around origin (a colour wheel), over time (the whole ring shifts colour as it travels), per glyph (each glyph its own brand colour).',
  rippleColorScale: 'How many times the palette repeats across the distribution. 1 = once; 3 = three full cycles.',
  rippleColorOffset: 'Rotates which colour lands where (0 → 1 = a full turn of raspberry → coral → teal).',
  rippleColorSpin: 'Cycles the palette over time while the ripple plays. 0 = static.',
  rippleColorBlend: 'Band edges: 1 = smooth gradients between colours, 0 = hard bands.',
  aftershock: 'A second, quieter ring that follows the first.',
  aftershockTriggerAt: 'When the aftershock leaves, as a fraction of the main ring\'s journey (0.05 = almost at once).',
  aftershockDelay: 'Extra wait before the aftershock, on top of trigger at.',
  aftershockDuration: 'How long the aftershock takes to travel.',
  aftershockStrength: 'Brightness of the aftershock ring.',
  rippleWobble: 'Makes the ring slightly irregular (not a perfect circle) and alive.',
  rippleWarp: 'Bends the picture as the ring passes, like a lens shockwave.',
  impactBurst: 'Horizontal tearing on the first moments of the ripple, the hit of the impact.',
  pulseAttackMs: 'Pulse: how fast the field ramps from its resting values up to the peak values on impact.',
  pulseHoldMs: 'Pulse: how long the field stays at the peak before decaying.',
  pulseDecayMs: 'Pulse: how long it takes to settle back to the resting values.',
  rasterBloom: 'At the pulse peak the whole picture swells by this much, like a CRT under a brightness spike.',
  // mwp
  mwpColorStrength: 'How strongly the M/W/P letters in the field show their brand colour.',
  mwpDensity: 'How many cells can show an M/W/P letter.',
  mwpFlickerSpeed: 'Speed of the letters\' scramble / decode flicker.',
  mwpWaveDuration: 'Length of the heart-shaped wave of letters that follows the ripple.',
  mwpWaveAt: 'When that wave starts, as a fraction of the ripple (or aftershock).',
  heartStrength: 'Brightness of the big heart stamped into the field by that wave.',
  heartScale: 'Size of that field heart, in cells per heart pixel.',
  heartFalloff: 'How far that heart\'s glow spreads beyond its pixels.',
  mwpLegible: 'Fraction of the time a letter is readable rather than scrambled.',
  mwpGlitch: 'How glitchy a letter is while it decodes.',
  // brand
  brandMode: 'Brand colour cycling through the field: whole field, a gradient sweep, or per glyph.',
  brandStrength: 'How much the brand colour replaces the field tint.',
  brandSpeed: 'Speed of the brand colour cycle.',
  brandSoftness: 'Crossfade between brand colours (0 = hard cuts).',
  brandScale: 'Gradient sweep: how many colour bands fit across the screen.',
  brandAngle: 'Gradient sweep: direction of the bands.',
  // field
  brightness: 'Overall glyph brightness.',
  glyphGamma: 'Contrast of the glyphs: higher = only the strongest glyphs light, the rest fall to the slate.',
  scanlineIntensity: 'Strength of the horizontal scanlines.',
  glitchAmount: 'Horizontal sync glitches (the occasional sideways jump).',
  flickerAmount: 'How often those glitches flicker on.',
  noiseAmp: 'Strength of the slow noise that decides which glyphs are lit.',
  curvature: 'CRT glass curvature. The lift straightens pixels off this as they leave the glass.',
  mouseStrength: 'How much the field lights up around the cursor.',
  timeScale: 'Master speed of all field motion.',
  digitSize: 'Glyph size within its cell (bigger = smaller gap between glyphs).',
  tiltStrength: 'How far the screen tilts toward the cursor. Overscan grows with it automatically.',
  vignette: 'Darkens the corners of the visible screen (with overscan on, measured on what you see).',
  retraceSweep: 'A faint bright band that rolls down the screen, like the raster retrace.',
  noiseDetail: 'Adds a finer layer to the field noise.',
  phosphorOn: 'Phosphor persistence: lit glyphs leave a fading afterglow. Also makes the ghost a lifted pixel leaves.',
  phosphor: 'How long that afterglow lasts.',
  chromaticAberration: 'Splits red and blue slightly apart, like misconverged CRT guns. Costs two extra field samples.',
  dither: 'Fine grain to break up banding in gradients.',
  overscanMargin: 'Extra canvas beyond what the tilt needs (only with overscan on).',
  // lift resolve
  logoOrigin: 'Where the heart forms in the field: mid-field (then glides to the HTML heart) or at the heart (beside its final spot).',
  logoFieldMs: 'How long the field takes to fade in before anything else happens.',
  logoHoldMs: 'Pause between the field arriving and the heart starting to form.',
  logoPinMs: 'The heart\'s cells decode into their M / W / P letters, then fill into solid blocks.',
  logoLiftHoldMs: 'A beat with the heart sitting solid in the glass before the first pixel lifts.',
  logoLiftMs: 'How long a pixel takes to leave the glass: scanlines fade, it grows toward you and brightens.',
  logoStaggerMs: 'Delay between the colour groups: raspberry (M), then coral (W), then teal (P).',
  logoRowStagger: 'Delay per row inside a colour group, so each group peels off top to bottom.',
  logoTravelMs: 'The glide from the field to the HTML heart\'s pixels (critically damped, no overshoot).',
  logoDepth: 'How much a lifted pixel grows as it comes off the glass (toward you).',
  logoBloom: 'Phosphor glow around a pixel while it is off the glass. Gone by the time it lands.',
  logoQuiet: 'Calms the field cells around the forming heart so its shape reads.',
  degaussOffset: 'When the degauss hits, relative to the first lift (negative = before).',
  degaussMs: 'How long the degauss takes to settle.',
  degaussAmp: 'How hard the glass shakes.',
  degaussDecay: 'How quickly the shake dies away within its length (higher = a sharp thunk, lower = a long wobble).',
  degaussPurity: 'Colour-purity blotches: drifting patches of tint across the glass during the degauss.',
  logoRippleAt: 'When the ripple fires, relative to the landing (negative = while the pixels are still gliding).',
};
// Lift-resolve knobs in the panel: key, label, min, max, step.
const LIFT_KNOBS = [
  ['logoFieldMs', 'field fade-in', 0, 2500, 10],
  ['logoHoldMs', 'hold', 0, 1500, 10],
  ['logoPinMs', 'decode + fill', 100, 3000, 10],
  ['logoLiftHoldMs', 'beat before lift', 0, 1500, 10],
  ['logoLiftMs', 'leave the glass', 40, 2000, 10],
  ['logoStaggerMs', 'M › W › P gap', 0, 800, 5],
  ['logoRowStagger', 'row stagger', 0, 120, 1],
  ['logoTravelMs', 'glide', 100, 3000, 10],
  ['logoDepth', 'lift depth', 0, 0.4, 0.01],
  ['logoBloom', 'off-glass bloom', 0, 1.5, 0.01],
  ['logoQuiet', 'calm field', 0, 1, 0.01],
  ['degaussOffset', 'degauss offset', -1500, 1500, 10],
  ['degaussMs', 'degauss length', 100, 4000, 10],
  ['degaussAmp', 'degauss shake', 0, 4, 0.05],
  ['degaussDecay', 'degauss settle', 0, 12, 0.05],
  ['degaussPurity', 'purity blotches', 0, 2, 0.05],
  ['logoRippleAt', 'ripple vs landing', -1500, 1500, 10],
  ['logoCurveFrom', 'start curvature', 0, 0.5, 0.01],
  ['logoCurveOffset', 'curve offset', -3000, 2000, 10],
  ['logoCurveMs', 'curve length', 0, 4000, 10],
];
function buildDebugPanel(instances){
  if(!instances.length) return;
  if(!document.getElementById('ft-debug-styles')){
    const s=document.createElement('style');
    s.id='ft-debug-styles';
    s.textContent=`
#ft-debug{position:fixed;top:16px;right:16px;z-index:99999;width:340px;max-height:88vh;
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
.ft-row{display:grid;grid-template-columns:118px 1fr 40px;align-items:center;
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
#ft-dbh{cursor:grab;user-select:none;touch-action:none;gap:8px;}
#ft-debug.ft-dragging #ft-dbh{cursor:grabbing;}
.ft-win{display:flex;gap:3px;margin-left:auto;}
.ft-win button{background:rgba(255,255,255,0.06);border:1px solid #2a3a40;color:#99a;width:22px;height:20px;
border-radius:4px;cursor:pointer;font:11px monospace;padding:0;line-height:1;}
.ft-win button:hover{background:rgba(255,255,255,0.14);color:#fff;}
.ft-win button[aria-pressed=true]{border-color:#3dc096;color:#3dc096;}
#ft-debug.ft-dock{top:0;bottom:0;max-height:none;height:100vh;width:380px;border-radius:0;}
#ft-debug.ft-dock-left{left:0;right:auto;border-width:0 1px 0 0;}
#ft-debug.ft-dock-right{right:0;left:auto;border-width:0 0 0 1px;}
#ft-debug.ft-dock #ft-dbh{cursor:default;border-radius:0;}
#ft-debug.ft-popped{position:static;width:auto;height:100vh;max-height:none;border:0;border-radius:0;box-shadow:none;}
#ft-debug.ft-popped #ft-dbh{cursor:default;border-radius:0;}
#ft-debug.ft-popped .ft-win button[data-mode]{display:none;}
.ft-row input[type=checkbox]{width:auto;accent-color:#3dc096;cursor:pointer;}
.ft-row.ft-off label{opacity:.45;}
#ft-logo{padding:4px 12px 8px;display:flex;flex-direction:column;gap:6px;}
#ft-logo .ft-lbar{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
#ft-logo button,#ft-logo select{background:rgba(255,255,255,0.06);color:#bbb;border:1px solid #2a3a40;
border-radius:4px;cursor:pointer;font:11px monospace;padding:3px 7px;}
#ft-logo button:hover{background:rgba(255,255,255,0.13);color:#fff;}
#ft-logo button.ft-go{border-color:#3dc096;color:#3dc096;}
#ft-logo label.ft-chk{display:flex;align-items:center;gap:4px;color:#889;cursor:pointer;}
#ft-logo label.ft-chk input{accent-color:#3dc096;margin:0;}
.ft-lstat{display:flex;justify-content:space-between;gap:8px;color:#778;font-variant-numeric:tabular-nums;}
.ft-lstat b{color:#ddd;font-weight:normal;}
.ft-track{position:relative;height:86px;margin-bottom:14px;border:1px solid #1f3036;border-radius:4px;
background:rgba(0,0,0,0.25);cursor:ew-resize;touch-action:none;user-select:none;}
.ft-lane{position:absolute;left:0;right:0;height:13px;}
.ft-seg{position:absolute;top:0;height:13px;border-radius:2px;overflow:hidden;white-space:nowrap;
font-size:9px;line-height:13px;padding-left:3px;color:rgba(255,255,255,0.85);}
.ft-seg.f{background:#3b5a62;}.ft-seg.r{background:linear-gradient(90deg,#3b5a62,#F28745);}
.ft-seg.d{background:repeating-linear-gradient(90deg,#c93f63 0 5px,#2f8a78 5px 10px);}
.ft-seg.x{background:linear-gradient(90deg,#fff,#F28745 35%,rgba(242,135,69,0));color:#222;}
.ft-mk{position:absolute;top:0;bottom:0;border-left:1px dashed rgba(255,255,255,0.5);pointer-events:none;}
.ft-mk em{position:absolute;bottom:1px;left:3px;font-style:normal;font-size:9px;color:#ddd;white-space:nowrap;}
.ft-mk.rp{border-color:#F28745;}.ft-mk.rp em{bottom:12px;color:#F28745;}
.ft-ph{position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,0.6);pointer-events:none;}
.ft-tk{position:absolute;left:0;right:0;bottom:-14px;height:12px;font-size:9px;color:#557;}
.ft-tk i{position:absolute;font-style:normal;transform:translateX(-50%);}
.ft-sec{cursor:pointer;user-select:none;}
.ft-sec::before{content:'▾ ';color:#2a6a58;}
.ft-sec.ft-shut::before{content:'▸ ';}
.ft-sbox.ft-shut{display:none;}
#ft-help{padding:6px 12px;min-height:44px;color:#8aa;border-top:1px solid #1a2a30;flex-shrink:0;font-size:10.5px;line-height:1.45;}
#ft-help b{color:#3dc096;font-weight:normal;}
#ft-mode{display:flex;gap:5px;align-items:center;padding:6px 12px;border-top:1px solid #1a2a30;margin-top:4px;flex-wrap:wrap;}
#ft-mode span{color:#667;}
#ft-mode button{background:rgba(255,255,255,0.06);color:#bbb;border:1px solid #2a3a40;border-radius:4px;cursor:pointer;font:11px monospace;padding:2px 8px;}
#ft-mode button[aria-pressed=true]{border-color:#F28745;color:#F28745;}
#ft-debug.ft-peak .ft-sbox>.ft-row input[type=range]{accent-color:#F28745;}
#ft-debug.ft-peak .ft-sbox>.ft-row.ft-np{opacity:.3;pointer-events:none;}
.ft-row.ft-pk label{color:#F28745;}
.ft-seg[data-k]{cursor:grab;}
.ft-seg .ft-h{position:absolute;right:0;top:0;bottom:0;width:6px;cursor:ew-resize;background:rgba(255,255,255,0.25);}
.ft-seg.p{background:linear-gradient(90deg,#3b5a62,#8fa7ad);}
.ft-seg.m{background:#E84F5C;}.ft-seg.w{background:#F28745;}.ft-seg.t{background:#3DC096;color:#0b1a16;}
.ft-seg.c{background:linear-gradient(90deg,#1d2b30,#7a8f95);}
.ft-seg.g{background:linear-gradient(90deg,rgba(255,255,255,0.35),rgba(255,255,255,0.08));}
.ft-mk.rp{pointer-events:auto;cursor:ew-resize;border-left-width:2px;}
.ft-mk.rp::after{content:'';position:absolute;left:-6px;top:0;bottom:0;width:12px;}
`;
    document.head.appendChild(s);
  }
  const panel=document.createElement('div');
  panel.id='ft-debug';
  document.body.appendChild(panel);
  panel.innerHTML=`
<div id="ft-dbh"><b>🎛 ft debug</b><small>\` toggle</small><span class="ft-win">
<button data-mode="left" title="Dock left">◧</button><button data-mode="float" title="Float (drag the bar)">▢</button>
<button data-mode="right" title="Dock right">◨</button><button id="ft-pop" title="Pop out into its own window">⧉</button></span></div>
<div id="ft-ibar">
<button id="ft-prev">◀</button>
<span id="ft-ilabel">Terminal 1 / ${instances.length}</span>
<button id="ft-next">▶</button>
</div>
<div id="ft-dbb"></div>
<div id="ft-help">Hover any control to see what it does.</div>
<div id="ft-dbf">
<button id="ft-retrigger">↺ re-trigger</button>
<button id="ft-copy">⎘ copy values</button>
</div>
<div id="ft-dbk" style="padding:0 12px 8px;color:#667;display:flex;gap:6px;align-items:center;flex-shrink:0;">
<label style="display:flex;gap:5px;align-items:center;cursor:pointer;" title="Remember the panel's values, layout and open state in this browser and re-apply them after a reload. Other visitors are unaffected."><input type="checkbox" id="ft-keep" style="accent-color:#3dc096;margin:0;"> keep tweaks on reload</label>
</div>`;
  if(instances.length<=1){
    panel.querySelector('#ft-prev').style.visibility='hidden';
    panel.querySelector('#ft-next').style.visibility='hidden';
  }
  const body=panel.querySelector('#ft-dbb');
  const helpBar=panel.querySelector('#ft-help');
  const logoBox=document.createElement('div');
  body.appendChild(logoBox);
  // editing rest (the field's resting values) or peak (where the pulse drives it)
  const modeBar=document.createElement('div');
  modeBar.id='ft-mode';
  modeBar.innerHTML='<span>editing</span><button data-m="rest" aria-pressed="true">rest</button><button data-m="peak" aria-pressed="false">pulse peak</button>'+
    '<button data-m="preset" title="Load the saved pulse peak (24 Nov) to tune from" style="margin-left:auto;">load preset</button>'+
    '<button data-m="clear" title="Remove this terminal\'s pulse peak values (no pulse)">clear peak</button>';
  body.appendChild(modeBar);
  let editMode='rest';
  const showHelp=(key,label)=>{ const h=HELP[key]; helpBar.innerHTML=h ? '<b>'+label+'</b> · '+h.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '<b>'+label+'</b> · <span style="color:#556">'+key+'</span>'; };
  const ilabel=panel.querySelector('#ft-ilabel');
  let currentIdx=0;
  const inst=()=>instances[currentIdx];
  // Name each instance after where it sits, so "which one am I dragging?" has
  // an answer that survives more than one terminal on a page.
  // Layout/utility class names say nothing about *which* terminal this is.
  const UTILITY=/^(w-|wf-|-{0,2}is-|does-|ft-|--)/;
  function usefulClass(el){
    if(!el||!el.className||typeof el.className!=='string') return null;
    return el.className.trim().split(/\s+/).filter(n=>n&&!UTILITY.test(n))[0]||null;
  }
  function instName(i){
    const c=instances[i].ctn;
    const sec=c.closest&&c.closest('section,header,footer,main');
    const named=c.id
      || (c.parentElement&&c.parentElement.id)
      || (sec&&sec.id)
      || usefulClass(c.parentElement)
      || usefulClass(sec);
    if(!named) return `terminal ${i+1}`;
    const n=String(named);
    return n.length>22 ? n.slice(0,21)+'…' : n;
  }
  // Outline whichever instance the panel is driving.
  const marker=document.createElement('style');
  marker.textContent='.ft-panel-selected{outline:2px solid #3DC096;outline-offset:-2px;}';
  document.head.appendChild(marker);
  function markSelected(){
    instances.forEach((it,i)=>it.ctn.classList.toggle('ft-panel-selected',i===currentIdx));
  }
  // Alt-click a terminal to bring it into the panel. The containers are
  // pointer-events:none, so hit-test their rects rather than using the target.
  document.addEventListener('click',e=>{
    if(!e.altKey || panel.classList.contains('ft-hidden')) return;
    for(let i=0;i<instances.length;i++){
      const r=instances[i].ctn.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){
        loadInst(i); break;
      }
    }
  });
  const inputs={}; // key → {input, val (span or null)}
  // keep tweaks on reload: values per terminal (by name), panel layout, open state
  const STORE='ft-debug';
  const store=(()=>{ try{ return JSON.parse(localStorage.getItem(STORE)||'null')||{}; }catch(e){ return {}; } })();
  store.values=store.values||{};
  store.peaks=store.peaks||{};
  store.shut=store.shut||{};
  const saveStore=()=>{ if(!store.keep) return; try{ localStorage.setItem(STORE, JSON.stringify(store)); }catch(e){} };
  function setP(key,v){
    const n=instName(currentIdx);
    if(editMode==='peak' && inputs[key] && inputs[key].peakable){
      inst().setPulsePeak(key,v);
      (store.peaks[n]=store.peaks[n]||{})[key]=v;
      markPeak(key);
      saveStore();
      return;
    }
    inst().setParam(key,v);
    (store.values[n]=store.values[n]||{})[key]=v;
    saveStore();
  }
  if(store.keep){
    instances.forEach((it,i)=>{
      const vals=store.values[instName(i)];
      if(vals) Object.keys(vals).forEach(k=>{ try{ it.setParam(k,vals[k]); }catch(e){} });
      const pk=store.peaks[instName(i)];
      if(pk && it.setPulsePeak) Object.keys(pk).forEach(k=>{ try{ it.setPulsePeak(k,pk[k]); }catch(e){} });
    });
  }
  let lastSec=null, secBox=body;
  function makeSection(title, into){
    const sec=document.createElement('div');
    sec.className='ft-sec';
    sec.textContent=title;
    const box=document.createElement('div'); box.className='ft-sbox';
    const shut=!!store.shut[title];
    sec.classList.toggle('ft-shut',shut); box.classList.toggle('ft-shut',shut);
    sec.addEventListener('click',()=>{
      const now=!box.classList.contains('ft-shut');
      sec.classList.toggle('ft-shut',now); box.classList.toggle('ft-shut',now);
      store.shut[title]=now; saveStore();
    });
    into.appendChild(sec); into.appendChild(box);
    return box;
  }
  function hoverHelp(row,key,label){
    row.addEventListener('mouseenter',()=>showHelp(key,label));
    row.addEventListener('focusin',()=>showHelp(key,label));
  }
  SLIDERS.forEach(([key,uName,label,min,max,step,section,type])=>{
    if(section!==lastSec){
      secBox=makeSection(section, body);
      lastSec=section;
    }
    const body_=body;
    { const body=secBox;
    const row=document.createElement('div'); row.className='ft-row';
    const lbl=document.createElement('label'); lbl.title=HELP[key]||key; lbl.textContent=label;
    hoverHelp(row,key,label);
    if(!uName) row.classList.add('ft-np');
    if(type==='bool'){
      const inp=document.createElement('input');
      inp.type='checkbox';
      inp.checked=!!(inst().getParam(key)??DEFAULTS[key]);
      inp.style.cssText='width:auto;accent-color:#3dc096;cursor:pointer;';
      inp.addEventListener('change',()=>setP(key,inp.checked));
      const spacer=document.createElement('span');
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(spacer);
      body.appendChild(row);
      inputs[key]={input:inp,val:null,row,peakable:!!uName};
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
      sel.addEventListener('change',()=>setP(key,parseFloat(sel.value)));
      const spacer=document.createElement('span');
      row.appendChild(lbl); row.appendChild(sel); row.appendChild(spacer);
      body.appendChild(row);
      inputs[key]={input:sel,val:null,row,peakable:!!uName};
    } else {
      const inp=document.createElement('input');
      inp.type='range'; inp.min=min; inp.max=max; inp.step=step;
      inp.value=inst().getParam(key)??DEFAULTS[key]??0;
      const val=document.createElement('span'); val.className='ftv';
      val.textContent=fmt(inp.value,step);
      inp.addEventListener('input',()=>{
        const v=parseFloat(inp.value);
        val.textContent=fmt(v,step);
        setP(key,v);
      });
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(val);
      body.appendChild(row);
      inputs[key]={input:inp,val,row,peakable:!!uName};
    }
    }
  });
  // a peak value that differs from rest shows its label in orange
  function markPeak(key){
    const r=inputs[key]; if(!r || !r.peakable || !inst().getPulsePeak) return;
    const pk=inst().getPulsePeak(key), rest=inst().getParam(key);
    r.row.classList.toggle('ft-pk', pk!==null && Math.abs(pk-Number(rest))>1e-6);
  }
  function showValue(key){
    const r=inputs[key]; if(!r) return;
    const step=+(r.input.step||1);
    let v=inst().getParam(key)??DEFAULTS[key]??0;
    if(editMode==='peak' && r.peakable && inst().getPulsePeak){ const pk=inst().getPulsePeak(key); if(pk!==null) v=pk; }
    if(r.input.type==='checkbox') r.input.checked=!!v;
    else if(r.input.tagName==='SELECT') r.input.value=Math.round(v);
    else { r.input.value=v; if(r.val) r.val.textContent=fmt(v,step); }
  }
  function setEditMode(m){
    editMode=m;
    panel.classList.toggle('ft-peak', m==='peak');
    modeBar.querySelectorAll('button[data-m=rest],button[data-m=peak]').forEach(b=>b.setAttribute('aria-pressed', String(b.getAttribute('data-m')===m)));
    if(inst().pulsePreview) inst().pulsePreview(m==='peak');
    Object.keys(inputs).forEach(k=>{ showValue(k); markPeak(k); });
    helpBar.innerHTML = m==='peak'
      ? '<b>pulse peak</b> · The field is held at its peak. Orange sliders set where each value goes on the ripple impact; it settles back to rest over the PULSE timings. Greyed rows can\'t pulse.'
      : '<b>rest</b> · The field\'s resting values, where it sits between pulses. Orange labels have a different peak.';
  }
  modeBar.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    const m=b.getAttribute('data-m');
    if(m==='preset'){
      const n=instName(currentIdx);
      Object.keys(PULSE_PRESET).forEach(k=>{ inst().setPulsePeak(k,PULSE_PRESET[k]); (store.peaks[n]=store.peaks[n]||{})[k]=PULSE_PRESET[k]; });
      saveStore();
      Object.keys(inputs).forEach(k=>{ showValue(k); markPeak(k); });
      return;
    }
    if(m==='clear'){
      const pk=inst().opts.pulsePeak||{};
      Object.keys(pk).forEach(k=>inst().setPulsePeak(k,null));
      delete store.peaks[instName(currentIdx)]; saveStore();
      Object.keys(inputs).forEach(k=>{ showValue(k); markPeak(k); });
      return;
    }
    setEditMode(m);
  });
  function loadInst(idx){
    currentIdx=idx;
    ilabel.textContent = instances.length>1
      ? `${instName(idx)}  ${idx+1}/${instances.length}`
      : instName(idx);
    markSelected();
    instances.forEach((it,i)=>{ if(i!==idx && it.pulsePreview) it.pulsePreview(false); });
    setEditMode(editMode);
    buildLogo();
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
        : `  ${key}: ${step<0.01 ? (+v).toFixed(3) : fmt(v,step)},\n`;
    });
    const pk=inst().opts.pulsePeak;
    if(pk && Object.keys(pk).length){
      out+='  // pulse peak: where the field goes on the ripple impact\n  pulsePeak: {\n';
      SLIDERS.forEach(([key,,,,,step])=>{ if(pk[key]!=null) out+=`    ${key}: ${fmt(pk[key],step)},\n`; });
      out+='  },\n';
    }
    out+='};';
    if(inst().liftTimeline){
      out+='\n// lift resolve: site config (FaultyTerminalConfig / data-ft-opts)\nconst LIFT = {\n';
      out+=`  logoOrigin: '${inst().getParam('logoOrigin')}',\n  logoCurveRamp: ${inst().getParam('logoCurveRamp')!==false},\n`;
      LIFT_KNOBS.forEach(([key])=>{ out+=`  ${key}: ${+(+inst().getParam(key)).toFixed(3)},\n`; });
      out+='};';
    }
    if(inst().logoTimeline){
      out+='\n// logo resolve: site config (FaultyTerminalConfig / data-ft-opts)\nconst LOGO = {\n';
      LOGO_KNOBS.forEach(([key])=>{ out+=`  ${key}: ${+(+inst().getParam(key)).toFixed(3)},\n`; });
      out+='};';
    }
    // Copy from the window that holds the panel: when it is popped out, the
    // page isn't focused and its clipboard refuses the write.
    const btn=panel.querySelector('#ft-copy'), orig='⎘ copy values';
    const doc=panel.ownerDocument, win=doc.defaultView||window;
    const done=ok=>{ btn.textContent=ok?'✓ copied!':'✗ not copied, see console'; setTimeout(()=>btn.textContent=orig,1800); };
    const fallback=()=>{
      let ok=false;
      try{
        const ta=doc.createElement('textarea'); ta.value=out;
        ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
        panel.appendChild(ta); ta.focus(); ta.select(); ok=doc.execCommand('copy'); ta.remove();
      }catch(e){ ok=false; }
      if(!ok) console.log(out);
      done(ok);
    };
    try{
      const cb=win.navigator && win.navigator.clipboard;
      if(cb && cb.writeText) cb.writeText(out).then(()=>done(true), fallback); else fallback();
    }catch(e){ fallback(); }
  });
  function setOpen(open){
    panel.classList.toggle('ft-hidden', !open);
    if(open) markSelected(); else instances.forEach(it=>it.ctn.classList.remove('ft-panel-selected'));
    store.open=open; saveStore();
    if(open) tickLogo();
  }
  document.addEventListener('keydown',e=>{
    if(e.key!=='`' || popWin) return;
    const t=e.target;
    if(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    setOpen(panel.classList.contains('ft-hidden'));
  });

  // ---- logo resolve section: timeline, scrub, knobs ----
  let logoUi=null;
  function buildLogo(){
    logoBox.innerHTML=''; logoUi=null;
    if(inst().liftTimeline) return buildLift();
    const lt=inst().logoTimeline;
    if(!lt) return;
    const it=inst();
    logoBox.innerHTML=`<div class="ft-sec">LOGO RESOLVE</div><div id="ft-logo">
<div class="ft-lbar"><button class="ft-go" data-a="play">▶ play</button><button data-a="pause">❚❚</button>
<button data-a="reload" title="Reload the page: replays the whole intro, Webflow interactions included">⟳ reload page</button>
<select data-a="speed" title="Playback speed"><option value="1">1×</option><option value="0.5">0.5×</option>
<option value="0.25">0.25×</option><option value="0.1">0.1×</option></select>
<label class="ft-chk" title="Show the final logo at 45% over the resolve"><input type="checkbox" data-a="ghost"> ghost</label></div>
<div class="ft-lstat"><span data-o="clock">0 ms</span><span data-o="stage"></span></div>
<div class="ft-track" data-o="track"></div><div data-o="knobs"></div>
<div class="ft-lstat"><span data-o="start"></span><button data-a="reset" style="padding:2px 6px;">reset timings</button></div></div>`;
    const q=a=>logoBox.querySelector(a);
    const track=q('[data-o=track]'), knobs=q('[data-o=knobs]');
    const flareOn=!!it.opts.logoFlare, rippleOn=!!it.opts.logoRipple;
    LOGO_KNOBS.forEach(([key,label,min,max,step])=>{
      const row=document.createElement('div'); row.className='ft-row';
      const off=(/Flare/.test(key)&&!flareOn)||(key==='logoRippleAt'&&!rippleOn);
      if(off){ row.classList.add('ft-off'); row.title='The site runs this part (logo'+(key==='logoRippleAt'?'Ripple':'Flare')+' is off)'; }
      const lbl=document.createElement('label'); lbl.title=key; lbl.textContent=label;
      const inp=document.createElement('input'); inp.type='range'; inp.min=min; inp.max=max; inp.step=step;
      inp.value=it.getParam(key);
      const val=document.createElement('span'); val.className='ftv'; val.textContent=fmt(inp.value,step);
      inp.addEventListener('input',()=>{ const v=parseFloat(inp.value); val.textContent=fmt(v,step); setP(key,v); drawTrack(); });
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(val); knobs.appendChild(row);
    });
    function pct(ms){ return (ms/lt.schedule.done*100)+'%'; }
    function drawTrack(){
      const S=lt.schedule, end=S.done;
      const lane=(cls,name,a,b,top)=>`<div class="ft-lane" style="top:${top}px"><div class="ft-seg ${cls}" style="left:${pct(a)};width:${pct(Math.max(0,b-a))}">${name}</div></div>`;
      let h=lane('f','field',0,S.f1,3)+lane('r','resolve',S.r0,S.r1,19)+lane('d','degauss',S.d0,S.d1,35)+lane('x','flare',S.h,S.x1,51);
      h+=`<div class="ft-mk" style="left:${pct(S.h)}"><em>hand-off</em></div><div class="ft-mk rp" style="left:${pct(S.rp)}"><em>ripple</em></div>`;
      h+='<div class="ft-ph" data-o="ph"></div><div class="ft-tk">';
      for(let t=0;t<=end;t+=500) h+=`<i style="left:${pct(t)}">${(t/1000).toFixed(1)}s</i>`;
      track.innerHTML=h+'</div>';
    }
    drawTrack();
    function scrub(x){ const r=track.getBoundingClientRect(); lt.seek(clamp((x-r.left)/r.width,0,1)*lt.schedule.done); }
    track.addEventListener('pointerdown',e=>{ track.setPointerCapture(e.pointerId); scrub(e.clientX); });
    track.addEventListener('pointermove',e=>{ if(e.buttons) scrub(e.clientX); });
    logoBox.addEventListener('click',e=>{
      const a=e.target.closest('[data-a]'); if(!a) return;
      const act=a.getAttribute('data-a');
      if(act==='play') lt.play();
      if(act==='pause') lt.pause();
      if(act==='reload') location.reload();
      if(act==='reset'){
        LOGO_KNOBS.forEach(([key])=>setP(key,DEFAULTS[key]));
        knobs.querySelectorAll('input').forEach((inp,i)=>{ const [key,,,,step]=LOGO_KNOBS[i]; inp.value=DEFAULTS[key]; inp.nextSibling.textContent=fmt(DEFAULTS[key],step); });
        drawTrack();
      }
    });
    const spd=q('[data-a=speed]'); spd.value=String(lt.speed);
    spd.addEventListener('change',()=>lt.setSpeed(parseFloat(spd.value)));
    const gh=q('[data-a=ghost]'); gh.checked=lt.ghost;
    gh.addEventListener('change',()=>lt.setGhost(gh.checked));
    logoUi={ lt, clock:q('[data-o=clock]'), stage:q('[data-o=stage]'), start:q('[data-o=start]'), track, pct };
    tickLogo();
  }

  // ---- lift resolve: transport, draggable lanes, knobs ----
  function liftStage(S,e){
    if(e<S.f1) return 'field fades in';
    if(e<S.p0) return 'hold';
    if(e<S.p1) return 'pin · decode → fill';
    if(e<S.l0) return 'beat';
    if(e<S.lastLift+S.lMs) return 'lift M › W › P'+(e>=S.d0&&e<S.d1?' · degauss':'');
    if(e<S.land) return 'glide'+(e>=S.d0&&e<S.d1?' · degauss':'');
    if(e<S.rp) return 'landed · HTML heart';
    return 'ripple + pulse';
  }
  function buildLift(){
    const it=inst(), lt=it.liftTimeline;
    logoBox.innerHTML='';
    const box=makeSection('LIFT RESOLVE', logoBox);
    box.innerHTML=`<div id="ft-logo">
<div class="ft-lbar"><button class="ft-go" data-a="play" title="Replay the whole resolve">▶ play</button><button data-a="pause" title="Pause / resume">❚❚</button>
<select data-a="speed" title="Playback speed"><option value="1">1×</option><option value="0.5">0.5×</option>
<option value="0.25">0.25×</option><option value="0.1">0.1×</option></select>
<select data-a="origin" title="${HELP.logoOrigin}"><option value="centre">forms mid-field</option><option value="target">forms at the heart</option></select>
<label class="ft-chk" title="Show the final HTML heart at 45% over the resolve, to check alignment"><input type="checkbox" data-a="ghost"> ghost</label>
<label class="ft-chk" title="${HELP.logoCurveRamp}"><input type="checkbox" data-a="flat"> flat start</label>
<button data-a="reload" title="Reload the page: replays the whole intro">⟳</button></div>
<div class="ft-lstat"><span data-o="clock">0 ms</span><span data-o="stage"></span></div>
<div class="ft-track" data-o="track" style="height:138px"></div>
<div style="color:#556;font-size:10px;margin-top:-6px;">drag a lane to move it · drag its bright end to resize · drag the ripple line · click to scrub</div>
<div data-o="knobs"></div>
<div class="ft-lstat"><span data-o="start"></span><button data-a="reset" style="padding:2px 6px;">reset timings</button></div></div>`;
    const q=a=>box.querySelector(a);
    const track=q('[data-o=track]'), knobs=q('[data-o=knobs]');
    const knobRows={};
    LIFT_KNOBS.forEach(([key,label,min,max,step])=>{
      const row=document.createElement('div'); row.className='ft-row';
      const lbl=document.createElement('label'); lbl.title=HELP[key]||key; lbl.textContent=label;
      hoverHelp(row,key,label);
      const inp=document.createElement('input'); inp.type='range'; inp.min=min; inp.max=max; inp.step=step;
      inp.value=it.getParam(key);
      const val=document.createElement('span'); val.className='ftv'; val.textContent=fmt(inp.value,step);
      inp.addEventListener('input',()=>{ const v=parseFloat(inp.value); val.textContent=fmt(v,step); setLift(key,v,false); drawTrack(); });
      row.appendChild(lbl); row.appendChild(inp); row.appendChild(val); knobs.appendChild(row);
      knobRows[key]={inp,val,step};
    });
    function setLift(key,v,syncKnob){
      const n=instName(currentIdx);
      inst().setParam(key,v);
      (store.values[n]=store.values[n]||{})[key]=v; saveStore();
      if(syncKnob && knobRows[key]){ const k=knobRows[key]; k.inp.value=v; k.val.textContent=fmt(v,k.step); }
      if(lt.refresh) lt.refresh();
    }
    // the track runs a little past the end so the ripple has room
    const span=()=>{ const S=lt.schedule; return Math.max(S.done, S.rp)+700; };
    function pct(ms){ return (ms/span()*100)+'%'; }
    // lanes: [key, label, class, start, end, body-drag param, edge-drag param]
    function lanes(S){
      const grp=g=>[S.l0+g*S.st, S.l0+g*S.st+6*S.rs+S.lMs];
      return [
        ['field','field','f',0,S.f1,null,'logoFieldMs'],
        ['pin','decode + fill','p',S.p0,S.p1,'logoHoldMs','logoPinMs'],
        ['m','lift M','m',...grp(0),'logoLiftHoldMs','logoLiftMs'],
        ['w','lift W','w',...grp(1),'stagger1','logoLiftMs'],
        ['t','lift P','t',...grp(2),'stagger2','logoLiftMs'],
        ['glide','glide','g',S.l0+S.lMs*0.5,S.land,'logoLiftHoldMs','logoTravelMs'],
        ['deg','degauss','d',S.d0,S.d1,'degaussOffset','degaussMs'],
      ].concat(S.cOn ? [['curve','curvature','c',S.c0,S.c1,'logoCurveOffset','logoCurveMs']] : []);
    }
    function drawTrack(){
      const S=lt.schedule, end=span();
      let h='';
      lanes(S).forEach(([id,name,cls,a,b,bodyK,edgeK],i)=>{
        h+=`<div class="ft-lane" style="top:${3+i*16}px"><div class="ft-seg ${cls}" data-k="${id}" style="left:${pct(a)};width:${pct(Math.max(0,b-a))}" title="${name}">${name}${edgeK?'<span class="ft-h" data-edge="1"></span>':''}</div></div>`;
      });
      h+=`<div class="ft-mk" style="left:${pct(S.land)}"><em>land · HTML</em></div><div class="ft-mk rp" data-k="ripple" style="left:${pct(S.rp)}" title="drag: ripple timing"><em>ripple</em></div>`;
      h+='<div class="ft-ph" data-o="ph"></div><div class="ft-tk">';
      const stepT=end>4000?1000:500;
      for(let t=0;t<=end;t+=stepT) h+=`<i style="left:${pct(t)}">${(t/1000).toFixed(1)}s</i>`;
      track.innerHTML=h+'</div>';
    }
    drawTrack();
    let drag=null;
    track.addEventListener('pointerdown',e=>{
      track.setPointerCapture(e.pointerId);
      const seg=e.target.closest('[data-k]');
      const r=track.getBoundingClientRect(), msPx=span()/r.width;
      if(seg){
        const id=seg.getAttribute('data-k'), edge=!!e.target.closest('[data-edge]');
        const L=lanes(lt.schedule).find(l=>l[0]===id);
        let key=null;
        if(id==='ripple') key='logoRippleAt';
        else if(L) key=edge?L[6]:L[5];
        if(key){
          const stag=key==='stagger1'?1:key==='stagger2'?2:0;
          const real=stag?'logoStaggerMs':key;
          drag={ key:real, div:stag||1, x0:e.clientX, v0:+inst().getParam(real), msPx };
          const lbl=(id==='ripple'?'ripple':L[1])+(edge?' · length':' · timing');
          showHelp(real, lbl);
          e.preventDefault(); return;
        }
      }
      drag=null; scrub(e.clientX);
    });
    track.addEventListener('pointermove',e=>{
      if(!e.buttons) return;
      if(drag){
        let v=drag.v0+(e.clientX-drag.x0)*drag.msPx/drag.div;
        const kn=LIFT_KNOBS.find(k=>k[0]===drag.key);
        if(kn) v=clamp(Math.round(v/kn[4])*kn[4], kn[2], kn[3]);
        setLift(drag.key, v, true); drawTrack();
      } else scrub(e.clientX);
    });
    track.addEventListener('pointerup',()=>{ drag=null; });
    function scrub(x){ const r=track.getBoundingClientRect(); lt.seek(clamp((x-r.left)/r.width,0,1)*span()); }
    box.addEventListener('click',e=>{
      const a=e.target.closest('[data-a]'); if(!a) return;
      const act=a.getAttribute('data-a');
      if(act==='play') lt.play();
      if(act==='pause') lt.playing ? lt.pause() : lt.resume();
      if(act==='reload') location.reload();
      if(act==='reset'){
        LIFT_KNOBS.forEach(([key])=>setLift(key, key in LIFT_DEFAULTS ? LIFT_DEFAULTS[key] : DEFAULTS[key], true));
        drawTrack();
      }
    });
    const spd=q('[data-a=speed]'); spd.value=String(lt.speed);
    spd.addEventListener('change',()=>lt.setSpeed(parseFloat(spd.value)));
    const org=q('[data-a=origin]'); org.value=String(it.getParam('logoOrigin')).toLowerCase()==='target'?'target':'centre';
    org.addEventListener('change',()=>{ setLift('logoOrigin', org.value, false); lt.play(); });
    const gh=q('[data-a=ghost]'); gh.checked=lt.ghost;
    gh.addEventListener('change',()=>lt.setGhost(gh.checked));
    const fl=q('[data-a=flat]'); fl.checked=it.getParam('logoCurveRamp')!==false;
    fl.addEventListener('change',()=>{ setLift('logoCurveRamp', fl.checked, false); if(!fl.checked) it.setParam('curvature', it.getParam('curvature')); drawTrack(); });
    logoUi={ lt, clock:q('[data-o=clock]'), stage:q('[data-o=stage]'), start:q('[data-o=start]'), track, pct, lift:true };
    tickLogo();
  }
  function stageAt(S,e){
    if(e<S.f1) return 'field fades in';
    if(e<S.r0) return 'hold';
    if(e<Math.min(S.d0,S.h)) return 'resolve · lock, switch on, fill';
    if(e<S.h) return 'degauss · wobble + fringe';
    if(e<S.x1) return 'hand-off · flare';
    return 'done';
  }
  let tickId=0;
  function tickLogo(){
    cancelAnimationFrame(tickId);
    if(!logoUi || panel.classList.contains('ft-hidden') && !popWin) return;
    const {lt,clock,stage,start,track,pct}=logoUi, S=lt.schedule, e=lt.time;
    clock.textContent=Math.round(e)+' ms'+(lt.playing?'':' · paused');
    stage.textContent=logoUi.lift ? liftStage(S,e) : stageAt(S,e);
    start.textContent=lt.startedAt?('started '+Math.round(lt.startedAt)+' ms after page load'):'';
    const ph=track.querySelector('[data-o=ph]'); if(ph) ph.style.left=pct(Math.min(e,S.done));
    tickId=requestAnimationFrame(tickLogo);
  }

  // ---- window: float + drag, dock left/right, pop out ----
  let popWin=null;
  function setMode(mode){
    store.mode=mode; saveStore();
    panel.classList.remove('ft-dock','ft-dock-left','ft-dock-right');
    if(mode==='left'||mode==='right'){ panel.classList.add('ft-dock','ft-dock-'+mode); panel.style.left=panel.style.top=''; }
    else if(store.pos){ panel.style.left=store.pos[0]+'px'; panel.style.top=store.pos[1]+'px'; panel.style.right='auto'; }
    panel.querySelectorAll('.ft-win button[data-mode]').forEach(b=>b.setAttribute('aria-pressed', String(b.getAttribute('data-mode')===(mode||'float'))));
  }
  panel.querySelector('.ft-win').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.id==='ft-pop') return popWin ? popWin.close() : popOut(e.shiftKey);
    setMode(b.getAttribute('data-mode'));
  });
  const head=panel.querySelector('#ft-dbh');
  head.addEventListener('pointerdown',e=>{
    if(e.target.closest('button') || popWin || panel.classList.contains('ft-dock')) return;
    const r=panel.getBoundingClientRect(), dx=e.clientX-r.left, dy=e.clientY-r.top;
    head.setPointerCapture(e.pointerId); panel.classList.add('ft-dragging');
    const move=ev=>{
      const x=clamp(ev.clientX-dx,0,innerWidth-60), y=clamp(ev.clientY-dy,0,innerHeight-30);
      panel.style.left=x+'px'; panel.style.top=y+'px'; panel.style.right='auto'; store.pos=[x,y];
    };
    const up=()=>{ head.removeEventListener('pointermove',move); head.removeEventListener('pointerup',up); panel.classList.remove('ft-dragging'); saveStore(); };
    head.addEventListener('pointermove',move); head.addEventListener('pointerup',up);
  });
  // Pop out: a named popup window you can drag anywhere, outside the browser
  // too. It survives reloads and page changes: the old page leaves it open
  // with a "reconnecting" note, and the next page with a terminal finds it by
  // name (no click needed for an existing window) and moves its panel in.
  // Shift-click ⧉ for Document Picture-in-Picture instead (Chrome/Edge):
  // always on top, but the browser closes it on every reload.
  const POP_NAME='ft-debug-panel', POP_FLAG='ft-debug-popped';
  const popFlag=v=>{ try{ v ? sessionStorage.setItem(POP_FLAG,'1') : sessionStorage.removeItem(POP_FLAG); }catch(e){} };
  let popPip=false;
  async function popOut(pip){
    let w=null;
    const h=Math.min(1000,(screen.availHeight||900)-80);
    if(pip){
      try{ if(window.documentPictureInPicture) w=await window.documentPictureInPicture.requestWindow({ width:400, height:h }); }catch(e){ w=null; }
    }
    popPip=!!w;
    if(!w) w=window.open('', POP_NAME, 'popup,width=400,height='+h);
    if(w) attachPop(w);
  }
  function attachPop(w){
    let d;
    try{ d=w.document; d.body; }catch(e){ return false; } // window went cross-origin
    popWin=w;
    d.title='ft debug';
    d.querySelectorAll('#ft-debug-styles').forEach(n=>n.remove());
    d.head.appendChild(document.getElementById('ft-debug-styles').cloneNode(true));
    d.body.innerHTML='';
    d.body.style.cssText='margin:0;background:#080c10;';
    panel.classList.remove('ft-hidden');
    panel.classList.add('ft-popped');
    d.body.appendChild(panel);
    panel.querySelector('#ft-pop').setAttribute('aria-pressed','true');
    panel.querySelector('#ft-pop').title='Back into the page';
    if(!popPip) popFlag(true);
    const back=()=>{
      if(popWin!==w) return;
      popWin=null; popFlag(false);
      panel.classList.remove('ft-popped');
      document.body.appendChild(panel);
      panel.querySelector('#ft-pop').setAttribute('aria-pressed','false');
      panel.querySelector('#ft-pop').title='Pop out into its own window (shift-click: always on top, closes on reload)';
      setMode(store.mode); setOpen(true);
    };
    w.addEventListener('pagehide', back);
    const iv=setInterval(()=>{ if(w.closed){ clearInterval(iv); back(); } }, 500);
    tickLogo();
    return true;
  }
  // This page is going away (reload / navigation): leave the popup open for the next page.
  window.addEventListener('pagehide',()=>{
    if(!popWin || popPip) return;
    try{
      const d=popWin.document;
      d.body.innerHTML='<div style="font:12px/1.5 ui-monospace,Menlo,monospace;color:#7fa;padding:16px;">ft debug · reconnecting…<br><span style="color:#577">The panel comes back when a page with a terminal loads. Close this window to stop popping out.</span></div>';
    }catch(e){}
  });
  function reattachPop(){
    let flag=null; try{ flag=sessionStorage.getItem(POP_FLAG); }catch(e){}
    if(!flag) return false;
    let w=null;
    try{ w=window.open('', POP_NAME); }catch(e){ w=null; } // finds the open window; blocked (null) if it was closed
    if(!w || w.closed){ popFlag(false); return false; }
    popPip=false;
    if(attachPop(w)) return true;
    popFlag(false); return false;
  }
  const keep=panel.querySelector('#ft-keep');
  keep.checked=!!store.keep;
  keep.addEventListener('change',()=>{
    store.keep=keep.checked;
    if(store.keep) saveStore(); else { try{ localStorage.removeItem(STORE); }catch(e){} }
  });

  setMode(store.mode||'float');
  loadInst(0);
  setOpen(!!(store.keep && store.open));
  reattachPop();
}
// Debug panel controls for the logo timeline: key, label, min, max, step.
const LOGO_KNOBS = [
  ['logoFieldMs', 'field fade-in', 200, 2500, 50],
  ['logoHoldMs', 'hold', 0, 1500, 50],
  ['logoResolveMs', 'resolve', 100, 4000, 50],
  ['logoSpread', 'pixel stagger', 0, 0.5, 0.01],
  ['degaussOffset', 'degauss vs fill', -1500, 800, 10],
  ['degaussMs', 'degauss length', 150, 2000, 10],
  ['degaussAmp', 'degauss amp', 0, 4, 0.05],
  ['degaussDecay', 'degauss settle', 1, 12, 0.25],
  ['logoSlot', 'pre-degauss size', 0.5, 1, 0.01],
  ['logoHandOffset', 'hand-off vs end', -800, 600, 10],
  ['logoFlareMs', 'flare length', 150, 1500, 10],
  ['logoFlareSpread', 'flare stagger', 0, 500, 10],
  ['logoFlareIntensity', 'flare intensity', 0, 4, 0.05],
  ['logoFlareBlur', 'flare blur (px)', 0, 40, 1],
  ['logoRippleAt', 'ripple vs hand-off', -300, 1000, 10],
];
// Webflow Libraries namespace a component's classes on install — a component
// shared from "MWP Component Library" arrives as
// .mwp-component-library--faulty-terminal, not .faulty-terminal. Matching the
// exact class alone silently finds nothing, so match any class containing the
// name, plus an explicit data attribute (attributes survive the install intact
// and are the namespace-proof hook).
const FT_SELECTOR = '.faulty-terminal, [class*="faulty-terminal"], [data-faulty-terminal]';

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
// Webflow gives a new Text Block this copy. If a config carrier still holds it,
// the property was never filled in — treat it as blank, not as a value.
const WF_PLACEHOLDER = 'This is some text inside of a div block.';
const REJECTED = Symbol('rejected');
function coerceAttrValue(raw, key){
  const v = String(raw).trim();
  if(v === '' || v === WF_PLACEHOLDER) return REJECTED;
  const def = DEFAULTS[key];
  if(typeof def === 'boolean'){
    if(v === 'true') return true;
    if(v === 'false') return false;
    console.warn('[faulty-terminal] ' + key + ' expects true/false, got:', v);
    return REJECTED;
  }
  if(typeof def === 'number'){
    const n = Number(v);
    if(v !== '' && isFinite(n)) return n;
    console.warn('[faulty-terminal] ' + key + ' expects a number, got:', v);
    return REJECTED;
  }
  if(v === 'true') return true;
  if(v === 'false') return false;
  if(v === 'null') return null;
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
    const val = coerceAttrValue(raw, key);
    if(val !== REJECTED) out[key] = val;
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
    const val = coerceAttrValue(raw, key);
    if(val !== REJECTED) overrides[key] = val;
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
// reveal is the one-word way to say how the field arrives; it sets the older
// ripple / pageLoadAnimation pair so the rest of the code needs no new branches.
const REVEAL_MODES = ['ripple', 'fade', 'instant'];
// reveal:'fade' is chosen where nothing triggers the ripple, so it should start
// at once. These apply unless the site set pageLoadDelay/Duration itself; the
// legacy ripple:false path keeps the older 1500ms delay / 2000ms fade.
const FADE_DEFAULTS = { pageLoadDelay: 0, pageLoadDuration: 1500 };
function applyReveal(opts, overrides){
  overrides = overrides || {};
  const r = String(opts.reveal == null ? '' : opts.reveal).trim().toLowerCase();
  if(!r) return opts;
  if(!REVEAL_MODES.includes(r)){
    console.warn('[faulty-terminal] reveal expects ripple | fade | instant, got:', opts.reveal);
    return opts;
  }
  opts.reveal = r;
  if(r === 'ripple'){ opts.ripple = true; }
  else if(r === 'fade'){
    opts.ripple = false; opts.pageLoadAnimation = true;
    Object.keys(FADE_DEFAULTS).forEach(k => { if(!(k in overrides)) opts[k] = FADE_DEFAULTS[k]; });
  }
  else { opts.ripple = false; opts.pageLoadAnimation = false; }
  return opts;
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
  const found = scope.querySelectorAll ? scope.querySelectorAll(FT_SELECTOR) : [];
  const fresh = [];
  found.forEach(ctn => {
    if(ctn[INITED]) return;
    ctn[INITED] = true;
    const overrides = Object.assign({}, siteConfig(), parseAttrOpts(ctn));
    const opts = applyReveal(Object.assign({}, DEFAULTS, overrides.logoLift ? LIFT_DEFAULTS : null, overrides), overrides);
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
