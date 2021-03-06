// packages
const pkExpress = require( 'express' ) ;
const pkBodyParser = require( 'body-parser' ) ;
const pkEjs = require( 'ejs' ) ;

const pkRequest = require( 'request' ) ;
const pkJwt = require( 'jsonwebtoken' ) ;
const { v4 : pkUuidv4 } = require( 'uuid' ) ;
const pkQueryString = require( 'querystring' ) ;
const pkQueryStringEncode = require( 'querystring' ).encode ;
const pkCrypto = require( 'crypto' ) ;

const pkMySQL = require( 'mysql' ) ;

// globals
var gApp = pkExpress(  ) ;
var gApiKeyObject = null ;
var gApiTickerArray = null ;
var gOrderForm = null ;
var gApiOrderObject = new Object(  ) ;
var gApiAutoOrderObject = new Object(  ) ;
var gMessage = '' ;

// globals functions
function g_checkKey( AccessKey , SecretKey )
{
	if( AccessKey == '' )
		return false ;
	else if( SecretKey == '' )
		return false ;
	return true ;
}
function g_getTokenUpbit( AccessKey , SecretKey , Method , Path , Body , Query )
{	
	var Payload = 
	{
		access_key : AccessKey , 
		nonce : pkUuidv4(  )
	} ;
	if( Body != null )
	{
		Payload[ 'query_hash' ] = pkCrypto.createHash( 'sha512' ).update( pkQueryStringEncode( Body ) , 'utf-8' ).digest( 'hex' ) ;
		Payload[ 'query_hash_alg' ] = 'SHA512' ;
	}
	
	var Result = 
	{
		method : Method , 
		url : 'https://api.upbit.com/' + Path + ( Query == null ? '' : pkQueryStringEncode( Query ) ) , 
		headers : { Authorization : 'Bearer ' + pkJwt.sign( Payload , SecretKey ) }
	} ;
	if( Body != null )
		Result[ 'json' ] = Body ;
	
	return Result ;
}
function g_getTokenBitstamp( AccessKey , SecretKey , Method , Path , Body )
{
	var Result = 
	{
		Header : null ,
		Signature : null ,
		Message : null , 
		Options : null 
	} ;
	
	Result.Header = 
	{
		'X-Auth' : 'BITSTAMP ' + AccessKey , 
		'X-Auth-Signature' : null , 
		'X-Auth-Nonce' : String( pkUuidv4(  ) ) , 
		'X-Auth-Timestamp' : String( Date.now(  ) ) , 
		'X-Auth-Version' : 'v2' 
	} ;
	if( Body != null )
		Result.Header[ 'Content-Type' ] = 'application/x-www-form-urlencoded' ;
	Result.Message = Result.Header[ 'X-Auth' ] + 
					Method + 
					'www.bitstamp.net' + 
					'/api/' + Path + 
					'' + 
					( Body == null ? '' : Result.Header[ 'Content-Type' ] ) + 
					Result.Header[ 'X-Auth-Nonce' ] + 
					Result.Header[ 'X-Auth-Timestamp' ] + 
					Result.Header[ 'X-Auth-Version' ] + 
					( Body == null ? '' : pkQueryString.stringify( Body ) ) ;
	
	Result.Signature = pkCrypto.createHmac( 'sha256' , SecretKey ).update( Result.Message ).digest( 'hex' ) ;
	Result.Header[ 'X-Auth-Signature' ] = Result.Signature ;
	
	Result.Options = 
	{
		method : Method , 
		url : "https://www.bitstamp.net/api/" + Path , 
		headers : Result.Header
	} ;
	if( Body != null )
		Result.Options[ 'body' ] = pkQueryString.stringify( Body ) ;
	
	return Result ;
}

// setting
gApp.set( 'views' , __dirname + '/views' ) ;
gApp.set( 'view engine' , 'ejs' ) ;

gApp.use( pkExpress.static( __dirname + '/' ) ) ;
gApp.use( pkBodyParser.urlencoded( { extended : false } ) ) ;

// routings
gApp.get
( 
	'/' , 
	( Req , Res ) => 
	{
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerArray , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm , 
			ApiMessage : gMessage 
		} ;
		Res.render( "index" , Context ) ;
	}
) ;
gApp.get
( 
	'/api_initDB' , 
	( Req , Res ) => 
	{
		gApiKeyObject = null ;
		gApiTickerArray = null ;
		
		gApiOrderObject = new Object(  ) ;
		gApiAutoOrderObject = new Object(  ) ;
		
		var DBConnection = pkMySQL.createConnection
		(
			{
				host : 'puppysss.cafe24.com' , 
				user : 'puppysss' , 
				password : Req.query.DBPW , 
				database : 'puppysss' , 
				port : '3306' 
			}
		) ;
		DBConnection.connect(  ) ;
		
		DBConnection.query
		(
			'SELECT * FROM apiKey' , 
			function ( Err , Rows , Fields )
			{
				if( Err )
				{
					gMessage = Err ;
					return ;
				}
				
				gApiKeyObject = new Object(  ) ;
				gApiKeyObject[ 'Upbit' ] = new Array(  ) ;
				gApiKeyObject[ 'Bitstamp' ] = new Array(  ) ;
				
				for( var Key in Rows )
				{
					var ExchangeName = Rows[ Key ][ 'X' ] ;
					var Index = Rows[ Key ][ 'Number' ] ;
					var Name = Rows[ Key ][ 'Name' ] ; 
					var AccessKey = Rows[ Key ][ 'AccessKey' ] ;
					var SecretKey = Rows[ Key ][ 'SecretKey' ] ;
					var TradeAccessKey = Rows[ Key ][ 'TradeAccessKey' ] ;
					var TradeSecretKey = Rows[ Key ][ 'TradeSecretKey' ] ;
					
					ExchangeName = ( Buffer.isBuffer( ExchangeName ) ? ExchangeName.toString(  ) : ExchangeName ) ;
					Name = ( Buffer.isBuffer( Name ) ? Name.toString(  ) : Name ) ;
					AccessKey = ( Buffer.isBuffer( AccessKey ) ? AccessKey.toString(  ) : AccessKey ) ;
					SecretKey = ( Buffer.isBuffer( SecretKey ) ? SecretKey.toString(  ) : SecretKey ) ;
					TradeAccessKey = ( Buffer.isBuffer( TradeAccessKey ) ? TradeAccessKey.toString(  ) : TradeAccessKey ) ;
					TradeSecretKey = ( Buffer.isBuffer( TradeSecretKey ) ? TradeSecretKey.toString(  ) : TradeSecretKey ) ;
					
					gApiKeyObject[ ExchangeName ][ Index ] = new Object(  ) ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'Name' ] = Name ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'AccessKey' ] = AccessKey ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'SecretKey' ] = SecretKey ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'TradeAccessKey' ] = TradeAccessKey ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'TradeSecretKey' ] = TradeSecretKey ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'AccountInfo' ] = null ;
					gApiKeyObject[ ExchangeName ][ Index ][ 'OrderStatus' ] = 0 ;
				}
			}
		) ;
		DBConnection.query
		(
			'SELECT * FROM apiTicker' , 
			function ( Err , Rows , Fields )
			{
				if( Err )
				{
					gMessage = Err ;
					return ;
				}
				
				gApiTickerArray = new Array(  ) ;
				
				for( var Index in Rows )
				{
					var Ticker = Rows[ Index ][ 'Ticker' ] ;
					
					Ticker = ( Buffer.isBuffer( Ticker ) ? Ticker.toString(  ) : Ticker ) ;
					
					gApiTickerArray[ Index ] = Ticker ;
				}
			}
		) ;
		
		DBConnection.end(  ) ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerArray , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm , 
			ApiMessage : gMessage 
		} ;
		Res.render( "index" , Context ) ;
	}
) ;
gApp.listen
( 
	8001 , 
	(  ) => 
	{
		gMessage = "I'm listening." ;
	}
) ;

// orders
gApp.get
(
	'/api_placeOrder' , 
	( Req , Res ) => 
	{
		if( gApiKeyObject == null )
			return ;
		
		var OrderPlacerX = Req.query.OrderPlacer.split( '_' )[ 0 ] ;
		var OrderPlacerIndex = parseInt( Req.query.OrderPlacer.split( '_' )[ 1 ] ) ;
		
		requestOrder( Req.query , OrderPlacerX , OrderPlacerIndex ) ;
		
		gOrderForm = new Object(  ) ;
		gOrderForm.Ticker = Req.query.Ticker ;
		gOrderForm.Placement = Req.query.OrderPlacement ;
		gOrderForm.Placer = Req.query.OrderPlacer ;
		gOrderForm.Price = Req.query.Price ;
		gOrderForm.Size = Req.query.Size ;
		gOrderForm.Interval = Req.query.Interval ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerArray , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm , 
			ApiMessage : gMessage 
		} ;
		Res.render( "index" , Context ) ;
	}
)

gApp.get
(
	'/api_cancelOrder' , 
	( Req , Res ) => 
	{
		var CancelPlacerX = Req.query.OrderCancelPlacer.split( '_' )[ 0 ] ;
		var CancelPlacerIndex = parseInt( Req.query.OrderCancelPlacer.split( '_' )[ 1 ] ) ;
		var OrderId = Req.query.OrderId ;
		
		cancelOrder( CancelPlacerX , CancelPlacerIndex , OrderId ) ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerArray , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm , 
			ApiMessage : gMessage 
		} ;
		Res.render( "index" , Context ) ;
	}
)
gApp.get
(
	'/api_cancelAllOrders' , 
	( Req , Res ) => 
	{
		if( gApiKeyObject == null )
			return ;
		
		cancelAllOrders(  ) ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerArray , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm , 
			ApiMessage : gMessage 
		} ;
		Res.render( "index" , Context ) ;
	}
)

// updates
gApp.post
(
	'/api_update' , 
	( Req , Res ) => 
	{
		updateAccounts(  ) ;
		updateOrders(  ) ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerArray , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm , 
			ApiMessage : gMessage 
		} ;
		Res.render( "index" , Context ) ;
	}
)

/* update */
function updateAccounts(  )
{
	if( gApiKeyObject == null )
		return ;
	
	/* Account Status*/
	// Upbit
	if( gApiKeyObject.Upbit[ 0 ].Name != null )
	{
		var Options = g_getTokenUpbit( gApiKeyObject.Upbit[ 0 ].AccessKey , gApiKeyObject.Upbit[ 0 ].SecretKey , 'GET' , 'v1/accounts' , null , null ) ;
		
		pkRequest
		( 
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiKeyObject.Upbit[ 0 ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiKeyObject.Upbit[ 0 ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiKeyObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].Ticker = AccountObject[ AccountIndex ].currency ;
					gApiKeyObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].Balance = AccountObject[ AccountIndex ].balance ;
					gApiKeyObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].Locked = AccountObject[ AccountIndex ].locked ;
					gApiKeyObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].AvgPrice = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
	if( gApiKeyObject.Upbit[ 1 ].Name != null )
	{
		var Options = g_getTokenUpbit( gApiKeyObject.Upbit[ 1 ].AccessKey , gApiKeyObject.Upbit[ 1 ].SecretKey , 'GET' , 'v1/accounts' , null , null ) ;

		pkRequest
		( 
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiKeyObject.Upbit[ 1 ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiKeyObject.Upbit[ 1 ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiKeyObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].Ticker = AccountObject[ AccountIndex ].currency ;
					gApiKeyObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].Balance = AccountObject[ AccountIndex ].balance ;
					gApiKeyObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].Locked = AccountObject[ AccountIndex ].locked ;
					gApiKeyObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].AvgPrice = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
	if( gApiKeyObject.Upbit[ 2 ].Name != null )
	{
		var Options = g_getTokenUpbit( gApiKeyObject.Upbit[ 2 ].AccessKey , gApiKeyObject.Upbit[ 2 ].SecretKey , 'GET' , 'v1/accounts' , null , null ) ;

		pkRequest
		( 
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiKeyObject.Upbit[ 2 ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiKeyObject.Upbit[ 2 ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiKeyObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].Ticker = AccountObject[ AccountIndex ].currency ;
					gApiKeyObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].Balance = AccountObject[ AccountIndex ].balance ;
					gApiKeyObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].Locked = AccountObject[ AccountIndex ].locked ;
					gApiKeyObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].AvgPrice = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
	
	// Bitstamp
	var Result ;
	if( gApiKeyObject.Bitstamp[ 0 ].Name != null )
	{
		Result = g_getTokenBitstamp( gApiKeyObject.Bitstamp[ 0 ].AccessKey , gApiKeyObject.Bitstamp[ 0 ].SecretKey , 'POST' , 'v2/balance/' , null ) ;
		pkRequest
		(
			Result.Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiKeyObject.Bitstamp[ 0 ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiKeyObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiKeyObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiKeyObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiKeyObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
	if( gApiKeyObject.Bitstamp[ 1 ].Name != null )
	{
		Result = g_getTokenBitstamp( gApiKeyObject.Bitstamp[ 1 ].AccessKey , gApiKeyObject.Bitstamp[ 1 ].SecretKey , 'POST' , 'v2/balance/' , null ) ;
		pkRequest
		(
			Result.Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiKeyObject.Bitstamp[ 1 ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiKeyObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiKeyObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiKeyObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiKeyObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
	if( gApiKeyObject.Bitstamp[ 2 ].Name != null )
	{
		Result = g_getTokenBitstamp( gApiKeyObject.Bitstamp[ 2 ].AccessKey , gApiKeyObject.Bitstamp[ 2 ].SecretKey , 'POST' , 'v2/balance/' , null ) ;
		pkRequest
		(
			Result.Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiKeyObject.Bitstamp[ 2 ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiKeyObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiKeyObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiKeyObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiKeyObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
}
function updateOrders(  )
{
	if( gApiKeyObject == null )
		return ;
		
	var TradeAccessKey ;
	var TradeSecretKey ;
	
	// Upbit
	TradeAccessKey = gApiKeyObject.Upbit[ 0 ].AccessKey ;
	TradeSecretKey = gApiKeyObject.Upbit[ 0 ].SecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'GET' , 'v1/orders?' , { state : 'wait' } , { state : 'wait' } ) ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				if( gApiKeyObject.Upbit[ 0 ].OrderStatus != 2 )
				{
					if( 'error' in Body == true || Body.length == 0 )
					{
						gApiKeyObject.Upbit[ 0 ].OrderStatus = 0 ;
						gApiOrderObject[ 'Upbit_0' ] = null ;
					}
					else
					{
						gApiOrderObject[ 'Upbit_0' ] = new Array(  ) ;
						for( var Index in Body )
						{
							gApiOrderObject[ 'Upbit_0' ][ Index ] = 
							{
								Id : Body[ Index ][ 'uuid' ] , 
								Ticker : Body[ Index ][ 'market' ] , 
								Type : Body[ Index ][ 'side' ] == 'bid' ? 'Buy' : 'Sell' , 
								Price : Body[ Index ][ 'price' ] , 
								Size : Body[ Index ][ 'remaining_volume' ] 
							} ;
						}
						gApiKeyObject.Upbit[ 0 ].OrderStatus = 1 ;
					}
				}
			}
		) ;
	}
	TradeAccessKey = gApiKeyObject.Upbit[ 1 ].AccessKey ;
	TradeSecretKey = gApiKeyObject.Upbit[ 1 ].SecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'GET' , 'v1/orders?' , { state : 'wait' } , { state : 'wait' } ) ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				if( gApiKeyObject.Upbit[ 1 ].OrderStatus != 2 )
				{
					if( 'error' in Body == true || Body.length == 0 )
					{
						gApiKeyObject.Upbit[ 1 ].OrderStatus = 0 ;
						gApiOrderObject[ 'Upbit_1' ] = null ;
					}
					else
					{
						gApiOrderObject[ 'Upbit_1' ] = new Array(  ) ;
						for( var Index in Body )
						{
							gApiOrderObject[ 'Upbit_1' ][ Index ] = 
							{
								Id : Body[ Index ][ 'uuid' ] , 
								Ticker : Body[ Index ][ 'market' ] , 
								Type : Body[ Index ][ 'side' ] == 'bid' ? 'Buy' : 'Sell' , 
								Price : Body[ Index ][ 'price' ] , 
								Size : Body[ Index ][ 'remaining_volume' ] 
							} ;
						}
						gApiKeyObject.Upbit[ 1 ].OrderStatus = 1 ;
					}
				}
			}
		) ;
	}
	TradeAccessKey = gApiKeyObject.Upbit[ 2 ].AccessKey ;
	TradeSecretKey = gApiKeyObject.Upbit[ 2 ].SecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'GET' , 'v1/orders?' , { state : 'wait' } , { state : 'wait' } ) ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				if( gApiKeyObject.Upbit[ 2 ].OrderStatus != 2 )
				{
					if( 'error' in Body == true || Body.length == 0 )
					{
						gApiKeyObject.Upbit[ 2 ].OrderStatus = 0 ;
						gApiOrderObject[ 'Upbit_2' ] = null ;
					}
					else
					{
						gApiOrderObject[ 'Upbit_2' ] = new Array(  ) ;
						for( var Index in Body )
						{
							gApiOrderObject[ 'Upbit_2' ][ Index ] = 
							{
								Id : Body[ Index ][ 'uuid' ] , 
								Ticker : Body[ Index ][ 'market' ] , 
								Type : Body[ Index ][ 'side' ] == 'bid' ? 'Buy' : 'Sell' , 
								Price : Body[ Index ][ 'price' ] , 
								Size : Body[ Index ][ 'remaining_volume' ] 
							} ;
						}
						gApiKeyObject.Upbit[ 2 ].OrderStatus = 1 ;
					}
				}
			}
		) ;
	}
	
	// Bitstamp
	TradeAccessKey = gApiKeyObject.Bitstamp[ 0 ].TradeAccessKey ;
	TradeSecretKey = gApiKeyObject.Bitstamp[ 0 ].TradeSecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		var Result = g_getTokenBitstamp( TradeAccessKey , TradeSecretKey , 'POST' , 'v2/open_orders/all/' , null ) ;
		pkRequest
		(
			Result.Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var Result = JSON.parse( Body ) ;
				
				if( gApiKeyObject.Bitstamp[ 0 ].OrderStatus != 2 )
				{
					if( 'status' in Result == true || Result.length == 0 )
					{
						gApiKeyObject.Bitstamp[ 0 ].OrderStatus = 0 ;
						gApiOrderObject[ 'Bitstamp_0' ] = null ;
					}
					else
					{
						gApiOrderObject[ 'Bitstamp_0' ] = new Array(  ) ;
						for( var Index in Result )
						{
							gApiOrderObject[ 'Bitstamp_0' ][ Index ] = 
							{
								Id : Result[ Index ][ 'id' ] , 
								Ticker : Result[ Index ][ 'currency_pair' ] , 
								Type : Result[ Index ][ 'type' ] == 0 ? 'Buy' : 'Sell' , 
								Price : Result[ Index ][ 'price' ] , 
								Size : Result[ Index ][ 'amount' ] 
							} ;
						}
						gApiKeyObject.Bitstamp[ 0 ].OrderStatus = 1 ;
					}
				}
			}
		) ;
	}
	TradeAccessKey = gApiKeyObject.Bitstamp[ 1 ].TradeAccessKey ;
	TradeSecretKey = gApiKeyObject.Bitstamp[ 1 ].TradeSecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		var Result = g_getTokenBitstamp( TradeAccessKey , TradeSecretKey , 'POST' , 'v2/open_orders/all/' , null ) ;
		pkRequest
		(
			Result.Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var Result = JSON.parse( Body ) ;
				
				if( gApiKeyObject.Bitstamp[ 1 ].OrderStatus != 2 )
				{
					if( 'status' in Result == true || Result.length == 0 )
					{
						gApiKeyObject.Bitstamp[ 1 ].OrderStatus = 0 ;
						gApiOrderObject[ 'Bitstamp_1' ] = null ;
					}
					else
					{
						gApiOrderObject[ 'Bitstamp_1' ] = new Array(  ) ;
						for( var Index in Result )
						{
							gApiOrderObject[ 'Bitstamp_1' ][ Index ] = 
							{
								Id : Result[ Index ][ 'id' ] , 
								Ticker : Result[ Index ][ 'currency_pair' ] , 
								Type : Result[ Index ][ 'type' ] == 0 ? 'Buy' : 'Sell' , 
								Price : Result[ Index ][ 'price' ] , 
								Size : Result[ Index ][ 'amount' ] 
							} ;
						}
						gApiKeyObject.Bitstamp[ 1 ].OrderStatus = 1 ;
					}
				}
			}
		) ;
	}
	TradeAccessKey = gApiKeyObject.Bitstamp[ 2 ].TradeAccessKey ;
	TradeSecretKey = gApiKeyObject.Bitstamp[ 2 ].TradeSecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		var Result = g_getTokenBitstamp( TradeAccessKey , TradeSecretKey , 'POST' , 'v2/open_orders/all/' , null ) ;
		pkRequest
		(
			Result.Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var Result = JSON.parse( Body ) ;
				
				if( gApiKeyObject.Bitstamp[ 2 ].OrderStatus != 2 )
				{
					if( 'status' in Result == true || Result.length == 0 )
					{
						gApiKeyObject.Bitstamp[ 2 ].OrderStatus = 0 ;
						gApiOrderObject[ 'Bitstamp_2' ] = null ;
					}
					else
					{
						gApiOrderObject[ 'Bitstamp_2' ] = new Array(  ) ;
						for( var Index in Result )
						{
							gApiOrderObject[ 'Bitstamp_2' ][ Index ] = 
							{
								Id : Result[ Index ][ 'id' ] , 
								Ticker : Result[ Index ][ 'currency_pair' ] , 
								Type : Result[ Index ][ 'type' ] == 0 ? 'Buy' : 'Sell' , 
								Price : Result[ Index ][ 'price' ] , 
								Size : Result[ Index ][ 'amount' ] 
							} ;
						}
						gApiKeyObject.Bitstamp[ 2 ].OrderStatus = 1 ;
					}
				}
			}
		) ;
	}
}

/* order */
function checkFatFinger( PlacerX , Placement , Price , Size , Interval )
{
	if( Placement == 'LimitBuy' || Placement == 'LimitSell' )
	{
		if
		( 
			Number.isNaN( parseFloat( Price ) ) == true || 
			parseFloat( Price ) <= 0.0 || 
			Number.isNaN( parseFloat( Size ) ) == true || 
			parseFloat( Size ) <= 0.0 
		)
			return false ;
	}
	else if( Placement == 'AutoMarketBuy' )
	{
		if( PlacerX == 'Upbit' )
		{
			if
			( 
				Number.isNaN( parseFloat( Price ) ) == true || 
				parseFloat( Price ) <= 0.0 || 
				Number.isNaN( parseInt( Interval ) ) == true || 
				parseInt( Interval ) <= 0 
			)
				return false ;
		}
		else
		{
			if
			( 
				Number.isNaN( parseFloat( Size ) ) == true || 
				parseFloat( Size ) <= 0.0 || 
				Number.isNaN( parseInt( Interval ) ) == true || 
				parseInt( Interval ) <= 0 
			)
				return false ;
		}
	}
	else if( Placement == 'AutoMarketSell' )
	{
		if
		( 
			Number.isNaN( parseFloat( Size ) ) == true || 
			parseFloat( Size ) <= 0.0 || 
			Number.isNaN( parseInt( Interval ) ) == true || 
			parseInt( Interval ) <= 0 
		)
			return false ;
	}
	else
		return false ;
	
	return true ;
}

function requestOrder( FormData , PlacerX , PlacerIndex )
{
	if( gApiKeyObject == null )
		return ;
	else if
	(
		( gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeAccessKey == null )
		||
		( gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeSecretKey == null )
	)
	{
		gMessage = "거래 Api 키가 없습니다." ;
		return ;
	}
	else if
	( gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus > 0 )
	{
		gMessage = "주문이 실행 중입니다." ;
		return ;
	}
	else if( checkFatFinger( PlacerX , FormData.OrderPlacement , FormData.Price , FormData.Size , FormData.Interval ) == false )
	{
		gMessage = "주문이 유효하지 않습니다." ;
		return ;
	}
	
	var TradeAccessKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeAccessKey ;
	var TradeSecretKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeSecretKey ;
	var Options ;
	
	switch( PlacerX )
	{
		case 'Upbit' : 
			switch( FormData.OrderPlacement )
			{
				case 'LimitBuy' : 
					var Body = 
					{
						market : FormData.Ticker , 
						side : 'bid' , 
						volume : FormData.Size , 
						price : FormData.Price , 
						ord_type : 'limit' 
					} ;
					var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'POST' , 'v1/orders' , Body , null ) ;
					
					pkRequest
					(
						Options , ( Err , Res , Body ) => 
						{
							if( Err )
								throw new Error( Err ) ;
							
							if( 'error' in Body == true )
							{
								gMessage = "지정가 매수 주문 실패" + JSON.stringify( Body ) ;
							}
							else
								gMessage = "지정가 매수 주문 성공" ;
						}
					) ;
				break ;
				case 'LimitSell' : 
					var Body = 
					{
						market : FormData.Ticker , 
						side : 'ask' , 
						volume : FormData.Size , 
						price : FormData.Price , 
						ord_type : 'limit' 
					} ;
					var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'POST' , 'v1/orders' , Body , null ) ;
					
					pkRequest
					(
						Options , ( Err , Res , Body ) => 
						{
							if( Err )
								throw new Error( Err ) ;
							
							if( 'error' in Body == true )
							{
								gMessage = "지정가 매도 주문 실패" + JSON.stringify( Body ) ;
							}
							else
								gMessage = "지정가 매도 주문 성공" ;
						}
					) ;
				break ;
				case 'AutoMarketBuy' : 
					gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = 
					{
						Ticker : FormData.Ticker , 
						Type : 'Buy' , 
						Size : FormData.Price , 
						Interval : parseInt( parseFloat( FormData.Interval ) * 1000 ) , 
						IntervalId : setInterval
						(
							requestIntervalOrder.bind( { X : PlacerX , Index : PlacerIndex } ) , 
							parseInt( parseFloat( FormData.Interval ) * 1000 )
						)
					} ;
					gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 2 ;
				break ;
				case 'AutoMarketSell' : 
					gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = 
					{
						Ticker : FormData.Ticker , 
						Type : 'Sell' , 
						Size : FormData.Size , 
						Interval : parseInt( parseFloat( FormData.Interval ) * 1000 ) , 
						IntervalId : setInterval
						(
							requestIntervalOrder.bind( { X : PlacerX , Index : PlacerIndex } ) , 
							parseInt( parseFloat( FormData.Interval ) * 1000 )
						)
					} ;
					gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 2 ;
				break ;
			}
		break ;
		case 'Bitstamp' : 
			switch( FormData.OrderPlacement )
			{
				case 'LimitBuy' : 
					var RequestBody = 
					{  
							'amount' : FormData.Size , 
							'price' : FormData.Price
					} ;
					var Result = g_getTokenBitstamp( TradeAccessKey , TradeSecretKey , 'POST' , 'v2/buy/' + FormData.Ticker + '/' , RequestBody ) ;
					pkRequest
					(
						Result.Options , ( Err , Res , Body ) => 
						{
							if( Err )
								throw new Error( Err ) ;
							
							var ResultData = JSON.parse( Body ) ;
							
							if( 'status' in ResultData == true )
							{
								gMessage = "지정가 매수 주문 실패" + JSON.stringify( Body ) ;
							}
							else
								gMessage = "지정가 매수 주문 성공" ;
							
						}
					) ;
					gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 1 ;
				break ;
				case 'LimitSell' : 
					var RequestBody = 
					{  
							'amount' : FormData.Size , 
							'price' : FormData.Price
					} ;
					var Result = g_getTokenBitstamp( TradeAccessKey , TradeSecretKey , 'POST' , 'v2/sell/' + FormData.Ticker + '/' , RequestBody ) ;
					pkRequest
					(
						Result.Options , ( Err , Res , Body ) => 
						{
							if( Err )
								throw new Error( Err ) ;
							
							var ResultData = JSON.parse( Body ) ;
							
							if( 'status' in ResultData == true )
							{
								gMessage = "지정가 매도 주문 실패" + JSON.stringify( Body ) ;
							}
							else
								gMessage = "지정가 매도 주문 성공" ;
							
						}
					) ;
					gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 1 ;
				break ;
				
				case 'AutoMarketBuy' : 
					gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = 
					{
						Ticker : FormData.Ticker , 
						Type : 'Buy' , 
						Size : FormData.Size , 
						Interval : parseInt( parseFloat( FormData.Interval ) * 1000 ) , 
						IntervalId : setInterval
						(
							requestIntervalOrder.bind( { X : PlacerX , Index : PlacerIndex } ) , 
							parseInt( parseFloat( FormData.Interval ) * 1000 )
						)
					} ;
					gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 2 ;
				break ;
				case 'AutoMarketSell' : 
					gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = 
					{
						Ticker : FormData.Ticker , 
						Type : 'Sell' , 
						Size : FormData.Size , 
						Interval : parseInt( parseFloat( FormData.Interval ) * 1000 ) , 
						IntervalId : setInterval
						(
							requestIntervalOrder.bind( { X : PlacerX , Index : PlacerIndex } ) , 
							parseInt( parseFloat( FormData.Interval ) * 1000 )
						)
					} ;
					gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 2 ;
				break ;
			}
		break ;
	}
}
function requestIntervalOrder(  )
{
	if( gApiKeyObject == null )
		return ;
	else if
	( 
		gApiKeyObject[ this.X ][ this.Index ].TradeAccessKey == null 
		||
		gApiKeyObject[ this.X ][ this.Index ].TradeSecretKey == null
	)
		return ;
	else if
	( 
		gApiAutoOrderObject[ this.X + '_' + this.Index ] == undefined 
		|| 
		gApiAutoOrderObject[ this.X + '_' + this.Index ] == null 
	)
		return ;
	
	var TradeAccessKey = gApiKeyObject[ this.X ][ this.Index ].TradeAccessKey ;
	var TradeSecretKey = gApiKeyObject[ this.X ][ this.Index ].TradeSecretKey ;
	
	switch( this.X )
	{
		case 'Upbit' : 
			var Body ;
			switch( gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Type' ] )
			{
				case 'Buy' : 
					Body = 
					{
						market : gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Ticker' ] , 
						side : 'bid' , 
						price : gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Size' ] , 
						ord_type : 'price' 
					} ;
				break ;
				case 'Sell' : 
					Body = 
					{
						market : gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Ticker' ] , 
						side : 'ask' , 
						volume : gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Size' ] , 
						ord_type : 'market' 
					} ;
				break ;
			}
			var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'POST' , 'v1/orders' , Body , null ) ;
			
			pkRequest
			(
				Options , ( Err , Res , Body ) => 
				{
					if( Err )
						throw new Error( Err ) ;
					
					if( 'error' in Body == true )
					{
						gMessage = "자동 시장가 주문 실패" + JSON.stringify( Body ) ;
					}
					else
					{
						gMessage = "자동 시장가 주문 성공 : \n" + Body ;
					}
				}
			) ;
		break ;
		
		case 'Bitstamp' : 
			var RequestBody = 
			{  
				'amount' : gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Size' ]
			} ;
			
			switch( gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Type' ] )
			{
				case 'Buy' : 
					var Result = g_getTokenBitstamp
					( 
						TradeAccessKey , TradeSecretKey , 'POST' , 
						'v2/buy/market/' + gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Ticker' ] + '/' , 
						RequestBody 
					) ;
				break ;
				case 'Sell' : 
					var Result = g_getTokenBitstamp
					( 
						TradeAccessKey , TradeSecretKey , 'POST' , 
						'v2/sell/market/' + gApiAutoOrderObject[ this.X + '_' + this.Index ][ 'Ticker' ] + '/' , 
						RequestBody 
					) ;
				break ;
			}
			pkRequest
			(
				Result.Options , ( Err , Res , Body ) => 
				{
					if( Err )
						throw new Error( Err ) ;
					
					var ResultData = JSON.parse( Body ) ;
					
					if( 'status' in ResultData == true )
					{
						gMessage = "자동 시장가 주문 실패" + JSON.stringify( Body ) ;
					}
					else
					{
						gMessage = "자동 시장가 주문 성공 : \n" + Body ;
					}
				}
			) ;
		break ;
	}
}
function cancelOrder( PlacerX , PlacerIndex , OrderId )
{
	if( gApiKeyObject == null )
		return ;
	else if
	(
		( gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeAccessKey == null )
		||
		( gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeSecretKey == null )
	)
	{
		gMessage = "거래 Api 키가 없습니다." ;
		return ;
	}
	else if( gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus == 0 )
	{
		gMessage = "없는 주문입니다." ;
		return ;
	}
	
	var TradeAccessKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeAccessKey ;
	var TradeSecretKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeSecretKey ;
	
	switch( PlacerX )
	{
		case 'Upbit' : 
			if( gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus == 1 )
			{
				var RequestBody = 
				{  
					'uuid' : OrderId
				} ;
				var Options = g_getTokenUpbit( TradeAccessKey , TradeSecretKey , 'DELETE' , 'v1/order?' , RequestBody , RequestBody ) ;
				pkRequest
				(
					Options , ( Err , Res , Body ) => 
					{
						if( Err )
							throw new Error( Err ) ;
						
						if( 'error' in Body == true )
						{
							gMessage = "주문 취소 실패" + JSON.stringify( Body ) ;
						}
						else
							gMessage = "주문 취소 성공" ;
					}
				) ;
			}
			else
			{
				clearInterval( gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ][ 'IntervalId' ] ) ;
				gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = null ;
				gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 0 ;
				gMessage = "자동 시장가 주문 취소 성공" ;
			}
		break ;
		case 'Bitstamp' : 
			if( gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus == 1 )
			{
				var RequestBody = 
				{  
					'id' : OrderId
				} ;
				var Result = g_getTokenBitstamp( TradeAccessKey , TradeSecretKey , 'POST' , 'v2/cancel_order/' , RequestBody ) ;
				pkRequest
				(
					Result.Options , ( Err , Res , Body ) => 
					{
						if( Err )
							throw new Error( Err ) ;
						
						var ResultData = JSON.parse( Body ) ;
						
						if( 'error' in ResultData == true )
						{
							gMessage = "주문 취소 실패" + JSON.stringify( Body ) ;
						}
						else
							gMessage = "주문 취소 성공" ;
					}
				) ;
			}
			else
			{
				clearInterval( gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ][ 'IntervalId' ] ) ;
				gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = null ;
				gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus = 0 ;
				gMessage = "자동 시장가 주문 취소 성공" ;
			}
		break ;
	}
}
function cancelAllOrders(  )
{
	if( gApiKeyObject == null )
		return ;
	
	for( var Key in gApiOrderObject )
	{
		var PlacerX = Key.split( '_' )[ 0 ] ;
		var PlacerIndex = parseInt( Key.split( '_' )[ 1 ] ) ;
		
		for( var Index in gApiOrderObject[ Key ] )
		{
			var OrderId = gApiOrderObject[ Key ][ Index ][ 'Id' ] ;
			cancelOrder( PlacerX , PlacerIndex , OrderId ) ;
		}
	}
	for( var Key in gApiAutoOrderObject )
	{
		var PlacerX = Key.split( '_' )[ 0 ] ;
		var PlacerIndex = parseInt( Key.split( '_' )[ 1 ] ) ;
		
		if( gApiAutoOrderObject[ Key ] != null )
		{
			cancelOrder( PlacerX , PlacerIndex , null ) ;
		}
	}
}
