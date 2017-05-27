function Simple()
{
    this.setup = function(assert, print, testSetTimeout, deffer, makeTestCallback)
    {
    };

    this.SimpleCase = function(assert, print, testSetTimeout, deffer, makeTestCallback)
    {
        require.main.simpleTestRan = true;
    };

    this.tearDown = function(assert, print, testSetTimeout, deffer, makeTestCallback)
    {
    };
}

Simple.staticSetup = function(assert, print, testSetTimeout, deffer, makeTestCallback)
{
};

Simple.testCases = [];
Simple.testCases.push("SimpleCase");

Simple.staticTearDown = function(assert, print, testSetTimeout, deffer, makeTestCallback)
{
};

Simple.name = "Simple";

module.exports = Simple;