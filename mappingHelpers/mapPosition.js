function mapPosition(position) {
  if (!position) return null
  if (position === 'Goalkeeper (association football)') return 'GK'
  if (position === 'Defender (association football)') return 'DF'
  if (position === 'Midfielder') return 'MF'
  if (position === 'Forward (association football)') return 'FW'
  return null
}

module.exports = mapPosition
