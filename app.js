var settings = require('./settings'),
	express = require('express'),
	request = require('request'),
	stylus  = require('stylus'),
	uuid    = require('node-uuid'),
	bcrypt  = require('bcrypt'),
	mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	mongooseAuth = require('mongoose-auth'),
	everyauth = require('everyauth'),
	querystring = require('querystring');

var	TWILIO_SMS_PATH = settings.twilio.root + '/SMS/Messages.json';

var sms_to = '+13017411101';

var app = module.exports = express.createServer();

var dict = require('./nouns.js');
console.log(dict.length);

// Database configuration

mongoose.connect(settings.dbHost+'/'+settings.dbName);

var schema = require('./schema.js');

var PollOptions = schema.PollOptions,
	Poll = schema.Poll,
	User = schema.User,
	Vote = schema.Vote;


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
	app.use('/css', express.static(__dirname + '/public/css'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "vote spry" }));
	app.use(mongooseAuth.middleware());
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
	if(req.loggedIn) {
		Poll.find({ 'author': req.user._id }, function(err, doc) {
					res.render('dashboard', { polls: doc });
				});
	} else {
		res.render('home');
	}
});

// Creating poll
app.get('/new', function(req, res) {
	if(! req.loggedIn) {
		res.redirect('/login?redirect_to=/new');
	} else {
		res.render('newpoll', { title: 'New Poll' });
	}
});
app.post('/new', function(req, res) {
	if(! req.loggedIn) {
		res.redirect('/login');
	}
	
	var newPoll = new Poll();
	
	newPoll.title = req.body.title;

	// instantiate each choice individually
	var choices = req.body.choices;
	for(var i=0; i<choices.length; i++) {
		newPoll.choices.push({ name: choices[i] });
	}

	newPoll.author = req.user._id;
	
	if(! req.body.code) {
		function findUntakenCode() {
			var rand = Math.floor(Math.random() * dict.length),
			keyword = dict[rand];

			console.log(keyword);
			/*User.find({ "polls.code": keyword }, function(err, doc) {
				console.log("Found " + doc.length + " matches");
				
				if(doc.length == 0) 
			});*/
			
			return keyword;
		}

		newPoll.code = findUntakenCode();
	} else {
		newPoll.code = req.body.code;
	}

	console.log(newPoll);
	
	newPoll.save();

	res.redirect('/polls');
});

app.get('/poll/:code', function(req, res) {
	Poll.where('code', req.params.code)
		.limit(1)
		.run(function(err, doc) {
			if(doc.length == 1) {
				res.render('pollitem', {
					poll: doc[0],
					host: settings.host,
					number: settings.twilio.fromFormatted
				});
			} else {
				console.log("No code");

				res.redirect('/polls');
			}
		});
});

app.get('/poll/:code/data.json', function(req, res) {
	Poll.where('code', req.params.code)
		.limit(1)
		.run(function(err, doc) {
			if(doc.length == 1) {
				var poll = doc[0];
				
				if(poll) {
					var data = {
						code: req.params.code,
						keys: [],
						votes: []
					};

					for(var i=0; i<poll.choices.length; i++) {
						data.keys[i] = poll.choices[i].name.toUpperCase();
						data.votes[i] = poll.choices[i].votes;
					}

					res.json(data);
				} else {
					res.json({ error: "No poll with that ID", code: req.params.code });
				}
			} else {
				res.json({ error: "No poll with that ID", code: req.params.code });
			}
		});	
});

app.get('/vote/:code/:choice', function(req, res) {
	//if(! req.loggedIn) res.redirect('/login');

	Poll.where('code', req.params.code)
		.exists('choices.'+req.params.choice)
		.limit(1)
		.run(function(err, doc) {
			if(doc.length == 1) {
				var poll = doc[0];
				
				console.log(poll);

				Vote.where('author', req.user._id)
					.where('poll', poll._id)
					.limit(1)
					.run(function(err, doc) {
						if(doc.length > 0) {
							console.log("Invalid vote");
							
							res.json({ error: "You have already voted on this poll." });
						} else {
							var increment = { '$inc': {} };
							increment['$inc']['choices.'+req.params.choice+'.votes'] = 1;

							Poll.update({ 'code': req.params.code },
										increment,
										function(err, doc) {
										});
							
							var vote = new Vote({
								author: req.user._id,
								poll: poll._id
							});
							vote.save();

							res.json({ success: "Vote succeeded" });
						}
					});
			} else {
				res.json({ error: "No poll with that ID", code: req.params.code });
			}
		});	
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
	
	var body = req.body.Body;

	var splitIndex = body.indexOf(' '),
		code = body.substr(0, splitIndex).toLowerCase(),
		content = body.substr(splitIndex+1, body.length).toLowerCase();

	console.log(code, content);

	Poll.where('code', code)
		.where('choices.name', content)
		.limit(1)
		.run(function(err, doc) {
			var poll = doc[0];
			
			var updateIndex = -1;
			for(var i=0; i<poll.choices.length; i++) {
				if(poll.choices[i].name == content) {
					updateIndex = i;
					break;
				}
			}

			if(typeof updateIndex !== 'undefined') {
				var increment = { '$inc': {} };
					increment['$inc']['choices.'+updateIndex+'.votes'] = 1;
				Poll.update({ 'code': code },
							increment,
							function(err, doc) {
							});

				res.sendfile('./smsSuccess.xml');
			} else {
				res.sendfile('./smsFailure.xml');
			}
		});
});

mongooseAuth.helpExpress(app);

app.listen(settings.port);
console.log("Server listening on port %d", settings.port);
