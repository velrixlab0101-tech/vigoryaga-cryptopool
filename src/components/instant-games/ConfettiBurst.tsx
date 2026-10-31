'use client'

import { useEffect, useRef } from 'react'

export default function ConfettiBurst({ active, big = false }: { active: boolean; big?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const particles: Array<{x:number,y:number,vx:number,vy:number,r:number,c:string,rot:number,vr:number}> = []
    const colors = ['#f5c542','#ff8a3d','#ffd86b','#ffffff','#22c55e']
    const count = big ? 160 : 80
    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width/2 + (Math.random()-0.5)*200,
        y: canvas.height/2,
        vx: (Math.random()-0.5)*12,
        vy: -Math.random()*16 - 4,
        r: Math.random()*6 + 2,
        c: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random()*Math.PI,
        vr: (Math.random()-0.5)*0.3
      })
    }
    let frame = 0
    const animate = () => {
      frame++
      ctx.clearRect(0,0,canvas.width,canvas.height)
      particles.forEach(p => {
        p.vy += 0.4
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x,p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6)
        ctx.restore()
      })
      if (frame < 120) requestAnimationFrame(animate)
      else ctx.clearRect(0,0,canvas.width,canvas.height)
    }
    animate()
  }, [active, big])

  if (!active) return null
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[100]" />
}
