const _ = require('lodash')
const { read, write } = require('./database')


const clubs = read('clubs.json')
const players = read('players.json')

const numbersOfPlayers = []
const clubsWithPlayers = _.forEach(clubs, (club) => {
  const clubPlayers = _.remove(players, player => player.clubId === club.id)
  club.players = clubPlayers
  numbersOfPlayers.push(clubPlayers.length)
})

console.log(`Minimum number of players: ${_.min(numbersOfPlayers)}`)
console.log(`Maximum number of players: ${_.max(numbersOfPlayers)}`)
console.log(`Mean number of players: ${_.mean(numbersOfPlayers)}`)

write(clubsWithPlayers, 'clubsWithPlayers.json')
