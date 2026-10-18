'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl sm:text-7xl font-bold mb-6"
          >
            CryptoPool
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-foreground/70 mb-12"
          >
            Daily USDC Lucky Draw • Transparent • On Base
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-surface rounded-2xl p-8 max-w-2xl mx-auto border border-accent/20 pulse-glow"
          >
            <p className="text-foreground/70 mb-4">NEXT DRAW</p>
            <div className="text-6xl sm:text-7xl font-bold text-accent mb-6 shimmer">
              $1,000 USDC
            </div>
            <p className="text-foreground/70 mb-8">5 Winners • 50/25/15/7/3 Split</p>
            <Link 
              href="/draws"
              className="inline-block bg-accent text-background font-bold px-8 py-4 rounded-lg text-lg hover:bg-accent/90 transition-colors pulse-glow"
            >
              View Active Draws
            </Link>
          </motion.div>
        </div>
      </section>
      
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Buy Tickets", desc: "Buy tickets with USDC on Base" },
              { step: "2", title: "Draw Closes", desc: "Wait for the draw to close" },
              { step: "3", title: "Winners Announced", desc: "5 winners get paid out directly" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                className="bg-surface rounded-xl p-6 border border-accent/20"
              >
                <div className="text-4xl font-bold text-accent mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-foreground/70">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
