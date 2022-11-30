import { ImageSave, Image } from './image'
import potpack from 'potpack'

const max_size = 8192


export class Packer {


  entries: Array<Entry> = []
  pages: Array<ImageSave> = []

  constructor(readonly padding: number = 0) {
  }

  add(image: Image) {

    let { padding } = this

    let pixels = image.pixels
    let w = image.width,
      h = image.height

    let frame = {
      x: padding,
      y: padding,
      w,
      h
    }

    let packed = {
      x: 0,
      y: 0,
      w: w + padding * 2,
      h: h + padding * 2
    }

    let entry = {
      frame,
      packed,
      pixels
    }

    this.entries.push(entry)

    return entry
  }


  pack() {
    let { padding } = this


    let sources = this.entries


    let { w, h } = potpack(sources.map(_ => _.packed))

    let page = {
      width: w,
      height: h,
      pixels: []
    }

    this.pages.push(new ImageSave(page))

    for (let i = 0; i < sources.length; i++) {
      let dst = sources[i].packed,
        src = sources[i].pixels

      let sw = sources[i].frame.w,
        sh = sources[i].frame.h


      for (let x = 0; x < sw; x++) {
        for (let y = 0; y < sh; y++) {
          let sx = x + padding
          let sy = y + padding

          page.pixels[(dst.x + sx + (dst.y + sy) * page.width) * 4 + 0] = 
            src[(x + y * sw) * 4 + 0]


          page.pixels[(dst.x + sx + (dst.y + sy) * page.width) * 4 + 1] = 
            src[(x + y * sw) * 4 + 1]

          page.pixels[(dst.x + sx + (dst.y + sy) * page.width) * 4 + 2] = 
            src[(x + y * sw) * 4 + 2]

          page.pixels[(dst.x + sx + (dst.y + sy) * page.width) * 4 + 3] = 
            src[(x + y * sw) * 4 + 3]
        }
      }

    }

  }


}
