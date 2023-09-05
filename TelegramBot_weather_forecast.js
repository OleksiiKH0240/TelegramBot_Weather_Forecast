import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';


// @ferusBestia_test_bot
// const token = "6317463778:AAHFNnvwQP3RRqE5tKdG1ww45vRIyiM4qhg";

// @ferusBestia_weather_forecast_bot
const token = process.env.ferusBestia_weather_forecast_bot_token
const bot = new TelegramBot(token, { polling: true });
let city, frequency;

// bot.on("message", (msg) => { bot.sendMessage(msg.chat.id, msg.text); })

const cityKeyboard = {
    'reply_markup': {
        'keyboard': [['Kyiv', 'Dnipro']],
        'resize_keybord': true,
        'one_time_keyboard': false,
        'force_reply': true
    }
}

const frequencyKeyboard = {
    'reply_markup': {
        'keyboard': [['Each three hours', 'Each six hours']],
        'resize_keybord': true,
        'one_time_keyboard': false,
        'force_reply': true
    }
}

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `hello ${msg.from.first_name}, choose city`, cityKeyboard)
})

bot.onText(/Kyiv|Dnipro/, (msg) => {
    if (msg.text == "Kyiv") {
        city = "Kyiv";
    } else {
        city = "Dnipro";
    }

    bot.sendMessage(msg.chat.id, "choose frequency of weather forecast", frequencyKeyboard)
});

bot.onText(/Each three hours|Each six hours/, async (msg) => {
    let partRes;
    if (msg.text == "Each three hours") {
        partRes = await getWeatherForecast(3);
    } else {
        partRes = await getWeatherForecast(6);
    }
    partRes.forecasts = partRes.forecasts.map(pretifyForecast);
    const dailyWeatherForecast = makeDailyWeatherForecast(partRes);
    bot.sendMessage(msg.chat.id, dailyWeatherForecast, cityKeyboard)
});

console.log("bot is waiting for your messages ");




// const kyivCoords = {latitude: 50.4500336, longitude: 30.5241361};
// const dniproCoords = {latitude: 48.4680221, longitude: 35.0417711};

const url = "http://api.openweathermap.org/data/2.5/forecast?units=metric&appid=d952dc06c989b061f50cf16bf2ef9204&q=Kyiv,804"

async function getWeatherForecast(eachNHours = 3) {
    const response = await axios.get(url);
    const weatherForecast = {
        city_name: response.data.city.name, forecasts: response.data.list.map((forecast) => {
            return {
                dt: forecast.dt,
                dt_hours: (new Date(forecast.dt * 1000)).getUTCHours(),
                dt_txt: forecast.dt_txt,
                temp: forecast.main.temp,
                feels_like: forecast.main.feels_like,
                weather: forecast.weather[0].description
            };
        }).filter((value) => (value.dt_hours % eachNHours) == 0)
    };
    return weatherForecast;
};

// console.log(await getWeatherForecast(6));
function pretifyForecast(forecast) {
    const date = (new Date(forecast.dt * 1000));
    const pretyForecast = {};
    pretyForecast.pretyDt = date.toUTCString().split(" ").slice(0, 3).join(" ");

    let pretifyTemp = (temp) => {
        temp = Math.round(temp);
        let sign = temp > 0 ? "+" : "-";
        sign = temp == 0 ? "" : sign;
        return sign + `${temp}°C`;
    };

    // UTCString = 'Sun, 10 Sep 2023 00:00:00 GMT'
    const time = date.toUTCString().split(" ").slice(4, 5)[0].slice(0, -3),
        temp = pretifyTemp(forecast.temp), feels_like = pretifyTemp(forecast.feels_like);

    const pretyWeather = `${time}, ${temp}, feels like: ${feels_like}, ${forecast.weather}`;
    pretyForecast.pretyWeather = pretyWeather;

    return pretyForecast;
}

function makeDailyWeatherForecast(weatherForecast) {
    let dailyWeatherForecast = `Weather in ${weatherForecast.city_name}:\n\n`;

    let currDate, prevDate = weatherForecast.forecasts[0].pretyDt;

    dailyWeatherForecast += prevDate + ":\n";
    dailyWeatherForecast += "\t" + weatherForecast.forecasts[0].pretyWeather + "\n";

    for (const forecast of weatherForecast.forecasts.slice(1)) {
        currDate = forecast.pretyDt;
        if (currDate != prevDate) {
            dailyWeatherForecast += "\n" + currDate + ":\n";
        }
        dailyWeatherForecast += "\t" + forecast.pretyWeather + "\n";

        prevDate = currDate;
    }
    return dailyWeatherForecast;
}


// dt_txt: '2023-09-10 00:00:00'
let forecast = {
    dt: 1694304000,
    dt_hours: 0,
    dt_txt: '2023-09-10 00:00:00',
    temp: 14.64,
    feels_like: 13.33,
    weather: 'broken clouds'
};

// let partRes = await getWeatherForecast();
// partRes.forecasts = partRes.forecasts.map(pretifyForecast);
// let res = makeDailyWeatherForecast(partRes);
// console.log(res);

// console.log(pretifyForecast(forecast));
