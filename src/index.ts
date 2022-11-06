import * as fs from 'fs'
import { Slice, Tag, Aseprite, aseprite } from './aseprite'
import { ImageSave } from './image'
import { Packer, Entry } from './packer'


let folder_name = process.argv[2]
let out_prefix = process.argv[3]

let packer = new Packer()

if (!folder_name || !out_prefix) {
  console.error("Usage: aset folder out_prefix")
} else {

  fs.readdir(folder_name, (err, files) => {
    if (err) {
      console.error("Usage: aset folder out_prefix")
      return
    }

    Promise.all(files.filter(_ => _.match(/\.ase$/))
                .map(_ => parse(folder_name + '/' + _).then(aseprite => pack(aseprite, _)))).then(pack_end)
  })
}

function pack_end(packs: Array<{name: string, slices: Array<Slice>, tags: Array<Tag>, packs: Array<Entry>}>) {

  packer.pack()


  let res = packs.map(({name, packs, tags, slices })=> {

    let frame = packs[0].frame

    let packeds = packs.map(_ => _.packed)

    return {
      name, 
      slices: slices.map(_ => [
        _.frame,
        _.origin.x,
        _.origin.y,
        _.width,
        _.height,
        _.pivot?.x,
        _.pivot?.y
      ]),
      tags: tags.map(_ => [
        _.from,
        _.to,
        _.name
      ]),
      frame: [
        frame.x,
        frame.y,
        frame.w,
        frame.h
      ], 
      packeds: packeds.flatMap(_ => [
        _.x,
        _.y,
        _.w,
        _.h
      ])
    }
  })

  let dst = out_prefix + '_0.png'
  fs.writeFile(dst,
               packer.pages[0].png_buffer, (err) => {
                 if (err) {
                   console.error(err)
                 } else {
                   console.log(`${dst}`)
                 }
               })

  let dst_json = out_prefix + '_0.json'
  fs.writeFile(dst_json,
               JSON.stringify(res), (err) => {
                 if (err) {
                   console.error(err)
                 } else {
                   console.log(`${dst_json}`)
                 }
               })

}

function pack(aseprite: Aseprite, name: string) {

  return {
    name: name.split('.')[0],
    packs: aseprite.frames.map(frame => packer.add(frame.image)).filter(Boolean) as Array<Entry>,
    tags: aseprite.tags,
    slices: aseprite.slices
  }
}

function parse(file: string): Promise<Aseprite> {
  return new Promise(resolve =>
  fs.readFile(file, function(err: any, data: Buffer) {
    if (err) {
      console.error(err)
      return
    }
    resolve(aseprite(data))
  }))
}

