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
var gApiOrderObject = new Object(  ) ;
var gApiAutoOrderObject = new Object(  ) ;

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
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
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
		gOrderForm.Ticker = Req.query.Ticker ;
		gOrderForm.Placement = Req.query.OrderPlacement ;
		gOrderForm.Placer = Req.query.OrderPlacer ;
		gOrderForm.Price = Req.query.Price ;
		gOrderForm.Size = Req.query.Size ;
		gOrderForm.Interval = Req.query.Interval ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
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
		var CancelPlacerX = Req.query.OrderCancelPlacer.split( '_' )[ 0 ] ;
		var CancelPlacerIndex = parseInt( Req.query.OrderCancelPlacer.split( '_' )[ 1 ] ) ;
		var OrderId = Req.query.OrderId ;
		
		cancelOrder( CancelPlacerX , CancelPlacerIndex , OrderId ) ;
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
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
		
		
		
		var Context = 
		{
			ApiKey : gApiKeyObject , 
			ApiTicker : gApiTickerObject , 
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
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
		updateAccounts(  ) ;
		updateOrders(  ) ;
		
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
			ApiOrder : gApiOrderObject , 
			ApiAutoOrder : gApiAutoOrderObject , 
			OrderForm : gOrderForm 
		} ;
		Res.render( "index" , Context ) ;
	}
)

/* update */
function updateAccounts(  )
{
	if( gApiKeyObject == null )
		return ;
	
	var Options ;
	var Token ;
	
	console.log( "Updating the accounts." ) ;
	
	/* Account Status*/
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
	var Options ;
	
	// Upbit
	TradeAccessKey = gApiKeyObject.Upbit[ 0 ].TradeAccessKey ;
	TradeSecretKey = gApiKeyObject.Upbit[ 0 ].TradeSecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		
	}
	TradeAccessKey = gApiKeyObject.Upbit[ 1 ].TradeAccessKey ;
	TradeSecretKey = gApiKeyObject.Upbit[ 1 ].TradeSecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		
	}
	TradeAccessKey = gApiKeyObject.Upbit[ 2 ].TradeAccessKey ;
	TradeSecretKey = gApiKeyObject.Upbit[ 2 ].TradeSecretKey ;
	if( TradeAccessKey != null && TradeSecretKey != null )
	{
		
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
function checkValidation( Price , Size )
{
	var Flag = false ;
	
	if( Price != null && Price != '' && Size != null && Size != '' )
	{
		if( parseFloat( Price ) > 0.0 && parseFloat( Size ) > 0.0 )
		{
			Flag = true ;
		}
	}
	
	return Flag ;
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
		console.log( "거래 Api 키가 없습니다." ) ;
		return ;
	}
	else if
	( gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus > 0 )
	{
		console.log( "주문이 실행 중입니다." ) ;
		return ;
	}
	else if( checkValidation( FormData.Price , FormData.Size ) == false )
	{
		console.log( "주문이 유효하지 않습니다." ) ;
		return ;
	}
	
	var TradeAccessKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeAccessKey ;
	var TradeSecretKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeSecretKey ;
	var Options ;
	
	switch( PlacerX )
	{
		case 'Upbit' : 
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
								console.log( "지정가 매수 주문 실패" ) ;
								console.log( Body ) ;
							}
							else
								console.log( "지정가 매수 주문 성공" ) ;
							
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
								console.log( "지정가 매도 주문 실패" ) ;
								console.log( Body ) ;
							}
							else
								console.log( "지정가 매도 주문 성공" ) ;
							
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
						console.log( "자동 시장가 주문 실패" ) ;
						console.log( Body ) ;
					}
					else
					{
						console.log( "자동 시장가 주문 성공 : \n" + ResultData ) ;
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
		console.log( "거래 Api 키가 없습니다." ) ;
		return ;
	}
	else if( gApiKeyObject[ PlacerX ][ PlacerIndex ].OrderStatus == 0 )
	{
		console.log( "없는 주문입니다." ) ;
		return ;
	}
	
	var TradeAccessKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeAccessKey ;
	var TradeSecretKey = gApiKeyObject[ PlacerX ][ PlacerIndex ].TradeSecretKey ;
	
	switch( PlacerX )
	{
		case 'Upbit' : 
			
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
							console.log( "주문 취소 실패" ) ;
							console.log( Body ) ;
						}
						else
							console.log( "주문 취소 성공" ) ;
					}
				) ;
			}
			else
			{
				clearInterval( gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ][ 'IntervalId' ] ) ;
				gApiAutoOrderObject[ PlacerX + '_' + PlacerIndex ] = null ;
				console.log( "자동 시장가 주문 취소 성공" ) ;
			}
		break ;
	}
}
