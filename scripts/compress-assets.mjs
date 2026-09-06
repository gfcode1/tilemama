import sharp from 'sharp'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = 'src/assets'
const SIZE = 256

async function compressFile(path) {
  const buf = await sharp(path)
    .resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer()
  const out = await sharp(buf).toFile(path + '.tmp')
  const orig = (await stat(path)).size
  const tmp = (await stat(path + '.tmp')).size
  // only overwrite if smaller
  const { rename, unlink } = await import('node:fs/promises')
  if (tmp < orig) {
    await rename(path + '.tmp', path)
    return { path, orig, tmp, saved: orig - tmp }
  } else {
    await unlink(path + '.tmp')
    return { path, orig, tmp: orig, saved: 0 }
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) files.push(...await walk(p))
    else if (e.isFile() && e.name.endsWith('.png')) files.push(p)
  }
  return files
}

const files = await walk(ROOT)
console.log(`Found ${files.length} PNGs, resizing to ${SIZE}px max, png palette`)
let totalOrig = 0, totalNew = 0
for (const f of files) {
  const r = await compressFile(f)
  totalOrig += r.orig
  totalNew += r.tmp
  console.log(`${f}: ${(r.orig/1024).toFixed(0)}KB -> ${(r.tmp/1024).toFixed(0)}KB saved ${(r.saved/1024).toFixed(0)}KB`)
}
console.log(`Total: ${(totalOrig/1024).toFixed(0)}KB -> ${(totalNew/1024).toFixed(0)}KB saved ${((totalOrig-totalNew)/1024).toFixed(0)}KB (${((1-totalNew/totalOrig)*100).toFixed(1)}%)`)
