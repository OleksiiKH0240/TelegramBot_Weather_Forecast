import axios from 'axios';
import TelegramBot from 'node-telegram-bot-api';
import express from 'express'
import http from 'http'


// const server = net.createServer((socket) => {
//     socket.write("Hello Bot!");
//     socket.on('data', (chunk)=>{
//         console.log(`server recieved '${chunk}' from client.`)
//         socket.write(chunk);
//     })
// })

// server.listen(80, "localhost");


// self pinging to prevent switching to sleep mode
const app = express();
const server = http.createServer(app);
app.get("/", (req, res) => {
    res.send("<h1>Hello Bot!</h1>");
    console.log("recieved GET request from client")
});

server.listen(80, "0.0.0.0", () => { console.log("server is listening on *:80") })


const requestLoop = setInterval(async () => {
    console.log("\nsending GET request to server...");
    try {
        const url = process.env.botUrl || "http://0.0.0.0:80";
        const response = await axios.get(url);
        console.log(`server response status: ${response.status}\n`);
    } catch (error) {
        console.log("got an error: " + error);
    }
}, 120000);

// clearInterval(requestLoop);



// @ferusBestia_test_bot
// const token = "6317463778:AAHFNnvwQP3RRqE5tKdG1ww45vRIyiM4qhg";

// @ferusBestia_weather_forecast_bot
const token = process.env.ferusBestia_weather_forecast_bot_token;

const bot = new TelegramBot(token, { polling: true, });


let cityName = "Kyiv", frequency;

// bot.on("message", (msg) => { bot.sendMessage(msg.chat.id, msg.text); })


const startKeyboard = {
    'reply_markup': {
        'keyboard': [['Weather', 'Currency rate']],
        'resize_keybord': true,
        'one_time_keyboard': false,
        'force_reply': true
    }
}

const currencyKeyboard = {
    'reply_markup': {
        'keyboard': [['USD', 'EUR'], ['Previous menu']],
        'resize_keybord': true,
        'one_time_keyboard': false,
        'force_reply': true
    }
}

const cityKeyboard = {
    'reply_markup': {
        'keyboard': [['Kyiv', 'Dnipro'], ['Previous menu']],
        'resize_keybord': true,
        'one_time_keyboard': false,
        'force_reply': true
    }
}

const frequencyKeyboard = {
    'reply_markup': {
        'keyboard': [['Each three hours', 'Each six hours'], ['Previous menu']],
        'resize_keybord': true,
        'one_time_keyboard': false,
        'force_reply': true
    }
}

const states = {
    start: {
        keyboard: startKeyboard,
        message: "Would you like to know about weather or currency rate?"
    },
    currency: {
        keyboard: currencyKeyboard,
        message: "Choose the currency which rate you would like to know"
    },
    city: {
        keyboard: cityKeyboard,
        message: "Choose the city where you would like to know the weather"
    },
    frequency: {
        keyboard: frequencyKeyboard,
        message: "Choose frequency of weather forecast"
    }
};

const usersCurrentStates = {};

const previousStateMap = { currency: "start", city: "start", frequency: "city" }

// bot.sendMessage(botId, "hello to myself from the past");

// bot.on("message", (msg) => {
//     if (msg.text == "hello to myself from the past") {
//         console.log("hello to myself from the past");
//     }
// });



bot.onText(/Previous menu/, (msg) => {
    const userId = msg.from.id;
    const userCurrState = usersCurrentStates[userId];
    const userPrevState = userId in usersCurrentStates ? previousStateMap[userCurrState] : "start";
    usersCurrentStates[userId] = userPrevState;
    bot.sendMessage(userId, states[userPrevState].message, states[userPrevState].keyboard)
    console.log(usersCurrentStates);
})

bot.onText(/\/start/, (msg) => {
    usersCurrentStates[msg.from.id] = "start";
    bot.sendMessage(msg.chat.id, `hello ${msg.from.first_name}, ${states.start.message}`, startKeyboard)
    console.log(usersCurrentStates);
})

bot.onText(/Weather|Currency rate/, (msg) => {
    if (msg.text == "Weather") {
        bot.sendMessage(msg.chat.id, states.city.message, cityKeyboard);
        usersCurrentStates[msg.from.id] = "city";
    } else {
        bot.sendMessage(msg.chat.id, states.currency.message, currencyKeyboard);
        usersCurrentStates[msg.from.id] = "currency";
    }
    console.log(usersCurrentStates);
})

bot.onText(/Kyiv|Dnipro/, (msg) => {
    if (msg.text == "Kyiv") {
        cityName = "Kyiv";
    } else {
        cityName = "Dnipro";
    }

    bot.sendMessage(msg.chat.id, states.frequency.message, frequencyKeyboard)
    usersCurrentStates[msg.from.id] = "frequency";
    console.log(usersCurrentStates);
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
    bot.sendMessage(msg.chat.id, dailyWeatherForecast);
});

bot.onText(/USD|EUR/, async (msg) => {
    let partRes;
    if (msg.text == "USD") {
        partRes = await getCurrencyRate("usd");
    } else {
        partRes = await getCurrencyRate("eur");
    }
    const currencyRate = pretifyCurrencyRate(partRes);
    bot.sendMessage(msg.chat.id, currencyRate);
});

console.log("bot is waiting for your messages ");




// const kyivCoords = {latitude: 50.4500336, longitude: 30.5241361};
// const dniproCoords = {latitude: 48.4680221, longitude: 35.0417711};

const weatherForecastUrl = "http://api.openweathermap.org/data/2.5/forecast?units=metric&appid=d952dc06c989b061f50cf16bf2ef9204"

async function getWeatherForecast(eachNHours = 3) {
    const response = await axios.get(weatherForecastUrl + `&q=${cityName},804`);
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


const currencyRateUrl = "https://api.monobank.ua/bank/currency";
const uahCode = 980, usdCode = 840, eurCode = 978;

const usdRate = {
    currencyName: "usd",
    rateBuy: 36.65,
    rateSell: 37.4406
};

const eurRate = {
    currencyName: "eur",
    rateBuy: 39.3,
    rateSell: 40.6504
};

async function getCurrencyRate(currency = "usd") {
    const currencyCode = currency == "usd" ? usdCode : eurCode;
    try {
        const response = await axios.get(currencyRateUrl);
        const currencyRate = response.data.filter(
            (currRate) => currRate["currencyCodeA"] == currencyCode && currRate["currencyCodeB"] == uahCode)[0];


        console.log("monobank status code: " + response.status);
        // console.log(currencyRate);
        if (currency == "usd") {
            usdRate.rateBuy = currencyRate.rateBuy;
            usdRate.rateSell = currencyRate.rateSell;
            return usdRate;
        } else {
            eurRate.rateBuy = currencyRate.rateBuy;
            eurRate.rateSell = currencyRate.rateSell;
            return eurRate;
        }
    } catch (error) {
        console.log("got an error in monobank api request");
        return currency == "usd" ? usdRate : eurRate;
    }

};

function pretifyCurrencyRate(currencyRate) {
    let currName = currencyRate.currencyName;
    currName = (currName == "usd") ? "United States dollar" : "Euro";
    return `${currName} \nbuy rate: ${currencyRate.rateBuy} uah \nsell rate: ${currencyRate.rateSell} uah`;
}

// console.log(pretifyCurrencyRate(await getCurrencyRate("eur")));