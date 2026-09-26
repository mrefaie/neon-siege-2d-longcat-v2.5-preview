#!/usr/bin/env python3
"""NEON SIEGE audio asset generator.

Regenerates all bundled audio assets into ../audio/:
  - SFX: short synthesized WAV files (shoot, explode, pickup, ...)
  - Music: looping synthwave tracks (menu, game, boss)

Usage:  python3 gen_audio.py
Requires: numpy
"""
import os
import math
import wave
import struct
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1337)


def write_wav(name, data):
    data = np.clip(data, -1.0, 1.0)
    pcm = (data * 32767).astype(np.int16)
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'  {name}  {len(data)/SR:.2f}s')


def env(n, a, d, sustain=0.0):
    e = np.zeros(n)
    na = max(1, int(a * SR))
    nd = max(1, int(d * SR))
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, sustain, nd)
    if na + nd < n:
        e[na + nd:] = sustain
    return e


def tone(freq, dur, kind='sine', vol=0.5, freq_end=None, a=0.004):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = freq if freq_end is None else np.linspace(freq, freq_end, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == 'sine':
        w = np.sin(ph)
    elif kind == 'square':
        w = np.sign(np.sin(ph))
    elif kind == 'saw':
        w = 2 * ((ph / (2 * np.pi)) % 1) - 1
    elif kind == 'triangle':
        w = 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
    else:
        w = np.sin(ph)
    return w * env(n, a, dur - a) * vol


def noise(dur, vol=0.4, lp=1200, a=0.004):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    if lp > 0:
        k = int(SR / lp)
        x = np.convolve(x, np.ones(k) / k, mode='same')
    return x * env(n, a, dur - a) * vol


def mix(*segs):
    n = max(len(s) for s in segs)
    out = np.zeros(n)
    for s in segs:
        out[:len(s)] += s
    return out


def sfx_shoot():
    return tone(880, 0.09, 'square', 0.30, 220)

def sfx_enemy_shoot():
    return tone(320, 0.12, 'saw', 0.20, 140)

def sfx_hit():
    return mix(noise(0.08, 0.35, 2400), tone(200, 0.08, 'triangle', 0.25, 60))

def sfx_explode():
    return mix(noise(0.35, 0.55, 900), tone(160, 0.30, 'sine', 0.40, 40))

def sfx_big_explode():
    return mix(noise(0.70, 0.65, 600), tone(110, 0.60, 'sine', 0.45, 30), tone(70, 0.50, 'saw', 0.30, 25))

def sfx_player_hit():
    return mix(noise(0.25, 0.50, 1500), tone(220, 0.25, 'square', 0.30, 55))

def sfx_dash():
    return mix(noise(0.18, 0.30, 3000), tone(300, 0.15, 'sine', 0.15, 900))

def sfx_pickup():
    n = int(0.30 * SR)
    out = np.zeros(n)
    for i, f in enumerate([520, 660, 880]):
        seg = tone(f, 0.12, 'sine', 0.30)
        st = int(i * 0.07 * SR)
        out[st:st + len(seg)] += seg[:n - st]
    return out

def sfx_wave_clear():
    n = int(0.60 * SR)
    out = np.zeros(n)
    for i, f in enumerate([523, 659, 784, 1047]):
        seg = tone(f, 0.20, 'triangle', 0.30)
        st = int(i * 0.09 * SR)
        out[st:st + len(seg)] += seg[:n - st]
    return out

def sfx_boss_alarm():
    n = int(0.90 * SR)
    out = np.zeros(n)
    for i in range(3):
        st = int(i * 0.28 * SR)
        seg = mix(tone(180, 0.20, 'saw', 0.28, 120), tone(184, 0.20, 'saw', 0.28, 124))
        out[st:st + len(seg)] += seg[:n - st]
    return out

def sfx_ui_move():
    return tone(700, 0.05, 'sine', 0.15)

def sfx_ui_select():
    n = int(0.18 * SR)
    out = np.zeros(n)
    seg1 = tone(880, 0.08, 'sine', 0.22)
    out[:len(seg1)] += seg1
    st = int(0.05 * SR)
    seg = tone(1320, 0.10, 'sine', 0.18)
    out[st:st + len(seg)] += seg[:n - st]
    return out

def sfx_freeze():
    return tone(1400, 0.30, 'sine', 0.22, 200)

def sfx_nova():
    return mix(noise(0.50, 0.50, 2500), tone(90, 0.50, 'sine', 0.40, 35))

def sfx_chain():
    return tone(1200, 0.10, 'saw', 0.16, 300)

def sfx_shield_break():
    return mix(noise(0.30, 0.45, 4000), tone(500, 0.20, 'square', 0.20, 100))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def render_music(name, bpm, bars, bassline, arp_notes, root, pad_every=2):
    beat = 60.0 / bpm
    total = bars * 4 * beat
    n = int(total * SR)
    out = np.zeros(n)

    def add(seg, t0):
        st = int(t0 * SR)
        end = min(n, st + len(seg))
        if st < n:
            out[st:end] += seg[:end - st]

    for bar in range(bars):
        t0 = bar * 4 * beat
        for b, note in enumerate(bassline):
            f = midi(root + note - 12)
            add(tone(f, beat * 0.45, 'saw', 0.22), t0 + b * beat * 0.5)
            add(tone(f / 2, beat * 0.40, 'square', 0.12), t0 + b * beat * 0.5)
        for s in range(8):
            f = midi(root + 12 + arp_notes[s % len(arp_notes)])
            add(tone(f, beat * 0.22, 'triangle', 0.10), t0 + s * beat * 0.5)
        for q in range(4):
            add(tone(150, 0.10, 'sine', 0.50, 40), t0 + q * beat)
            add(noise(0.05, 0.10, 6000), t0 + q * beat + beat * 0.5)
        if bar % pad_every == 0:
            for chord in [0, 3, 7]:
                add(tone(midi(root + chord), beat * 3.5, 'saw', 0.05), t0)
    return out * 0.8


def main():
    print('SFX:')
    for name, fn in [
        ('shoot.wav', sfx_shoot), ('enemy_shoot.wav', sfx_enemy_shoot),
        ('hit.wav', sfx_hit), ('explode.wav', sfx_explode),
        ('big_explode.wav', sfx_big_explode), ('player_hit.wav', sfx_player_hit),
        ('dash.wav', sfx_dash), ('pickup.wav', sfx_pickup),
        ('wave_clear.wav', sfx_wave_clear), ('boss_alarm.wav', sfx_boss_alarm),
        ('ui_move.wav', sfx_ui_move), ('ui_select.wav', sfx_ui_select),
        ('freeze.wav', sfx_freeze), ('nova.wav', sfx_nova),
        ('chain.wav', sfx_chain), ('shield_break.wav', sfx_shield_break),
    ]:
        write_wav(name, fn())
    print('Music:')
    menu_bass = [0, 0, 7, 5, 0, 0, 7, 10]
    menu_arp = [0, 3, 7, 12, 7, 3]
    write_wav('music_menu.wav', render_music('menu', 92, 8, menu_bass, menu_arp, 45))
    game_bass = [0, 0, 3, 0, 5, 0, 7, 5]
    game_arp = [0, 3, 7, 10, 12, 10, 7, 3]
    write_wav('music_game.wav', render_music('game', 118, 8, game_bass, game_arp, 43))
    boss_bass = [0, 0, 1, 0, 0, 6, 5, 6]
    boss_arp = [0, 1, 7, 8, 7, 1]
    write_wav('music_boss.wav', render_music('boss', 132, 8, boss_bass, boss_arp, 41))
    print('Done.')


if __name__ == '__main__':
    main()
