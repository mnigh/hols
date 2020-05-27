const Sugar = require('sugar-date')
const easterDay = require('@jsbits/easter-day')
const format = require('date-fns/format')
const addDays = require('date-fns/addDays')
const addMinutes = require('date-fns/addMinutes')
const getISODay = require('date-fns/getISODay')
const differenceInDays = require('date-fns/differenceInDays')
const startOfDay = require('date-fns/startOfDay')
const formatDistance = require('date-fns/formatDistance')

const _getISODayInt = (weekday) => {
  if (weekday === 'Monday') {
    return 1
  }

  if (weekday === 'Tuesday') {
    return 2
  }

  if (weekday === 'Friday') {
    return 5
  }

  throw new Error(`Weekday not parsable: ${weekday}`)
}

const _getBeforePosition = ({ weekdayInt, anchorDate }) => {
  let count = -1

  // addDays to the current anchorDay until the day of the week matches
  while (weekdayInt !== getISODay(addDays(anchorDate, count))) {
    count--
  }

  return count
}

const _getAfterPosition = ({ weekdayInt, anchorDate }) => {
  let count = 1

  // addDays to the current anchorDay until the day of the week matches
  while (weekdayInt !== getISODay(addDays(anchorDate, count))) {
    count++
  }

  return count
}

const _getDayCount = ({ position, weekday, anchorDate }) => {
  const weekdayInt = _getISODayInt(weekday)
  let before = _getBeforePosition({ weekdayInt, anchorDate })
  let after = _getAfterPosition({ weekdayInt, anchorDate })

  switch (position) {
    case 'before':
      return before
    case 'after':
      return after
    case 'near':
      if (before === -7) {
        return 0
      }
      return Math.abs(before) <= after ? before : after
    default:
      throw new Error(`Date string position not parsable: ${position}`)
  }
}

const _parseRelativeDates = (dateString) => {
  let [weekday, position, ...anchorDate] = dateString.split(' ')

  let year = anchorDate[anchorDate.length - 1]
  anchorDate = anchorDate.join(' ')

  if (anchorDate.includes('Easter')) {
    anchorDate = easterDay(year)
  } else {
    anchorDate = Sugar.Date.create(anchorDate)
  }

  const count = _getDayCount({ position, weekday, anchorDate })
  return addDays(anchorDate, count)
}

// returns a Date object
const _getDate = (dateString, year) => {
  let date
  dateString = `${dateString} ${year}`

  if (/First|Second|Third|Fourth/i.test(dateString)) {
    dateString = `The ${dateString}`
  }

  if (/before|after|near/i.test(dateString)) {
    date = _parseRelativeDates(dateString)
  } else {
    date = Sugar.Date.create(dateString)
  }

  // Test for invalid dates
  if (isNaN(date)) {
    throw new Error(`Date string not parsable: ${dateString}`)
  }

  return date
}

const getLiteralDate = (dateString, year = new Date(Date.now()).getUTCFullYear()) => {
  const endsWithNumber = !!parseInt(dateString.slice(-2))
  dateString =
    endsWithNumber && !/May/i.test(dateString)
      ? dateString.split(' ').slice(-2).join(' ')
      : dateString

  return _getDate(dateString, year).toISOString().substring(0, 10)
}

const getObservedDate = (dateString, year = new Date(Date.now()).getUTCFullYear()) => {
  let date = _getDate(dateString, year)

  // If Boxing Day is on a Sunday or Monday, move to Tuesday (Christmas will be Monday)
  if ([1, 7].includes(getISODay(date)) && /December 26/i.test(dateString)) {
    date = _parseRelativeDates(`Tuesday after ${dateString} ${year}`)
  }

  // If it lands on a Saturday or Sunday (and not National Aboriginal Day) move to Monday
  if ([6, 7].includes(getISODay(date)) && !/June 21/i.test(dateString)) {
    date = _parseRelativeDates(`Monday after ${dateString} ${year}`)
  }

  return date.toISOString().substring(0, 10)
}

// 60 minutes * 24 hours = 1440
const getDateBeforeMidnightFromString = (str) => addMinutes(new Date(str), 1439)

const space2Nbsp = (str) => str.replace(/ /g, ' ')

const displayDate = (dateString, weekday = false) => {
  dateString = getDateBeforeMidnightFromString(dateString)
  let msg = space2Nbsp(format(dateString, 'MMMM d'))

  return weekday ? `${msg}, ${format(dateString, 'EEEE')}` : msg
}

const relativeDate = (dateString) => {
  const daysOffset = differenceInDays(
    startOfDay(new Date(Date.now())),
    getDateBeforeMidnightFromString(dateString),
  )

  switch (daysOffset) {
    case 0:
      return 'That’s today!'
    case -1:
      return 'That’s tomorrow!'
    default:
      return `That’s in ${formatDistance(
        getDateBeforeMidnightFromString(dateString),
        new Date(Date.now()),
      )}`
  }
}

module.exports = { getLiteralDate, getObservedDate, displayDate, relativeDate }
