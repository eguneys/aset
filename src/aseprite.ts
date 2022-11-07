import * as zlib from 'zlib'
import { Image } from './image'

const CLayer =  0
const CCel = 0x2005
const CPalette = 0x2019
const CUserData = 0
const CFrameTags = 0x2018
const CSlice = 0x2022


export type ChunkType = 0x2005 | 0x2019 | 0x2018 | 0x2022 | 0
export type CelChunk = {
  layer_index: number,
  x: number,
  y: number,
  alpha: number,
  image_or_link: Image | number
}

export type Point = { x: number, y: number }

export type Slice = {
  name: string,
  frame: number,
  origin: Point,
  width: number,
  height: number,
  pivot?: Point
}

export type SliceChunk = Array<Slice>

export type TagsChunk = Array<Tag>

export type Tag = {
  from: number,
  to: number,
  name: string
}

export type PaletteChunk = Array<number>

export type ChunkData = CelChunk | PaletteChunk | TagsChunk | SliceChunk


export type Chunk = {
  size: number,
  type: ChunkType,
  data?: ChunkData
}


export type Frame = {
  nb_bytes: number,
  duration: number,
  nb_chunks: number,
  chunks: Array<Chunk>,
  image: Image
}

export type Aseprite = {
  file_size: number,
  nb_frames: number,
  width: number,
  height: number,
  c_depth: number,
  flags: number,
  frames: Array<Frame>,
  tags: Array<Tag>,
  slices: Array<Slice>
}

function n(n: number) {
  return [...Array(n).keys()]
}


// TODO compose layers with blending modes
function render_chunks(chunks: Array<Chunk>, width: number, height: number) {
  let _cel = chunks.filter(_ => _.type === CCel)[0]

  let cel: CelChunk = _cel.data as CelChunk

  let srcImage = cel.image_or_link as Image

  let src = srcImage.pixels
  let dst: Array<number> = []

  let srcX = cel.x
  let srcY = cel.y
  let srcW = srcImage.width
  let srcH = srcImage.height
  let dstW = width
  let dstH = height

  let left = Math.max(0, srcX)
  let right = Math.min(dstW, srcX + srcW)
  let top = Math.max(0, srcY)
  let bottom = Math.min(dstH, srcY + srcH)

  for (let dx = left, sx = 0; dx < right; dx++, sx ++) {
    for (let dy = top, sy = 0; dy < bottom; dy++, sy++) {

      dst[(dx + dy * dstW) * 4 + 0] = src[(sx + sy * srcW)*4 + 0]
      dst[(dx + dy * dstW) * 4 + 1] = src[(sx + sy * srcW)*4 + 1]
      dst[(dx + dy * dstW) * 4 + 2] = src[(sx + sy * srcW)*4 + 2]
      dst[(dx + dy * dstW) * 4 + 3] = src[(sx + sy * srcW)*4 + 3]
    } 
  }

  return {
    pixels: dst,
    width,
    height
  }
}

function render_tags(frames: Array<Frame>) {

  let tags: TagsChunk = frames.flatMap(_ => _.chunks).filter(_ => _.type === CFrameTags).flatMap(_ => _.data! as TagsChunk)
  return tags
}

function render_slices(frames: Array<Frame>) {
  let slices: SliceChunk = frames.flatMap(_ => _.chunks).filter(_ => _.type === CSlice).flatMap(_ => _.data! as SliceChunk)
  return slices
}

export function aseprite(data: Buffer) {

  let i = 0

  function _string() {
    let length = word()
    let res = data.toString('utf8', i, i + length)
    i += length
    return res
  }

  function _short() {
    let res = data.readInt16LE(i)
    i += 2
    return res
  }

  function _long() {
    let res = data.readInt32LE(i)
    i += 4
    return res
  }

  function _byte() {
    let res = data.readUInt8(i)
    i+= 1
    return res
  }

  function word() {
    let res = data.readUInt16LE(i)
    i+= 2
    return res
  }

  function dword() {
    let res = data.readUInt32LE(i)
    i += 4
    return res
  }

  function pixel() {
    return n(4).map(_ => _byte())
  }

  function ctags() {
    let nb_tags = word()
    n(8).map(() => _byte())

    return n(nb_tags).map(() => {
      let from = word()
      let to = word()
      let dir = _byte()
      let repeat = word()

      n(6).map(() => _byte())
      n(3).map(() => _byte())
      _byte()
      let name = _string()

      return {
        from,
        to,
        name
      }
    })
  }

  function ccell() {

    let layer_index = word()
    let x = _short()
    let y = _short()
    let alpha = _byte()
    let type = word()
    let image_or_link: Image | number = -1

    n(7).map(_ => _byte())
    if (type === 0 || type === 2) {
      let width = word()
      let height = word()
      let count = width * height

      let pixels: Array<number>
      if (type === 0) {
        pixels = n(count).flatMap(() => pixel())
      } else {
        pixels = [...zlib.inflateSync(data.slice(i))]
      }

      image_or_link = {
        width,
        height,
        pixels
      }
    } else if (type === 1) {
      image_or_link = word()
    }
    return {
      layer_index,
      x,
      y,
      alpha,
      image_or_link
    }

  }

  function cslice() {
    let count = dword()
    let flags = dword()
    dword()
    let name = _string()
    return n(count).map(_ => {

      let frame = dword()
      let origin = {
        x: dword(),
        y: dword()
      }
      let width = dword()
      let height = dword()

      if (flags & (1 << 0)) {
        _long()
        _long()
        dword()
        dword()
      }
      let pivot
      if (flags & (1 << 1)) {
        pivot = {
          x: _long(),
          y: _long()
        }
      }

      return {
        name,
        frame,
        origin,
        width,
        height,
        pivot
      }

    })
  }

  function cpalette() {

    let p_size = dword()
    let from = dword()
    let to = dword()
    n(8).map(_ => _byte())
    let colors = n(to-from+1).map(_ => {
      let has_name = word()
      let color = dword()

      if (has_name & 0xf000) {
        let len = word()
        i += len
      }
      return color
    })

    return colors
  }

  function chunk() {
    let _i = i
    let size = dword()
    let type: ChunkType = word() as ChunkType
    let data: ChunkData | undefined
    switch (type) {
      case CLayer:
        break
      case CCel:
        data = ccell()
        break
      case CPalette:
        data = cpalette()
        break
      case CUserData:
        break
      case CFrameTags:
        data = ctags()
        break
      case CSlice:
        data = cslice()
        break
    }
    i = _i + size

    return {
      size,
      type,
      data
    }
  }


  function frame() {

    let _i = i
    let nb_bytes = dword()
    let magic = word()
    let nb_chunks_old = word()
    let duration = word()
    n(2).map(_ => _byte())
    let nb_chunks_new = dword()

    let nb_chunks = (nb_chunks_old === 0xffff) ? nb_chunks_new : nb_chunks_old

    let chunks = n(nb_chunks).map(_ => chunk())

    let image = render_chunks(chunks, width, height)

    i = _i + nb_bytes

    return {
      nb_bytes,
      duration,
      nb_chunks,
      chunks,
      image
    }
  }


  let file_size = dword()
  let magic     = word()
  let nb_frames = word()
  let width     = word()
  let height    = word()
  let c_depth   = word()
  let flags     = dword()
  word()
  dword()
  dword()
  _byte()
  n(3).map(_ => _byte())
  word()

  let p_width  = _byte()
  let p_height = _byte()
  let grid_x   = _short()
  let grid_y   = _short()
  let grid_w   = word()
  let grid_h   = word()
  n(84).map(_ => _byte())

  let frames = n(nb_frames).map(_ => frame())
  let tags = render_tags(frames)
  let slices = render_slices(frames)


  return {
    file_size,
    nb_frames,
    width,
    height,
    c_depth,
    flags,
    frames,
    tags,
    slices
  }
}
