// Simple WebAudio candy SFX — no external files, synth via Oscillator
let ctx: AudioContext | null = null
let muted = false
try {
  const v = localStorage.getItem('tilemama_muted')
  if (v === '1') muted = true
} catch {}

function getCtx(): AudioContext | null {
  if (muted) return null
  if (ctx) return ctx
  try {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    return ctx
  } catch {
    return null
  }
}

export function isMuted() { return muted }
export function toggleMute(): boolean {
  muted = !muted
  try { localStorage.setItem('tilemama_muted', muted ? '1' : '0') } catch {}
  if (!muted) getCtx()?.resume()
  return muted
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.18, slideTo?: number) {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  if (slideTo) {
    o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur * 0.9)
  }
  g.gain.value = gain
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + dur)
}

function chord(freqs: number[], dur: number, type: OscillatorType = 'sine') {
  freqs.forEach((f, i) => setTimeout(() => tone(f, dur, type, 0.14), i * 18))
}

export const sfx = {
  move() { tone(420, 0.12, 'sine', 0.12, 540) },
  merge() { chord([520, 660, 880], 0.22, 'sine'); tone(880, 0.18, 'triangle', 0.1) },
  explode() { chord([380, 460, 620], 0.4, 'triangle'); tone(180, 0.45, 'sawtooth', 0.09, 90) },
  star() { chord([740, 880, 1100], 0.35, 'sine') },
  bonus() { chord([640, 820, 1020], 0.3, 'sine') },
  pending() { tone(660, 0.18, 'sine', 0.13); setTimeout(()=> tone(880, 0.18,'sine',0.13),120) },
  apply() { chord([660, 880, 1320], 0.28, 'sine') },
  wallHit() { tone(120, 0.18, 'square', 0.08, 80); tone(90, 0.12,'square',0.06) },
  wallBreak() { tone(200, 0.28,'square',0.12,60); tone(300,0.18,'triangle',0.09) },
  laser() { tone(880, 0.12,'sawtooth',0.11,220); setTimeout(()=> tone(660,0.18,'sine',0.1),80) },
  magnet() { tone(300,0.28,'sine',0.12,500); tone(500,0.18,'triangle',0.08) },
  vortex() { tone(500,0.32,'sine',0.11,900); setTimeout(()=> tone(700,0.22,'triangle',0.09),120) },
  shuffle() { chord([400,520,640,800],0.32,'triangle') },
  pop() { tone(900,0.1,'sine',0.12,1200) },
  error() { tone(160,0.14,'square',0.09,110) },
  undo() { chord([520,460,380],0.32,'sine') },
  tap() { tone(700,0.08,'sine',0.09) },
}
