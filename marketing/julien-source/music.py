# Original soundtrack for the SD Wise film: 120 BPM, A minor, synced to scene cuts.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
DUR = 83.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
BEAT = 0.5
BAR = 2.0

def buf(): return np.zeros(N)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def add(dst, t0, sig, g=1.0):
    i = int(t0 * SR)
    if i >= N: return
    j = min(N, i + len(sig)); dst[i:j] += sig[: j - i] * g
def saw(f, n, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f + ph) % 1) - 1
def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) if na else e[:na]
    e[na:na + nd] = np.linspace(1, s, len(e[na:na + nd]))
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def in_any(t, spans): return any(a <= t < b for a, b in spans)

GROOVE = [(20, 58), (62, 74)]
CHORDS = [  # (bass root, pad voicing, arp tones)
    (45, [57, 60, 64, 71], [69, 72, 76, 79]),   # Am(add9)
    (41, [53, 57, 60, 64], [65, 69, 72, 76]),   # Fmaj7
    (48, [55, 60, 64, 67], [67, 72, 76, 79]),   # C
    (43, [55, 59, 62, 67], [67, 71, 74, 79]),   # G
]
def chord_at(t): return CHORDS[int(t // BAR) % 4]

kick, clap, hats, bass, pad, arp, fx, verb_send = (buf() for _ in range(8))

# ---- drums ----
def kick_hit(g=1.0, dec=0.38):
    n = int(0.6 * SR); t = np.arange(n) / SR
    f = 45 + 120 * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    s[:40] += rng.standard_normal(40) * 0.3
    return np.tanh(s * 1.6) * g
def clap_hit():
    n = int(0.35 * SR); t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 900, 5000)
    e = np.exp(-t / 0.12) * (1 + 0.6 * (np.exp(-((t - 0.012) % 0.011) / 0.003) * (t < 0.035)))
    return nz * e * 0.6
def hat_hit(dec=0.035):
    n = int(0.15 * SR); t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7500) * np.exp(-t / dec) * 0.35

for i in range(int(DUR / (BEAT / 2))):
    t = i * BEAT / 2
    beat_pos = i % 4  # 16th within beat
    if in_any(t, GROOVE):
        if beat_pos == 0: add(kick, t, kick_hit())
        if beat_pos == 0 and (i // 4) % 2 == 1: add(clap, t, clap_hit()); add(verb_send, t, clap_hit(), 0.25)
        if beat_pos == 2: add(hats, t, hat_hit(0.06), 1.0)
        elif beat_pos in (1, 3): add(hats, t, hat_hit(0.025), 0.45)
    elif 0 <= t < 9.5:
        # intro: ticking 16ths build, heartbeat kick from 4s
        add(hats, t, hat_hit(0.02), 0.25 + 0.35 * t / 10)
        if beat_pos == 0 and t >= 4 and (i // 4) % 2 == 0: add(kick, t, kick_hit(0.7, 0.5))
    elif 16 <= t < 20 and beat_pos == 0:
        add(kick, t, kick_hit(0.55, 0.6)) if (i // 4) % 4 == 0 else None
    elif 58 <= t < 61.4 and beat_pos == 2:
        add(hats, t, hat_hit(0.03), 0.4)

# ---- bass (8ths, octave bounce) ----
for i in range(int(DUR / (BEAT / 2))):
    t = i * BEAT / 2
    if not in_any(t, GROOVE) or i % 2: continue
    root = chord_at(t)[0] + (12 if (i // 2) % 4 == 3 else 0)
    n = int(0.24 * SR); tt = np.arange(n) / SR
    f = mtof(root)
    s = saw(f, n) * 0.6 + saw(f * 1.005, n) * 0.4 + np.sin(2 * np.pi * f / 2 * tt) * 0.8
    s = lp(s, 380) * np.exp(-tt / 0.18) * np.minimum(1, tt / 0.004)
    add(bass, t, s, 0.55)

# ---- pad (per bar, continuous) ----
def pad_level(t):
    if t < 10: return 0.35 + 0.35 * t / 10
    if t < 14: return 0.75
    if t < 20: return 1.0
    if 58 <= t < 62: return 1.0
    if 74 <= t < 76.5: return 0.8
    if t >= 76.5: return 1.0
    return 0.7
for b in range(int(DUR / BAR) + 1):
    t0 = b * BAR
    _, notes, _ = chord_at(t0)
    n = int((BAR + 0.6) * SR)
    s = np.zeros(n)
    for m in notes:
        for det in (-0.08, 0.0, 0.09):
            s += saw(mtof(m + det), n, rng.random())
    s = lp(s, 1400 if 20 <= t0 < 58 or 62 <= t0 < 74 else 900, 2)
    e = env_adsr(n, 0.35, 0.2, 0.9, 0.6)
    add(pad, t0, s * e * 0.06 * pad_level(t0))

# ---- arp pluck (16ths) ----
ARP_SPANS = [(14, 20), (20, 58), (58, 61.4), (62, 74), (78.3, 83)]
for i in range(int(DUR / (BEAT / 2))):
    t = i * BEAT / 2
    if not in_any(t, ARP_SPANS): continue
    tones = chord_at(t)[2]
    pat = [0, 2, 1, 3, 2, 0, 3, 1]
    m = tones[pat[i % 8]] + (12 if (i % 16) >= 12 else 0)
    n = int(0.3 * SR); tt = np.arange(n) / SR
    f = mtof(m)
    s = (np.sign(np.sin(2 * np.pi * f * tt)) * 0.3 + np.sin(2 * np.pi * f * tt)) * np.exp(-tt / 0.09)
    s = lp(s, 3200)
    g = 0.11 if (20 <= t < 58 or 62 <= t < 74) else 0.08
    add(arp, t, s, g); add(verb_send, t, s, g * 0.8)
# echo on arp
d = int(0.375 * SR); ech = np.zeros(N); ech[d:] = arp[:-d] * 0.35; ech[2 * d:] += arp[:-2 * d] * 0.15
arp += ech

# ---- fx ----
def riser(t0, t1, g=0.5):
    n = int((t1 - t0) * SR); tt = np.arange(n) / SR; p = tt / (t1 - t0)
    nz = rng.standard_normal(n)
    lo = hp(nz, 400) * p ** 2
    hi = hp(nz, 3000) * p ** 3
    tone = np.sin(2 * np.pi * np.cumsum(200 + 1200 * p ** 2) / SR) * p ** 2 * 0.25
    add(fx, t0, (lo * 0.5 + hi * 0.6 + tone) * g)
    add(verb_send, t0, (lo * 0.5 + tone) * g, 0.4)
def impact(t0, g=1.0):
    n = int(3.5 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt / 0.08)) / SR) * np.exp(-tt / 1.1)
    nz = lp(rng.standard_normal(n), 3000) * np.exp(-tt / 0.25) * 0.5
    s = np.tanh((boom * 1.2 + nz) * 1.3) * g
    add(fx, t0, s * 0.8); add(verb_send, t0, nz * g, 1.2)
def whoosh(tc, g=0.5, pre=0.5, post=0.4):
    n = int((pre + post) * SR); tt = np.arange(n) / SR
    e = np.where(tt < pre, (tt / pre) ** 2, np.exp(-(tt - pre) / (post / 3)))
    s = bp(rng.standard_normal(n), 500, 6000) * e
    add(fx, tc - pre, s * g); add(verb_send, tc - pre, s * g, 0.5)
def blip(t0, m=81, g=0.25, dec=0.12):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt / dec) + 0.3 * np.sin(2 * np.pi * mtof(m + 12) * tt) * np.exp(-tt / (dec / 2))
    add(fx, t0, s * g); add(verb_send, t0, s * g, 0.6)
def click(t0, g=0.18):
    n = int(0.02 * SR); tt = np.arange(n) / SR
    add(fx, t0, hp(rng.standard_normal(n), 2500) * np.exp(-tt / 0.003) * g)
def thump(t0, g=0.6):
    add(fx, t0, kick_hit(g, 0.25))

for tw in (0.4, 1.9, 3.3, 4.7, 6.1):   # word hits in the opener
    thump(tw, 0.5); blip(tw, 76, 0.12, 0.08)
thump(7.5, 0.8)
riser(7.6, 9.9, 0.55); whoosh(10.0, 0.7)
blip(10.1, 69, 0.12, 0.4); blip(11.3, 72, 0.12, 0.4)
riser(12.2, 15.85, 0.6)
whoosh(13.9, 0.4, 0.4, 0.2)
impact(15.85, 1.0)
blip(16.5, 88, 0.08, 0.3)
riser(18.4, 20.0, 0.35); whoosh(20.0, 0.6); impact(20.0, 0.45)
for tc in (28.0, 36.0, 46.0): whoosh(tc, 0.55); thump(tc, 0.3)
for k in range(38):  # typing in the ask bar
    click(37.2 + k * (1.8 / 38) + rng.random() * 0.02)
blip(39.1, 84, 0.1, 0.1)
for k in range(12): blip(39.3 + k * 0.12, 88 + (k % 4) * 2, 0.03, 0.05)  # traversal ticks
blip(41.2, 81, 0.14, 0.3)
click(50.6, 0.4); blip(50.65, 86, 0.08, 0.1)
click(54.2, 0.45); blip(54.6, 84, 0.14, 0.25); blip(54.72, 88, 0.12, 0.4)
whoosh(58.0, 0.5)
for tw in (58.25, 59.25, 60.25): thump(tw, 0.35)
riser(59.6, 61.45, 0.6); impact(61.45, 0.9)
whoosh(64.0, 0.5); thump(64.0, 0.4)
whoosh(67.35, 0.35); whoosh(70.7, 0.35)
for k in range(24): blip(71.95 + k * 0.05, 93, 0.02, 0.03)  # lock -> shield flips ~71.9
whoosh(74.0, 0.5)
riser(76.5, 78.35, 0.55); impact(78.35, 1.0)
blip(78.5, 81, 0.1, 1.2); blip(78.7, 88, 0.07, 1.2)

# ---- sidechain ducking in groove ----
tt = np.arange(N) / SR
duck = np.ones(N)
g = np.zeros(N, bool)
for a, b in GROOVE: g |= (tt >= a) & (tt < b)
duck[g] = 1 - 0.55 * np.exp(-(tt[g] % BEAT) / 0.12)

# ---- reverb ----
irn = int(2.4 * SR); irt = np.arange(irn) / SR
ir = rng.standard_normal((2, irn)) * np.exp(-irt / 0.7)
ir[:, : int(0.01 * SR)] = 0
wet = np.stack([fftconvolve(lp(verb_send, 6000), ir[c])[:N] for c in range(2)]) * 0.06

dry = kick * 0.9 + clap * 0.5 + hats * 0.5 + bass * duck + pad * duck + arp * duck * 0.9 + fx
# gentle stereo: pad/arp widened with a small delay
wide = np.zeros(N); dd = int(0.012 * SR); wide[dd:] = (pad + arp)[:-dd] * duck[dd:]
L = dry + wet[0] + 0.15 * wide
R = dry + wet[1] - 0.15 * wide + 0.15 * (pad + arp) * duck * 0  # keep mono-compatible
mix = np.stack([L, R])
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.8) / np.tanh(1.8)
fade = np.ones(N); fs = int(80.5 * SR); fade[fs:] = np.linspace(1, 0, N - fs) ** 1.5
fi = int(0.05 * SR); fade[:fi] = np.linspace(0, 1, fi)
mix *= fade * 0.89
wavfile.write('music.wav', SR, (mix.T * 32767).astype(np.int16))
print('ok', mix.shape)
