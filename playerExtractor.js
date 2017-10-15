const Promise = require('bluebird')
const _ = require('lodash')
const countryCode = require('country-code')
const sparql = require('sparql')

const prefixes = require('./query-components/prefixes')
const europeClubFilter = require('./query-components/europeClubFilter')
const { read, write } = require('./database')

const client = new sparql.Client('http://dbpedia.org/sparql')

const SEPARATOR = '---'

function parseListString(listString) {
  if (!listString) return null
  items = _.uniq(listString.split(SEPARATOR))
  if (items.length === 0 || (items.length === 1 && !items[0])){
    return null
  }
  return items
}

function val(obj) {
  if (!obj || !obj.value) return null
  return obj.value
}

function getInt(str) {
  if (typeof(str) !== 'string') return null
  const onlyDigitsString = str.replace(/\D/g, '')
  return parseInt(onlyDigitsString, 10)
}

function translateCountry(country) {
  if (!country) return null
  if (country === 'Russian Federation') {
    country = 'Russia'
  }
  if (_.includes(['Scotland', 'Wales', 'England', 'North Ireland'], country)) {
    country = 'United Kingdom'
  }
  if (country === 'Republic of Macedonia') {
    country = 'Macedonia, Republic of'
  }
  const codeObj = countryCode.find({ name: country })
  if (codeObj) return codeObj.alpha2
  return null
}

function translatePosition(position) {
  if (!position) return null
  if (position === 'Goalkeeper (association football)') return 'GK'
  if (position === 'Defender (association football)') return 'DF'
  if (position === 'Midfielder') return 'MF'
  if (position === 'Forward (association football)') return 'FW'
  return null
}

function getItem(array, index) {
  if (!array || !array.length || array.length < index + 1) return null
  return array[index]
}

function yearToDate(year) {
  if (!year || year < 1700 || year > 2020) return null
  return `${year}-01-01`
}

function checkDate(date) {
  if (!date || date.length !== 10) return null
  return date
}

function exec(querystring) {
  return new Promise((resolve, reject) => {
    client.query(querystring, (error, response) => {
      if (error) reject(error)
      else resolve(response)
    })
  })
}

function getPlayers(offset) {
  const query = prefixes +
  'SELECT DISTINCT \n' +
    '?player \n' +
    '(MAX(CONCAT(STR(?year),\'' + SEPARATOR + '\',?club,\'' + SEPARATOR + '\', STR(?numberOfMatches))) as ?yearclub) \n' +
    '(SAMPLE(?playerLabel) AS ?playerLabelSample) \n' +
    '(SAMPLE(?height) AS ?heightSample) \n' +
    '(SAMPLE(?birthDate) AS ?birthDateSample) \n' +
    '(SAMPLE(?birthPlaceLabel) AS ?birthPlaceSample) \n' +
    '(SAMPLE(?nationalityLabel) AS ?nationalitySample) \n' +
    '(SAMPLE(?givenName) AS ?givenNameSample) \n' +
    '(SAMPLE(?surname) AS ?surnameSample) \n' +
    '(SAMPLE(?gender) AS ?genderSample) \n' +
    '(SAMPLE(?positionLabel) AS ?positionSample) \n' +
    '(SAMPLE(?homepage) AS ?homepageSample) \n' +
    'WHERE {\n' +
      '{ \n' +
        'SELECT DISTINCT ?player \n' +
        'WHERE {\n' +
          '?player rdf:type dbo:SoccerPlayer .\n' +
        '}\n' +
        'LIMIT 10000 \n' +
        'OFFSET ' + offset + '\n' +
      '}\n' +
      '?player dbo:careerStation ?cs .\n' +
      'OPTIONAL { \n' +
        '?cs dbo:years ?year .\n' +
        '?cs dbo:team ?club .\n' +
        '?cs dbo:numberOfMatches ?numberOfMatches .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player rdfs:label ?playerLabel .\n' +
        'FILTER (lang(?playerLabel) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player <http://dbpedia.org/ontology/Person/height> ?height .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player dbo:birthDate ?birthDate .\n' +
        'FILTER (datatype(?birthDate) = xsd:date) .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player dbo:birthPlace ?birthPlace .\n' +
        '?birthPlace rdf:type dbo:Settlement .\n' +
        '?birthPlace rdfs:label ?birthPlaceLabel .\n' +
        'FILTER (lang(?birthPlaceLabel) = \'en\') .\n' +
        'OPTIONAL { \n' +
          '?birthPlace dbo:country ?nationality .\n' +
          '?nationality rdfs:label ?nationalityLabel .\n' +
          'FILTER (lang(?nationalityLabel) = \'en\') .\n' +
        '}\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player dbo:position ?position .\n' +
        '?position rdfs:label ?positionLabel .\n' +
        'FILTER (lang(?positionLabel) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player foaf:givenName ?givenName .\n' +
        'FILTER (lang(?givenName) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player foaf:surname ?surname .\n' +
        'FILTER (lang(?surname) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player foaf:gender ?gender .\n' +
        'FILTER (lang(?gender) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?player foaf:homepage ?homepage .\n' +
      '}\n' +
    '}\n' +
    'GROUP BY ?player'

  return exec(query)
    .then(({ results: { bindings }}) => bindings)
    .map(({
      player,
      playerLabelSample,
      yearclub,
      heightSample,
      birthDateSample,
      birthPlaceSample,
      nationalitySample,
      givenNameSample,
      surnameSample,
      genderSample,
      positionSample,
      homepageSample
    }) => ({
      id: val(player),
      playerLabel: val(playerLabelSample) || null,
      clubMembershipValidAsOf: checkDate(yearToDate(getInt(getItem(parseListString(val(yearclub)), 0)))) || null,
      clubId: getItem(parseListString(val(yearclub)), 1) || null,
      numberOfMatchesForTheCurrentClub: getInt(getItem(parseListString(val(yearclub)), 2), 10) || null,
      height: parseInt(val(heightSample), 10) || null,
      birthDate: checkDate(val(birthDateSample)) || null,
      birthPlace: val(birthPlaceSample) || null,
      nationality: translateCountry(val(nationalitySample)) || null,
      givenName: val(givenNameSample) || null,
      surname: val(surnameSample) || null,
      gender: val(genderSample) || null,
      position: translatePosition(val(positionSample)) || null,
      homepage: val(homepageSample) || null
    }))
    .then((players) => {
      return _.chain(players)
       .filter(player => player.playerLabel && player.playerLabel.length > 0)
       .uniqBy('id')
       .value()
    })
}

let promise = Promise.resolve([])

for (i = 0; i <= 16; i++) {
  const offset = i * 10000
  promise = promise.then((players) => {
    return getPlayers(offset)
      .then((newPlayers) => {
        console.log(`Extracted ${newPlayers.length} European players for offset ${offset}.`)
        return _.concat(players, newPlayers)
      })
      .catch(error => console.log('offset:', offset, 'error:', error))
  })
}

promise.then((players) => {
  console.log(`Extracted ${players.length} European players in total.`)
  write(players, 'players_unfiltered.json')
})

// getPlayers(0)
//   .then((players) => {
//     console.log(`Extracted ${players.length} European players.`)
//     console.log(players)
//     // write(players, 'players120-130.json')
//   })
//   .catch(error => console.log(error))
