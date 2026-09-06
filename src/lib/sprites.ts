import type { Block, SpecialKind } from './types'

// Tile sprites — 4 colori × 5 valori
import blue1 from '../assets/blue/1.png'
import blue2 from '../assets/blue/2.png'
import blue4 from '../assets/blue/4.png'
import blue8 from '../assets/blue/8.png'
import blue16 from '../assets/blue/16.png'

import rosso1 from '../assets/rosso/1.png'
import rosso2 from '../assets/rosso/2.png'
import rosso4 from '../assets/rosso/4.png'
import rosso8 from '../assets/rosso/8.png'
import rosso16 from '../assets/rosso/16.png'

import giallo1 from '../assets/giallo/1.png'
import giallo2 from '../assets/giallo/2.png'
import giallo4 from '../assets/giallo/4.png'
import giallo8 from '../assets/giallo/8.png'
import giallo16 from '../assets/giallo/16.png'

import verde1 from '../assets/verde/1.png'
import verde2 from '../assets/verde/2.png'
import verde4 from '../assets/verde/4.png'
import verde8 from '../assets/verde/8.png'
import verde16 from '../assets/verde/16.png'

// Special sprites
import bombaImg from '../assets/speciali/bomba_nobg_cropped.png'
import cloneImg from '../assets/speciali/clone_nobg_cropped.png'
import wallImg from '../assets/speciali/wall_nobg_cropped.png'
import crackedWallImg from '../assets/speciali/crackedwall_nobg_cropped.png'
import laserImg from '../assets/speciali/laser_nobg_cropped.png'
import rainbowImg from '../assets/speciali/rainbow_nobg_cropped.png'
import shuffleImg from '../assets/speciali/shuffle_nobg_cropped.png'
import starImg from '../assets/speciali/star_nobg_cropped.png'
import vortexImg from '../assets/speciali/vortex_nobg_cropped.png'
import x2Img from '../assets/speciali/x2_nobg_cropped.png'

import titleImg from '../assets/tilemama_cropped.png'

const tileMap: Record<string, Record<number, string>> = {
  blue: { 1: blue1, 2: blue2, 4: blue4, 8: blue8, 16: blue16 },
  red: { 1: rosso1, 2: rosso2, 4: rosso4, 8: rosso8, 16: rosso16 },
  yellow: { 1: giallo1, 2: giallo2, 4: giallo4, 8: giallo8, 16: giallo16 },
  green: { 1: verde1, 2: verde2, 4: verde4, 8: verde8, 16: verde16 },
}

export function tileSprite(block: Block): string {
  if (block.jolly) return rainbowImg
  const byColor = tileMap[block.color]
  if (!byColor) return tileMap.green[1]
  return byColor[block.value] ?? byColor[16] ?? verde16
}

const specialMap: Record<string, string> = {
  star: starImg,
  x2: x2Img,
  jolly: rainbowImg,
  bombColor: bombaImg,
  laser: laserImg,
  wall: wallImg,
  vortex: vortexImg,
  shuffle: shuffleImg,
  clone: cloneImg,
}

export function specialSprite(kind: SpecialKind, hp?: number): string {
  if (kind === 'wall' && hp === 1) return crackedWallImg
  return specialMap[kind] ?? starImg
}

export const titleSprite = titleImg
export const rainbowSprite = rainbowImg
