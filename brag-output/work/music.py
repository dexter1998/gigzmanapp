#!/usr/bin/env python3
"""
Soundtrack for the Mantis /brag video — written as one piece, music and interface sounds
together: the blips at each cut are chord tones from the progression that is already
playing, pushed through the same delay as the pluck bus so they sit in the same room
rather than on top of it.

Tempo 100 BPM (bar = 2.4s), A minor. Nine bars: Am F C G | Am F C G | Am.
Arrangement follows the edit — sparse under the hook, pluck when the query is typed,
kick when the results land, full under the payoff, resolving into the outro card.
"""
import math, struct, wave

SR = 44100
DUR = 23.6          # a little tail past the 23.0s picture
BPM = 100.0
BEAT = 60.0 / BPM   # 0.6s
BAR = 4 * BEAT      # 2.4s
N = int(SR * DUR)

# --- edit landmarks (seconds) --------------------------------------------------
T_HOOK, T_TYPE, T_RESULTS, T_SELECT, T_LEADS, T_OUTRO = 0.0, 5.0, 9.4, 13.6, 16.8, 20.0
CUTS = [T_TYPE, T_RESULTS, T_SELECT, T_LEADS, T_OUTRO]

# --- pitch ---------------------------------------------------------------------
def nt(semi_from_a4, octave_shift=0):
    return 440.0 * (2 ** ((semi_from_a4 + 12 * octave_shift) / 12.0))

A3, C4, E4, F3, A4, C5, G3, B3, D4, G4, E3, F4 = (
    nt(-12), nt(3), nt(7), nt(-16), nt(0), nt(15), nt(-14), nt(-10), nt(5), nt(-2), nt(-17), nt(8))

# chord per bar: (root for bass, [pad voicing], [arp pool])
CHORDS = [
    (A3 / 2, [A3, C4, E4],  [A3, C4, E4, A4]),   # Am
    (F3 / 2, [F3, A3, C4],  [F3, A3, C4, F4]),   # F
    (C4 / 4, [E3, G3, C4],  [C4, E4, G4, C5]),   # C
    (G3 / 2, [G3, B3, D4],  [G3, B3, D4, G4]),   # G
]

def chord_at(t):
    return CHORDS[int(t // BAR) % 4]

# --- envelopes -----------------------------------------------------------------
def ramp(t, a, b):
    if t <= a: return 0.0
    if t >= b: return 1.0
    x = (t - a) / (b - a)
    return x * x * (3 - 2 * x)

def fall(t, a, b):
    return 1.0 - ramp(t, a, b)

# --- buses ---------------------------------------------------------------------
dry = [0.0] * N      # pad, bass, kick — no delay
wet = [0.0] * N      # pluck, hats, blips — fed through the delay below

def add(buf, start, samples, gain=1.0):
    i0 = int(start * SR)
    for k, v in enumerate(samples):
        i = i0 + k
        if 0 <= i < N:
            buf[i] += v * gain

# --- pad: three sines per chord note, slightly detuned, slow breathing ---------
for bar in range(10):
    t0 = bar * BAR
    if t0 >= DUR: break
    root, voicing, _ = CHORDS[bar % 4] if bar < 8 else CHORDS[0]
    length = BAR * (1.6 if bar >= 8 else 1.02)
    cnt = int(length * SR)
    for f in voicing:
        for det, g in ((0.0, 1.0), (+0.14, 0.5), (-0.17, 0.5)):
            fr = f * (1 + det / 100.0)
            ph = (bar * 7 + int(f)) % 17 * 0.37
            seg = []
            for k in range(cnt):
                t = k / SR
                env = ramp(t, 0.0, 0.55) * fall(t, length - 0.9, length)
                # a touch of movement so the pad is not a static organ tone
                vib = 1 + 0.0013 * math.sin(2 * math.pi * 0.23 * (t0 + t) + ph)
                seg.append(env * math.sin(2 * math.pi * fr * vib * t + ph))
            # the pad opens up as the edit does
            arr_g = 0.055 * g * (0.55 + 0.45 * ramp(t0, T_HOOK, T_RESULTS))
            add(dry, t0, seg, arr_g)

# --- bass: root on every beat, short and round ---------------------------------
beat = 0
while beat * BEAT < DUR:
    t0 = beat * BEAT
    root, _, _ = chord_at(t0)
    length = BEAT * 0.92
    cnt = int(length * SR)
    seg = []
    for k in range(cnt):
        t = k / SR
        env = ramp(t, 0.0, 0.012) * math.exp(-3.4 * t)
        seg.append(env * (math.sin(2 * math.pi * root * t) + 0.22 * math.sin(4 * math.pi * root * t)))
    duck = 1.0 if t0 < T_OUTRO else fall(t0, T_OUTRO, T_OUTRO + 2.4)
    add(dry, t0, seg, 0.17 * (0.5 + 0.5 * ramp(t0, 0.0, 3.0)) * duck)
    beat += 1

# --- kick: beats 1 and 3, only once the results land ---------------------------
beat = 0
while beat * BEAT < DUR:
    t0 = beat * BEAT
    if t0 >= T_RESULTS and t0 < T_OUTRO + 0.7 and beat % 2 == 0:
        cnt = int(0.26 * SR)
        seg = []
        for k in range(cnt):
            t = k / SR
            f = 46 + 86 * math.exp(-28 * t)
            env = math.exp(-11 * t)
            seg.append(env * math.sin(2 * math.pi * f * t))
        g = 0.42 * ramp(t0, T_RESULTS, T_RESULTS + 1.2) * fall(t0, T_OUTRO - 0.2, T_OUTRO + 0.8)
        add(dry, t0, seg, g)
    beat += 1

# --- pluck arp: eighths from the moment the query is typed ---------------------
step = 0
while step * (BEAT / 2) < DUR:
    t0 = step * (BEAT / 2)
    if T_TYPE - 0.1 <= t0 < T_OUTRO + 0.5:
        _, _, pool = chord_at(t0)
        f = pool[(step * 3) % len(pool)]
        if step % 8 in (0, 3, 6):          # leave air; not every eighth speaks
            cnt = int(0.42 * SR)
            seg = []
            for k in range(cnt):
                t = k / SR
                env = ramp(t, 0.0, 0.004) * math.exp(-7.5 * t)
                # triangle-ish: odd harmonics falling off fast
                s = (math.sin(2 * math.pi * f * t)
                     + 0.12 * math.sin(6 * math.pi * f * t)
                     + 0.04 * math.sin(10 * math.pi * f * t))
                seg.append(env * s)
            g = 0.10 * ramp(t0, T_TYPE, T_TYPE + 0.8) * fall(t0, T_OUTRO - 0.4, T_OUTRO + 0.5)
            add(wet, t0, seg, g)
    step += 1

# --- hats: offbeat sixteenths, kept well under the music ----------------------
seed = 12345
def rnd():
    global seed
    seed = (1103515245 * seed + 12345) % (1 << 31)
    return seed / (1 << 30) - 1.0

step = 0
while step * (BEAT / 4) < DUR:
    t0 = step * (BEAT / 4)
    if T_TYPE <= t0 < T_OUTRO and step % 2 == 1:
        cnt = int(0.05 * SR)
        seg = []
        prev = 0.0
        for k in range(cnt):
            t = k / SR
            n = rnd()
            prev = n - prev * 0.55          # crude high-pass, keeps it thin
            seg.append(math.exp(-62 * t) * prev)
        g = 0.030 * ramp(t0, T_TYPE, T_TYPE + 1.0) * (1.0 if step % 8 != 1 else 0.6)
        add(wet, t0, seg, g)
    step += 1

# --- interface blips: chord tones at each cut, into the same delay ------------
for i, t0 in enumerate(CUTS):
    _, _, pool = chord_at(t0)
    f = pool[-1] * (2 if i >= 3 else 1)
    cnt = int(0.30 * SR)
    seg = []
    for k in range(cnt):
        t = k / SR
        env = ramp(t, 0.0, 0.003) * math.exp(-13 * t)
        seg.append(env * (math.sin(2 * math.pi * f * t) + 0.18 * math.sin(4 * math.pi * f * t)))
    add(wet, t0 - 0.02, seg, 0.085)

# a last, longer tone as the outro card settles
_, pad_v, pool = CHORDS[0]
cnt = int(2.6 * SR)
seg = []
for k in range(cnt):
    t = k / SR
    env = ramp(t, 0.0, 0.01) * math.exp(-1.5 * t)
    seg.append(env * (math.sin(2 * math.pi * A4 * t) + 0.5 * math.sin(2 * math.pi * E4 * t)))
add(wet, T_OUTRO + 0.08, seg, 0.075)

# --- one delay for the whole wet bus: everything shares the same room ---------
d1, d2 = int(BEAT * 0.75 * SR), int(BEAT * 1.5 * SR)
for i in range(N):
    v = wet[i]
    if v:
        if i + d1 < N: wet[i + d1] += v * 0.26
        if i + d2 < N: wet[i + d2] += v * 0.12

# --- mix, stereo spread, master fade ------------------------------------------
left = [0.0] * N
right = [0.0] * N
for i in range(N):
    t = i / SR
    master = ramp(t, 0.0, 0.35) * fall(t, 22.5, 23.5)
    d, w = dry[i] * master, wet[i] * master
    left[i] = d + w * 1.06
    right[i] = d + w * 0.94

peak = max(max(abs(v) for v in left), max(abs(v) for v in right)) or 1.0
norm = (10 ** (-1.5 / 20.0)) / peak

frames = bytearray()
for i in range(N):
    for ch in (left, right):
        v = ch[i] * norm
        v = math.tanh(v * 1.08) * 0.985        # gentle glue, nothing spiky
        frames += struct.pack('<h', int(max(-1.0, min(1.0, v)) * 32767))

with wave.open('/Users/dextermorgan/Desktop/gigzmanapp/brag-output/work/music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(bytes(frames))
print('wrote music.wav', round(DUR, 2), 's  peak', round(peak, 3))
