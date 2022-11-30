import fs from 'fs'
import { aseprite, Packer } from '../dist/index.js'

let in_file = './data/many'

let packer = new Packer(1)
let packs = []

await ase_files(in_file).then(_ => _.map(({ name, ase}) => {

  packs.push(...ase.frames.map(frame => packer.add(frame.image)))
}))

packer.pack()

fs.writeFileSync('./data/out_0.png', packer.pages[0].png_buffer)
fs.writeFileSync('./data/out_0.json', JSON.stringify(packs.map(_ => ({ frame: _.frame, packed: _.packed }))))


function ase_files(folder) {
  return new Promise(resolve => {
    fs.readdir(folder, (err, files) => {
      Promise.all(files.filter(_ => _.match(/\.ase$/))
        .map(file => new Promise(_resolve => {
          fs.readFile([folder, file].join('/'), (err, data) => {
            if (err) {
              console.error(err)
              return
            }
            let name = file.split('.')[0]
            _resolve({ name, ase: aseprite(data)})
          })
        }))).then(resolve)

    })
  })
}
