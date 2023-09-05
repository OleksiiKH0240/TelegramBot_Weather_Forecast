FROM node:20.4.0-alpine

ENV ferusBestia_weather_forecast_bot_token="6450401021:AAHflcWAsNDgEGg9pLCPu1jq9mohqRIsyyI"

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . ./

CMD [ "node", "TelegramBot_weather_forecast.js" ]