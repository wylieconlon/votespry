VoteSpry: Instantly create real-time polls
==========================================

Imagine you're giving a presentation, and want to collect feedback while it's
happening. If you're holding a contest, you might want to let the audience
choose the winner. Or if you're a teacher, you might want to figure out if your
lecture is going too fast or too slow.

VoteSpry is a super-simple app that lets anybody vote on a poll via text
message. It's focused primarily on real-time situations with an audience to
gather feedback from.

How it works
------------

VoteSpry is a node.js app that provides a simple web interface for creating and
monitoring polls, using [Twilio](http://twilio.com) to handle incoming SMS
votes. Registration with email and password is temporarily required to create
and come back to polls, but this will be replaced soon with an email-based
system.

Install instructions
--------------------

### Dependencies

* node.js
* npm
* [mongodb](http://mongodb.org)

To install the required node.js modules, run `npm install` in the project
directory.

### Specifying settings

The app requires a settings.js module to specify ports, databases, and API keys
and urls. Here is a sample settings.js file:

    var settings = {};
    settings.host = 'localhost';
    settings.port = process.env.PORT || 80;
    
    settings.local = process.env.NODE_ENV !== 'production';
    
    settings.dbHost = 'mongodb://localhost';
    settings.dbName = 'votespry';
    
    settings.twilio = {};
    
    var tw = settings.twilio;
    
    tw.sid  = '### YOUR TWILIO SID';
    tw.auth = '### YOUR TWILIO AUTH TOKEN';
    
    tw.protocol = 'https://';
    tw.host = 'api.twilio.com';
    
    tw.from = '### YOUR TWILIO PHONE NUMBER';
    tw.fromFormatted = '### YOUR TWILIO PHONE NUMBER'; // for display to users
    
    if(settings.local) {
        // you can override settings here
    }
    
    tw.path = '/2010-04-01/Accounts/' + tw.sid;
    
    tw.root = tw.protocol + tw.sid + ':' + tw.auth + '@' + tw.host + tw.path;
    
    module.exports = settings;
    
### Note about Twilio

This project is tricky to test locally because Twilio must have a web-accessible
URL for its incoming SMS callbacks. That's why there's an alternate way to vote
by sending an HTTP `GET` to the `/vote/:code/:choiceIndex` route (note: only one
vote per user is enforced). One possibility is to use a proxy service to forward
requests at a remote service to your machine.
