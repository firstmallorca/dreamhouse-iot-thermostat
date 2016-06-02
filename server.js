const process = require('process');
const express = require('express');
const axios = require('axios');
const cache = require('memory-cache');
const cors = require('cors');

const port = process.env.PORT || 5000;

const ecobeeAppKey = process.env.ECOBEE_APP_KEY;

const ACCESS_TOKEN = 'access_token';
const REFRESH_TOKEN = 'refresh_token';

if (ecobeeAppKey == null) {
  console.log('You must set the ECOBEE_APP_KEY environment variable');
  process.exit(1);
}

const app = express();
app.enable('trust proxy');
app.use(cors());

function cacheAuth(authData) {
  cache.put(ACCESS_TOKEN, authData[ACCESS_TOKEN], authData['expires_in'] * 1000);
  cache.put(REFRESH_TOKEN, authData[REFRESH_TOKEN], 1000 * 60 * 60 * 24 * 365);

  return authData[ACCESS_TOKEN];
}

function thermostats(accessToken) {
  const url = 'https://api.ecobee.com/1/thermostat';

  const config = {
    params: {
      body: JSON.stringify({
        selection: {
          selectionType: 'registered',
          includeRuntime: true
        }
      })
    },
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  };

  return axios.get(url, config).then(response => response.data);
}


function updateThermostatTemp(temp, accessToken) {

  const url = 'https://api.ecobee.com/1/thermostat';

  const body = {
    selection: {
      selectionType: 'registered'
    },
    functions: [
      {
        type: 'setHold',
        params: {
          holdType: 'indefinite',
          heatHoldTemp: temp,
          coolHoldTemp: temp
        }
      }
    ]
  };

  const config = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  };

  return axios.post(url, body, config).then(response => response.data);
}

function redirectUrl(request) {
  return `${request.protocol}://${request.hostname}/_oauth`;
}

function withAccessToken(redirect, request, response, f) {
  const authUrl = `https://api.ecobee.com/authorize?response_type=code&client_id=${ecobeeAppKey}&redirect_uri=${redirectUrl(request)}&scope=smartWrite&state=${redirect}`;

  const maybeAccessToken = cache.get(ACCESS_TOKEN);
  const maybeRefreshToken = cache.get(REFRESH_TOKEN);

  if (maybeAccessToken == null) {
    if (maybeRefreshToken == null) {
      response.redirect(authUrl);
    }
    else {
      const url = 'https://api.ecobee.com/token';

      const config = {
        params: {
          grant_type: REFRESH_TOKEN,
          [REFRESH_TOKEN]: maybeRefreshToken
        }
      };

      axios.post(url, null, config)
        .then(postResponse => {
          if (postResponse.status == 200) {
            const accessToken = cacheAuth(postResponse.data);
            f(accessToken);
          }
          else {
            response.redirect(authUrl);
          }
        });
    }
  }
  else {
    f(maybeAccessToken);
  }
}

app.get('/on', (req, res) => {
  withAccessToken('/on', req, res, accessToken => {
    thermostats(accessToken).then(thermostatsJson => {
      const newTemp = Math.max(...thermostatsJson.thermostatList.map(thermostat => thermostat.runtime.actualTemperature)) + 100;
      updateThermostatTemp(newTemp, accessToken).then(updateData => {
        res.json(updateData);
      });
    });
  });
});

app.get('/off', (req, res) => {
  withAccessToken('/off', req, res, accessToken => {
    thermostats(accessToken).then(thermostatsJson => {
      const newTemp = Math.max(...thermostatsJson.thermostatList.map(thermostat => thermostat.runtime.actualTemperature)) - 100;
      updateThermostatTemp(newTemp, accessToken).then(updateData => {
        res.json(updateData);
      });
    });
  });
});

app.get('/get', (req, res) => {
  withAccessToken('/get', req, res, accessToken => {
    thermostats(accessToken).then(thermostatsJson => {
      res.json(thermostatsJson).end();
    });
  });
});

app.get('/set', (req, res) => {
  withAccessToken('/set', req, res, accessToken => {
    updateThermostatTemp(req.query.temp, accessToken).then(updateData => {
      res.json(updateData).end();
    });
  });
});

app.get('/_oauth', (req, res) => {

  const url = 'https://api.ecobee.com/token';

  const config = {
    params: {
      grant_type: 'authorization_code',
      'code': req.query.code,
      'redirect_uri': redirectUrl(req),
      'client_id': ecobeeAppKey
    }
  };

  axios.post(url, null, config)
    .then(postResponse => {
      cacheAuth(postResponse.data);
      res.redirect(req.query.state);
    });
});

app.listen(port);

console.log('Listening at: http://localhost:' + port);