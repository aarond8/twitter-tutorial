'use strict';

var _ = require('underscore'),
    fameids = {},
    footballids = {
      1:{
        "id":"joe-hart",
        "name":"Joe Hart",
        "alias":"Hart",
        "team":"Man City"
      },
      2:{
          "id":"yaya-toure",
          "name":"Yaya Toure",
          "alias":"Yaya",
          "team":"Man City"
      },
      3:{
          "id":"adam-lallana",
          "name":"Adam Lallana",
          "alias":"Lallana",
          "team":"Liverpool"
      },
      4:{
          "id":"wayne-rooney",
          "name":"Wayne Rooney",
          "alias":"Rooney",
          "team":"Man Utd"
      }
    },
    current;

exports = module.exports = function(callback) {
  var dbInterface = {
    fameids: function() {
      return fameids;
    },
    footballids: function() {
      return footballids;
    },
    storeTwitter: function(options, callback){
      //save results if we want
      return callback(null);
    },
    getTwitterDay: function(options, callback){
      //fetch results
      return callback(null);
    },
  };

  if (!current) {
    // initialize the db state once
    current = true;
  }

  if (callback) {
    callback(true, dbInterface);
  }

  if (!callback) {
    return dbInterface;
  }
};
