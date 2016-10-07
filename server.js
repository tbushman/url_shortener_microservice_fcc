var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var dotenv = require('dotenv');
var url = require('url');
var pug = require('pug');
var ObjectID = mongodb.ObjectID;

var app = express();

app.use(express.static(__dirname + '/public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(urlencodedParser);

//this is how I'm getting the .env MONGOLAB_URI loaded:
dotenv.load();
var MongoClient = mongodb.MongoClient;
var uri = process.env.MONGODB_URI;
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

var alph = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
var alphInd;
app.get(/(.*)/, function (req, res) { //regexp checks if at least one char in path of address bar
	var outputPath = url.parse(req.url).pathname;
	//pathname includes slash...so remove it . 
	//we're looking for an alpha-numeric id, i.e. 'a1', so .replace() works here
	outputPath = outputPath.replace('/', '');
	alphInd = alph.indexOf(outputPath.split()[0])
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
	//concatenated parts of host url (herokuapp.com or, if in build stage, 'localhost:8080')
	newUrl = req.protocol + '://'+ req.get('host') + req.originalUrl;
	//regexp to check for 'http(s)://chars.' in input url
	//very basic regexp compared to some 
	var re = /(http(s)*:\/\/)+[\w]+[\.]+/;
	var test = re.test(req.body.urli);
	if (test == false) {
		handleError(res, "Invalid URL", "Must contain 'http://' or 'https://' plus text and at least one '.'", 400);
	} else {
		var collection = db.collection('fcc_urls');
		var alphInd;
		var num;
		var dblength;
		
		collection.find({}, {'sort': [['urlid', 'desc']]}).toArray(function(err, doc){
			
			var uniqueIdA = doc[0].urlid.split('')[0];
			alphInd = alph.indexOf(uniqueIdA);
			console.log(alphInd)
			
			collection.count(function(err, cnt){
				if (err) {
					handleError(res, err.message, "Failed to sum number of records in collection.");
				} else {
					dblength = cnt;
					if (dblength >= alph.length) { //start over at 0
						num = dblength % alph.length;
					} else {
						num = dblength+1;
					}
					if (alphInd == undefined) {
						alphInd = 0;
					} else {
						if (num > alph.length) {
							alphInd++; //increment alphabet char
						}
					}
					uniqueId = alph[alphInd]+""+num;
					var shortened = ""+newUrl+""+uniqueId+"";
					var insertDb = {
						input: req.body.urli,
						output: shortened,
						urlid: uniqueId
					};

					collection.insertOne(insertDb, function(err, doc){
						if (err) {
							handleError(res, err.message, "Failed to shorten URL.");
						} else {
							res.render('index', {
								title: 'FCC URL Shortener Microservice',
								response: formatOutput(doc.ops[0]),
								link: shortened
							});
						}
					});
				}
			});
		});
		
	}
});

function formatOutput(doc) {
	return JSON.stringify(doc)
}
