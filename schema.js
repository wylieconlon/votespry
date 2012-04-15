var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	mongooseAuth = require('mongoose-auth'),
	everyauth = require('everyauth'),
	uuid = require('node-uuid');

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
	, author: { type: Schema.ObjectId, ref: 'User' }
	, open: { type: Boolean, default: true }
	, authCode: { type: String, default: uuid.v1 }
});
PollSchema.pre('save', function(next) {
	this.code = this.code.toLowerCase();
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
	
	//, polls: { type: [PollSchema], ref: 'Poll' }
});
UserSchema.plugin(mongooseAuth, {
	everymodule: {
		everyauth: {
			User: function () {
				return User;
			}
		}
	}
	
	, password: {
		  loginWith: 'email'
		, everyauth: {
			getLoginPath: '/login'
			, postLoginPath: '/login'
			, loginView: 'login.jade'
			, getRegisterPath: '/register'
			, postRegisterPath: '/register'
			, registerView: 'register.jade'
			, loginSuccessRedirect: '/'
			, registerSuccessRedirect: '/'
		}
	}
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

