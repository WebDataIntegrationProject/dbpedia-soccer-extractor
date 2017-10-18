const Promise = require('bluebird')
const _ = require('lodash')
const sparql = require('sparql')

const prefixes = require('./query-components/prefixes')
const europeClubFilter = require('./query-components/europeClubFilter')
const { write } = require('./database')

const client = new sparql.Client('http://dbpedia.org/sparql')

function val(obj) {
  if (!obj || !obj.value) return null
  return obj.value
}

function getInt(str) {
  if (typeof str !== 'string') return null
  const onlyDigitsString = str.replace(/\D/g, '')
  return parseInt(onlyDigitsString, 10)
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
  const queryClubs = `${prefixes}
  SELECT DISTINCT 
    ?club 
    (SAMPLE(?clubLabel) AS ?clubLabelSample) 
    (SAMPLE(?founded) AS ?foundedSample) 
    (SAMPLE(?homepage) AS ?homepageSample) 
    (SAMPLE(?leagueLabel) AS ?leagueLabelSample) 
    (SAMPLE(?countryLabel) AS ?countryLabelSample) 
    (SAMPLE(?cityLabel) AS ?cityLabelSample) 
    (SAMPLE(?capacity) AS ?capacityMax) 
    (SAMPLE(?nickName) AS ?nickNameSample) 
    (SAMPLE(?groundLabel) AS ?groundSample) 
    WHERE {
      ?club rdf:type dbo:SoccerClub ;
            dct:subject ?football_clubs_in_country .
      OPTIONAL { 
        ?club rdfs:label ?clubLabel .
        FILTER (lang(?clubLabel) = 'en') .
      }
      OPTIONAL { 
        ?club dbp:founded ?founded .
      }
      OPTIONAL { 
        ?club foaf:homepage ?homepage .
      }
      OPTIONAL { 
        ?club foaf:nick ?nickName .
        FILTER (lang(?nickName) = 'en') .
      }
      OPTIONAL { 
        ?club dbo:league ?league .
        ?league rdfs:label ?leagueLabel .
        FILTER (lang(?leagueLabel) = 'en') .
        OPTIONAL { 
          ?league dbo:country ?country .
          ?country rdfs:label ?countryLabel .
          FILTER (lang(?countryLabel) = 'en') .
        }
      }
      OPTIONAL { 
        ?club dbo:ground ?ground .
        ?ground rdf:type dbo:ArchitecturalStructure .
        ?ground rdfs:label ?groundLabel .
        FILTER (lang(?groundLabel) = 'en') .
        OPTIONAL { 
          ?ground dbo:location ?city .
          ?city rdf:type dbo:Settlement .
          ?city rdfs:label ?cityLabel .
          FILTER (lang(?cityLabel) = 'en') .
        }
        OPTIONAL { 
          ?ground dbp:seatingCapacity ?capacity .
        }
      }
      ${europeClubFilter}
    }
    GROUP BY ?club`

  return exec(queryClubs)
    .then(({ results: { bindings } }) => bindings)
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
      countryLabel: val(countryLabelSample) || null,
      cityLabel: val(cityLabelSample) || null,
      groundLabel: val(groundSample) || null,
      capacity: getInt(val(capacityMax)) || null
    }))
    .then(clubs => _.uniqBy(clubs, 'id'))
}

getClubs()
  .then((clubs) => {
    console.log(`Extracted ${clubs.length} European clubs.`)
    write(clubs, 'clubs.json')
  })
  .catch(error => console.log(error))
