const fs = require('fs')
const Parser = require('binary-parser').Parser

let aseprite_file = new Parser()
  .endianness("little")
  .uint32('file_size')
  .uint16('magic')
  .uint16('frames')
  .uint16('width')
  .uint16('height')
  .uint16('color_depth')
  .uint32('flags')
  .uint16('_')
  .uint32('_')
  .uint32('_')
  .uint8('_')
  .array('_', { type: 'uint8', length: 3 })
  .uint16('nb_colors')
  .uint8('pixel_width')
  .uint8('pixel_height')
  .int16('grid_x')
  .int16('grid_y')
  .uint16('grid_w')
  .uint16('grid_h')
  .array('_', { type: 'uint8', length: 84 })



function parse(file, cb) {
  fs.readFile(file, function(err, data) {
    if (err) {
      console.error(err)
      return
    }
    cb(aseprite_file.parse(data))
  })
}

let file_name = process.argv[2]

if (!file_name) {
  console.error("Usage node aseprite.js file.aseprite")
} else {
  parse(file_name, console.log)
}
