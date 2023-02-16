// require includes the packages that were installed with npm
var path = require('path');
const fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');

/* =========== */
/* GLOBAL VARS */
/* =========== */
global.rootDir = __dirname;
global.collectionsDir = global.rootDir + '/data/';
global.testCollDir = global.collectionsDir + '/data-test/';
global.jsonDir = global.rootDir + '/json/';

global.supExt = ['.rdf', '.xml'];
global.startDate = null;
global.port = 8000;


const {DataFile, FileCollection} = require(global.rootDir + '/scripts/parsing.js');

/* ============== */
/* EXPRESS CONFIG */
/* ============== */
var app = express();
app.use('/', express.static(global.rootDir + '/client'));

// enable files upload
app.use(fileUpload({
  createParentPath: true
}));

// other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.enable('trust proxy');


/*app.post('/upload', (req, res) => {
    console.log(`Uploading files...`);
    let data = []; 

    try {
        
        if(!req.files) {
            res.send({
                status: false,
                message: 'No file uploaded.'
            });
        } else if (Object.keys(req.files).length < 2) {
            let unfile = req.files.files;
            let fileExt = path.extname(unfile.name);
              
            // check that the file's format is supported by the program
            isSupported = false;
            global.supExt.forEach((ext) => {
                if(fileExt == ext) {
                    isSupported = true;
                }
            });
            if (!isSupported) {
                res.send({
                    status: false,
                    message: 'Extension ' + fileExt + ' not supported.'
                });
            }
              
            // move uploaded files to files directory
            unfile.mv('./client/data/' + unfile.name);

            data.push({
                name: unfile.name,
                mimetype: unfile.mimetype,
                size: unfile.size
            });
            res.send({
                status: true,
                message: 'File is uploaded.',
                data: data
            });

        }
        else {   
            // loop all files
            _.forEach(_.keysIn(req.files.files), (key) => {
                let unfile = req.files.files[key];
                let fileExt = path.extname(unfile.name);
              
                // check that the file's format is supported by the program
                isSupported = false;
                global.supExt.forEach((ext) => {
                    if(fileExt == ext) {
                        isSupported = true;
                    }
                });
                if (!isSupported) {
                    res.send({
                        status: false,
                        message: 'Extension ' + fileExt + ' not supported.'
                    });
                }
              
                // move uploaded files to files directory
                unfile.mv('./client/data/' + unfile.name);

                data.push({
                    name: unfile.name,
                    mimetype: unfile.mimetype,
                    size: unfile.size
                });
            });
  
            res.send({
                status: true,
                message: 'Files are uploaded.',
                data: data
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
});*/

app.get('/pull-parse', function(req, res) {
	console.log(`Pulling files and parsing them...`);
	
	try {
        const coll = fs.readdirSync(global.testCollDir);
        const fileCollection = new FileCollection(global.testCollDir);
        const dataFiles = [];
        if(coll.size == 0) {
            res.send({
                status: false,
                message: "No files to pull."
            });
        }

        coll.forEach(function(file) {
            filePath = path.join(global.testCollDir, file);
            fileContent = fs.readFileSync(filePath, 'utf-8');
            fileFormat = path.extname(filePath);
            
            const dataFile = new DataFile(file, fileContent, fileFormat);
            dataFile.parseFile();
            //dataFiles.push(dataFile);
            fileCollection.pushDataFile(dataFile);
        });

        // saving the parsed data of the collection in a json file
        const jsonString = JSON.stringify(fileCollection);
        fs.writeFile(global.jsonDir + 'data-test-collection.json', jsonString, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('Objects saved to file.');
            }
        });

        res.send({
            status: true,
            fileNames: coll,
            parsedData: fileCollection.collFiles
        })
	}
	catch(e) {
		res.status(500).send(e);
	}
});

app.post('/queries', function(req, res) {
	console.log(`Making n queries on all the documents...`);
	
	try {
        const queriesRes = [];
        const json = JSON.parse(fs.readFileSync(global.jsonDir + 'data-test-collection.json'));
        const fileCollection = new FileCollection(global.testCollDir);

        fileCollection.constructFromJson(json);

        fileCollection.collFiles.forEach(function(dataFile) {
            var results = [];

            req.body.queries.forEach((query) => {
                dataFile.queryFile(query, req.body.queryLang);
                const resQuery = dataFile.fileQueries.at(-1);

                if (resQuery == null) {
                    res.send({
                        status: false,
                        error: "Invalid query or an error occurred during execution of it."
                    })
                }

                results.push(resQuery);
            });
                
            results.forEach(function(res) {
                queriesRes.push(res);
            });

        })

        // updating the json
        const jsonString = JSON.stringify(fileCollection);
        fs.writeFile(global.jsonDir + 'data-test-collection.json', jsonString, (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('Objects saved to file.');
            }
        });
        
        res.send({
            status: true,
            queriesResult: queriesRes
        })
	}
	catch(e) {
		res.send({
            status: false,
            error: e.message
        });
	}
});

/* ==================== */
/* ACTIVATE NODE SERVER */
/* ==================== */
app.listen(global.port, function() {
    global.startDate = new Date(); 
    console.log(`App is listening on port ${global.port} started ${global.startDate.toLocaleString()}.`);
});