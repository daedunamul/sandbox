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
var gApiKeyObject = null ;
var gApiTickerObject = null ;
var gOrderForm = null ;

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
function g_getTokenBitstamp( Index , Method , Path , Body )
{
	var Result = 
	{
		Header : null ,
		Signature : null ,
		Message : null 
	} ;
	
	Result.Header = 
	{
		'X-Auth' : 'BITSTAMP ' + gApiKeyObject.Bitstamp[ Index ].AccessKey , 
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
					( Body == null ? '' : Body ) ;
	
	Result.Signature = pkCrypto.createHmac( 'sha256' , gApiKeyObject.Bitstamp[ Index ].SecretKey ).update( Result.Message ).digest( 'hex' ) ;
	Result.Header[ 'X-Auth-Signature' ] = Result.Signature ;
	
	return Result ;
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
			'./key.json' , 
			'utf8' , 
			function( Err , Data )
			{
				if( Err )
					gApiKeyObject = null ;
				else
				{
					gApiKeyObject = JSON.parse( Data ) ;
					gApiKeyObject.Message = new String(  ) ;
				}
			}
		) ;
		pkFs.readFile
		(
			'./ticker.json' , 
			'utf8' , 
			function( Err , Data )
			{
				if( Err )
					gApiTickerObject = null ;
				else
				{
					gApiTickerObject = JSON.parse( Data ) ;
				}
			}
		) ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			OrderForm : gOrderForm 
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
		gOrderForm.Placement = Req.query.OrderPlacement ;
		gOrderForm.Placer = Req.query.OrderPlacer ;
		gOrderForm.Price = Req.query.Price ;
		gOrderForm.Size = Req.query.Size ;
		gOrderForm.Interval = Req.query.Interval ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			OrderForm : gOrderForm 
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
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			OrderForm : gOrderForm 
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
		
		for( var Key in gApiKeyObject )
		{
			for( var Index in gApiKeyObject[ Key ] )
			{
				if( gApiKeyObject[ Key ][ Index ].Order != null )
				{
					if( gApiKeyObject[ Key ][ Index ].Order.IntervalId != null )
					{
						clearInterval( gApiKeyObject[ Key ][ Index ].Order.IntervalId ) ;
						gApiKeyObject[ Key ][ Index ].Order.IntervalId = null ;
					}	
					console.log( Key + '_' + gApiKeyObject[ Key ][ Index ].Name + " 계좌의 주문을 취소하였습니다." ) ;
					gApiKeyObject[ Key ][ Index ].Order = null ;
				}
			}
		}
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			OrderForm : gOrderForm 
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
		requestAccount(  ) ;
		
		gApiKeyObject.Message = "(티커 : 잔고 / 동결 / 평단)\n" ;
		for( var Key in gApiKeyObject )
		{
			for( var Index in gApiKeyObject[ Key ] )
			{
				if( gApiKeyObject[ Key ][ Index ].Name != null )
				{
					gApiKeyObject.Message = gApiKeyObject.Message + '♠' + Key + '_' + gApiKeyObject[ Key ][ Index ].Name + '♠' + '\n' ;
					for( var InfoIndex in gApiKeyObject[ Key ][ Index ].AccountInfo )
					{
						if( gApiKeyObject[ Key ][ Index ].AccountInfo != null )
						{
							gApiKeyObject.Message = gApiKeyObject.Message + 
							gApiKeyObject[ Key ][ Index ].AccountInfo[ InfoIndex ].Ticker + ' : ' + 
							gApiKeyObject[ Key ][ Index ].AccountInfo[ InfoIndex ].Balance + ' / ' + 
							gApiKeyObject[ Key ][ Index ].AccountInfo[ InfoIndex ].Locked + ' / ' + 
							gApiKeyObject[ Key ][ Index ].AccountInfo[ InfoIndex ].AvgPrice + 
							'\n' ;
						}
					}
				}
			}
		}
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			OrderForm : gOrderForm 
		} ;
		Res.render( "index" , Context ) ;
	}
)

// sub functions
function requestAccount(  )
{
	if( gApiKeyObject == null )
		return ;
	
	var Options ;
	var Token ;
	
	console.log( "Updating the accounts." ) ;
	
	// Upbit
	if( gApiKeyObject.Upbit[ 0 ].Name != null )
	{
		Token = g_getTokenUpbit( gApiKeyObject.Upbit[ 0 ].AccessKey , gApiKeyObject.Upbit[ 0 ].SecretKey ) ;
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
		Token = g_getTokenUpbit( gApiKeyObject.Upbit[ 1 ].AccessKey , gApiKeyObject.Upbit[ 1 ].SecretKey ) ;
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
		Token = g_getTokenUpbit( gApiKeyObject.Upbit[ 2 ].AccessKey , gApiKeyObject.Upbit[ 2 ].SecretKey ) ;
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
		Result = g_getTokenBitstamp( 0 , 'POST' , 'v2/balance/' , null ) ;
		
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Result.Header
		} ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
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
		Result = g_getTokenBitstamp( 1 , 'POST' , 'v2/balance/' , null ) ;
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Result.Header
		} ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
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
		Result = g_getTokenBitstamp( 2 , 'POST' , 'v2/balance/' , null ) ;
		Options = 
		{
			method : "POST" , 
			url : "https://www.bitstamp.net/api/v2/balance/" , 
			headers : Result.Header
		} ;
		
		pkRequest
		(
			Options , ( Err , Res , Body ) => 
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
function requestOrder( FormData , PlacerX , PlacerIndex )
{
	if( gApiKeyObject == null )
		return ;
	else if( gApiKeyObject[ PlacerX ][ PlacerIndex ].Order != null )
	{
		console.log( "실행 중인 주문입니다." ) ;
		return ;
	}
	
	gApiKeyObject[ PlacerX ][ PlacerIndex ].Order = new Object(  ) ;
	gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Ticker = FormData.Ticker ;
	gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Placement = FormData.OrderPlacement ;
	
	switch( FormData.OrderPlacement )
	{
		case "LimitBuy" : 
		case "LimitSell" : 
			gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Price = FormData.Price ;
			gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Interval = null ;
			gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.IntervalId = null ;
		break ;
		case "AutoMarketBuy" : 
		case "AutoMarketSell" : 
			gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Price = null ;
			gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Interval = parseInt( parseFloat( FormData.Interval ) * 1000 ) ;
			gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.IntervalId = setInterval
			(
				requestIntervalOrder.bind( { X : PlacerX , Index : PlacerIndex } ) , 
				gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Interval
			) ;
		break ;
	}
	gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.Size = FormData.Size ;
	
	console.log( PlacerX + '_' + gApiKeyObject[ PlacerX ][ PlacerIndex ].Name + " 계좌의 주문을 시도합니다." ) ;
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
	if( gApiKeyObject == null )
		return ;
	
	console.log( this.X + '_' + gApiKeyObject[ this.X ][ this.Index ].Name + " 계좌의 자동 주문을 시도합니다." ) ;
}
function cancelOrder( PlacerX , PlacerIndex )
{
	if( gApiKeyObject == null )
		return ;
	else if( gApiKeyObject[ PlacerX ][ PlacerIndex ].Order == null )
	{
		console.log( "없는 주문입니다." ) ;
		return ;
	}
	
	switch( PlacerX )
	{
		case 'Upbit' : 
			
		break ;
		case 'Bitstamp' : 
			var Result = g_getTokenBitstamp( PlacerIndex , 'POST' , 'v2/open_orders/all/' , null ) ;
			Options = 
			{
				method : "POST" , 
				url : "https://www.bitstamp.net/api/v2/open_orders/all/" , 
				headers : Result.Header
			} ;
			
			pkRequest
			(
				Options , ( Err , Res , Body ) => 
				{
					if( Err )
						throw new Error( Err ) ;
					
					console.log(Body);
				}
			) ;
		break ;
	}
	
	if( gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.IntervalId != null )
	{
		clearInterval( gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.IntervalId ) ;
		gApiKeyObject[ PlacerX ][ PlacerIndex ].Order.IntervalId = null ;
	}
	gApiKeyObject[ PlacerX ][ PlacerIndex ].Order = null ;
	console.log( PlacerX + '_' + gApiKeyObject[ PlacerX ][ PlacerIndex ].Name + " 계좌의 주문을 취소했습니다." ) ;
}
