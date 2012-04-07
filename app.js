var settings = require('./settings'),
	express = require('express'),
	request = require('request'),
	querystring = require('querystring'),
	TwilioClient = require('twilio').Client,
	Twiml = require('twilio').Twiml;

var	TWILIO_SMS_PATH = settings.twilio.root + '/SMS/Messages.json';

var sms_to = '+13017411101';

var app = module.exports = express.createServer();

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.static(__dirname + '/public'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(app.router);
});

app.configure('development', function() {
	app.use(express.errorHandler({ 
		dumpExceptions: true, 
		showStack: true 
	})); 
});

app.configure('production', function() {
	app.use(express.errorHandler());
});

// Routes
app.get('/', function(req, res) {
	res.send("Hi");
});

app.get('/send', function(req, res) {
	var params = {
		'From': settings.twilio.from,
		'To': sms_to,
		'Body': "Test message"
	};
	
	var body = querystring.stringify(params);
	
	console.log(body, TWILIO_SMS_PATH);
	
	request.post({
		url: TWILIO_SMS_PATH,
		form: params
	}, function(error, response, body) {
		if(!error) {
			console.log(response.statusCode, body);
		} else {
			console.log(error);
		}
	});
	
	res.send("Message sent");
});

app.post('/SmsResponse', function(req, res) {
	console.log(req.body);
	res.sendfile('./smsresponse.xml');
});

app.listen(settings.port);
console.log("Server listening on port %d", settings.port);