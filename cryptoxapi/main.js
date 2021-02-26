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
// entry
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
				{
					gApiObject = JSON.parse( Data ) ;
					gApiObject.Message = new String(  ) ;
				}
			}
		) ;
		
		var Context = 
		{
			ApiObject : gApiObject
		} ;
		Res.render( "index" , Context ) ;
	}
) ;
gApp.listen
( 
	7777 , 
	(  ) => 
	{
		console.log( "I'm listening." ) ;
		setInterval( requestAccount , 1000 ) ;
	}
) ;

// orders
gApp.get
(
	'/api_placeOrder' , 
	( Req , Res ) => 
	{
		if( gApiObject == null )
			return ;
		
		var OrderPlacerX = Req.query.OrderPlacer.split( '_' )[ 0 ] ;
		var OrderPlacerIndex = parseInt( Req.query.OrderPlacer.split( '_' )[ 1 ] ) ;
		
		requestOrder( Req.query , OrderPlacerX , OrderPlacerIndex ) ;
		
		var Context = 
		{
			ApiObject : gApiObject
		} ;
		Res.render( "index" , Context ) ;
	}
)
gApp.get
(
	'/api_cancelOrder' , 
	( Req , Res ) => 
	{
		var CancelPlacerX = Req.query.CancelPlacer.split( '_' )[ 0 ] ;
		var CancelPlacerIndex = parseInt( Req.query.CancelPlacer.split( '_' )[ 1 ] ) ;
		
		cancelOrder( CancelPlacerX , CancelPlacerIndex ) ;
		
		var Context = 
		{
			ApiObject : gApiObject
		} ;
		Res.render( "index" , Context ) ;
	}
)
gApp.get
(
	'/api_cancelAllOrders' , 
	( Req , Res ) => 
	{
		if( gApiObject == null )
			return ;
		
		for( var Key in gApiObject )
		{
			for( var Index in gApiObject[ Key ] )
			{
				if( gApiObject[ Key ][ Index ].Order != null )
				{
					if( gApiObject[ Key ][ Index ].Order.IntervalId != null )
					{
						clearInterval( gApiObject[ Key ][ Index ].Order.IntervalId ) ;
						gApiObject[ Key ][ Index ].Order.IntervalId = null ;
					}	
					console.log( Key + '_' + gApiObject[ Key ][ Index ].Name + " 계좌의 주문을 취소하였습니다." ) ;
					gApiObject[ Key ][ Index ].Order = null ;
				}
			}
		}
		
		var Context = 
		{
			ApiObject : gApiObject
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
		gApiObject.Message = "(티커 : 잔고 / 동결 / 평단)\n" ;
		for( var Key in gApiObject )
		{
			for( var Index in gApiObject[ Key ] )
			{
				if( gApiObject[ Key ][ Index ].Name != null )
				{
					gApiObject.Message = gApiObject.Message + '♠' + Key + '_' + gApiObject[ Key ][ Index ].Name + '♠' + '\n' ;
					for( var InfoIndex in gApiObject[ Key ][ Index ].AccountInfo )
					{
						if( gApiObject[ Key ][ Index ].AccountInfo != null )
						{
							gApiObject.Message = gApiObject.Message + 
							gApiObject[ Key ][ Index ].AccountInfo[ InfoIndex ].Ticker + ' : ' + 
							gApiObject[ Key ][ Index ].AccountInfo[ InfoIndex ].Balance + ' / ' + 
							gApiObject[ Key ][ Index ].AccountInfo[ InfoIndex ].Locked + ' / ' + 
							gApiObject[ Key ][ Index ].AccountInfo[ InfoIndex ].AvgPrice + 
							'\n' ;
						}
					}
				}
			}
		}
		
		var Context = 
		{
			ApiObject : gApiObject 
		} ;
		Res.render( "index" , Context ) ;
	}
)

// sub functions
function requestAccount(  )
{
	if( gApiObject == null )
		return ;
	
	var Options ;
	var Token ;
	
	console.log( "Updating the accounts." ) ;
	
	// Upbit
	if( gApiObject.Upbit[ 0 ].Name != null )
	{
		Token = g_getTokenUpbit( gApiObject.Upbit[ 0 ].AccessKey , gApiObject.Upbit[ 0 ].SecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization : `Bearer ${Token}` }
		} ;

		pkRequest
		( 
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ 0 ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiObject.Upbit[ 0 ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].Ticker = AccountObject[ AccountIndex ].currency ;
					gApiObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].Balance = AccountObject[ AccountIndex ].balance ;
					gApiObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].Locked = AccountObject[ AccountIndex ].locked ;
					gApiObject.Upbit[ 0 ].AccountInfo[ AccountIndex ].AvgPrice = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
	if( gApiObject.Upbit[ 1 ].Name != null )
	{
		Token = g_getTokenUpbit( gApiObject.Upbit[ 1 ].AccessKey , gApiObject.Upbit[ 1 ].SecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization : `Bearer ${Token}` }
		} ;

		pkRequest
		( 
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ 1 ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiObject.Upbit[ 1 ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].Ticker = AccountObject[ AccountIndex ].currency ;
					gApiObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].Balance = AccountObject[ AccountIndex ].balance ;
					gApiObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].Locked = AccountObject[ AccountIndex ].locked ;
					gApiObject.Upbit[ 1 ].AccountInfo[ AccountIndex ].AvgPrice = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
	if( gApiObject.Upbit[ 2 ].Name != null )
	{
		Token = g_getTokenUpbit( gApiObject.Upbit[ 2 ].AccessKey , gApiObject.Upbit[ 2 ].SecretKey ) ;
		Options = 
		{
			method : "GET" , 
			url : "https://api.upbit.com/v1/accounts" , 
			headers : { Authorization : `Bearer ${Token}` }
		} ;

		pkRequest
		( 
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var AccountObject = JSON.parse( Body ) ;
				
				gApiObject.Upbit[ 2 ].AccountInfo = new Array(  ) ;
				for( var AccountIndex in AccountObject )
				{
					gApiObject.Upbit[ 2 ].AccountInfo[ AccountIndex ] = new Object(  ) ;
					gApiObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].Ticker = AccountObject[ AccountIndex ].currency ;
					gApiObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].Balance = AccountObject[ AccountIndex ].balance ;
					gApiObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].Locked = AccountObject[ AccountIndex ].locked ;
					gApiObject.Upbit[ 2 ].AccountInfo[ AccountIndex ].AvgPrice = AccountObject[ AccountIndex ].avg_buy_price ;
				}
			}
		) ;
	}
	
	// Bitstamp
	if( gApiObject.Bitstamp[ 0 ].Name != null )
	{
		var Headers = 
		{
			'X-Auth' : 'BITSTAMP ' + gApiObject.Bitstamp[ 0 ].AccessKey , 
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
		var Signature = pkCrypto.createHmac( 'sha256' , gApiObject.Bitstamp[ 0 ].SecretKey ).update( Message ).digest( 'hex' ) ;
		
		Headers[ 'X-Auth-Signature' ] = Signature ;
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Headers 
		} ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiObject.Bitstamp[ 0 ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiObject.Bitstamp[ 0 ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
	if( gApiObject.Bitstamp[ 1 ].Name != null )
	{
		var Headers = 
		{
			'X-Auth' : 'BITSTAMP ' + gApiObject.Bitstamp[ 1 ].AccessKey , 
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
		var Signature = pkCrypto.createHmac( 'sha256' , gApiObject.Bitstamp[ 1 ].SecretKey ).update( Message ).digest( 'hex' ) ;
		
		Headers[ 'X-Auth-Signature' ] = Signature ;
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Headers 
		} ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiObject.Bitstamp[ 1 ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiObject.Bitstamp[ 1 ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
	if( gApiObject.Bitstamp[ 2 ].Name != null )
	{
		var Headers = 
		{
			'X-Auth' : 'BITSTAMP ' + gApiObject.Bitstamp[ 2 ].AccessKey , 
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
		var Signature = pkCrypto.createHmac( 'sha256' , gApiObject.Bitstamp[ 2 ].SecretKey ).update( Message ).digest( 'hex' ) ;
		
		Headers[ 'X-Auth-Signature' ] = Signature ;
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Headers 
		} ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
			{
				if( Err )
					throw new Error( Err ) ;
				
				var BalanceInfo = JSON.parse( Body ) ;
				var AssetCount = 0 ;
				
				gApiObject.Bitstamp[ 2 ].AccountInfo = new Array(  ) ;
				for( var Key in BalanceInfo )
				{
					var Ticker = Key.split( '_' )[ 0 ] ;
					var Tag = Key.split( '_' )[ 1 ] ;
					
					if( Tag == 'balance' && BalanceInfo[ Key ] > 0.0 )
					{
						gApiObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ] = new Object(  ) ;
						gApiObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ].Ticker = Ticker ;
						gApiObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ].Balance = BalanceInfo[ Key ] ;
						gApiObject.Bitstamp[ 2 ].AccountInfo[ AssetCount ].Locked = BalanceInfo[ Key ] - BalanceInfo[ Ticker + '_available' ] ;
						
						AssetCount ++ ;
					}
				}
			}
		) ;
	}
}
function requestOrder( FormData , PlacerX , PlacerIndex )
{
	if( gApiObject == null )
		return ;
	else if( gApiObject[ PlacerX ][ PlacerIndex ].Order != null )
	{
		console.log( "실행 중인 주문입니다." ) ;
		return ;
	}
	
	gApiObject[ PlacerX ][ PlacerIndex ].Order = new Object(  ) ;
	gApiObject[ PlacerX ][ PlacerIndex ].Order.Placement = FormData.OrderPlacement ;
	
	switch( FormData.OrderPlacement )
	{
		case "LimitBuy" : 
		case "LimitSell" : 
			gApiObject[ PlacerX ][ PlacerIndex ].Order.Price = FormData.Price ;
			gApiObject[ PlacerX ][ PlacerIndex ].Order.Interval = null ;
			gApiObject[ PlacerX ][ PlacerIndex ].Order.IntervalId = null ;
		break ;
		case "AutoMarketBuy" : 
		case "AutoMarketSell" : 
			gApiObject[ PlacerX ][ PlacerIndex ].Order.Price = null ;
			gApiObject[ PlacerX ][ PlacerIndex ].Order.Interval = parseInt( parseFloat( FormData.Interval ) * 1000 ) ;
			gApiObject[ PlacerX ][ PlacerIndex ].Order.IntervalId = setInterval
			(
				requestIntervalOrder.bind( { X : PlacerX , Index : PlacerIndex } ) , 
				gApiObject[ PlacerX ][ PlacerIndex ].Order.Interval
			) ;
		break ;
	}
	gApiObject[ PlacerX ][ PlacerIndex ].Order.Size = FormData.Size ;
	
	console.log( PlacerX + '_' + gApiObject[ PlacerX ][ PlacerIndex ].Name + " 계좌의 주문을 시도합니다." ) ;
	switch( PlacerX )
	{
		case 'Upbit' : 
			
		break ;
		case 'Bitstamp' : 
			
		break ;
	}
}
function requestIntervalOrder(  )
{
	if( gApiObject == null )
		return ;
	
	console.log( this.X + '_' + gApiObject[ this.X ][ this.Index ].Name + " 계좌의 자동 주문을 시도합니다." ) ;
}
function cancelOrder( PlacerX , PlacerIndex )
{
	if( gApiObject == null )
		return ;
	else if( gApiObject[ PlacerX ][ PlacerIndex ].Order == null )
	{
		console.log( "없는 주문입니다." ) ;
		return ;
	}
	
	if( gApiObject[ PlacerX ][ PlacerIndex ].Order.IntervalId != null )
	{
		clearInterval( gApiObject[ PlacerX ][ PlacerIndex ].Order.IntervalId ) ;
		gApiObject[ PlacerX ][ PlacerIndex ].Order.IntervalId = null ;
	}
	gApiObject[ PlacerX ][ PlacerIndex ].Order = null ;
	console.log( PlacerX + '_' + gApiObject[ PlacerX ][ PlacerIndex ].Name + " 계좌의 주문을 취소했습니다." ) ;
}
