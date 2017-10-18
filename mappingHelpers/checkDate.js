function checkDate(date) {
  if (!date || date.length !== 10) return null
  return date
}

module.exports = checkDate
