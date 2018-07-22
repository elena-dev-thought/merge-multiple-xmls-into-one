const klaw = require('klaw');
const xml2js = require('xml2js');
const path = require('path');
const parser = require('xml2js').parseString;
const builder = new xml2js.Builder();
const outputFolder = path.resolve(process.cwd(), process.argv[2]);

const fs = require('fs');

let countOfFailedTests = 0;
let countOfTotalTests = 0;

async function buildResultXml(xmlResults) {
  const jsonResultReport = {
    testsuites: {
      $: { tests: countOfTotalTests, failures: countOfFailedTests },
      testsuite: []
    }
  };
  xmlResults.forEach((xmlResult) => {
    countOfTotalTests += parseInt(xmlResult.testsuites.$.tests, 10);
    countOfFailedTests += parseInt(xmlResult.testsuites.$.failures, 10);
    jsonResultReport.testsuites.testsuite.push(...xmlResult.testsuites.testsuite);
  });
  const resultXml = builder.buildObject(jsonResultReport);
  fs.writeFileSync(path.resolve(outputFolder, 'result.xml'), resultXml);
}

function parseXML(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Parsing xml file ${filePath}`);
    parser(fs.readFileSync(filePath), (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

const items = [];
klaw(outputFolder)
  .on('readable', function () {
    let item = this.read();
    while (item) {
      if (path.extname(item.path) === '.xml') {
        items.push(parseXML(item.path));
      }
      item = this.read();
    }
  })
  .on('end', () => {
    Promise.all(items)
      .then((xmlResults) => {
        buildResultXml(xmlResults);
      })
      .catch(err => console.error(err));
  });
