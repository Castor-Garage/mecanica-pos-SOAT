'use strict'

// Full config reference: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/nodejs-agent-configuration/
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME ?? 'mecanica-castor-garage'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL ?? 'info',
  },
  allow_all_headers: true,
  attributes: {
    // never send bearer tokens / session cookies to New Relic
    exclude: ['request.headers.authorization', 'request.headers.cookie', 'response.headers.set-cookie*'],
  },
}
