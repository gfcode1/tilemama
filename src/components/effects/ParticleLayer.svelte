<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { gridEl } = $props<{ gridEl: HTMLDivElement | null }>();
  let canvas: HTMLCanvasElement | null = $state(null);
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let particles: {x:number;y:number;vx:number;vy:number;life:number;ttl:number;r:number;color:string;alpha:number;shape:string}[] = [];
  const MAX = 80;

  function syncSize() {
    if (!canvas || !gridEl) return;
    const r = gridEl.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = r.width+'px';
    canvas.style.height = r.height+'px';
    ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function emit(origin:{x:number;y:number}, kind:string, count:number, color:string|null) {
    if (!gridEl || !canvas || !ctx) return;
    const r = gridEl.getBoundingClientRect();
    const cx = origin.x * window.innerWidth - r.left;
    const cy = origin.y * window.innerHeight - r.top;
    const palette: Record<string,string[]> = {
      merge: ['#34d399','#fb7185','#fde68a','#7dd3fc'],
      boom: ['#fb7185','#fbbf24','#f472b6','#a78bfa','#34d399','#fff'],
      laser: ['#f43f5e','#fecdd3'],
      bomb: ['#fb7185','#fecdd3','#fff1f2'],
      star: ['#f0abfc','#fde68a','#fff'],
      vortex: ['#a78bfa','#ddd6fe'],
      shuffle: ['#fbbf24','#fef3c7'],
      wall: ['#a8a29e','#e7e5e4'],
      default: color ? [color] : ['#fb7185','#34d399','#fde68a']
    };
    const colors = palette[kind] ?? palette.default;
    const need = Math.min(count, MAX - particles.length);
    for (let i=0;i<need;i++) {
      const ang = kind==='laser' ? (Math.random()<0.5 ? 0 : Math.PI) + (Math.random()-0.5)*0.6 : Math.random()*Math.PI*2;
      const speed = kind==='boom' ? 3+Math.random()*6 : kind==='laser' ? 5+Math.random()*7 : 2+Math.random()*4;
      const ttl = kind==='boom' ? 28+Math.random()*18 : kind==='laser' ? 18+Math.random()*10 : 22+Math.random()*14;
      particles.push({
        x: cx + (Math.random()-0.5)*6,
        y: cy + (Math.random()-0.5)*6,
        vx: Math.cos(ang)*speed + (kind==='boom'?0: (Math.random()-0.5)*1),
        vy: Math.sin(ang)*speed - (kind==='boom'?1:0),
        life: 0, ttl, r: kind==='boom'? 3+Math.random()*4 : 2.2+Math.random()*2.5,
        color: colors[Math.floor(Math.random()*colors.length)]!,
        alpha: 1, shape: kind==='star' || kind==='boom' ? (Math.random()<0.35?'star':'circle') : 'circle'
      });
    }
    if (kind==='laser') {
      // line flash
      for (let i=0;i<Math.min(6, MAX-particles.length); i++) {
        particles.push({x: cx, y: cy, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life:0, ttl:10, r:1.5, color:'#fecdd3', alpha:0.9, shape:'circle'});
      }
    }
  }

  export function burst(origin:{x:number;y:number}, kind:string, count:number, color:string|null) {
    emit(origin, kind, count, color);
  }

  function tick() {
    if (!ctx || !canvas) { raf = requestAnimationFrame(tick); return; }
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0,0,r.width,r.height);
    let alive: typeof particles = [];
    for (const p of particles) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // gravity
      p.vx *= 0.99;
      p.alpha = 1 - p.life/p.ttl;
      if (p.life >= p.ttl) continue;
      if (ctx) {
        ctx.globalAlpha = Math.max(0,p.alpha);
        ctx.fillStyle = p.color;
        if (p.shape==='star') {
          // 5-point star
          ctx.beginPath();
          for (let i=0;i<5;i++) {
            const a = (i*Math.PI*2/5) - Math.PI/2;
            const rx = i%2===0 ? p.r : p.r*0.45;
            const x = p.x + Math.cos(a)*rx;
            const y = p.y + Math.sin(a)*rx;
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        }
      }
      alive.push(p);
    }
    particles = alive;
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  }

  let ro: ResizeObserver | null = null;
  onMount(() => {
    syncSize();
    ro = new ResizeObserver(syncSize);
    if (gridEl) ro.observe(gridEl);
    raf = requestAnimationFrame(tick);
  });
  // handle late gridEl binding (Svelte 5 props update after mount)
  $effect(() => {
    void gridEl;
    syncSize();
    if (gridEl && ro && !(ro as any)._observed) {
      try { ro.observe(gridEl); } catch {}
    }
  });
  onDestroy(() => { cancelAnimationFrame(raf); ro?.disconnect(); });

  // expose globally for App.svelte via bind
  export { emit };
</script>

<canvas bind:this={canvas} class="absolute inset-[7px] pointer-events-none z-[7] rounded-[20px]"></canvas>
