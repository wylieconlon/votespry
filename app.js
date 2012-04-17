var settings = require('./settings'),
	express = require('express'),
	request = require('request'),
	stylus  = require('stylus'),
	uuid    = require('node-uuid'),
	bcrypt  = require('bcrypt'),
	mongoose = require('mongoose'),
	email = require('mailer'),
	expressValidator = require('express-validator');

var	TWILIO_SMS_PATH = settings.twilio.root + '/SMS/Messages.json';

var app = module.exports = express.createServer();

var dict = require('./nouns');
console.log(dict.length);

// Database configuration

mongoose.connect(settings.dbHost+'/'+settings.dbName);

var schema = require('./schema');

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
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "vote spry" }));
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
	res.render('newpoll');
});
app.post('/new', function(req, res) {
	var newPoll = new Poll();
	
	newPoll.title = req.body.title;

	req.assert('title', 'Please give your poll a title').notEmpty();
	
	req.assert('choices', 'Your poll must have some options').isArray();

	// instantiate each choice individually
	var choices = req.body.choices;
	for(var i=0; i<choices.length; i++) {
		if(choices[i]) {
			newPoll.choices.push({ name: choices[i] });
		}
	}
	
	if(req.body.email) {
		req.assert('email', 'Invalid email address').isEmail();
	}

	var errors = req.validationErrors(true);
	if(errors){
		console.log(errors);

		var data = req.body;
		data.errors = errors;

		console.log("Sending %j", data);
		
		res.render('newpoll', data);
	} else {
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

		newPoll.save(function(err, doc) {
			console.log(doc);

			email.send({
				host: settings.email.host,

				from: settings.email.from,
				to: req.body.email,

				subject: "Administration link for your VoteSpry poll",
				template: "email-admin.html",
				data: {
					title: doc.title,
					code: doc.code,
					authCode: doc.authCode
				},

				authentication: 'login',
				username: settings.email.user,
				password: settings.email.password
			},
			function(err) {
				console.log(err);
			});


			res.redirect('/poll/admin/'+doc.authCode+'/');
		});
	}
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

				res.redirect('/');
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

app.get('/poll/admin/:authCode', function(req, res) {
	Poll.where('authCode', req.params.authCode)
		.limit(1)
		.run(function(err, doc) {
			if(doc.length == 1) {
				res.render('polladmin', doc[0]);
			} else {
				res.redirect('/');
			}
		});
});

app.post('/poll/admin/:authCode', function(req, res) {
	Poll.where('authCode', req.params.authCode)
		.limit(1)
		.run(function(err, doc) {
			if(doc.length == 1) {
				var poll = doc[0];
				
				if(req.body.close) {
					// request to close current poll
					
					Poll.update({ '_id': poll._id },
								{ open: false },
								function(err, doc) {
									poll.open = false;
									res.render('polladmin', poll);
								});
				} else if(req.body.code) {
					// request to update vote code
					
					var code = req.body.code.replace(/\s*/g, '').toLowerCase();

					// must check if code isn't in use
					Poll.where('code', code)
						.limit(1)
						.run(function(err, doc) {
							if(!err && doc.length == 0) {
								Poll.update({ '_id': poll._id},
											{ 'code': code },
											function(err, doc) {
												res.redirect('/poll/admin/'+req.params.authCode+'/');
											});
							} else {
								res.render('polladmin', poll);
							}
						});
				} else if(req.body.title) {
					// request to update poll title
					
					if(req.body.title.length > 0) {
						Poll.update({ '_id': poll._id },
									{ title: req.body.title },
									function(err, doc) {
										poll.title = req.body.title;
										res.render('polladmin', poll);
									});
					} else {
						poll.errors = { title: 'Please give your poll a title' };
						console.log(poll);
						res.render('polladmin', poll);
					}
				} else {
					res.render('polladmin', poll);
				}
			} else {
				res.redirect('/');
			}
		});
});

app.post('/SmsResponse', function(req, res) {
	console.log(req.body);
	
	var from = req.body.From,
		body = req.body.Body;

	var splitIndex = body.indexOf(' '),
		code = body.substr(0, splitIndex).toLowerCase(),
		content = body.substr(splitIndex+1, body.length).toLowerCase();

	console.log(code, content);

	var voteCallback = function(err, doc) {
		var user = doc[0];

		Poll.where('code', code)
			.where('choices.name', content)
			.limit(1)
			.run(function(err, doc) {
				if(doc.length == 1) {
					var poll = doc[0];
					
					if(poll.open === false) {
						res.sendfile('./smsPollClosed.xml');
					} else {
						var votePair = { 'author': user._id, 'poll': poll._id };
						
						Vote.count(votePair, function(err, doc) {
							console.log(err, doc);
							if(doc !== 0) {
								// already voted
								res.sendfile('./smsAlreadyVoted.xml');
							} else {
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

									var vote = new Vote(votePair);
									vote.save(function(err, doc) { console.log(doc); });

									res.sendfile('./smsSuccess.xml');
								} else {
									res.sendfile('./smsFailure.xml');
								}
							}
						});
					}
				} else {
					res.sendfile('./smsFailure.xml');
				}
			});
	}
	
	User.find({ 'phone': from }, function(err, doc) {
		if(doc.length == 0) {
			var user = new User({ 'phone': from });
			user.save(function(err) {
				User.find({ 'phone': from }, voteCallback);
			});
		} else {
			var user = doc[0];
			voteCallback(null, [user]);
		}

	});
});

app.listen(settings.port);
console.log("Server listening on port %d", settings.port);
