// server.js
// where your node app starts
var http = require("http");
var https = require("https");
var fs = require("fs");
var querystring = require('querystring');


// init project
var express = require('express');
var app = express();

var token = "412677136:AAHkF37m4HkCtucOxYOPi6ap2kN5bzyYlW0";//470423265:AAFNppOsnPtJV8kUdBjoGvKEGdHKpygCIF0"
var url = "https://super-cook.glitch.me/" + token
var telegram_api = "https://api.telegram.org/"//402243532:AAHds37dMd2Q_TTN4xsO1WdHmc25lU8pXOw/setWebhook?url=https://super-cook.glitch.me/402243532:AAHds37dMd2Q_TTN4xsO1WdHmc25lU8pXOw"
var api_url = telegram_api + "bot" + token

// https://super-cook.glitch.me/402243532:AAHds37dMd2Q_TTN4xsO1WdHmc25lU8pXOw


var updates = [];
var update_last_id = 0;

function censor(censor) {
  var i = 0;

  return function(key, value) {
    if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value) 
      return '[Circular]'; 

    if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
      return '[Unknown]';

    ++i; // so we know we aren't using the original object anymore

    return value;  
  }
}

function replyToMessage(message, myMessage, replyMarkup) {
  var text = "" + myMessage + ""
  var method = "/sendMessage"
  var data = "?chat_id=" + message.chat.id +
                          "&parse_mode=Markdown" +
  ((!replyMarkup) ? "" : ("&reply_to_message_id=" + message.message_id) ) +
                          "&text=" + encodeURIComponent(text)

  console.log("get", api_url + method + data) 
  https.get( api_url + method + data )
  
}

function getUpdates() {
  var method = "/getUpdates"
  var data = "?offset=" + (update_last_id+1)
  
  request(api_url + method + data, function(res) {
    if (!res.ok) return;
    
    for (var key in res.result) {
      var update = res.result[key]
      updates.push( update )
      update_last_id = update.update_id
      handleUpdate(update)
    }
  })
}
function round(x,base) {
  return Math.floor(x * base) / base
}

function handleUpdate(update) {
  let exmo_url = "https://api.exmo.com/v1/ticker/";
  
  request(exmo_url, function (data){
    let price = data["BTC_RUB"];
    let low = price["low"];
    let high = price["high"];
    let amount = 44000; // rub
    console.log(low, high);
    let intros = [
      "Торговал сегодня битком.",
      "Прикинь, впервые вообще на биржу зашёл.",
      "Использовал quantative analysis.",
      "Продал эфиры. Биткоины - будущее!",
      "Эта коза меня бросила, а теперь опять пишет. Конечно, теперь я талант:",
      "Случайно нажал купить и заработал.",
      "Кошка наступила на клавиатуру и получила миллионы прибыли.",
      "Погадал по картам таро и вложился на всю сумму.",
    ];
    
    
    let rindex = Math.floor(Math.random()*intros.length);
    
    let message = intros[rindex] + "\n\n" + "Сегодня купил BTC по "+ round(low/1000,1)  + "к" +
        ", продал по "+ round(high/1000,1) + "к" +
        " \n\nЗаработал +"+round((high/low-1),100)*100+"%, "+
        round((high/low)*amount,1)+"руб. с "+amount/1000+"к";

    // message = "Я купил "+amount+" руб. и, торгуя биткоином на EXMO, за последние сутки заработал с них +" + Math.floor((high/low-1)*amount * 100) / 100+" руб.";
    console.log(message)

    replyToMessage(update.message, message);
  });

  console.log(update.message)

  return;
  
}

function download(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
}

function request(url, callback) {
  
  https.get(url, function (res) {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];

      let error;
      if (res.statusCode !== 200) {
        error = new Error('Request Failed.\n' +
                          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
                          `Expected application/json but received ${contentType}`);
      }
    
      if (error) {
        console.error(error.message);
        //console.error(res);
        // consume response data to free up memory
        res.resume();
        return;
      }
    
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          //console.log(rawData);
          const parsedData = JSON.parse(rawData);
          callback(parsedData)
        } catch (e) {
          console.error(e.message);
        }
      });
  })
}

function startCycle() {
  setInterval(getUpdates, 500)
}

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/" + token, function(req, res) {
  
  var message = JSON.stringify(req.query, censor(req.query), 4)
  
  console.log(message)
  console.log(req.query)
  
  var url = replyToMessage(message)
  
  https.get(url, function(response) {
    res.send("{}");
  })
  
})

// listen for requests :)

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  startCycle();
});
