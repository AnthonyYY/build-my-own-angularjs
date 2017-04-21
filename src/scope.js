'use strict';

var _ = require('lodash');
function initialWatch(){}

function Scope(){
  this.$$watchers = [];
  this.$$lastDirtyWatch = null;
  this.$$asyncQuene = [];
  this.$$applyAsyncQuene = [];
  this.$$phase = null;
  this.$$applyAsyncId = null;
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
      if(watcher){
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
  this.$beginPhase('$digest');
  do{
    while(this.$$asyncQuene.length){
      var asyncTask = this.$$asyncQuene.shift();
      asyncTask.scope.$eval(asyncTask.expression);
    }
    dirty = this.$$digestOnce();
    if((dirty || this.$$asyncQuene.length ) && !(ttl--)){
      this.$clearPhase();
      throw '10 digest iterations reached';
    }
  }while(dirty || this.$$asyncQuene.length);
  this.$clearPhase();
};

Scope.prototype.$$areEqual = function(newValue,oldValue,valueEq){
  if(valueEq){
    return _.isEqual(newValue,oldValue);
  }else{
    return newValue === oldValue || (typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
  }
};

Scope.prototype.$eval = function(expr,locals){
  return expr(this,locals);
};

Scope.prototype.$apply = function(expr){
  try{
    this.$beginPhase('$apply');
    return this.$eval(expr);
  }finally{
    this.$clearPhase();
    this.$digest();
  }
};

Scope.prototype.$evalAsync = function(expr){
  var self = this;
  if(!self.$$phase && !self.$$asyncQuene.length){
    setTimeout(function(){
      if(self.$$asyncQuene.length){
        self.$digest();
      }
    },0);
  }
  this.$$asyncQuene.push({scope: this,expression: expr});
};

Scope.prototype.$applyAsync = function(expr){
  var self = this;
  self.$$applyAsyncQuene.push(function(){
    self.$eval(expr);
  });
  if(self.$$applyAsyncId === null){
    self.$$applyAsyncId = setTimeout(function(){
      self.$apply(function(){
        while(self.$$applyAsyncQuene.length){
          self.$$applyAsyncQuene.shift()();
        }
        self.$$applyAsyncId = null;
      });
    },0);
  }
};

Scope.prototype.$beginPhase = function(phase){
  if(this.$$phase){
    throw this.$$phase + ' already in progress.';
  }
  this.$$phase = phase;
};

Scope.prototype.$clearPhase = function(){
  this.$$phase = null;
};

module.exports = Scope;
