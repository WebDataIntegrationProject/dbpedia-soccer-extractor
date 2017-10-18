const _ = require('lodash')
const { read, write } = require('./database')

const extractionResult = read('clubsWithPlayers.json')

const mapResult = _.map(extractionResult, (club) => {
  const mappedPlayers = _.map(club.players, mapPlayer)
  return {
    // other stuff //
    players: mappedPlayers
  }
})

function mapPlayer({
  id,
  playerLabel,
  clubMembershipValidAsOf,
  clubId,
  numberOfMatchesForTheCurrentClub,
  height,
  birthDate,
  birthPlace,
  nationality,
  givenName,
  surname,
  gender,
  position,
  homepage
}) {
  return {
    fullName,
    birthDate,
    birthplace,
    nationality,
    height,
    weight,
    shirtNumberOfClub: undefined,
    shirtNumberOfNationalTeam: undefined,
    position,
    preferredFoot,
    caps64,
    isInNationalTeam,
    clubMembershipValidAsOf
  }
}
