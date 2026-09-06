import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const CELL = 128
const assetsDir = path.resolve('src/assets')
const outDir = path.resolve('public/sprites')

fs.mkdirSync(outDir, { recursive: true })

// Tiles: 4 colors x 5 values = 20, layout 5 cols x 4 rows
const tileDefs = [
  { color: 'green', dir: 'verde', values: [1, 2, 4, 8, 16] },
  { color: 'yellow', dir: 'giallo', values: [1, 2, 4, 8, 16] },
  { color: 'red', dir: 'rosso', values: [1, 2, 4, 8, 16] },
  { color: 'blue', dir: 'blue', values: [1, 2, 4, 8, 16] },
]

const specials = [
  { kind: 'bombColor', file: 'bomba_nobg_cropped.png' },
  { kind: 'clone', file: 'clone_nobg_cropped.png' },
  { kind: 'wall', file: 'wall_nobg_cropped.png' },
  { kind: 'wall-cracked', file: 'crackedwall_nobg_cropped.png' },
  { kind: 'laser', file: 'laser_nobg_cropped.png' },
  { kind: 'jolly', file: 'rainbow_nobg_cropped.png' },
  { kind: 'shuffle', file: 'shuffle_nobg_cropped.png' },
  { kind: 'star', file: 'star_nobg_cropped.png' },
  { kind: 'vortex', file: 'vortex_nobg_cropped.png' },
  { kind: 'x2', file: 'x2_nobg_cropped.png' },
]

async function buildTiles() {
  const cols = 5
  const rows = 4
  const W = cols * CELL
  const H = rows * CELL

  const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })

  const composites = []
  const map = {}
  let idx = 0
  for (const def of tileDefs) {
    for (const v of def.values) {
      const src = path.join(assetsDir, def.dir, `${v}.png`)
      const buf = await sharp(src).resize(CELL, CELL, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
      const col = idx % cols
      const row = Math.floor(idx / cols)
      const left = col * CELL
      const top = row * CELL
      composites.push({ input: buf, left, top })
      map[`${def.color}-${v}`] = { x: left, y: top, w: CELL, h: CELL, col, row }
      idx++
    }
  }

  const pngBuf = await base.composite(composites).png({ compressionLevel: 9 }).toBuffer()
  const webpBuf = await sharp(pngBuf).webp({ quality: 82 }).toBuffer()

  fs.writeFileSync(path.join(outDir, 'tiles.png'), pngBuf)
  fs.writeFileSync(path.join(outDir, 'tiles.webp'), webpBuf)

  console.log(`tiles: ${W}x${H} ${composites.length} cells -> tiles.png ${Math.round(pngBuf.length/1024)}KB tiles.webp ${Math.round(webpBuf.length/1024)}KB`)
  return { cols, rows, W, H, map }
}

async function buildSpecials() {
  const cols = 5
  const rows = 2
  const W = cols * CELL
  const H = rows * CELL

  const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })

  const composites = []
  const map = {}
  for (let i = 0; i < specials.length; i++) {
    const s = specials[i]
    const src = path.join(assetsDir, 'speciali', s.file)
    const buf = await sharp(src).resize(CELL, CELL, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    const col = i % cols
    const row = Math.floor(i / cols)
    const left = col * CELL
    const top = row * CELL
    composites.push({ input: buf, left, top })
    map[s.kind] = { x: left, y: top, w: CELL, h: CELL, col, row }
  }

  const pngBuf = await base.composite(composites).png({ compressionLevel: 9 }).toBuffer()
  const webpBuf = await sharp(pngBuf).webp({ quality: 85 }).toBuffer()

  fs.writeFileSync(path.join(outDir, 'specials.png'), pngBuf)
  fs.writeFileSync(path.join(outDir, 'specials.webp'), webpBuf)

  console.log(`specials: ${W}x${H} ${composites.length} cells -> specials.png ${Math.round(pngBuf.length/1024)}KB specials.webp ${Math.round(webpBuf.length/1024)}KB`)
  return { cols, rows, W, H, map }
}

const tiles = await buildTiles()
const specialsMeta = await buildSpecials()

const manifest = {
  cell: CELL,
  tiles,
  specials: specialsMeta,
  generatedAt: new Date().toISOString()
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('manifest written to public/sprites/manifest.json')
