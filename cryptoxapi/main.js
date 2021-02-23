// packages
const pkExpress = require( 'express' ) ;
const pkBodyParser = require( 'body-parser' ) ;
const pkEjs = require( 'ejs' ) ;

const pkFs = require( 'fs' ) ;
const pkRequest = require( 'request' ) ;
const pkJwt = require( 'jsonwebtoken' ) ;
const { v4 : pkUuidv4 } = require( 'uuid' ) ;
const pkQueryString = require( 'querystring' ) ;
const pkCrypto = require( 'crypto' ) ;

// globals
var gApp = pkExpress(  ) ;
var gApiObject = null ;
var gCount ;

// globals functions
function g_checkKey( AccessKey , SecretKey )
{
	if( AccessKey == '' )
		return false ;
	else if( SecretKey == '' )
		return false ;
	return true ;
}
function g_getTokenUpbit( AccessKey , SecretKey )
{
	var Payload = 
	{
		access_key : AccessKey , 
		nonce : pkUuidv4(  )
	} ;
	
	return pkJwt.sign( Payload , SecretKey ) ;
}

// setting
gApp.set( "view engine" , "ejs" ) ;
gApp.use( pkExpress.static( __dirname + '/' ) ) ;
gApp.use( pkBodyParser.urlencoded( { extended : false } ) ) ;

// routings
gApp.get
( 
	'/' , 
	( Req , Res ) => 
	{
		pkFs.readFile
		(
			'./Key.json' , 
			'utf8' , 
			function( Err , Data )
			{
				if( Err )
					gApiObject = null ;
				else
					gApiObject = JSON.parse( Data ) ;
			}
		) ;
		
		var Context = 
		{
			ApiObject : gApiObject
		} ;
		Res.render( "index" , Context ) ;
	}
) ;

gApp.post
(
	'/api_placeOrder' , 
	( Req , Res ) => 
	{
		
		var Context = 
		{
			ApiObject : gApiObject
		} ;
		Res.render( "index" , Context ) ;
	}
)

gApp.post
(
	'/api_update' , 
	( Req , Res ) => 
	{
		
		var Context = 
		{
			ApiObject : gApiObject
		} ;
		Res.render( "index" , Context ) ;
	}
)

gApp.listen
( 
	7777 , 
	(  ) => 
	{
		console.log( "I'm listening." ) ;
		setInterval( requestAccount , 1000 ) ;
	}
) ;

// sub functions
function requestAccount(  )
{
	if( gApiObject == null )
		return ;
	
	var Options ;
	var Token ;
	
	console.log( "Updating the accounts." ) ;
	
	// Upbit
	for( gCount in gApiObject.Upbit )
	{
		if( gApiObject.Upbit[ gCount ].Name == null )
			continue ;
		
		Token = g_getTokenUpbit( gApiObject.Upbit[ gCount ].AccessKey , gApiObject.Upbit[ gCount ].SecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization : `Bearer ${Token}` }
		} ;

		pkRequest
		( 
			Options , 
			( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ gCount ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiObject.Upbit[ gCount ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiObject.Upbit[ gCount ].AccountInfo[ AccountIndex ].currency = AccountObject[ AccountIndex ].currency ;
					gApiObject.Upbit[ gCount ].AccountInfo[ AccountIndex ].balance = AccountObject[ AccountIndex ].balance ;
					gApiObject.Upbit[ gCount ].AccountInfo[ AccountIndex ].locked = AccountObject[ AccountIndex ].locked ;
					gApiObject.Upbit[ gCount ].AccountInfo[ AccountIndex ].avg_buy_price = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
		
	// Bitstamp
	for( gCount in gApiObject.Bitstamp )
	{
		if( gApiObject.Bitstamp[ gCount ].Name == null )
			continue ;
		
		var Headers = 
		{
			'X-Auth' : 'BITSTAMP ' + gApiObject.Bitstamp[ gCount ].AccessKey , 
			'X-Auth-Signature' : null , 
			'X-Auth-Nonce' : String( pkUuidv4(  ) ) , 
			'X-Auth-Timestamp' : String( Date.now(  ) ) , 
			'X-Auth-Version' : 'v2' 
		} ;
		var Message = Headers[ 'X-Auth' ] + 
			'POST' + 
			'www.bitstamp.net' + 
			'/api/v2/balance/' + 
			'' + 
			Headers[ 'X-Auth-Nonce' ] + 
			Headers[ 'X-Auth-Timestamp' ] + 
			Headers[ 'X-Auth-Version' ] ;
		var Signature = pkCrypto.createHmac( 'sha256' , gApiObject.Bitstamp[ gCount ].SecretKey ).update( Message ).digest( 'hex' ) ;
		
		Headers[ 'X-Auth-Signature' ] = Signature ;
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Headers 
		} ;
		
		pkRequest
		( 
			Options , 
			( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiObject.Bitstamp[ gCount ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiObject.Bitstamp[ gCount ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiObject.Bitstamp[ gCount ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiObject.Bitstamp[ gCount ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiObject.Bitstamp[ gCount ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
}
