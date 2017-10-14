const fs = require('fs')
const path = require('path')

function getFilePath(filename) {
  return path.join(__dirname, 'data', filename)
}

function write(obj, filename) {
  const filepath = getFilePath(filename)
  fs.writeFileSync(filepath, JSON.stringify(obj))
}

function read(filename) {
  const filepath = getFilePath(filename)
  return JSON.parse(fs.readFileSync(filepath, { encoding: 'utf-8' }))
}

module.exports = {
  write, read
}
