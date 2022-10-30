import * as fs from 'fs'
import { Aseprite, aseprite } from './aseprite'


let file_name = process.argv[2]

if (!file_name) {
  console.error("Usage node aseprite.js file.aseprite")
} else {
  parse(file_name, console.log)
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

