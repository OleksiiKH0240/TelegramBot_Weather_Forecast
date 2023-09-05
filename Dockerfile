FROM node:20.4.0-alpine


WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . ./

CMD [ "node", "TelegramBot_weather_forecast.js" ]