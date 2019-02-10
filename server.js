const express = require('express');
const app = express();

app.use(express.static('platforms/browser/www'));
app.set('port', process.env.PORT || 8000);
app.get('/api/v1/health', function (req, res){
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({isAvailable: true}));
  console.log('Deployed successfully');
})
app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});