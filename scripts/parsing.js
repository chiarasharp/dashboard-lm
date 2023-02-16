const rdflib = require('rdflib');
const DOMParser = require('xmldom').DOMParser;
const xpath = require('xpath');
const fs = require('fs');

/*
* Auxiliar function that finds the URI inside an RDF/XML file.
*/
function findUriRDFXML(rdfText) {
  const match = rdfText.match(/xmlns:(\w+)="(.*?)"/);
  if(match) {
      return match[2];
  }
  return null;
}

/*
* Querys an XML file with an XPath query.
*/
const queryXMLXPath = (query, fileContent) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fileContent, 'application/xml');
  const root = doc.documentElement; // avoiding xmldom security problem
  var res = "";
  
  var resultEvaluate = xpath.evaluate(
    query,                      // xpathExpression
    root,                       // contextNode
    null,                       // namespaceResolver
    xpath.XPathResult.ANY_TYPE, // resultType
    null                        // result
  )

  switch (resultEvaluate.resultType) {
    case 1:                              // NUMBER_TYPE
      res = resultEvaluate.numberValue; 
      break;
    case 2:                              // STRING_TYPE
      res = resultEvaluate.stringValue;  
      break;
    case 3:                              // BOOLEAN_TYPE
      res = resultEvaluate.booleanValue;
      break;
    case 4:                              // UNORDERED_NODE_ITERATOR_TYPE
    case 5:                              // ORDERED_NODE_ITERATOR_TYPE
      node = resultEvaluate.iterateNext();
      while (node) {
        res = res + "\n" + node.toString();
        node = resultEvaluate.iterateNext();
      }
      break;
    default:
      res = null;
      break;
  }

  return res;
}

/*
* Querys an XML file with an XQuery query.
  // TODO: try saxon 
*/
/*const queryXMLXQuery = (query, fileContent) => {
  const resQuery = "";
  try {
    const baseXSession = basex.Session();
    const dom = new JSDOM(fileContent);
    //const document = dom.window.document;
    const docString = dom.serialize();
    //const resQuery = xpath.select(query, document);
  

    baseXSession.execute("xquery", query, { input : docString }, (error, result) => {
      if(error){
        resQuery = null;
        console.log("Invalid query or an error occurred during execution", error);
      }
      else{
        resQuery = result.result;
        console.log(result.result)
      }
      baseXSession.close();
    });
  } catch (e) {
    console.log(e);
  }

  return resQuery;
}*/

/* 
* Parses an XML file.
*/
const parseXML = fileContent => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fileContent, 'application/xml');
  //const root = doc.documentElement;

  const data = {
    namespaces: "",
    namespacePrefixes: "",
    elements: []
  };

  const elements = doc.getElementsByTagName('*');
  const elementsArray = Array.from(elements);

  if (elementsArray[0].namespaceURI) {
    data.namespaces = elementsArray[0].namespaceURI;
  }

  if (elementsArray[0].prefix) {
    data.namespacePrefixes = elementsArray[0].prefix;
  }

  for (const element of elementsArray) {
      
    const elementData = {
      tagName: element.tagName,
      attributes: {},
      textContent: ""
    };

    const attributes = element.attributes;
    const attributesArray = Array.from(attributes);

    for (const attribute of attributesArray) {
      elementData.attributes[attribute.name] = attribute.value;
    }

    if (element.textContent) {
      elementData.textContent = element.textContent.trim();
    }

    data.elements.push(elementData);
  }

  return data;
};

/* 
* Parses an RDF/XML file.
*/
const parseRDFXML = fileContent => {
    const store = rdflib.graph();
    const data = {
      namespaces: {},
      statements: []
    };

    try {
      // Attempt to find the original namespace URI in the file
      const uri = findUriRDFXML(fileContent);
      
      rdflib.parse(fileContent, store, uri, 'application/rdf+xml', (err, stat) => {
        data.statements = stat.statements;
        data.namespaces = stat.namespaces;
      });
  
    } catch (e) {
      console.error(`Error finding original namespace URI: ${e}`)
    }

    return data;
  };

/* 
* ODM class to represent a generic query. 
*/
class Query {
  
  /* 
  * Constructor for a query.
  */
  constructor(queryFile, queryNum, queryText, queryLang, queryRes) {
    this.queryFile = queryFile;
    this.queryNum = queryNum;
    this.queryText = queryText;
    this.queryLang = queryLang;
    this.queryRes = queryRes;
  }

}

/* 
* ODM class to represent a generic file. 
*/
class DataFile {
  
  constructor(fileName, fileContent, fileFormat) {
    this.fileName = fileName;
    this.fileContent = fileContent;
    this.fileFormat = fileFormat;
    this.fileParsed = {};
    this.fileQueries = [];
  }

  /*
  * Parsing of the file based on the format.
  */
  async parseFile() {

    switch (this.fileFormat) {
      case '.xml':
        this.fileParsed = parseXML(this.fileContent);
        break;
      case '.rdf':
        this.fileParsed = parseRDFXML(this.fileContent);
        break;
    }
    
  }

  /*
  * Querying of the file based on the format and the query language.
  */
  async queryFile(query, queryLang) {
    switch (this.fileFormat) {
      case '.xml':
        switch (queryLang) {
          case 'xpath':
            const queryRes = queryXMLXPath(query, this.fileContent);
            const queryOb = new Query(this.fileName, this.fileQueries.length, query, queryLang, queryRes);
            
            this.fileQueries.push(queryOb);
            break;
            
          case 'xquery':
            //return queryXML(query, this.fileContent);
            break;
          default:
            console.error(`Can't perform a ${queryLang} query on XML file.`);
            break;
        }
    }
  }
}

class FileCollection {
  constructor(collName) {
    this.collName = collName;
    this.collFiles = [];
  }

  async pushDataFile(dataFile) {
    this.collFiles.push(dataFile);
  }

  async constructFromJson(json) {
    json.collFiles.forEach(file => {
      var dataFile = new DataFile(file.fileName, file.fileContent, file.fileFormat);

      dataFile.fileParsed = file.fileParsed;

      file.fileQueries.forEach(query => {
        dataFile.fileQueries.push(query);
      })

      this.collFiles.push(dataFile);
    });
  }
}

module.exports = {DataFile, FileCollection}
