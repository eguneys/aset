import * as fs from 'fs'
import { Aseprite, aseprite } from './aseprite'
import { ImageSave } from './image'


let file_name = process.argv[2]

if (!file_name) {
  console.error("Usage node aseprite.js file.aseprite")
} else {
  parse(file_name, _ => {
    let data = new ImageSave(_.frames[0].image).png_buffer


    fs.writeFile("test.png", data, (err) => {
      console.log(err)
    })

  })
}

function parse(file: string, cb: (_: Aseprite) => void) {
  fs.readFile(file, function(err: any, data: Buffer) {
    if (err) {
      console.error(err)
      return
    }
    cb(aseprite(data))
  })
}

