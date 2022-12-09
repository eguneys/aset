import { PNG } from 'pngjs'

export class Rect {
  static make = (x: number, y: number, w: number, h: number) => new Rect(x, y, w, h)

  constructor(readonly x: number,
              readonly y: number,
              readonly w: number,
              readonly h: number) {}
}

export type Image = {
  width: number,
  height: number,
  pixels: Uint8Array
}

export class ImageSave {


  get png_buffer() {
    let png = new PNG({
      width: this.image.width,
      height: this.image.height,
    })
    png.data = new Uint16Array(this.image.pixels) as any

    return PNG.sync.write(png)
  }

  get_sub_image(rect: Rect) {

    let pixels = new Uint8Array(rect.w * rect.h * 4)

    for (let y = 0; y < rect.h; y++) {
      for (let x = 0; x < rect.w; x++) {

        let dst = (x + y * rect.w) * 4
        let src = (x + rect.x + (rect.y + y) * this.image.width) * 4
        pixels[dst + 0] = this.image.pixels[src + 0]
        pixels[dst + 1] = this.image.pixels[src + 1]
        pixels[dst + 2] = this.image.pixels[src + 2]
        pixels[dst + 3] = this.image.pixels[src + 3]
      }
    }


    return new ImageSave({ 
      width: rect.w,
      height: rect.h,
      pixels
    })
  }

  constructor(readonly image: Image) {}
}
