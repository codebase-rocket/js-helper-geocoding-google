// Info: Configuration file
'use strict';


// Export configration as key-value Map
module.exports = {

  // Base URL
  GOOGLE_GEO_CODING_BASE_URL        : 'https://maps.googleapis.com/maps/api/',


  // Errors
  GOOGLE_ERROR_CODES: {
    'OVER_QUERY_LIMIT': 'THROTTLED', // OVER_QUERY_LIMIT
    'OVER_DAILY_LIMIT': 'THROTTLED', // Billing has not been enabled on your account, OR A self-imposed usage cap has been exceeded.
    'REQUEST_DENIED': 'PROVIDER_AUTH_FAILED', // does not include an API key
    'INVALID_REQUEST': 'BAD_REQUEST', // Not Found
    'UNKNOWN_ERROR': 'UNKNOWN_FAILURE' // Server Error
  },

  // Failure Codes
  GOOGLE_FAILURE_CODES: {
    'PROVIDER_AUTH_FAILED': {
      'ii': true
    },
    'BAD_REQUEST': {
      'ii': true
    },
    'THROTTLED': {
      'ii': true
    },
    'UNKNOWN_FAILURE': {
      'ii': true
    }
  }

}
