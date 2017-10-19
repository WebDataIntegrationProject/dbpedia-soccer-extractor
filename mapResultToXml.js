const _ = require('lodash')
const builder = require('xmlbuilder')
const { read, writeXml } = require('./database')

const helper = require('./mappingHelpers')

const extractionResult = read('clubsWithPlayers.json')

const mapResult = _.map(extractionResult, ({
  // id,
  clubLabel,
  // founded,
  // homepage,
  // nickName,
  leagueLabel,
  countryLabel,
  cityLabel,
  groundLabel,
  capacity,
  players
}) => {
  const mappedPlayers = _.map(players, helper.mapPlayer)
  return {
    name: clubLabel || undefined,
    country: helper.mapCountry(countryLabel) || undefined,
    nameOfStadium: groundLabel || undefined,
    cityOfStadium: cityLabel || undefined,
    stadiumCapacity: capacity || undefined,
    leagueLabel: leagueLabel || undefined,
    players: mappedPlayers || undefined
  }
})

const xmlOptions = {
  version: '1.0',
  encoding: 'UTF-8'
}
const clubsElement = builder.create('clubs', xmlOptions)

_.forEach(mapResult, (club) => {
  const clubElement = clubsElement.ele('club')
  _.forEach(club, (clubValue, clubKey) => {
    if (clubKey !== 'players') {
      clubElement.ele(clubKey, clubValue)
    } else {
      const playersElement = clubElement.ele('players')
      _.forEach(club.players, (player) => {
        const playerElement = playersElement.ele('player')
        _.forEach(player, (playerValue, playerKey) => {
          playerElement.ele(playerKey, playerValue)
        })
      })
    }
  })
})

const xml = clubsElement.end({ pretty: true })

writeXml(xml, 'dbpedia.xml')
