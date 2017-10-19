const checkDate = require('./checkDate')
const mapCountry = require('./mapCountry')
const mapPosition = require('./mapPosition')
const mapYearToDate = require('./mapYearToDate')

function mapPlayer({
  // id,
  playerLabel,
  clubMembershipValidAsOf,
  // clubId,
  // numberOfMatchesForTheCurrentClub,
  height,
  birthDate,
  birthPlace,
  nationality,
  // givenName,
  // surname,
  // gender,
  position,
  // homepage
}) {
  return {
    fullName: playerLabel || undefined,
    birthDate: checkDate(birthDate) || undefined,
    birthplace: birthPlace || undefined,
    nationality: mapCountry(nationality) || undefined,
    height: height || undefined,
    weight: undefined,
    shirtNumberOfClub: undefined,
    shirtNumberOfNationalTeam: undefined,
    position: mapPosition(position) || undefined,
    preferredFoot: undefined,
    caps64: undefined,
    isInNationalTeam: undefined,
    clubMembershipValidAsOf: mapYearToDate(clubMembershipValidAsOf) || undefined
  }
}

module.exports = mapPlayer
