import * as zlib from 'zlib'

const CLayer =  0
const CCel = 0x2005
const CPalette = 0x2019
const CUserData = 0
const CFrameTags = 0
const CSlice = 0


export type ChunkType = 0x2005 | 0x2019 | 0

export type Image = {
  width: number,
  height: number,
  pixels: Array<number>
}

export type CelChunk = {
  layer_index: number,
  x: number,
  y: number,
  alpha: number,
  image_or_link: Image | number
}

export type PaletteChunk = Array<number>

export type ChunkData = CelChunk | PaletteChunk


export type Chunk = {
  size: number,
  type: ChunkType,
  data?: ChunkData
}


export type Frame = {
  nb_bytes: number,
  duration: number,
  nb_chunks: number,
  chunks: Array<Chunk>
}

export type Aseprite = {
  file_size: number,
  nb_frames: number,
  width: number,
  height: number,
  c_depth: number,
  flags: number,
  frames: Array<Frame>
}

function n(n: number) {
  return [...Array(n).keys()]
}

export function aseprite(data: Buffer) {

  let i = 0

  function _short() {
    let res = data.readInt16LE(i)
    i += 2
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
        pixels = [...zlib.inflateSync(data.slice(i, i + count))]
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
        break
      case CSlice:
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

    console.log(chunks)

    i = _i + nb_bytes

    return {
      nb_bytes,
      duration,
      nb_chunks,
      chunks
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


  return {
    file_size,
    nb_frames,
    width,
    height,
    c_depth,
    flags,
    frames
  }
}
