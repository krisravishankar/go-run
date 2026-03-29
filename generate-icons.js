#!/usr/bin/env node
// Generates PWA icons in public/icons/ using pure Node.js (no dependencies).
// Creates a green circle (#2ECC71) on a black background.

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
  // Raw image data: one filter byte (0 = None) + RGB pixels per row
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(rowSize * size, 0)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.44

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0 // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const offset = y * rowSize + 1 + x * 3
      if (Math.sqrt(dx * dx + dy * dy) <= r) {
        // #2ECC71
        raw[offset] = 0x2e
        raw[offset + 1] = 0xcc
        raw[offset + 2] = 0x71
      }
      // else stays black (0,0,0)
    }
  }

  const compressed = deflateSync(raw, { level: 9 })

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  // bytes 10-12 already 0 (compression, filter, interlace)

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
