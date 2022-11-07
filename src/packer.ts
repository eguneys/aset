import { ImageSave, Image } from './image'

const max_size = 8192

export type Rect = {
  x: number,
  y: number,
  w: number,
  h: number
}

export type Entry = {
  page?: number,
  frame: Rect,
  packed: Rect,
  pixels: Array<number>
}

export class Packer {

  constructor(readonly padding: number = 0, 
              readonly spacing: number = 0) {
  }

  entries: Array<Entry> = []
  pages: Array<ImageSave> = []

  add(image: Image) {
    let pixels = image.pixels
    let w = image.width,
      h = image.height
    let source = { x: 0, y: 0, w: image.width, h: image.height }

    // trim
    let top = source.y, left = source.x, right = source.x, bottom = source.y

    loop_top:
    for (let y = source.y; y < source.y + source.h; y++) {
      for (let x = source.x, s = x + y * w; x < source.x + source.w; x++, s++) {
        if (pixels[s * 4 + 3] > 0) {
          top = y
          break loop_top
        }
      }
    }


    loop_left:
    for (let x = source.x; x < source.x + source.w; x++) {
      for (let y = top, s = x + y * w; y < source.y + source.h; y++, s+= w) {
        if (pixels[s * 4 + 3] > 0) {
          left = x
          break loop_left
        }
      }
    }

    loop_right:
    for (let x = source.x + source.w - 1; x >= left; x--) {
      for (let y = top, s = x + y * w; y < source.y + source.h; y++, s+= w) {
        if (pixels[s * 4 + 3] > 0) {
          right = x + 1
          break loop_right
        }
      }
    }


    loop_bottom:
    for (let y = source.y + source.h - 1; y >= top; y--) {
      for (let x = left, s = x + y * w; x < right; x++, s++) {
        if (pixels[s * 4 + 3] > 0) {
          bottom = y + 1
          break loop_bottom
        }
      }
    }


    if (right > left && bottom > top) {

      let frame = { 
        x: source.x - left,
        y: source.y - top,
        w,
        h
      }

      let packed = {
        x: -1,
        y: -1,
        w: right - left,
        h: bottom - top
      }

      let buffer = []

      if (packed.w === w && packed.h === h) {
        buffer = pixels
      } else {
        for (let i =0; i < packed.h; i++) {
          for (let j = 0; j < packed.w; j++) {
            buffer[(j + i * packed.w) * 4 + 0] = pixels[(left + j + (top + i) * w) * 4 + 0]
            buffer[(j + i * packed.w) * 4 + 1] = pixels[(left + j + (top + i) * w) * 4 + 1]
            buffer[(j + i * packed.w) * 4 + 2] = pixels[(left + j + (top + i) * w) * 4 + 2]
            buffer[(j + i * packed.w) * 4 + 3] = pixels[(left + j + (top + i) * w) * 4 + 3]
          }
        }
      }

      let entry = {
        frame,
        packed,
        pixels: buffer
      }

      this.entries.push(entry)
      return entry
    }
  }

  pack() {
    let { padding, spacing } = this

    let sources = this.entries.slice(0)

    sources.sort((a, b) =>
      b.packed.w * b.packed.h - a.packed.w * a.packed.h
    )

    let count = this.entries.length

    let nodes = []
    let packed = 0, page = 0

    while (packed < count) {
      let from = packed
      let index = 0

      let root = new Node({
        x: 0,
        y: 0,
        w: sources[from].packed.w + padding * 2 + spacing,
        h: sources[from].packed.h + padding * 2 + spacing
      })

      while (packed < count) {

        let w = sources[packed].packed.w + padding * 2 + spacing
        let h = sources[packed].packed.h + padding * 2 + spacing

        let node = root.find(w, h)

        if (!node) {

          let canGrowDown = (w <= root.rect.w) && (root.rect.h + h < max_size)
          let canGrowRight = (h <= root.rect.h) && (root.rect.w + w < max_size)
          let shouldGrowRight = canGrowRight && (root.rect.h >= (root.rect.w + w))
          let shouldGrowDown = canGrowDown && (root.rect.w >= (root.rect.h + h))

          if (canGrowDown || canGrowRight) {
            if (shouldGrowRight || (!shouldGrowDown && canGrowRight)) {
              let next = new Node({ x: 0, y: 0, w: root.rect.w + w, h: root.rect.h })
              next.used = true
              next.down = root
              next.right = new Node({ x: root.rect.w, y: 0, w: w, h: root.rect.h })
              node = next.right
              root = next
            } else {
              let next = new Node({ x: 0, y: 0, w: root.rect.w, h: root.rect.h + h })
              next.used = true
              next.down= new Node({ x: 0, y: root.rect.h, w: root.rect.w, h: h })
              next.right= root
              node = next.down
              root = next
            }
          }

        }

        if (!node) {
          break
        }

        node.used = true
        node.down = new Node({
          x: node.rect.x,
          y: node.rect.y + h,
          w: node.rect.w,
          h: node.rect.h - h
        })
        node.right = new Node({
          x: node.rect.x + w,
          y: node.rect.y,
          w: node.rect.w - w,
          h: h
        })

        sources[packed].packed.x = node.rect.x + padding
        sources[packed].packed.y = node.rect.y + padding
        packed++
      }



      let page_width = 2,
        page_height = 2

      while (page_width < root.rect.w) {
        page_width *= 2
      }
      while (page_height < root.rect.h) {
        page_height *= 2
      }


      let page: Image = {
        width: page_width,
        height: page_height,
        pixels: []
      }

      this.pages.push(new ImageSave(page))


      for (let i = from; i< packed; i++) {

        sources[i].page = this.pages.length - 1

        let dst = sources[i].packed,
          src = sources[i].pixels

        for (let x = -padding; x < dst.w + padding; x++) {
          for (let y = -padding; y < dst.h + padding; y++) {
            let sx = (x < 0 ? 0 : (x > dst.w - 1 ? dst.w - 1: x))
            let sy = (y < 0 ? 0 : (y > dst.h - 1 ? dst.h - 1: y))

            page.pixels[(dst.x + x + (dst.y + y) * page.width) * 4 + 0] = src[(sx + sy * dst.w) * 4 + 0]
            page.pixels[(dst.x + x + (dst.y + y) * page.width) * 4 + 1] = src[(sx + sy * dst.w) * 4 + 1]
            page.pixels[(dst.x + x + (dst.y + y) * page.width) * 4 + 2] = src[(sx + sy * dst.w) * 4 + 2]
            page.pixels[(dst.x + x + (dst.y + y) * page.width) * 4 + 3] = src[(sx + sy * dst.w) * 4 + 3]
          }
        }
      }


    }
  }

}

class Node {

  used: boolean = false
  right?: Node
  down?: Node


  constructor(readonly rect: Rect) {}


  find(w: number, h: number): Node | undefined {
    if (this.used) {
      let r = this.right?.find(w, h)
      if (!r) {
        return r
      }
      return this.down?.find(w, h)
    } else {
      if (w <= this.rect.w && h <= this.rect.h) {
        return this
      }
    }
  }

}
