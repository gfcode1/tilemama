import { GRID_SIZE, DIRS, type Dir, type Block, type Special, isWall, isSpecial, isBlock } from '../../lib/types';

export type ResolvedMove =
  | { type: 'wall'; wall: Special; finalX: number; finalY: number; beforeX: number; beforeY: number }
  | { type: 'special'; special: Special; finalX: number; finalY: number }
  | { type: 'merge'; target: Block; finalX: number; finalY: number }
  | { type: 'slide'; finalX: number; finalY: number; moved: boolean }
  | { type: 'none'; finalX: number; finalY: number };

export function resolveMove(
  block: Block,
  dir: Dir,
  grid: (Block | Special | null)[][]
): ResolvedMove {
  const { dx, dy } = DIRS[dir];
  let cx = block.x;
  let cy = block.y;

  while (true) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
      return { type: 'slide', finalX: cx, finalY: cy, moved: cx !== block.x || cy !== block.y };
    }
    const cell = grid[ny][nx];
    if (!cell) {
      cx = nx;
      cy = ny;
      continue;
    }
    if (isWall(cell)) return { type: 'wall', wall: cell as Special, finalX: nx, finalY: ny, beforeX: cx, beforeY: cy };
    if (isSpecial(cell)) return { type: 'special', special: cell as Special, finalX: nx, finalY: ny };
    if (isBlock(cell)) {
      const canMerge = (cell.color === block.color || block.jolly || (cell as Block).jolly) && cell.value === block.value;
      if (canMerge) return { type: 'merge', target: cell as Block, finalX: nx, finalY: ny };
      // blocco incompatibile: scivola fino alla cella prima dell'ostacolo
      // se c'è spazio (cx != origin) -> moved true con spostamento
      // se adiacente (cx == origin) -> bump valido anche senza spostamento (richiesta utente: mossa valida)
      return { type: 'slide', finalX: cx, finalY: cy, moved: true };
    }
  }
}
