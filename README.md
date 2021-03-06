VoteSpry: Instantly create real-time polls
==========================================

Imagine you're giving a presentation, and want to collect feedback while it's
happening. If you're holding a contest, you might want to let the audience
choose the winner. Or if you're a teacher, you might want to figure out if your
lecture is going too fast or too slow.

VoteSpry is a super-simple app that lets anybody vote on a poll via text
message. It's focused primarily on real-time situations with an audience to
gather feedback from. It takes 30 seconds to create a poll.

[Read about the process behind building the app.](http://hci.wylie.su/2012/04/13/real_time-voting/)

How it works
------------

VoteSpry is a node.js app that provides a simple web interface for creating and
monitoring polls, using [Twilio](http://twilio.com) to handle incoming SMS
votes.

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
    
    var email = {};
    settings.email = email;
    
    email.host = 'smtp.sendgrid.net';
    email.from = '### YOUR SENDGRID EMAIL';
    
    email.user = '### YOUR SENDGRID USER';
    email.password = '### YOUR SENDGRID PASSWORD:';
    
    var tw = {};
    settings.twilio = tw;
    
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

### Note about sending email

You can use any SMTP server for this, such as [Sendgrid](http://sengrid.com).

### Note about Twilio

This project is tricky to test locally because Twilio must have a web-accessible
URL for its incoming SMS callbacks. However, to simulate voting behavior you
can send fake Twilio [post parameters](http://www.twilio.com/docs/api/rest/sms)
to the `/SmsResponse` route using `curl`.

Running the app
---------------

VoteSpry runs on port 80, which requires root privileges to bind to. To run it
locally, you can use the [node-dev](https://github.com/fgnass/node-dev) server:

    sudo node-dev app.js

On a production server, you must specify the NODE\_ENV environment variable:

    sudo NODE_ENV=production /usr/local/bin/node app.js
