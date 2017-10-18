function mapYearToDate(year) {
  if (!year || year < 1700 || year > 2020) return null
  return `${year}-01-01`
}

module.exports = mapYearToDate
