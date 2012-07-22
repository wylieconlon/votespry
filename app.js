var settings = require('./settings'),
	express = require('express'),
	stylus  = require('stylus'),
	expressValidator = require('express-validator'),
	poll = require('./poll');

var app = module.exports = express.createServer();

// App setup
app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(stylus.middleware({
		force: true,
		src: __dirname+'/views',
		dest: __dirname+'/public'
	}));
	app.use(express.static(__dirname + '/public'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(expressValidator);
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
	res.render('home');
});

// Creating poll
app.get('/new', function(req, res) {
	res.render('newpoll');
});
app.post('/new', poll.create);

// Displaying a poll
app.get('/poll/:code', poll.show);
app.get('/poll/:code/data.json', poll.getVotes);

// Editing a poll
// app.get('/poll/admin/:authCode', poll.admin);
// app.post('/poll/admin/:authCode', poll.edit);

// Voting
app.post('/SmsResponse', poll.vote);

app.listen(settings.port);
console.log("Server listening on port %d", settings.port);
