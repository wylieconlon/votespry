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
	, open: { type: Boolean, default: true }
	, authCode: { type: String, default: uuid.v1 }
	, expiration: Date
});
PollSchema.pre('save', function(next) {
	var code = this.code;

	code.toLowerCase();
	code.replace(/\s*/g, '');

	this.code = code;
	
	this.expiration = moment().add('days', 1);

	next();
});

var VoteSchema = new Schema({
	  phone: String
	, poll:   { type: Schema.ObjectId, ref: 'Poll' }
	, created: Date
});
VoteSchema.pre('save', function(next) {
	this.created = new Date();
	next();
});

exports.PollOptions = mongoose.model('PollOptions', PollOptionsSchema);
exports.Poll = mongoose.model('Poll', PollSchema);
exports.Vote = mongoose.model('Vote', VoteSchema);
