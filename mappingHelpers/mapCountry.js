const countryCode = require('country-code')

function mapCountry(country) {
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

module.exports = mapCountry
