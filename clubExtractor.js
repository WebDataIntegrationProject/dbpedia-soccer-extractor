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

function exec(querystring) {
  return new Promise((resolve, reject) => {
    client.query(querystring, (error, response) => {
      if (error) reject(error)
      else resolve(response)
    })
  })
}

function getClubs() {
  const queryClubs = prefixes +
  'SELECT DISTINCT \n' +
    '?club \n' +
    '(SAMPLE(?clubLabel) AS ?clubLabelSample) \n' +
    '(SAMPLE(?founded) AS ?foundedSample) \n' +
    '(SAMPLE(?homepage) AS ?homepageSample) \n' +
    '(SAMPLE(?leagueLabel) AS ?leagueLabelSample) \n' +
    '(SAMPLE(?countryLabel) AS ?countryLabelSample) \n' +
    '(SAMPLE(?cityLabel) AS ?cityLabelSample) \n' +
    '(SAMPLE(?capacity) AS ?capacityMax) \n' +
    '(SAMPLE(?nickName) AS ?nickNameSample) \n' +
    '(SAMPLE(?groundLabel) AS ?groundSample) \n' +
    'WHERE {\n' +
      '?club rdf:type dbo:SoccerClub ;\n' +
            'dct:subject ?football_clubs_in_country .\n' +      
      'OPTIONAL { \n' +
        '?club rdfs:label ?clubLabel .\n' +
        'FILTER (lang(?clubLabel) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?club dbp:founded ?founded .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?club foaf:homepage ?homepage .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?club foaf:nick ?nickName .\n' +
        'FILTER (lang(?nickName) = \'en\') .\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?club dbo:league ?league .\n' +
        '?league rdfs:label ?leagueLabel .\n' +
        'FILTER (lang(?leagueLabel) = \'en\') .\n' +
        'OPTIONAL { \n' +
          '?league dbo:country ?country .\n' +
          '?country rdfs:label ?countryLabel .\n' +
          'FILTER (lang(?countryLabel) = \'en\') .\n' +
        '}\n' +
      '}\n' +
      'OPTIONAL { \n' +
        '?club dbo:ground ?ground .\n' +
        '?ground rdf:type dbo:ArchitecturalStructure .\n' +
        '?ground rdfs:label ?groundLabel .\n' +
        'FILTER (lang(?groundLabel) = \'en\') .\n' +
        'OPTIONAL { \n' +
          '?ground dbo:location ?city .\n' +
          '?city rdf:type dbo:Settlement .\n' +
          '?city rdfs:label ?cityLabel .\n' +
          'FILTER (lang(?cityLabel) = \'en\') .\n' +
        '}\n' +
        'OPTIONAL { \n' +
          '?ground dbp:seatingCapacity ?capacity .\n' +
        '}\n' +
      '}\n' +
      europeClubFilter +
    '}\n' +
    'GROUP BY ?club'

  return exec(queryClubs)
    .then(({ results: { bindings }}) => bindings)
    .map(({
      club,
      clubLabelSample,
      foundedSample,
      homepageSample,
      nickNameSample,
      leagueLabelSample,
      groundSample,
      countryLabelSample,
      cityLabelSample,
      capacityMax
    }) => ({
      id: val(club),
      clubLabel: val(clubLabelSample) || null,
      founded: getInt(val(foundedSample)) || null,
      homepage: val(homepageSample) || null,
      nickName: val(nickNameSample) || null,
      leagueLabel: val(leagueLabelSample) || null,
      countryLabel: translateCountry(val(countryLabelSample)) || null,
      cityLabel: val(cityLabelSample) || null,
      groundLabel: val(groundSample) || null,
      capacity: getInt(val(capacityMax)) || null
    }))
    .then((clubs) => {
      return _.uniqBy(clubs, 'id')
    })
}

getClubs()
  .then((clubs) => {
    console.log(`Extracted ${clubs.length} European clubs.`)
    write(clubs, 'clubs.json')
  })
  .catch(error => console.log(error))
