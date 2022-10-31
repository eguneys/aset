import { PNG } from 'pngjs'
export type Image = {
  width: number,
  height: number,
  pixels: Array<number>
}

export class ImageSave {


  get png_buffer() {

    let png = new PNG({
      width: this.image.width,
      height: this.image.height,
    })
    png.data = new Uint16Array(this.image.pixels)

    return PNG.sync.write(png)
  }

  constructor(readonly image: Image) {}
}
