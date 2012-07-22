var settings = require('./settings'),
	request  = require('request'),
	uuid     = require('node-uuid'),
	moment   = require('moment'),
	pg = require('pg'),
	email = require('mailer'),
	expressValidator = require('express-validator');

var dict = require('./nouns');
console.log(dict.length);

var db = new pg.Client(settings.dbHost+'/'+settings.dbName);
db.connect();

// POST /new
exports.create = function(req, res) {
	
	req.assert('title', 'Please give your poll a title').notEmpty();
	
	req.assert('choices', 'Your poll must have some options').isArray();

	if (req.body.email) {
		req.assert('email', 'Invalid email address').isEmail();
	}

	var errors = req.validationErrors(true);
	if (errors) {

		var data = req.body;
		data.errors = errors;

		console.log("Sending %j", data, errors);
		
		res.render('newpoll', data);

	} else {

		var rand = Math.floor(Math.random() * dict.length),
			code = dict[rand];
		
		var expires = moment().add('days', 1).toDate();
		console.log('expires', expires);

		// save poll to db
		var createPoll = db.query({
			name: 'create poll',
			text: 'INSERT INTO polls (title, code, authCode, expiration) VALUES ($1, $2, $3, $4) RETURNING id',
			values: [
				req.body.title,
				code,
				uuid.v1(),
				expires
			]
		});

		// once poll exists, insert choices
		// row is returned by query above, like { id: 1 }
		createPoll.on('row', function(row) {
			
			var choices = req.body.choices;
			
			// generate a sql query to insert simultaneously
			var sql = 'INSERT INTO choices (poll_id, name) VALUES ',
				params = [];

			// remove empty options that may have been passed
			choices = choices.filter(function(val) {
				return val.trim() !== '';
			});

			// generate "($1, $2), ..." to insert in batch
			for (var i = 0; i < choices.length; i++) {

				sql += '($' + (i*2+1) + ', $' + (i*2+2) + ')';

				if (i < choices.length - 1) {
					sql += ', ';
				}

				// insert next two values
				params.push(row.id, choices[i].toLowerCase());

			}

			console.log(sql, params);

			var addChoices = db.query({
				name: 'add choices',
				text: sql,
				values: params
			});

			addChoices.on('end', function() {
				res.redirect('/poll/' + code + '/');
			});

		});
	}
}

// GET /poll/:code
exports.show = function(req, res) {

	var query = db.query({
		name: 'find poll',
		text: 'SELECT * FROM polls WHERE code = $1 LIMIT 1',
		values: [req.params.code]
	});

	query.on('row', function(row) {
		console.log('find result', row);

		if (row) {

			res.render('pollitem', {
				poll: row,
				host: settings.host,
				number: settings.twilio.fromFormatted
			});

		} else {

			res.redirect('/');

		}
	});
}

// GET /poll/:code/data.json
exports.getVotes = function(req, res) {
	var getChoices = db.query({
		name: 'find poll choices',
		text: " \
			SELECT c.* \
			FROM polls as p, \
			choices as c \
			WHERE p.code = $1 \
			AND c.poll_id = p.id \
		",
		values: [req.params.code]
	});

	var data = {
		code: req.params.code,
		keys: [],
		votes: []
	};

	getChoices.on('row', function(row) {
		if (row) {
			console.log('row', row);
			data.keys.push(row.name.toUpperCase());
			data.votes.push(row.count);
		}
	});

	getChoices.on('end', function() {
		res.json(data);
	});
}

// POST /SmsResponse
exports.vote = function(req, res) {
	console.log(req.body);
	
	var from = req.body.From,
		body = req.body.Body;

	var splitIndex = body.indexOf(' '),
		code = body.substr(0, splitIndex).toLowerCase(),
		content = body.substr(splitIndex+1, body.length).toLowerCase();

	console.log(code, content);

	var getChoice = db.query({
		  name: 'find choice'
		, text: 
			" SELECT p.id as poll_id, c.id as choice_id, p.open " +
			" FROM polls as p, " +
			" choices as c " +
			" WHERE p.code = $1 " +
			" AND c.poll_id = p.id " +
			" AND c.name = $2 "
		, values: [code, content]
	});

	var poll = false;

	getChoice.on('row', function(row) {
		poll = row;
	});

	getChoice.on('end', function() {
		if (poll) {
			console.log('poll', poll);

			if (poll.open) {
				
				var getVote = db.query({
					  name: 'find vote'
					, text:
						" SELECT * " +
						" FROM votes as v " +
						" WHERE v.phone = $1 " +
						" AND v.choice_id = $2 "
					, values: [from, poll.choice_id]
				});

				var vote = false;

				getVote.on('row', function(row) {
					vote = row;
				});

				getVote.on('end', function() {

					if (vote) {
						res.sendfile('sms/smsAlreadyVoted.xml');
					} else {

						var saveVote = db.query({
							  name: 'save vote'
							, text:
								" INSERT INTO votes (phone, choice_id, created) " +
								" VALUES ($1, $2, $3) "
							, values: [
								from,
								poll.choice_id,
								new Date()
							]
						});

						saveVote.on('end', function() {
							var incrVote = db.query({
								  name: 'increment vote'
								, text:
									" UPDATE choices " +
									" SET count = count + 1 " +
									" WHERE id = $1; "
								, values: [ poll.choice_id ]
							});

							incrVote.on('end', function() {
								res.sendfile('sms/smsSuccess.xml');
							});
						});

					}

				});

			} else {
				res.sendfile('sms/smsPollClosed.xml');
			}

		} else {
			res.sendfile('sms/smsFailure.xml');
		}
	});

}

// GET /poll/admin/:authCode
exports.admin = function(req, res) {
	var getPoll = db.query({
		  name: 'get poll by admin'
		, text:
			" SELECT * " +
			" FROM polls " +
			" WHERE p.authCode = $1 "
		, values: [req.params.authCode]
	});

	var poll = null;

	getPoll.on('row', function(row) {
		poll = row;
	});

	getPoll.on('end', function() {
		if (poll) {
			res.render('polladmin', poll);
		} else {
			res.redirect('/');
		}
	});
}

// POST /poll/admin/:authCode
exports.edit = function(req, res) {
	var getPoll = db.query({
		  name: 'get poll by admin'
		, text:
			" SELECT * " +
			" FROM polls " +
			" WHERE p.authCode = $1 "
		, values: [req.params.authCode]
	});

	var poll = null;

	getPoll.on('row', function(row) {
		poll = row;
	});

	getPoll.on('end', function() {
		if (poll) {
			
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

}
