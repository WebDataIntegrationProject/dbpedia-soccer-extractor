const _ = require('lodash')
const { read, write } = require('./database')


const clubIds = _.chain(read('clubs.json'))
  .map((club) => club.id)
  .value()


const players = _.chain(read(`players_unfiltered.json`))
  .filter((player) => _.includes(clubIds, player.clubId))
  .value()

console.log('Players length:', players.length)

write(players, `players.json`)
