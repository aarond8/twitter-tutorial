var _ = require('underscore'),
    Twitter = require('twitter'),
    workflow = new(require('events').EventEmitter)(),
    async = require('async');


var game = 'football';

var PRODUCTION = process.env.PRODUCTION || false,
    TEST = process.env.TEST === 'true' || false;
    ASYNC = false;

process.argv.forEach(function(val, index, array) {
  if (val === 'local') {
    TEST = true;
  }
  if (val === 'async') {
    ASYNC = true;
  }
});


if (TEST) {
  console.log('%s: Running Job on TEST server...', new Date());
  process.env.CURRENT_ENV = 'TEST';
} else if (PRODUCTION) {
  console.log('%s: Running Job on PRODUCTION server...', new Date());
  process.env.CURRENT_ENV = 'PRODUCTION';
} else {
  console.log('%s: Running Job on DEV server...', new Date());
  process.env.CURRENT_ENV = 'DEV';
}


//Do application only authentication as only public feeds needed.
var client = new Twitter({
  consumer_key: '',
  consumer_secret: '',
  bearer_token: ''
});

var currentids = {};
var taskcount = 1;
var dbInterface;
var startdate;

var resetScores = function(){
  _.keys(currentids).forEach(function(keyname){
    currentids[keyname].twscore = 0;
  });
}

var parseTweet = function(tweet, tag){
  //console.log(tweet.text);
  var found = false;
  _.keys(currentids).forEach(function(keyname){
    var firstmention = tweet.text.toString().toLowerCase().indexOf(currentids[keyname].name.toLowerCase());
    var aliasmention = tweet.text.toString().toLowerCase().indexOf(currentids[keyname].alias.toString().toLowerCase());
    if(firstmention>=0){
      if(TEST){
        console.log('== NAME MATCH: '+ currentids[keyname].name);
        console.log(tweet.text);
        console.log('=============');
      }
      currentids[keyname].twscore ++;
      found = true;
    } else {
      if(aliasmention>=0){
        if(TEST){
          console.log('== ALIAS MATCH: '+ currentids[keyname].alias);
        }
        currentids[keyname].twscore ++;
        found = true;
      }
    }
  });
  return found;
};

var search = function(query, callback){
  var cb = callback || function() {};

  //Set geocode data to geometric centre of UK and an encompassing radius
  var geo = '53.000,-1.500,250mi';
  var startdatestr = startdate.getFullYear()+'-'+(startdate.getMonth()+1)+'-'+startdate.getDate();
  //var searchoptions = ' exclude:retweets exclude:news exclude:links';
  var searchoptions = '';
  client.get('search/tweets', {q: query+' -#betting since:'+startdatestr + searchoptions, geocode: geo ,count:99, result_type:'recent'}, function(error, tweets, response) {
    //console.log(tweets);
    //var twresult = JSON.parse(tweets);
    //console.log('RESULTS:'+tweets.search_metadata.count);
    if(tweets){
    if(tweets.statuses){
      var fresults = false;
      var lastran = new Date().getTime() - (216000000*1); //Default just one hour = (216000 secs)
      var parseit = function(ptweet){
        var timestamp = new Date(ptweet.created_at).getTime();
        if(timestamp>lastran){
          //Parse it and set results flag if any
          if(parseTweet(ptweet)) fresults = true;
        }
      }
      tweets.statuses.forEach(parseit);
      if(fresults){
        console.log(':' + taskcount + ':' + query)
      }
    }
    }
    taskcount --;
    if(ASYNC){
      if(taskcount<=0){
        workflow.emit('doResults');
      }
    } else {
      cb(null);
    }
  });
}

var processResults = function(callback){
    cb = callback || function(){};
    var toplist = [];
    //order the ids
    _.keys(currentids).forEach(function(keyname){
      if(currentids[keyname].twscore >0){
        toplist.push(currentids[keyname]);
      }
    });
    toplist.sort(function(a, b){ return b.twscore-a.twscore });
    dbInterface.storeTwitter({game: game, results: toplist, date: startdate}, function(err){
      if(TEST){
        console.log(toplist);
      }
      cb(err);
    });
}

require('./db')(function(success, dbI) {
  if (!success) {
    console.log('ERROR: Failed to init datasource');
    process.exit(1);
  } else {
    //Save the dbInterface
    dbInterface = dbI;
    //Attached to DB - time to process ...
    var searches = [
          { "search": "#football", "weight": 1 },
          { "search": "#footballer", "weight": 1 },
          { "search": "#soccer", "weight": 1 },
          { "search": "#footy", "weight": 1 }
    ];

    currentids = dbI.footballids();
    //searches = require('./footballtwitter.json')


    workflow.on('doTheJob', function() {
      startdate = new Date(new Date().getTime()-(86400000*(0))-600000); // make new date 10 mins ago
      resetScores();
      if(ASYNC){
        searches.forEach(function(tsearch){
          taskcount ++;
          search(tsearch.search);
        });
        taskcount --;
        workflow.emit('updateTimeToExecute');
      } else {
        //Do all calls syncronously
        async.eachSeries(searches, function(tsearch, internalCallback){
          console.log('Process: ', tsearch.search);
          search(tsearch.search, internalCallback);
        }, function(err){
          workflow.emit('doResults');
        });
      }
    });

    workflow.on('doResults', function() {
      processResults(function(err){
        //finished whole job
        if(ASYNC){
          if(err) console.log('Failed to save');
          process.exit(1);
        } else {
          if(err){
            console.log('Failed to save');
          }
          workflow.emit('updateTimeToExecute');
        }

      });
    });

    workflow.on('updateTimeToExecute', function() {
      //re schedule
      console.log('Re-Schedule Set for one hour');
      setTimeout(function(){ workflow.emit('doTheJob'); }, 216000000);
    });

    //workflow.emit('checkTimeToExecute');
    workflow.emit('doTheJob');
  }
});


/*// == STREAM MONITORING OPTION ==
  var stream = client.stream('statuses/filter', {track: 'football'});
  stream.on('data', function(event) {
    console.log(event && event.text);
  });
  stream.on('error', function(error) {
    throw error;
  });
*/
