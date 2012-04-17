var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	uuid = require('node-uuid'),
	moment = require('moment');

var PollOptionsSchema = new Schema({
	name: String,
	votes: {
		type: Number,
		min: 0,
		default: 0
	}
});
PollOptionsSchema.pre('save', function(next) {
	this.name = this.name.toLowerCase();
	next();
});

var PollSchema = new Schema({
	  title: String
	, code:  String
	, choices: [PollOptionsSchema]
	//, author: { type: Schema.ObjectId, ref: 'User' }
	, open: { type: Boolean, default: true }
	, authCode: { type: String, default: uuid.v1 }
	, expiration: Date
});
PollSchema.pre('save', function(next) {
	var code = this.code;

	code.toLowerCase();
	code.replace(/\s*/g, '');

	this.code = code;
	
	this.expiration = moment().add('days', 7);

	next();
});

var VoteSchema = new Schema({
	  author: { type: Schema.ObjectId, ref: 'User' }
	, poll:   { type: Schema.ObjectId, ref: 'Poll' }
});

var UserSchema = new Schema({
	  resetToken: String
	, resetExpiration: Date
	, emailConfirmationToken: { type: String, default: uuid.v1 }
	, activated: { type: Boolean, default: false }
	, lastUpdated: Date
	, created: Date
	, lastIPaddress: String

	, phone: String
});
UserSchema.pre('save', function(next) {
	this.created = new Date();
	this.lastUpdated = this.created;

	next();
});


var User = mongoose.model('User', UserSchema);

exports.PollOptions = mongoose.model('PollOptions', PollOptionsSchema);
exports.Poll = mongoose.model('Poll', PollSchema);
exports.User = User;
exports.Vote = mongoose.model('Vote', VoteSchema);

