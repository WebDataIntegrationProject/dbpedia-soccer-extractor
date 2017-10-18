const Promise = require('bluebird')
const _ = require('lodash')
const sparql = require('sparql')

const prefixes = require('./query-components/prefixes')
const { write } = require('./database')

const client = new sparql.Client('http://dbpedia.org/sparql')

const SEPARATOR = '---'

function parseListString(listString) {
  if (!listString) return null
  const items = _.uniq(listString.split(SEPARATOR))
  if (items.length === 0 || (items.length === 1 && !items[0])) return null
  return items
}

function val(obj) {
  if (!obj || !obj.value) return null
  return obj.value
}

function getInt(str) {
  if (typeof str !== 'string') return null
  const onlyDigitsString = str.replace(/\D/g, '')
  return parseInt(onlyDigitsString, 10)
}

function getItem(array, index) {
  if (!array || !array.length || array.length < index + 1) return null
  return array[index]
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
  const query = `${prefixes}
  SELECT DISTINCT 
    ?player 
    (MAX(CONCAT(STR(?year),'${SEPARATOR}',?club,'${SEPARATOR}', STR(?numberOfMatches))) as ?yearclub) 
    (SAMPLE(?playerLabel) AS ?playerLabelSample) 
    (SAMPLE(?height) AS ?heightSample) 
    (SAMPLE(?birthDate) AS ?birthDateSample) 
    (SAMPLE(?birthPlaceLabel) AS ?birthPlaceSample) 
    (SAMPLE(?nationalityLabel) AS ?nationalitySample) 
    (SAMPLE(?givenName) AS ?givenNameSample) 
    (SAMPLE(?surname) AS ?surnameSample) 
    (SAMPLE(?gender) AS ?genderSample) 
    (SAMPLE(?positionLabel) AS ?positionSample) 
    (SAMPLE(?homepage) AS ?homepageSample) 
    WHERE {
      { 
        SELECT DISTINCT ?player 
        WHERE {
          ?player rdf:type dbo:SoccerPlayer .
        }
        LIMIT 10000 
        OFFSET ${offset}
      }
      ?player dbo:careerStation ?cs .
      OPTIONAL { 
        ?cs dbo:years ?year .
        ?cs dbo:team ?club .
        ?cs dbo:numberOfMatches ?numberOfMatches .
      }
      OPTIONAL { 
        ?player rdfs:label ?playerLabel .
        FILTER (lang(?playerLabel) = 'en') .
      }
      OPTIONAL { 
        ?player <http://dbpedia.org/ontology/Person/height> ?height .
      }
      OPTIONAL { 
        ?player dbo:birthDate ?birthDate .
        FILTER (datatype(?birthDate) = xsd:date) .
      }
      OPTIONAL { 
        ?player dbo:birthPlace ?birthPlace .
        ?birthPlace rdf:type dbo:Settlement .
        ?birthPlace rdfs:label ?birthPlaceLabel .
        FILTER (lang(?birthPlaceLabel) = 'en') .
        OPTIONAL { 
          ?birthPlace dbo:country ?nationality .
          ?nationality rdfs:label ?nationalityLabel .
          FILTER (lang(?nationalityLabel) = 'en') .
        }
      }
      OPTIONAL { 
        ?player dbo:position ?position .
        ?position rdfs:label ?positionLabel .
        FILTER (lang(?positionLabel) = 'en') .
      }
      OPTIONAL { 
        ?player foaf:givenName ?givenName .
        FILTER (lang(?givenName) = 'en') .
      }
      OPTIONAL { 
        ?player foaf:surname ?surname .
        FILTER (lang(?surname) = 'en') .
      }
      OPTIONAL { 
        ?player foaf:gender ?gender .
        FILTER (lang(?gender) = 'en') .
      }
      OPTIONAL { 
        ?player foaf:homepage ?homepage .
      }
    }
    GROUP BY ?player`

  return exec(query)
    .then(({ results: { bindings } }) => bindings)
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
      clubMembershipValidAsOf: getInt(getItem(parseListString(val(yearclub)), 0)) || null,
      clubId: getItem(parseListString(val(yearclub)), 1) || null,
      numberOfMatchesForTheCurrentClub: getInt(getItem(parseListString(val(yearclub)), 2), 10) || null,
      height: parseInt(val(heightSample), 10) || null,
      birthDate: val(birthDateSample) || null,
      birthPlace: val(birthPlaceSample) || null,
      nationality: val(nationalitySample) || null,
      givenName: val(givenNameSample) || null,
      surname: val(surnameSample) || null,
      gender: val(genderSample) || null,
      position: val(positionSample) || null,
      homepage: val(homepageSample) || null
    }))
    .then(players => _.chain(players)
      .filter(player => player.playerLabel && player.playerLabel.length > 0)
      .uniqBy('id')
      .value())
}

let promise = Promise.resolve([])

for (let i = 0; i <= 16; i += 1) {
  const offset = i * 10000
  promise = promise.then(players => getPlayers(offset)
    .then((newPlayers) => {
      console.log(`Extracted ${newPlayers.length} European players for offset ${offset}.`)
      return _.concat(players, newPlayers)
    })
    .catch(error => console.log('offset:', offset, 'error:', error)))
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
