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

app.get('/', function(req, res){
//app.get(/(.+)/, function (req, res) { //regexp checks if at least one char in path
/*	var newUrl = url.parse(req.url).pathname;
	if ( err) {
		handleError(res, "Invalid URL", "Must contain ... etc", 400);
	} 
	db.collection(fcc_urls).insertOne(newUrl, function(err, doc){
		if (err) {
			handleError(res, err.message, "Failed to shorten URL.");
		} else {
			res.status(201).json(doc.ops[0]);
		}
	});*/
	res.render('index', {
		title: 'FCC URL Shortener Microservice'//,
		//response: formatOutput(doc)
	});
});

app.post('/', urlencodedParser, function(req, res){ //if path empty, post from form
	var newUrl = {user: req.body.urli, shortened: "test"};	
	var re = /(http(s)*:\/\/)+[\w]+[\.]+/;
	if (!re.test(newUrl)) {
		handleError(res, "Invalid URL", "Must contain ... etc", 400);
	} else {
		var collection = db.collection('fcc_urls');
		collection.insertOne(newUrl, function(err, doc){
			if (err) {
				handleError(res, err.message, "Failed to shorten URL.");
			} else {
				res.render('index', {
					title: 'FCC URL Shortener Microservice',
					response: formatOutput(doc)
				});
				
			//	res.status(201).json(doc.ops[0]);
			}
		});
	}
});

function formatOutput(doc) {
	return JSON.stringify(doc)
}
