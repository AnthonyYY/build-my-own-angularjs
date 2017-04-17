'use strict';

var _ = require('lodash');
function initialWatch(){}

function Scope(){
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
}

Scope.prototype.$watch = function(watchFn,listenerFn,valueEq){
  var self = this;
  var watcher = {
    watchFn: watchFn,
    listenerFn: listenerFn || function(){},
    valueEq: !!valueEq,
    last: initialWatch
  };
  this.$$watchers.unshift(watcher);
  this.$$lastDirtyWatch = null;
  return function(){
    var index = self.$$watchers.indexOf(watcher);
    if(index >= 0){
      self.$$watchers.splice(index,1);
      self.$$lastDirtyWatch = null;
    }
  };
};

Scope.prototype.$$digestOnce = function(){
  var self = this;
  var newValue,oldValue,dirty;
  _.forEachRight(this.$$watchers,function(watcher){
    try {
      newValue = watcher.watchFn(self);
      oldValue = watcher.last;
      if(!self.$$areEqual(oldValue,newValue,watcher.valueEq)){
        self.$$lastDirtyWatch = watcher;
        watcher.last = (watcher.valueEq ? _.cloneDeep(newValue):newValue);
        watcher.listenerFn(newValue,oldValue == initialWatch ? newValue : oldValue,self);
        dirty = true;
      }else if(self.$$lastDirtyWatch === watcher){
        return false;
      }
    } catch (e) {
      console.error(e);
    }
  });
  return dirty;
};

Scope.prototype.$digest = function(){
  var ttl = 10;
  var dirty;
  this.$$lastDirtyWatch = null;
  do{
    dirty = this.$$digestOnce();
    if(dirty && !(ttl--)){
      throw '10 digest iterations reached';
    }
  }while(dirty);
};

Scope.prototype.$$areEqual = function(newValue,oldValue,valueEq){
  if(valueEq){
    return _.isEqual(newValue,oldValue);
  }else{
    return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};

module.exports = Scope;
