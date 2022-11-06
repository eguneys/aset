import * as fs from 'fs'
import { Slice, Tag, Aseprite, aseprite } from './aseprite'
import { ImageSave } from './image'
import { Packer, Entry } from './packer'

export type PackInfo = {
  folder_name: string, 
  name: string, 
  slices: Array<Slice>, 
  tags: Array<Tag>, 
  packs: Array<Entry>
}

export default function(folders: Array<string>, out_prefix: string) {
  let packer = new Packer()

  Promise.all(folders.map(folder_name => {
    return new Promise<Array<PackInfo>>(resolve =>
  fs.readdir(folder_name, (err, files) => {
    if (err) {
      throw err
      return
    }

    Promise.all(files.filter(_ => _.match(/\.ase$/))
                .map(_ => parse(folder_name + '/' + _).then(aseprite => pack(aseprite, _, folder_name)))).then(resolve)

  }))
  })).then(res => {
    pack_end(res.flat())
  })


  function pack_end(packs: Array<PackInfo>) {

    packer.pack()


    let res = packs.map(({folder_name, name, packs, tags, slices })=> {

      let frame = packs[0].frame

      let packeds = packs.map(_ => _.packed)

      return {
        folder: folder_name,
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

  function pack(aseprite: Aseprite, name: string, folder_name: string) {

    return {
      folder_name,
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
}
