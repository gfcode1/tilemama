import { COLORS, GRID_SIZE, type Block, type Color, type Dir, type Special, type SpecialKind, type MultiplierMode, type PendingMode, DIRS, isBlock, isSpecial, isWall, PENDING_KINDS, WALL_DURATION_MS, SPECIAL_DURATION_MS, WALL_HP, EXPLOSION_VALUE } from './types'
import { resolveMove } from '../core/engine/MoveResolver'

let idCounter = 0
function uid() {
  return `${Date.now()}-${++idCounter}-${Math.random().toString(36).slice(2, 6)}`
}

export type MoveResult = {
  moved: boolean
  merged: boolean
  hitSpecial: boolean
  exploded: boolean
  scoreGain: number
  baseGain?: number
  multiplier?: number
  combo?: number
  gameOver: boolean
  removedSpecialId?: string
  finalX: number
  finalY: number
  activatedPending?: PendingMode
  hitSpecialKind?: SpecialKind
  hitWall?: boolean
  wallDestroyed?: boolean
}

export type PendingResult = {
  applied: boolean
  exploded: boolean
  removed: boolean
  scoreGain: number
  gameOver: boolean
  mode: PendingMode
  targetId?: string
  newValue?: number
  removedColor?: Color
  clonedId?: string
}

export type EngineSnapshot = {
  grid: (Block | Special | null)[][]
  score: number
  gameOver: boolean
  pendingMode: PendingMode
  pendingSafeX5: boolean
}

export class Engine {
  grid: (Block | Special | null)[][] // [y][x]
  score = 0
  gameOver = false
  blocks: Map<string, Block> = new Map()
  specials: Map<string, Special> = new Map()
  pendingMode: PendingMode = null
  pendingSafeX5 = false
  private history: EngineSnapshot[] = []

  // backward compat alias
  get pendingMultiplier(): MultiplierMode {
    if (this.pendingMode === 'x2') return this.pendingMode
    return null
  }
  set pendingMultiplier(v: MultiplierMode) {
    if (v === 'x2') this.pendingMode = v
    else if (v === null && this.pendingMode === 'x2') this.pendingMode = null
  }

  constructor() {
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  }

  cloneGrid(): (Block | Special | null)[][] {
    return this.grid.map(row => [...row])
  }

  snapshot(): EngineSnapshot {
    return {
      grid: this.grid.map(row => row.map(c => (c ? ({ ...c } as any) : null))),
      score: this.score,
      gameOver: this.gameOver,
      pendingMode: this.pendingMode,
      pendingSafeX5: this.pendingSafeX5,
    }
  }

  pushHistory() {
    // keep only last move for single undo (spec: annulla ultima mossa)
    this.history = [this.snapshot()]
  }

  canUndo(): boolean {
    return this.history.length > 0
  }

  undo(): boolean {
    const snap = this.history.pop()
    if (!snap) return false
    this.grid = snap.grid.map(row => row.map(c => (c ? ({ ...c } as any) : null)))
    this.score = snap.score
    this.gameOver = snap.gameOver
    this.pendingMode = snap.pendingMode
    this.pendingSafeX5 = snap.pendingSafeX5
    this.blocks.clear()
    this.specials.clear()
    for (const row of this.grid) for (const c of row) if (c) {
      if (isBlock(c)) this.blocks.set(c.id, c as Block)
      else this.specials.set(c.id, c as Special)
    }
    return true
  }

  clearHistory() {
    this.history = []
  }

  getBlockAt(x: number, y: number) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null
    return this.grid[y][x]
  }

  freeCells(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = []
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) if (!this.grid[y][x]) out.push({ x, y })
    return out
  }

  private place(cell: Block | Special) {
    this.grid[cell.y][cell.x] = cell
    if (isBlock(cell)) this.blocks.set(cell.id, cell)
    else this.specials.set(cell.id, cell)
  }

  private removeAt(x: number, y: number) {
    const c = this.grid[y][x]
    if (!c) return
    this.grid[y][x] = null
    if (isBlock(c)) {
      this.blocks.delete(c.id)
    } else this.specials.delete(c.id)
  }

  spawnBlock(color: Color, value: number, pos?: { x: number; y: number }): Block | null {
    const free = this.freeCells()
    if (!free.length) return null
    const p = pos ?? free[Math.floor(Math.random() * free.length)]
    if (this.grid[p.y][p.x]) return null
    const b: Block = { id: uid(), x: p.x, y: p.y, color, value }
    this.place(b)
    return b
  }

  spawnSpecial(at?: { x: number; y: number }, forcedKind?: SpecialKind): Special | null {
    const free = this.freeCells()
    if (!free.length) return null
    const p = at ?? free[Math.floor(Math.random() * free.length)]
    if (this.grid[p.y][p.x]) return null
    let kind: SpecialKind = forcedKind ?? pickRandomBonusKind()
    const isWallKind = kind === 'wall'
    const duration = isWallKind ? WALL_DURATION_MS : SPECIAL_DURATION_MS
    const s: Special = { id: uid(), x: p.x, y: p.y, expiresAt: Date.now() + duration, kind, hp: isWallKind ? WALL_HP : undefined }
    this.place(s)
    return s
  }

  spawnStar(at?: { x: number; y: number }): Special | null {
    return this.spawnSpecial(at, 'star')
  }

  spawnRandomBonus(at?: { x: number; y: number }): Special | null {
    return this.spawnSpecial(at, pickRandomBonusKind())
  }

  removeSpecial(id: string) {
    const s = this.specials.get(id)
    if (!s) return
    if (this.grid[s.y][s.x]?.id === id) this.grid[s.y][s.x] = null
    this.specials.delete(id)
  }

  init() {
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    this.blocks.clear()
    this.specials.clear()
    this.score = 0
    this.gameOver = false
    this.pendingMode = null
    this.pendingSafeX5 = false
    this.clearHistory()
    for (const color of COLORS) {
      for (let i = 0; i < 4; i++) this.spawnBlock(color, 1)
    }
  }

  /** Slide block id in dir until obstacle. Returns result. Delegates to MoveResolver for arcade consistency. */
  move(blockId: string, dir: Dir, scoreMultiplier = 1): MoveResult {
    if (this.gameOver) {
      const fb = this.blocks.get(blockId)
      return { moved: false, merged: false, hitSpecial: false, exploded: false, scoreGain: 0, gameOver: true, finalX: fb?.x ?? 0, finalY: fb?.y ?? 0 }
    }
    if (this.pendingMode) {
      const fb = this.blocks.get(blockId)
      return { moved: false, merged: false, hitSpecial: false, exploded: false, scoreGain: 0, gameOver: false, finalX: fb?.x ?? 0, finalY: fb?.y ?? 0 }
    }

    const block = this.blocks.get(blockId)
    if (!block) return { moved: false, merged: false, hitSpecial: false, exploded: false, scoreGain: 0, gameOver: false, finalX: 0, finalY: 0 }

    const origX = block.x
    const origY = block.y
    // vacate origin for resolver
    this.grid[block.y][block.x] = null

    const resolved = resolveMove(block, dir, this.grid as any)

    let finalX = resolved.finalX
    let finalY = resolved.finalY
    // for slide, compute moved from resolver
    let hitWall = resolved.type === 'wall' ? (resolved as any).wall as Special : null
    let hitSpecial = resolved.type === 'special' ? (resolved as any).special as Special : null
    let mergeTarget = resolved.type === 'merge' ? (resolved as any).target as Block : null
    let slideMoved = resolved.type === 'slide' ? (resolved as any).moved as boolean : false
    let cx = resolved.type === 'wall' ? (resolved as any).beforeX : finalX
    let cy = resolved.type === 'wall' ? (resolved as any).beforeY : finalY

    let moved = false
    if (resolved.type === 'slide') moved = slideMoved
    else if (resolved.type === 'wall') moved = cx !== origX || cy !== origY
    else if (resolved.type === 'merge' || resolved.type === 'special') moved = true
    else moved = finalX !== block.x || finalY !== block.y

    let merged = false
    let exploded = false
    let scoreGain = 0

    // WALL HIT
    if (hitWall) {
      const wall = hitWall
      const hp = wall.hp ?? WALL_HP
      const newHp = hp - 1
      if (newHp <= 0) {
        this.specials.delete(wall.id)
        this.grid[wall.y][wall.x] = null
        block.x = finalX; block.y = finalY
        this.place(block)
        moved = true
        return { moved, merged, hitSpecial: false, exploded, scoreGain, gameOver: this.gameOver, finalX, finalY, hitWall: true, wallDestroyed: true, hitSpecialKind: 'wall' }
      } else {
        wall.hp = newHp
        const wallMoved = cx !== origX || cy !== origY
        block.x = cx; block.y = cy
        this.place(block)
        return { moved: wallMoved, merged, hitSpecial: false, exploded, scoreGain, gameOver: this.gameOver, finalX: cx, finalY: cy, hitWall: true, wallDestroyed: false, hitSpecialKind: 'wall' }
      }
    }

    if (hitSpecial) {
      const kind: SpecialKind = (hitSpecial as Special).kind ?? 'star'
      this.specials.delete(hitSpecial.id)
      this.grid[hitSpecial.y][hitSpecial.x] = null
      block.x = finalX; block.y = finalY
      this.place(block)
      moved = true

      if (PENDING_KINDS.has(kind)) {
        const pending = kindToPending(kind)
        if (pending) {
          this.pendingMode = pending
          return { moved, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX, finalY, activatedPending: pending, hitSpecialKind: kind }
        }
      }

      if (kind === 'star') {
        for (const c of COLORS) this.spawnBlock(c, 1)
        const over = this.freeCells().length === 0
        if (over) this.gameOver = true
        return { moved, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX, finalY, hitSpecialKind: 'star' }
      }
      if (kind === 'laser') {
        this.applyLaser(finalX, finalY, block.id)
        const over = this.freeCells().length === 0
        if (over) this.gameOver = true
        return { moved, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX, finalY, hitSpecialKind: 'laser' }
      }
      if (kind === 'vortex') {
        this.applyVortex(block)
        return { moved, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX: block.x, finalY: block.y, hitSpecialKind: 'vortex' }
      }
      if (kind === 'shuffle') {
        this.applyShuffle()
        return { moved, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX, finalY, hitSpecialKind: 'shuffle' }
      }
      if (kind === 'wall') {
        const s: Special = { id: uid(), x: finalX, y: finalY, expiresAt: Date.now() + WALL_DURATION_MS, kind: 'wall', hp: WALL_HP }
        this.grid[finalY][finalX] = null
        this.specials.delete(hitSpecial.id)
        block.x = cx; block.y = cy
        this.place(block)
        this.place(s)
        return { moved: false, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX: cx, finalY: cy, hitSpecialKind: 'wall' }
      }
      for (const c of COLORS) this.spawnBlock(c, 1)
      return { moved, merged, hitSpecial: true, exploded, scoreGain, gameOver: this.gameOver, removedSpecialId: hitSpecial.id, finalX, finalY, hitSpecialKind: kind }
    }

    if (mergeTarget) {
      this.removeAt(mergeTarget.x, mergeTarget.y)
      const wasJolly = !!block.jolly || !!(mergeTarget as Block).jolly
      let sum = block.value + mergeTarget.value
      const m = Math.max(1, scoreMultiplier)
      let gain = Math.round(sum * m)
      block.value = sum
      if (wasJolly) block.jolly = false
      block.x = finalX; block.y = finalY
      this.place(block)
      merged = true
      moved = true
      scoreGain = gain
      this.score += gain

      if (sum >= EXPLOSION_VALUE) {
        this.removeAt(block.x, block.y)
        exploded = true
        for (const c of COLORS) this.spawnBlock(c, 1)
      }
      const over = this.freeCells().length === 0
      if (over) this.gameOver = true
      return { moved, merged, hitSpecial: false, exploded, scoreGain, baseGain: sum, multiplier: m, gameOver: this.gameOver, finalX, finalY }
    }

    block.x = finalX; block.y = finalY
    this.place(block)
    if (!moved) return { moved: false, merged: false, hitSpecial: false, exploded: false, scoreGain: 0, gameOver: false, finalX, finalY }

    const over = this.freeCells().length === 0
    if (over) this.gameOver = true
    return { moved, merged, hitSpecial: false, exploded, scoreGain, gameOver: this.gameOver, finalX, finalY }
  }

  private applyLaser(cx: number, cy: number, movingBlockId: string) {
    // remove all blocks in same row and column except the moving block
    const toRemove: {x:number,y:number}[] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === cx) continue
      const c = this.grid[cy][x]
      if (c && isBlock(c) && c.id !== movingBlockId) toRemove.push({x,y:cy})
    }
    for (let y = 0; y < GRID_SIZE; y++) {
      if (y === cy) continue
      const c = this.grid[y][cx]
      if (c && isBlock(c) && c.id !== movingBlockId) toRemove.push({x:cx,y})
    }
    for (const p of toRemove) this.removeAt(p.x, p.y)
  }

  private applyVortex(block: Block) {
    const free = this.freeCells()
    if (!free.length) return
    // remove from current
    this.grid[block.y][block.x] = null
    const p = free[Math.floor(Math.random() * free.length)]
    block.x = p.x; block.y = p.y
    this.grid[block.y][block.x] = block
  }

  private applyShuffle() {
    const blocks = [...this.blocks.values()]
    if (blocks.length < 2) return
    // collect all occupied positions (blocks + specials) to avoid overlap
    const specialsPos = [...this.specials.values()].map(s=> ({x:s.x,y:s.y}))
    const occupiedBySpecials = new Set(specialsPos.map(p=> `${p.x},${p.y}`))
    const blockPositions = blocks.map(b=> ({x:b.x,y:b.y}))
    // shuffle block positions
    for (let i = blockPositions.length -1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1))
      ;[blockPositions[i], blockPositions[j]] = [blockPositions[j], blockPositions[i]]
    }
    // clear blocks from grid
    for (const b of blocks) this.grid[b.y][b.x] = null
    // reassign
    for (let i=0;i<blocks.length;i++) {
      blocks[i].x = blockPositions[i].x
      blocks[i].y = blockPositions[i].y
      this.grid[blocks[i].y][blocks[i].x] = blocks[i]
    }
  }

  applyPending(blockId: string): PendingResult | null {
    if (!this.pendingMode) return null
    const mode = this.pendingMode
    const block = this.blocks.get(blockId)
    if (!block) return null

    this.pendingMode = null
    let exploded = false
    let removed = false
    let scoreGain = 0

    if (mode === 'x2') {
      const newVal = block.value * 2
      block.value = newVal
      if (newVal >= EXPLOSION_VALUE) {
        this.removeAt(block.x, block.y)
        exploded = true
        for (const c of COLORS) this.spawnBlock(c, 1)
        scoreGain = newVal
        this.score += scoreGain
      }
      const over = this.freeCells().length === 0
      if (over) this.gameOver = true
      return { applied: true, exploded, removed: false, scoreGain, gameOver: this.gameOver, mode, targetId: blockId, newValue: newVal }
    } else if (mode === 'jolly') {
      block.jolly = true
      return { applied: true, exploded:false, removed:false, scoreGain, gameOver: this.gameOver, mode, targetId: blockId }
    } else if (mode === 'bombColor') {
      const color = block.color
      const toRemove = [...this.blocks.values()].filter(b=> b.color===color)
      for (const b of toRemove) this.removeAt(b.x, b.y)
      const over = this.freeCells().length === 0
      if (over) this.gameOver = true
      return { applied: true, exploded:false, removed:false, scoreGain, gameOver: this.gameOver, mode, targetId: blockId, removedColor: color }
    } else if (mode === 'clone') {
      const free = this.freeCells()
      if (!free.length) return { applied: true, exploded:false, removed:false, scoreGain, gameOver: true, mode, targetId: blockId }
      const p = free[Math.floor(Math.random()*free.length)]
      const nb: Block = { id: uid(), x:p.x, y:p.y, color: block.color, value: block.value }
      this.place(nb)
      const over = this.freeCells().length === 0
      if (over) this.gameOver = true
      return { applied: true, exploded:false, removed:false, scoreGain, gameOver: this.gameOver, mode, targetId: blockId, clonedId: nb.id }
    }
    return null
  }

  // alias for old API
  applyMultiplier(blockId: string) { return this.applyPending(blockId) as any }

  cancelPending() {
    this.pendingMode = null
  }
  cancelMultiplier() { this.cancelPending() }

  tickVirus(_now = Date.now()): string[] {
    return []
  }

  toJSON() {
    return {
      grid: this.grid,
      score: this.score,
      gameOver: this.gameOver,
      pendingMode: this.pendingMode,
      pendingMultiplier: this.pendingMode, // compat
      pendingSafeX5: this.pendingSafeX5,
    }
  }

  fromJSON(data: { grid: (Block | Special | null)[][]; score: number; gameOver: boolean; pendingMode?: PendingMode; pendingMultiplier?: MultiplierMode; pendingSafeX5?: boolean }) {
    this.grid = data.grid.map(row => row.map(c => {
      if (!c) return null
      const anyC = c as any
      if ('expiresAt' in anyC && !('kind' in anyC)) {
        return { ...anyC, kind: 'star' as SpecialKind }
      }
      if ('hp' in anyC && anyC.kind==='wall' && anyC.hp==null) anyC.hp = WALL_HP
      return { ...anyC }
    }))
    this.score = data.score
    this.gameOver = data.gameOver
    this.pendingMode = (data.pendingMode ?? data.pendingMultiplier ?? null) as PendingMode
    this.pendingSafeX5 = data.pendingSafeX5 ?? false
    this.blocks.clear(); this.specials.clear()
    for (const row of this.grid) for (const c of row) if (c) {
      if (isBlock(c)) this.blocks.set(c.id, c as Block)
      else this.specials.set(c.id, c as Special)
    }
  }

  cleanupExpiredSpecials(now = Date.now()): string[] {
    const removed: string[] = []
    for (const s of [...this.specials.values()]) {
      if (s.expiresAt <= now) {
        this.removeSpecial(s.id); removed.push(s.id)
      }
    }
    return removed
  }
}

function kindToPending(kind: SpecialKind): PendingMode | null {
  if (kind==='x2') return 'x2'
  if (kind==='jolly') return 'jolly'
  if (kind==='bombColor') return 'bombColor'
  if (kind==='clone') return 'clone'
  return null
}

function pickRandomBonusKind(): SpecialKind {
  // arcade: laser20 wall14 bombColor14 clone12 jolly12 x2 10 vortex9 shuffle9
  const r = Math.random()*100
  if (r < 20) return 'laser'
  if (r < 34) return 'wall'
  if (r < 48) return 'bombColor'
  if (r < 60) return 'clone'
  if (r < 72) return 'jolly'
  if (r < 82) return 'x2'
  if (r < 91) return 'vortex'
  return 'shuffle'
}

function pickRandomSpecialKind(): SpecialKind {
  return pickRandomBonusKind()
}
