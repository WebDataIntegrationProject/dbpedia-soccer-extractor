const _ = require('lodash')
const { read } = require('./database')

const filename = process.argv[2]
const size = parseInt(process.argv[3], 10)

const data = read(filename)
console.log(_.sampleSize(data, size))
