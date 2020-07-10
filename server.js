const express = require('express');
const app = express();
const path = require('path');


app.use(express.static('platforms/browser/www'));
app.set('port', process.env.PORT || 8000);
app.get('/api/v1/health', function (req, res){
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({isAvailable: true}));
  console.log('Deployed successfully');
})

app.use('/swrl/img', express.static('platforms/browser/www/img'))
app.use('/swrl/css', express.static('platforms/browser/www/css'))
app.use('/swrl/fonts', express.static('platforms/browser/www/fonts'))
app.use('/swrl/plugins', express.static('platforms/browser/www/plugins'))
app.use('/swrl/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/swrl/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/swrl/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/swrl/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/swrl/:id', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.use('/swrler/img', express.static('platforms/browser/www/img'))
app.use('/swrler/css', express.static('platforms/browser/www/css'))
app.use('/swrler/fonts', express.static('platforms/browser/www/fonts'))
app.use('/swrler/plugins', express.static('platforms/browser/www/plugins'))
app.use('/swrler/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/swrler/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/swrler/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/swrler/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/swrler/:id', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})


app.use('/recommend/img', express.static('platforms/browser/www/img'))
app.use('/recommend/css', express.static('platforms/browser/www/css'))
app.use('/recommend/fonts', express.static('platforms/browser/www/fonts'))
app.use('/recommend/plugins', express.static('platforms/browser/www/plugins'))
app.use('/recommend/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/recommend/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/recommend/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/recommend/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/recommend/:id', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})


app.use('/savedsearches/img', express.static('platforms/browser/www/img'))
app.use('/savedsearches/css', express.static('platforms/browser/www/css'))
app.use('/savedsearches/fonts', express.static('platforms/browser/www/fonts'))
app.use('/savedsearches/plugins', express.static('platforms/browser/www/plugins'))
app.use('/savedsearches/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/savedsearches/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/savedsearches/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/savedsearches/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/savedsearches', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.use('/recommendations/img', express.static('platforms/browser/www/img'))
app.use('/recommendations/css', express.static('platforms/browser/www/css'))
app.use('/recommendations/fonts', express.static('platforms/browser/www/fonts'))
app.use('/recommendations/plugins', express.static('platforms/browser/www/plugins'))
app.use('/recommendations/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/recommendations/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/recommendations/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/recommendations/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/recommendations', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.use('/watch/img', express.static('platforms/browser/www/img'))
app.use('/watch/css', express.static('platforms/browser/www/css'))
app.use('/watch/fonts', express.static('platforms/browser/www/fonts'))
app.use('/watch/plugins', express.static('platforms/browser/www/plugins'))
app.use('/watch/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/watch/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/watch/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/watch/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/watch', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.use('/listen/img', express.static('platforms/browser/www/img'))
app.use('/listen/css', express.static('platforms/browser/www/css'))
app.use('/listen/fonts', express.static('platforms/browser/www/fonts'))
app.use('/listen/plugins', express.static('platforms/browser/www/plugins'))
app.use('/listen/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/listen/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/listen/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/listen/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/listen', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.use('/read/img', express.static('platforms/browser/www/img'))
app.use('/read/css', express.static('platforms/browser/www/css'))
app.use('/read/fonts', express.static('platforms/browser/www/fonts'))
app.use('/read/plugins', express.static('platforms/browser/www/plugins'))
app.use('/read/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/read/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/read/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/read/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/read', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.use('/play/img', express.static('platforms/browser/www/img'))
app.use('/play/css', express.static('platforms/browser/www/css'))
app.use('/play/fonts', express.static('platforms/browser/www/fonts'))
app.use('/play/plugins', express.static('platforms/browser/www/plugins'))
app.use('/play/cordova-js-src', express.static('platforms/browser/www/cordova-js-src'))

app.get('/play/bundle.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/bundle.js'))
})
app.get('/play/cordova.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova.js'))
})
app.get('/play/cordova_plugins.js', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/cordova_plugins.js'))
})
app.get('/play', function (req, res){
  res.sendFile(path.join(__dirname + '/platforms/browser/www/index.html'))
})

app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});