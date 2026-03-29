#!/usr/bin/env node
// Generates PWA icons in public/icons/ using pure Node.js (no dependencies).
// Green circle background with white "GO" text (pixel bitmap font).

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── 5×7 pixel bitmaps for G and O ──────────────────────────────────────────
//   Each row is a bitmask of 5 bits (MSB = leftmost pixel)

const GLYPHS = {
  G: [
    0b01110,
    0b10001,
    0b10000,
    0b10111,
    0b10001,
    0b10001,
    0b01110,
  ],
  O: [
    0b01110,
    0b10001,
    0b10001,
    0b10001,
    0b10001,
    0b10001,
    0b01110,
  ],
}

const GLYPH_W = 5
const GLYPH_H = 7

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++)
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const payload = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(payload))
  return Buffer.concat([lenBuf, payload, crcBuf])
}

function createPNG(size) {
  // Scale factor: each bitmap pixel becomes `scale` screen pixels
  const scale = Math.floor(size * 0.055)  // each glyph cell; "GO" spans ~55% of icon width
  const gap = Math.floor(size * 0.04)     // gap between G and O

  const totalW = GLYPH_W * scale * 2 + gap
  const totalH = GLYPH_H * scale
  const startX = Math.floor((size - totalW) / 2)
  const startY = Math.floor((size - totalH) / 2)

  // Raw image data: filter byte (0) + RGB per row
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(rowSize * size, 0)

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0 // filter byte = None
    for (let x = 0; x < size; x++) {
      const offset = y * rowSize + 1 + x * 3

      // Full green background — iOS applies its own rounded-rect mask
      raw[offset]     = 0x2e  // #2ECC71
      raw[offset + 1] = 0xcc
      raw[offset + 2] = 0x71

      // Check if this pixel falls inside a glyph
      const lx = x - startX
      const ly = y - startY

      if (lx >= 0 && ly >= 0 && ly < totalH) {
        // G glyph occupies columns [0, GLYPH_W*scale)
        const gOffset = GLYPH_W * scale + gap
        let glyphPixel = false

        if (lx < GLYPH_W * scale) {
          // Inside G
          const col = Math.floor(lx / scale)
          const row = Math.floor(ly / scale)
          if (row < GLYPH_H && (GLYPHS.G[row] >> (GLYPH_W - 1 - col)) & 1)
            glyphPixel = true
        } else if (lx >= gOffset && lx < gOffset + GLYPH_W * scale) {
          // Inside O
          const col = Math.floor((lx - gOffset) / scale)
          const row = Math.floor(ly / scale)
          if (row < GLYPH_H && (GLYPHS.O[row] >> (GLYPH_W - 1 - col)) & 1)
            glyphPixel = true
        }

        if (glyphPixel) {
          raw[offset]     = 0xff  // white
          raw[offset + 1] = 0xff
          raw[offset + 2] = 0xff
        }
      }
    }
  }

  const compressed = deflateSync(raw, { level: 9 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = join(__dirname, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const outPath = join(outDir, `icon-${size}.png`)
  writeFileSync(outPath, createPNG(size))
  console.log(`✓ icon-${size}.png`)
}
