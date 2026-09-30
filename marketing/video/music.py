import numpy as np, wave
SR = 48000
DUR = 47.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(1)
BEAT = 0.5

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))

def env(n, a=0.005, d=0.2, curve=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d) ** curve
    return e

def lp(x, fc):
    # one-pole lowpass (fc can be array)
    fc = np.broadcast_to(fc, x.shape)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); z = 0.0
    for i in range(len(x)):
        z = (1 - a[i]) * x[i] + a[i] * z; y[i] = z
    return y

def lp_fast(x, fc):
    from itertools import accumulate
    return lp(x, fc)

def hp(x, fc):
    return x - lp(x, fc)

def note(n):  # midi -> hz
    return 440 * 2 ** ((n - 69) / 12)

# ---------- drums ----------
def kick(g=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.5)
    s += 0.25 * rng.standard_normal(n) * np.exp(-t * 180)
    return np.tanh(s * 1.6) * g

def clap():
    n = int(0.3 * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    e = np.exp(-t * 22) + 0.6 * (np.exp(-((t - 0.012) * 400) ** 2) + np.exp(-((t - 0.024) * 400) ** 2))
    return hp(nz * e, 900) * 0.5

def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    return hp(nz, 7000) * np.exp(-t * (14 if open_ else 70)) * 0.35

def impact():
    n = int(3.5 * SR); t = np.arange(n) / SR
    f = 30 + 80 * np.exp(-t * 6)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    nz = lp(rng.standard_normal(n), 2500 * np.exp(-t * 2) + 200) * np.exp(-t * 2.5)
    return np.tanh((boom * 1.4 + nz * 0.8)) * 0.9

def riser(d):
    n = int(d * SR); t = np.arange(n) / SR
    fc = 300 + 7000 * (t / d) ** 2
    nz = lp(rng.standard_normal(n), fc)
    tone = np.sin(2 * np.pi * np.cumsum(200 + 600 * (t / d) ** 2) / SR) * 0.15
    return (nz * 0.6 + tone) * (t / d) ** 2

def whoosh(d=0.7):
    n = int(d * SR); t = np.arange(n) / SR
    shape = np.sin(np.pi * t / d) ** 2
    fc = 400 + 5000 * np.sin(np.pi * t / d)
    return lp(rng.standard_normal(n), fc) * shape * 0.8

# ---------- tonal ----------
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55, 60], [55, 59, 62]]  # Am F C G
def chord_at(t):
    return CHORDS[int(t // 4) % 4]

def pad_voice(freq, d, bright=1200):
    n = int(d * SR); t = np.arange(n) / SR
    s = 0
    for det in (-0.12, 0, 0.11):
        f = freq * 2 ** (det / 12)
        s = s + (2 * ((t * f) % 1) - 1)
    a = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8).clip(0)
    return s / 3 * a

def pluck(freq, g=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    s = (2 * ((t * freq) % 1) - 1) + 0.5 * np.sign(np.sin(2 * np.pi * freq * 2 * t))
    s = lp(s, 600 + 5000 * np.exp(-t * 18))
    return s * np.exp(-t * 7) * 0.22 * g

def bass(freq, d):
    n = int(d * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t * 3) * 0.5

# pad bed (whole piece, chord per 4s), filtered
padL = np.zeros(N)
for k in range(int(DUR // 4) + 1):
    t0 = k * 4
    for nn in chord_at(t0):
        v = pad_voice(note(nn), 4.6)
        i = int(t0 * SR); v = v[: max(0, N - i)]
        padL[i:i + len(v)] += v * 0.09
tt = np.arange(N) / SR
cut = np.interp(tt, [0, 5, 6, 10, 12.5, 30, 31, 37.8, 38, 42.3, 42.5, 47], [500, 1200, 700, 1500, 1800, 2200, 900, 1600, 2400, 3000, 1400, 500])
pad = lp(padL, cut)
L += pad * 0.9; R += pad * 0.9 * 0.97

# intro ticks + heartbeat
for i in range(int(6 / 0.25)):
    add(hat(), i * 0.25, 0.25 if i % 2 else 0.4, pan=0.3 if i % 2 else -0.3)
for b in np.arange(0, 10, 1.0):
    add(kick(0.5), b)
for b in np.arange(6, 10, 0.5):
    add(pluck(note(chord_at(b)[int(b * 2) % 3] + 12), 0.5), b, pan=0.2)
add(riser(1.5), 8.5, 0.5)
add(riser(1.0), 3.5, 0.3)
add(impact(), 10.0, 0.9)
add(impact(), 4.45, 0.35)

# groove section
def groove(a, b, kickg=1.0, arp=True, half=False):
    t = a
    while t < b - 1e-6:
        beat = int(round((t - a) / BEAT))
        if not half or beat % 2 == 0:
            add(kick(kickg), t)
        if beat % 2 == 1:
            add(clap(), t, 0.6)
        add(hat(), t + 0.25, 0.5, pan=0.25)
        add(hat(), t + 0.125, 0.18, pan=-0.3)
        add(hat(), t + 0.375, 0.18, pan=-0.3)
        ch = chord_at(t)
        add(bass(note(ch[0] - 24), 0.24), t + 0.25, 0.8)
        add(bass(note(ch[0] - 24), 0.24), t, 0.5)
        if arp:
            for k in range(2):
                seq = ch + [ch[0] + 12]
                nn = seq[(beat * 2 + k) % len(seq)] + 12
                add(pluck(note(nn)), t + k * 0.25, 0.8, pan=0.35 if k else -0.35)
        t += BEAT

for b in np.arange(10.5, 12.5, 0.5):
    add(pluck(note(chord_at(b)[int(b * 2) % 3] + 24), 0.5), b, pan=-0.2)
add(whoosh(0.8), 12.1, 0.8)
add(kick(1.1), 12.5)
groove(12.5, 31.0)
add(whoosh(0.8), 24.1, 0.8)
add(impact(), 24.5, 0.35)
groove(31.0, 37.5, kickg=0.9, arp=False, half=True)
for b in np.arange(31, 37.5, 0.5):
    add(pluck(note(chord_at(b)[int(b * 2) % 3] + 12), 0.45), b, pan=0.2)
add(impact(), 34.6, 0.3)
add(riser(1.4), 36.6, 0.6)
add(impact(), 38.0, 0.6)
groove(38.0, 40.4, kickg=1.0)
add(riser(0.9), 39.5, 0.5)
add(impact(), 40.45, 0.9)
for b in np.arange(40.5, 42.5, 1.0):
    add(kick(0.8), b)
add(impact(), 42.5, 0.8)
for b in np.arange(42.5, 46, 0.5):
    add(pluck(note(CHORDS[0][int(b * 2) % 3] + 24), 0.35 * (1 - (b - 42.5) / 4)), b, pan=(-0.4 if int(b * 2) % 2 else 0.4))

# simple stereo delay/reverb send
def verb(x):
    y = x.copy()
    for d, g in ((0.037, .35), (0.071, .3), (0.113, .25), (0.19, .2), (0.29, .15), (0.375, .12)):
        k = int(d * SR); y[k:] += x[:-k] * g
    return lp(y, 5000)
L = L + 0.25 * verb(R); R = R + 0.25 * verb(L)
# master: fade & limit
fade = np.clip((DUR - 0.1 - tt) / 1.5, 0, 1) * np.clip(tt / 0.05, 0, 1)
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / peak * 1.4) / np.tanh(1.4) * 0.89
R = np.tanh(R / peak * 1.4) / np.tanh(1.4) * 0.89
out = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok')
