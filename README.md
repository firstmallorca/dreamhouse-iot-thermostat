DreamHouse Thermostat
---------------------

This sample app allows you to control an Ecobee3 Smart Thermostat from the DreamHouse app.

    <TODO DEMO>

To get started you will need an [Ecobee3 Smart Thermostat](https://www.amazon.com/gp/product/B00ZIRV39M/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B00ZIRV39M&linkCode=as2&tag=jamesward-20&linkId=0708922d14ecfb1007ac2b1c24c80d3a) and either hook it to an actual HVAC or [mock HVAC](https://www.jamesward.com/2016/05/17/building-a-mock-hvac-for-smart-thermostat-demos) system.  Setup the thermostat and connect it to the internet and your Ecobee account.

Run Locally:

1. Install [ngrok](https://ngrok.com/download)
1. Start ngrok: `ngrok http 5000`
1. Create a new Developer App in the [Ecobee Developer Dashboard](https://www.ecobee.com/consumerportal/index.html#/dev) setting the *Authorization Method* to `Authorization Code` and the *Redirect Domain* to your ngrok domain.  Take note of your `API key`.
1. Start the app: `ECOBEE_APP_KEY=<YOUR ECOBEE APP KEY> npm run dev`
1. To turn on the heater (or mock heater) open: `http://<YOUR NGROK ID>.ngrok.io/on`
1. After authorizing the app your thermostat's target temperture will be raised by 10 degrees, turning the heater on.
1. To turn off the heater open: `http://<YOUR NGROK ID>.ngrok.io/off`

Run on Heroku:

1. Create a new Developer App in the [Ecobee Developer Dashboard](https://www.ecobee.com/consumerportal/index.html#/dev) setting the *Authorization Method* to `Authorization Code` and the *Redirect Domain* to a temporary domain name.  Take note of your `API key`.
1. Deploy the app: [![Deploy on Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
1. Update the *Redirect Domain* for the newly created Ecobee Developer App to the domain of your Heroku app (e.g. `foo-bar-123.herokuapp.com`)
1. Turn the heater on: `http://<YOUR HEROKU APP NAME>.herokuapp.com/on`

### App Architecture

This application uses Ecobee's OAuth API to get an access token used with the Ecobee REST APIs.  For the purposes of this demo the access token (and a refresh token) are cached in memory.  For a production app you should use more secure and mutli-user methods of handling authentication.  With an access token the current temperature is read and then the temperature is increased or decreased by 10 degrees (depending on whether the `/on` or `/off` endpoint was accessed).  This is done by making REST API calls to the [Ecobee API](https://www.ecobee.com/home/developer/api/introduction/index.shtml).  The app is built with Node.js and Express.  You can find the full source in the `server.js` file.