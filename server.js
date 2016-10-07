var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var dotenv = require('dotenv');
var ObjectID = mongodb.ObjectID;

var app = express();

app.use(express.static(__dirname + '/public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(urlencodedParser);

//this is how I'm getting the .env stuff loaded:
dotenv.load();
var MongoClient = mongodb.MongoClient;
var uri = process.env.MONGOLAB_URI;
console.log(uri)
var db;
MongoClient.connect(uri, function (err, database) {
  	if (err) {
    	console.log('Unable to connect to the mongoDB server. Error:', err);
		process.exit(1);
  	} else {
		db = database;
    	console.log('Connection established to', uri);

		var server = app.listen(process.env.PORT/* || 8080*/, function(){
			var port = server.address().port;
			console.log('App now running on port', port);
		});
    	// do some work here with the database.

    	//Close connection
    	//db.close();
	}
});

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

var newUrl;
app.get('/', function(req, res){
//app.get(/(.*)/, function (req, res) { //regexp checks if at least one char in path
	//var inputUrl = url.parse(req.url);
	newUrl = req.protocol + '://'+ req.get('host') + req.originalUrl;
	//url.format(inputUrl)
	console.log(newUrl)
	/*if ( err) {
		handleError(res, "Invalid URL", "Must contain ... etc", 400);
	} */
	res.render('index', {
		title: 'FCC URL Shortener Microservice'//,
		//response: formatOutput(doc)
	});
});

app.post('/', urlencodedParser, function(req, res){ //if path empty, post from form
	//regexp for 'http(s)://chars.'
	newUrl = req.protocol + '://'+ req.get('host') + req.originalUrl;
	var re = /(http(s)*:\/\/)+[\w]+[\.]+/;
	var test = re.test(req.body.urli);
	if (test == false) {
		handleError(res, "Invalid URL", "Must contain 'http://' or 'https://' plus text and at least one '.'", 400);
	} else {
		var collection = db.collection('fcc_urls');
		var alph = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
		var alphInd;
		var num;
		var dblength = collection.find().count();
		if (dblength >= alph.length) {
			num = dblength % alph.length;
			if (num > 9) {
				alphInd = 1; //need to change this... thinking...
			}
		} else {
			alphInd = 0;
			num = dblength+1;
		}
		var shortened = ""+newUrl+""+alph[alphInd]+""+num+"";
		var showUrl = {
			input: req.body.urli,
			output: shortened
		};
		
		collection.insertOne(showUrl, function(err, doc){
			if (err) {
				handleError(res, err.message, "Failed to shorten URL.");
			} else {
				res.render('index', {
					title: 'FCC URL Shortener Microservice',
					response: formatOutput(doc.ops[0]),
					link: req.body.urli
				});
				
			//	res.status(201).json(doc.ops[0]);
			}
		});
	}
});

function formatOutput(doc) {
	return JSON.stringify(doc)
}
