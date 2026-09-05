<script lang="ts">
  let { trail = [], swipeDir = null, gridEl }: { trail: {x:number,y:number}[], swipeDir: 'N'|'S'|'E'|'W'|null, gridEl: HTMLDivElement | null } = $props();

  let canvas: HTMLCanvasElement | null = $state(null);
  let ro: ResizeObserver | null = null;

  export function syncSize() {
    if (!gridEl || !canvas) return;
    const r = gridEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    if (trail.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(251,146,60,0.18)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    const grad = ctx.createLinearGradient(trail[0].x, trail[0].y, trail[trail.length-1].x, trail[trail.length-1].y);
    grad.addColorStop(0, '#fb7185');
    grad.addColorStop(0.5, '#fde68a');
    grad.addColorStop(1, '#7dd3fc');
    ctx.strokeStyle = grad as any;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    if (swipeDir && trail.length >= 2) {
      const last = trail[trail.length-1];
      const prev = trail[trail.length-2];
      const ang = Math.atan2(last.y - prev.y, last.x - prev.x);
      ctx.fillStyle = '#fff7ed';
      ctx.strokeStyle = 'rgba(67,20,7,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(last.x - Math.cos(ang - 0.45)*16, last.y - Math.sin(ang - 0.45)*16);
      ctx.lineTo(last.x - Math.cos(ang + 0.45)*16, last.y - Math.sin(ang + 0.45)*16);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  $effect(() => { void trail.length; draw(); });
  $effect(() => { void swipeDir; draw(); });

  // expose sync via mount
  import { onMount, onDestroy } from 'svelte';
  onMount(() => {
    ro = new ResizeObserver(() => syncSize());
    if (gridEl) ro.observe(gridEl);
    syncSize();
  });
  onDestroy(() => ro?.disconnect());
</script>

<canvas bind:this={canvas} class="absolute inset-[7px] pointer-events-none z-[5] rounded-[20px]"></canvas>
