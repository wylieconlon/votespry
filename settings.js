var settings = {};

settings.host = 'http://ec2-107-22-121-32.compute-1.amazonaws.com';
settings.port = process.env.PORT || 80;

settings.local = process.env.NODE_ENV !== 'production';

settings.twilio = {};

var tw = settings.twilio;

tw.sid  = 'ACecd82028aa09427f9f6d2f6de3501a69';
tw.auth = '2401280c628f547fd5050c32b430747e';

tw.protocol = 'https://';
tw.host = 'api.twilio.com';

tw.from = '+16173703737';

if(settings.local) {
	settings.host = 'http://localhost';
	
	// settings to use Fake-Twilio-API
	// https://github.com/youngj/Fake-Twilio-Api
	tw.sid  = 'AC1fcf9bed2ffb2e066554195806e1a9e4ed9a4cb6108bf7039df57c566227520d';
	tw.auth = 'e0aeaf05c993574adcb2261f96c03b0d09352546b8b5bca59a30c04ad04ca6ac';
	
	tw.protocol = 'http://';
	tw.host = 'localhost:8080';
}

tw.path = '/2010-04-01/Accounts/' + tw.sid;

tw.root = tw.protocol + tw.sid + ':' + tw.auth + '@' + tw.host + tw.path;

module.exports = settings;