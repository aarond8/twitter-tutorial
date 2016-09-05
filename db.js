'use strict';

var _ = require('underscore'),
    footballAliases = {},
    fameids = {},
    footballids = {},
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
