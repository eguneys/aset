// src/index.ts
import * as fs from "fs";

// src/aseprite.ts
import * as zlib from "zlib";
var CLayer = 0;
var CCel = 8197;
var CPalette = 8217;
var CUserData = 0;
var CFrameTags = 0;
var CSlice = 0;
function n(n2) {
  return [...Array(n2).keys()];
}
function aseprite(data) {
  let i = 0;
  function _short() {
    let res = data.readInt16LE(i);
    i += 2;
    return res;
  }
  function _byte() {
    let res = data.readUInt8(i);
    i += 1;
    return res;
  }
  function word() {
    let res = data.readUInt16LE(i);
    i += 2;
    return res;
  }
  function dword() {
    let res = data.readUInt32LE(i);
    i += 4;
    return res;
  }
  function pixel() {
    return n(4).map((_) => _byte());
  }
  function ccell() {
    let layer_index = word();
    let x = _short();
    let y = _short();
    let alpha = _byte();
    let type = word();
    let image_or_link = -1;
    n(7).map((_) => _byte());
    if (type === 0 || type === 2) {
      let width2 = word();
      let height2 = word();
      let count = width2 * height2;
      let pixels;
      if (type === 0) {
        pixels = n(count).flatMap(() => pixel());
      } else {
        pixels = [...zlib.inflateSync(data.slice(i, i + count))];
      }
      image_or_link = {
        width: width2,
        height: height2,
        pixels
      };
    } else if (type === 1) {
      image_or_link = word();
    }
    return {
      layer_index,
      x,
      y,
      alpha,
      image_or_link
    };
  }
  function cpalette() {
    let p_size = dword();
    let from = dword();
    let to = dword();
    n(8).map((_) => _byte());
    let colors = n(to - from + 1).map((_) => {
      let has_name = word();
      let color = dword();
      if (has_name & 61440) {
        let len = word();
        i += len;
      }
      return color;
    });
    return colors;
  }
  function chunk() {
    let _i = i;
    let size = dword();
    let type = word();
    let data2;
    switch (type) {
      case CLayer:
        break;
      case CCel:
        data2 = ccell();
        break;
      case CPalette:
        data2 = cpalette();
        break;
      case CUserData:
        break;
      case CFrameTags:
        break;
      case CSlice:
        break;
    }
    i = _i + size;
    return {
      size,
      type,
      data: data2
    };
  }
  function frame() {
    let _i = i;
    let nb_bytes = dword();
    let magic2 = word();
    let nb_chunks_old = word();
    let duration = word();
    n(2).map((_) => _byte());
    let nb_chunks_new = dword();
    let nb_chunks = nb_chunks_old === 65535 ? nb_chunks_new : nb_chunks_old;
    let chunks = n(nb_chunks).map((_) => chunk());
    console.log(chunks);
    i = _i + nb_bytes;
    return {
      nb_bytes,
      duration,
      nb_chunks,
      chunks
    };
  }
  let file_size = dword();
  let magic = word();
  let nb_frames = word();
  let width = word();
  let height = word();
  let c_depth = word();
  let flags = dword();
  word();
  dword();
  dword();
  _byte();
  n(3).map((_) => _byte());
  word();
  let p_width = _byte();
  let p_height = _byte();
  let grid_x = _short();
  let grid_y = _short();
  let grid_w = word();
  let grid_h = word();
  n(84).map((_) => _byte());
  let frames = n(nb_frames).map((_) => frame());
  return {
    file_size,
    nb_frames,
    width,
    height,
    c_depth,
    flags,
    frames
  };
}

// src/index.ts
var file_name = process.argv[2];
if (!file_name) {
  console.error("Usage node aseprite.js file.aseprite");
} else {
  parse(file_name, console.log);
}
function parse(file, cb) {
  fs.readFile(file, function(err, data) {
    if (err) {
      console.error(err);
      return;
    }
    cb(aseprite(data));
  });
}
