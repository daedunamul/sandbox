// packages
const pkExpress = require( 'express' ) ;
const pkBodyParser = require( 'body-parser' ) ;
const pkEjs = require( 'ejs' ) ;

const pkRequest = require( 'request' ) ;
const pkJwt = require( 'jsonwebtoken' ) ;
const { v4 : pkUuidv4 } = require( 'uuid' ) ;

// globals
var gApp = pkExpress(  ) ;

var gApiObject = new Object(  ) ;

// globals functions
function g_alloc(  )
{
	gApiObject.Upbit = new Array(  ) ;
	gApiObject.Upbit[ 0 ] = new Object(  ) ;
	gApiObject.Upbit[ 1 ] = new Object(  ) ;
	gApiObject.Upbit[ 2 ] = new Object(  ) ;

	gApiObject.Bitstamp = new Array(  ) ;
	gApiObject.Bitstamp[ 0 ] = new Object(  ) ;
	gApiObject.Bitstamp[ 1 ] = new Object(  ) ;
	gApiObject.Bitstamp[ 2 ] = new Object(  ) ;
	
	gApiObject.Kraken = new Array(  ) ;
	gApiObject.Kraken[ 0 ] = new Object(  ) ;
	gApiObject.Kraken[ 1 ] = new Object(  ) ;
	gApiObject.Kraken[ 2 ] = new Object(  ) ;
}
function g_init(  )
{
	// Upbit
	gApiObject.Upbit[ 0 ].ViewAccessKey = null ;
	gApiObject.Upbit[ 0 ].ViewSecretKey = null ;
	gApiObject.Upbit[ 0 ].Account = null ;
	
	gApiObject.Upbit[ 1 ].ViewAccessKey = null ;
	gApiObject.Upbit[ 1 ].ViewSecretKey = null ;
	gApiObject.Upbit[ 1 ].Account = null ;
	
	gApiObject.Upbit[ 2 ].ViewAccessKey = null ;
	gApiObject.Upbit[ 2 ].ViewSecretKey = null ;
	gApiObject.Upbit[ 2 ].Account = null ;
	
	// Bitstamp
	gApiObject.Bitstamp[ 0 ].ViewAccessKey = null ;
	gApiObject.Bitstamp[ 0 ].ViewSecretKey = null ;
	gApiObject.Bitstamp[ 0 ].Account = null ;
	
	gApiObject.Bitstamp[ 1 ].ViewAccessKey = null ;
	gApiObject.Bitstamp[ 1 ].ViewSecretKey = null ;
	gApiObject.Bitstamp[ 1 ].Account = null ;
	
	gApiObject.Bitstamp[ 2 ].ViewAccessKey = null ;
	gApiObject.Bitstamp[ 2 ].ViewSecretKey = null ;
	gApiObject.Bitstamp[ 2 ].Account = null ;
	
	// Kraken
	gApiObject.Kraken[ 0 ].ViewAccessKey = null ;
	gApiObject.Kraken[ 0 ].ViewSecretKey = null ;
	gApiObject.Kraken[ 0 ].Account = null ;
	
	gApiObject.Kraken[ 1 ].ViewAccessKey = null ;
	gApiObject.Kraken[ 1 ].ViewSecretKey = null ;
	gApiObject.Kraken[ 1 ].Account = null ;
	
	gApiObject.Kraken[ 2 ].ViewAccessKey = null ;
	gApiObject.Kraken[ 2 ].ViewSecretKey = null ;
	gApiObject.Kraken[ 2 ].Account = null ;
}
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

g_alloc(  ) ;
g_init(  ) ;

// routings
gApp.get
( 
	'/' , 
	( Req , Res ) => 
	{
		Res.render( "index" , gApiObject ) ;
	}
) ;

gApp.post
(
	'/api_initKey' , 
	( Req , Res ) => 
	{
		g_init(  ) ;
		Res.render( "index" , gApiObject ) ;
	}
) ;
gApp.post
(
	'/api_getKey' , 
	( Req , Res ) => 
	{
		switch( Req.body.apiExchange )
		{
			case 'Upbit' : 				
				if( g_checkKey( Req.body.AccessKey0 , Req.body.SecretKey0 ) )
				{
					gApiObject.Upbit[ 0 ].ViewAccessKey = Req.body.AccessKey0 ;
					gApiObject.Upbit[ 0 ].ViewSecretKey = Req.body.SecretKey0 ;
				}
				else
				{
					gApiObject.Upbit[ 0 ].ViewAccessKey = null ;
					gApiObject.Upbit[ 0 ].ViewSecretKey = null ;
				}
					
				
				if( g_checkKey( Req.body.AccessKey1 , Req.body.SecretKey1 ) )
				{

					gApiObject.Upbit[ 1 ].ViewAccessKey = Req.body.AccessKey1 ;
					gApiObject.Upbit[ 1 ].ViewSecretKey = Req.body.SecretKey1 ;
				}
				else
				{
					gApiObject.Upbit[ 1 ].ViewAccessKey = null ;
					gApiObject.Upbit[ 1 ].ViewSecretKey = null ;
				}
				
				if( g_checkKey( Req.body.AccessKey2 , Req.body.SecretKey2 ) )
				{
					gApiObject.Upbit[ 2 ].ViewAccessKey = Req.body.AccessKey2 ;
					gApiObject.Upbit[ 2 ].ViewSecretKey = Req.body.SecretKey2 ;
				}
				else
				{
					gApiObject.Upbit[ 2 ].ViewAccessKey = null ;
					gApiObject.Upbit[ 2 ].ViewSecretKey = null ;
				}
			break ;
			case 'Bitstamp' : 
				if( g_checkKey( Req.body.AccessKey0 , Req.body.SecretKey0 ) )
				{
					gApiObject.Bitstamp[ 0 ].ViewAccessKey = Req.body.AccessKey0 ;
					gApiObject.Bitstamp[ 0 ].ViewSecretKey = Req.body.SecretKey0 ;
				}
				else
				{
					gApiObject.Bitstamp[ 0 ].ViewAccessKey = null ;
					gApiObject.Bitstamp[ 0 ].ViewSecretKey = null ;
				}
					
				
				if( g_checkKey( Req.body.AccessKey1 , Req.body.SecretKey1 ) )
				{

					gApiObject.Bitstamp[ 1 ].ViewAccessKey = Req.body.AccessKey1 ;
					gApiObject.Bitstamp[ 1 ].ViewSecretKey = Req.body.SecretKey1 ;
				}
				else
				{
					gApiObject.Bitstamp[ 1 ].ViewAccessKey = null ;
					gApiObject.Bitstamp[ 1 ].ViewSecretKey = null ;
				}
				
				if( g_checkKey( Req.body.AccessKey2 , Req.body.SecretKey2 ) )
				{
					gApiObject.Bitstamp[ 2 ].ViewAccessKey = Req.body.AccessKey2 ;
					gApiObject.Bitstamp[ 2 ].ViewSecretKey = Req.body.SecretKey2 ;
				}
				else
				{
					gApiObject.Bitstamp[ 2 ].ViewAccessKey = null ;
					gApiObject.Bitstamp[ 2 ].ViewSecretKey = null ;
				}
			break ;
			case 'Kraken' : 
				if( g_checkKey( Req.body.AccessKey0 , Req.body.SecretKey0 ) )
				{
					gApiObject.Kraken[ 0 ].ViewAccessKey = Req.body.AccessKey0 ;
					gApiObject.Kraken[ 0 ].ViewSecretKey = Req.body.SecretKey0 ;
				}
				else
				{
					gApiObject.Kraken[ 0 ].ViewAccessKey = null ;
					gApiObject.Kraken[ 0 ].ViewSecretKey = null ;
				}
					
				
				if( g_checkKey( Req.body.AccessKey1 , Req.body.SecretKey1 ) )
				{

					gApiObject.Kraken[ 1 ].ViewAccessKey = Req.body.AccessKey1 ;
					gApiObject.Kraken[ 1 ].ViewSecretKey = Req.body.SecretKey1 ;
				}
				else
				{
					gApiObject.Kraken[ 1 ].ViewAccessKey = null ;
					gApiObject.Kraken[ 1 ].ViewSecretKey = null ;
				}
				
				if( g_checkKey( Req.body.AccessKey2 , Req.body.SecretKey2 ) )
				{
					gApiObject.Kraken[ 2 ].ViewAccessKey = Req.body.AccessKey2 ;
					gApiObject.Kraken[ 2 ].ViewSecretKey = Req.body.SecretKey2 ;
				}
				else
				{
					gApiObject.Kraken[ 2 ].ViewAccessKey = null ;
					gApiObject.Kraken[ 2 ].ViewSecretKey = null ;
				}
			break ;
		}
		
		Res.render( "index" , gApiObject ) ;
	}
) ;
gApp.post
(
	'/api_update' , 
	( Req , Res ) => 
	{
		Res.render( "index" , gApiObject ) ;
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
	var Options ;
	var Token ;
	
	console.log( "Updating the accounts." ) ;
	
	// Upbit
	if( gApiObject.Upbit[ 0 ].ViewAccessKey != null )
	{
		Token = g_getTokenUpbit( gApiObject.Upbit[ 0 ].ViewAccessKey , gApiObject.Upbit[ 0 ].ViewSecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization: `Bearer ${Token}` }
		} ;
		pkRequest
		( 
			Options , 
			( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ 0 ].Account = new Array(  ) ;
				for( var Index in AccountObject )
				{
					gApiObject.Upbit[ 0 ].Account[ Index ] = new Object(  ) ;
					gApiObject.Upbit[ 0 ].Account[ Index ].currency = AccountObject[ Index ].currency ;
					gApiObject.Upbit[ 0 ].Account[ Index ].balance = AccountObject[ Index ].balance ;
					gApiObject.Upbit[ 0 ].Account[ Index ].locked = AccountObject[ Index ].locked ;
					gApiObject.Upbit[ 0 ].Account[ Index ].avg_buy_price = AccountObject[ Index ].avg_buy_price ;
				}
			}
		) ;
	}
	if( gApiObject.Upbit[ 1 ].ViewAccessKey != null )
	{
		Token = g_getTokenUpbit( gApiObject.Upbit[ 1 ].ViewAccessKey , gApiObject.Upbit[ 1 ].ViewSecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization: `Bearer ${Token}` }
		} ;
		pkRequest
		( 
			Options , 
			( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ 1 ].Account = new Array(  ) ;
				for( var Index in AccountObject )
				{
					gApiObject.Upbit[ 1 ].Account[ Index ] = new Object(  ) ;
					gApiObject.Upbit[ 1 ].Account[ Index ].currency = AccountObject[ Index ].currency ;
					gApiObject.Upbit[ 1 ].Account[ Index ].balance = AccountObject[ Index ].balance ;
					gApiObject.Upbit[ 1 ].Account[ Index ].locked = AccountObject[ Index ].locked ;
					gApiObject.Upbit[ 1 ].Account[ Index ].avg_buy_price = AccountObject[ Index ].avg_buy_price ;
				}
			}
		) ;
	}
	if( gApiObject.Upbit[ 2 ].ViewAccessKey != null )
	{
		Token = g_getTokenUpbit( gApiObject.Upbit[ 2 ].ViewAccessKey , gApiObject.Upbit[ 2 ].ViewSecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization: `Bearer ${Token}` }
		} ;
		pkRequest
		( 
			Options , 
			( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ 2 ].Account = new Array(  ) ;
				for( var Index in AccountObject )
				{
					gApiObject.Upbit[ 2 ].Account[ Index ] = new Object(  ) ;
					gApiObject.Upbit[ 2 ].Account[ Index ].currency = AccountObject[ Index ].currency ;
					gApiObject.Upbit[ 2 ].Account[ Index ].balance = AccountObject[ Index ].balance ;
					gApiObject.Upbit[ 2 ].Account[ Index ].locked = AccountObject[ Index ].locked ;
					gApiObject.Upbit[ 2 ].Account[ Index ].avg_buy_price = AccountObject[ Index ].avg_buy_price ;
				}
			}
		) ;
	}
		
	// Bitstamp
	
	// Kraken
}
