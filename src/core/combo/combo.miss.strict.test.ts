import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Engine } from '../../lib/engine'
import { ComboState } from './ComboState'
import { resolveMove } from '../engine/MoveResolver'

// Helpers to build clean engine
function cleanEngine(): Engine {
  const e = new Engine()
  e.init()
  e.grid = Array.from({ length: 8 }, () => Array(8).fill(null))
  e.blocks.clear()
  e.specials.clear()
  e.score = 0
  e.gameOver = false
  ;(e as any).history = []
  return e
}

describe('strict: mossa vuota chiude combo', () => {
  it('MoveResolver bump adiacente incompatibile -> type none', () => {
    const e = cleanEngine()
    const b1 = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    const b2 = { id: 'b', x: 1, y: 0, color: 'red' as const, value: 2 } // stesso valore ma colore diverso -> non merge
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1)
    e.grid[0][1] = b2; e.blocks.set(b2.id, b2)
    const res = resolveMove(b1, 'E', e.grid as any)
    expect(res.type).toBe('none')
  })

  it('MoveResolver slide vuota lunga -> slide moved true', () => {
    const e = cleanEngine()
    const b1 = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1)
    const res = resolveMove(b1, 'E', e.grid as any)
    expect(res.type).toBe('slide')
    if (res.type === 'slide') expect(res.moved).toBe(true)
  })

  it('engine.move bump adiacente -> moved false (strict)', () => {
    const e = cleanEngine()
    const b1 = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    const b2 = { id: 'b', x: 1, y: 0, color: 'red' as const, value: 2 }
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1)
    e.grid[0][1] = b2; e.blocks.set(b2.id, b2)
    const res = e.move('a', 'E')
    expect(res.moved).toBe(false)
    expect(res.merged).toBe(false)
    expect(res.hitSpecial).toBe(false)
    expect(res.hitWall).toBeFalsy()
  })

  it('game.doMove slide vuota chiude combo (strict)', async () => {
    // test integration via ComboState + Engine simulating game.svelte.ts logic
    const e = cleanEngine()
    const c = new ComboState()
    // two merges to build combo 2
    c.onMerge(0); c.onMerge(500)
    expect(c.combo).toBe(2)
    // place a movable block with empty lane
    const b = { id: 'm', x: 0, y: 0, color: 'green' as const, value: 2 }
    e.grid[0][0] = b; e.blocks.set(b.id, b)
    // slide vuota: no merge/special/wall
    const res = e.move('m', 'E', c.peekMultiplier(1000))
    // simulate strict logic from game.svelte.ts
    const isScoring = res.merged || res.hitSpecial || res.exploded || (!!res.hitWall && !!res.wallDestroyed)
    if (isScoring) c.onMerge(1000)
    else if (res.moved || res.hitWall) c.onMiss()
    else c.onMiss()
    expect(res.moved).toBe(true)
    expect(isScoring).toBe(false)
    expect(c.combo).toBe(0)
  })

  it('game.doMove bump adiacente chiude combo', () => {
    const e = cleanEngine()
    const c = new ComboState()
    c.onMerge(0); c.onMerge(400)
    expect(c.combo).toBe(2)
    const b1 = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    const b2 = { id: 'b', x: 1, y: 0, color: 'red' as const, value: 2 }
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1)
    e.grid[0][1] = b2; e.blocks.set(b2.id, b2)
    const res = e.move('a', 'E', c.peekMultiplier(1000))
    const isScoring = res.merged || res.hitSpecial || res.exploded || (!!res.hitWall && !!res.wallDestroyed)
    if (isScoring) c.onMerge(1000)
    else if (res.moved || res.hitWall) c.onMiss()
    else {
      // bump: undo + miss path
      c.onMiss()
    }
    expect(res.moved).toBe(false)
    expect(c.combo).toBe(0)
  })

  it('muro crepato (hp2 -> hp1) chiude combo strict', () => {
    const e = cleanEngine()
    const c = new ComboState()
    c.onMerge(0); c.onMerge(400)
    const b = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    e.grid[0][0] = b; e.blocks.set(b.id, b)
    const wall = e.spawnSpecial({ x: 1, y: 0 }, 'wall')!
    expect(wall.hp).toBe(2)
    const res = e.move('a', 'E', c.peekMultiplier(1000))
    expect(res.hitWall).toBe(true)
    expect(res.wallDestroyed).toBe(false)
    const isScoring = res.merged || res.hitSpecial || res.exploded || (!!res.hitWall && !!res.wallDestroyed)
    if (isScoring) c.onMerge(1000)
    else if (res.moved || res.hitWall) c.onMiss()
    expect(c.combo).toBe(0)
  })

  it('muro distrutto (hp1) alimenta combo', () => {
    const e = cleanEngine()
    const c = new ComboState()
    c.onMerge(0)
    const b = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    e.grid[0][0] = b; e.blocks.set(b.id, b)
    const wall = e.spawnSpecial({ x: 1, y: 0 }, 'wall')!
    wall.hp = 1
    const res = e.move('a', 'E', c.peekMultiplier(1000))
    expect(res.wallDestroyed).toBe(true)
    const isScoring = res.merged || res.hitSpecial || res.exploded || (!!res.hitWall && !!res.wallDestroyed)
    expect(isScoring).toBe(true)
    const before = c.combo
    if (isScoring) c.onMerge(1000)
    expect(c.combo).toBe(before + 1)
  })

  it('merge valido continua combo', () => {
    const e = cleanEngine()
    const c = new ComboState()
    c.onMerge(0)
    const b1 = { id: 'a', x: 0, y: 0, color: 'green' as const, value: 2 }
    const b2 = { id: 'b', x: 1, y: 0, color: 'green' as const, value: 2 }
    e.grid[0][0] = b1; e.blocks.set(b1.id, b1)
    e.grid[0][1] = b2; e.blocks.set(b2.id, b2)
    const peek = c.peekMultiplier(500)
    const res = e.move('a', 'E', peek)
    expect(res.merged).toBe(true)
    const isScoring = res.merged || res.hitSpecial || res.exploded || (!!res.hitWall && !!res.wallDestroyed)
    if (isScoring) c.onMerge(500)
    expect(c.combo).toBe(2)
  })
})
