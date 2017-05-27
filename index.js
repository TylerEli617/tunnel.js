function setupPipe(leftConnection, rightConnection)
{
    function writeDataToLeftConnection(data)
    {
        leftConnection.write(data);
    }
    
    function writeDataToRightConnection(data)
    {
        rightConnection.write(data);
    }
    
    function cleanupConnections()
    {
        leftConnection.removeListener('close', cleanupConnections);
        rightConnection.removeListener('close', cleanupConnections);
        leftConnection.cleanup();
        rightConnection.cleanup();
    }
    
    leftConnection.addListener('close', cleanupConnections);
    rightConnection.addListener('close', cleanupConnections);
    leftConnection.addListener('data', writeDataToRightConnection);
    rightConnection.addListener('data', writeDataToLeftConnection);
}

function forwardConnection(openConnection, listener)
{
    function setupListenerConnection(listenerConnection)
    {
        var dataCache = [];
        
        function cacheData(data)
        {
            dataCache.push(data);
        }
        
        function writeDataCache(connection)
        {
            while (dataCache.length > 0)
            {
                var data = dataCache.shift();
                connection.write(data);
            }
        }
        
        function connectionFailed()
        {
            listenerConnection.cleanup();
        }
        
        function connectionOpened(openedConnection)
        {
            listenerConnection.removeListener('data', cacheData);
            setupPipe(openedConnection, listenerConnection);
            writeDataCache(openedConnection);
        }
        
        listenerConnection.addListener('data', cacheData);
        openConnection(connectionOpened, connectionFailed);
    }
    
    listener.addListener('connection', setupListenerConnection);
    
    var returnObject =
    {
        connectionListener : setupListenerConnection
    };
    
    return returnObject;
}

exports.forwardConnection = forwardConnection;
exports.forwardTunnelProxy = forwardConnection;
exports.forwardTunnelEndpoint = forwardConnection;

function reverseTunnelProxy(endpointListener, clientListener, maxAttemptCount = 10)
{
    var cachedEndpointConnections = [];
    
    function cacheEndpointConnection(endpointConnection)
    {
        function filterOutThisConnection(connectionRecord)
        {
            return endpointConnection !== connectionRecord.connection;
        }
        
        function cleanup()
        {
            endpointConnection.removeListener('close', cleanup);
            cachedEndpointConnections = cachedEndpointConnections.filter(filterOutThisConnection);
            endpointConnection.cleanup();
        }
        
        endpointConnection.addListener('close', cleanup);
        cachedEndpointConnections.push({connection : endpointConnection, cleanup : cleanup});
    }
    
    function pipeToEndpoint(clientConnection)
    {
        var attemptCount = 0;
        
        function attemptPipeToEndpoint()
        {
            attemptCount++;
            
            if (cachedEndpointConnections.length > 0)
            {
                endpointConnectionRecord = cachedEndpointConnections.shift();
                endpointConnection = endpointConnectionRecord.connection;
                endpointConnection.removeListener('close', endpointConnectionRecord.cleanup);
                setupPipe(endpointConnection, clientConnection);
            }
            else if (attemptCount === maxAttemptCount)
            {
                clientConnection.cleanup();
            }
            else
            {
                setTimeout(attemptPipeToEndpoint, 0);
            }
        }
        
        setTimeout(attemptPipeToEndpoint, 0);
    }
    
    endpointListener.addListener('connection', cacheEndpointConnection);
    clientListener.addListener('connection', pipeToEndpoint);
    
    var returnObject =
    {
        endpointConnectionListener : setupListenerConnection,
        clientConnectionListener : pipeToEndpoint,
    };
    
    return returnObject;
}

function reverseTunnelEndpoint(openResourceConnection, openProxyConnection, maxIdleConnections = 10)
{
    var idleConnections = [];
    var connectingIdleConnectionCount = 0;
    var continueMaintainingIdleConnections = true;
    
    function proxyConnectionOpened(proxyConnection)
    {
        var dataCache = [];
        var proxyConnectionGone = false;
        
        function cacheData(data)
        {
            dataCache.push(data);
        }
        
        function writeDataCache(connection)
        {
            while (dataCache.length > 0)
            {
                var data = dataCache.shift();
                connection.write(data);
            }
        }
        
        function resourceConnectionOpened(resourceConnection)
        {
            if (proxyConnectionGone)
            {
                resourceConnection.cleanup();
            }
            else
            {
                proxyConnection.removeListener('data', cacheData);
                proxyConnection.removeListener('close', cleanup);
                writeDataCache(resourceConnection);
                setupPipe(resourceConnection, proxyConnection);
            }
        }
        
        function resourceConnectionFailed()
        {
            cleanup();
        }
        
        function filterOutThisConnection(connectionRecord)
        {
            return proxyConnection !== connectionRecord.connection;
        }
        
        function cleanup()
        {
            proxyConnectionGone = true;
            proxyConnection.removeListener('close', cleanup);
            idleConnections = idleConnections.filter(filterOutThisConnection);
            proxyConnection.cleanup();
        }
        
        function firstData(data)
        {
            cacheData(data);
            proxyConnection.removeListener('close', cleanup);
            proxyConnection.removeListener('data', firstData);
            proxyConnection.addListener('data', cacheData);
        }
        
        connectingIdleConnectionCount--;
        
        if (continueMaintainingIdleConnections)
        {
            proxyConnection.addListener('close', cleanup);
            proxyConnection.addListener('data', firstData);
            idleConnections.push({connection : proxyConnection, cleanup : cleanup});
        }
        else
        {
            cleanup();
        }
    }
    
    function proxyConnectionFailed()
    {
        connectingIdleConnectionCount--;
    }
    
    function maintainIdleConnections()
    {
        if (continueMaintainingIdleConnections)
        {
            while ((idleConnections.length + connectingIdleConnectionCount) < maxIdleConnections)
            {
                connectingIdleConnectionCount++;
                openProxyConnection(proxyConnectionOpened, proxyConnectionFailed);
            }
        
            setTimeout(maintainIdleConnections, 0);
        }
    }
    
    var returnObject =
    {
        stop = stopMaintainingIdleConnections
    };
    
    return returnObject;
}

exports.reverseTunnelProxy = reverseTunnelProxy;
exports.reverseTunnelEndpoint = reverseTunnelEndpoint;
