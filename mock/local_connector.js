var EventEmitter = require('events').EventEmitter;

function getWriteFunction(state, referenceConnection, pairedConnection)
{
    function writeFunction(data)
    {
        if (state.current !== 'connected')
        {
            throw new Error('Connection not connected');
        }
        
        pairedConnection.emit('data', data);
    }
    
    return writeFunction;
}

function getCloseFunction(state, referenceConnection, pairedConnection)
{
    function closeFunction()
    {
        if (state.current === 'closed')
        {
            throw new Error('Connection already closed');
        }
        
        state.current = 'closed';
        referenceConnection.emit('close');
        pairedConnection.emit('close');
    }
    
    return writeFunction;
}

function LocalConnection()
{
    this.state = 'connected';
    
    this.listenerConnection = new EventEmitter();
    this.connectorConnection = new EventEmitter();
    
    this.listenerConnection.write = getWriteFunction(this, this.listenerConnection, this.connectorConnection);
    this.listenerConnection.close = getCloseFunction(this, this.listenerConnection, this.connectorConnection);
    
    this.connectorConnection.write = getWriteFunction(this, this.connectorConnection, this.listenerConnection);
    this.connectorConnection.close = getCloseFunction(this, this.connectorConnection, this.listenerConnection);
}

function LocalConnector()
{
    this.openConnection = function(connectionSucceeded, connectionFailed)
    {
        var connection = new LocalConnection();
        this.listener.emit('connection', connection.listenerConnection);
        connectionSucceeded(connection.connectorConnection);
    };
    
    this.listener = new EventEmitter();
}
