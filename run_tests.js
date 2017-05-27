var NodeTest = require("merp_node_test.js");
var PrintTest = require("merp_print_test.js");

var path = require("path");

var print = console.log;

var findAndRunTestSuites = NodeTest.findAndRunTestSuites;
var countFailedResults = PrintTest.countFailedResults;
var printResults = PrintTest.getPrintResults(print);

function testsDone(results)
{
    printResults(results);

    if (module.simpleTestRan && (countFailedResults(results) === 0))
    {
        process.exit(0);
    }
    else
    {
        process.exit(1);
    }
}

module.simpleTestRan = false;

if (require.main === module)
{
    findAndRunTestSuites(path.join(process.cwd(), "tests"), print, testsDone);
}
