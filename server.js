var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var dotenv = require('dotenv');
var url = require('url');
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
	newUrl = req.protocol + '://'+ req.get('host') + req.originalUrl;
	res.render('index', {
		title: 'FCC URL Shortener Microservice'//,
	});
});


app.get(/(.*)/, function (req, res) { //regexp checks if at least one char in path
	var outputPath = url.parse(req.url).pathname;
	//pathname includes slash...so remove it . 
	//we're looking for an alpha-numeric id, i.e. 'a1', so .replace() works here
	outputPath = outputPath.replace('/', '');
	var collection = db.collection('fcc_urls');
	var inputUrl;
	collection.findOne({urlid: outputPath}, function(err, doc){
		if (err) {
			handleError(res, err.message, "Failed to redirect.");
			return false;
		} else {
			inputUrl = ''+doc.input+'';
		}
		res.redirect(inputUrl);
	});
});

app.post('/', urlencodedParser, function(req, res){ //if path empty, post from form
	//concatenated parts of host url (.herokuapp. or in build stage 'localhost:8080')
	newUrl = req.protocol + '://'+ req.get('host') + req.originalUrl;
	//regexp to check for 'http(s)://chars.' in input url
	//very basic regexp compared to some 
	var re = /(http(s)*:\/\/)+[\w]+[\.]+/;
	var test = re.test(req.body.urli);
	if (test == false) {
		handleError(res, "Invalid URL", "Must contain 'http://' or 'https://' plus text and at least one '.'", 400);
	} else {
		var collection = db.collection('fcc_urls');
		var alph = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
		var alphInd;
		var num;
		var dblength;
		collection.count(function(err, cnt){
			if (err) {
				handleError(res, err.message, "Failed to sum number of records in collection.");
			} else {
				dblength = cnt;
				if (dblength >= alph.length) {
					num = dblength % alph.length;
					if (num > 9) {
						alphInd = 1; //need to change this... thinking...
					}
				} else {
					alphInd = 0;
					num = dblength+1;
				}
				var uniqueId = alph[alphInd]+""+num;
				var shortened = ""+newUrl+""+uniqueId+"";
				var showUrl = {
					input: req.body.urli,
					output: shortened,
					urlid: uniqueId
				};

				collection.insertOne(showUrl, function(err, doc){
					if (err) {
						handleError(res, err.message, "Failed to shorten URL.");
					} else {
						res.render('index', {
							title: 'FCC URL Shortener Microservice',
							response: formatOutput(doc.ops[0]),
							link: shortened
						});

					//	res.status(201).json(doc.ops[0]);
					}
				});
			}
		});
	}
});

function formatOutput(doc) {
	return JSON.stringify(doc)
}
