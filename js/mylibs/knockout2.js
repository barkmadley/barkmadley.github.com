// Knockout JavaScript library v?.?.?
// (c) Mark Bradley -
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

(function(window,undefined){
  var document = window.document,
      navigator = window.navigator,
      location = window.location;

  /* create a disposable callback from a callback */
  function disposable(callback, list) {
    var that,
        my = {};
    my.managerList = list;

    that = callback;
    that.disposed = false;
    that.dispose = function() {
      that.disposed = true;
      var index = _.indexOf(my.managerList, that);
      if (index >= 0) {
        my.managerList.splice(index, 1);
      }
    }
    my.managerList.push(that);
    return that
  }

  /* Has a get/set function, and is itself a convenience functon that calls
   * get/set depending on the number of arguments */
  function base(get, set) {
    var that,
        my = {};
    /* the basic get/set function depending on argument length */
    that = function() {
      if (arguments.length > 0 && that.set) {
        that.set(arguments[0]);
      }
      return that.get();
    };
    /* unimplemented getters and setters */
    that.get = get || function() { throw "unsettable"; };
    that.set = set || function() { throw "ungettable"; };

    /* this is for checking mixin type dependencies */
    that.types = {};
    return that;
  }

  /* the basic container object.
   */
  function container(value) {
    var my = {};
    my.value = value;

    var that = base(
      function() {
        return my.value;
      },
      function(newvalue) {
        return my.value = newvalue;
      }
    );

    that.types['container'] = true;;
    return that;
  }

  /* a subscribable object is one that maintains a list of subscribers and
   * notifies them on set */
  function subscribable(that, o) {
    /* a private list of subscribers */
    var subscribers = [];

    /* manual subscription function */
    that.subscribe = function(callback) {
      return disposable(callback, subscribers);
    };

    /* manual notify function */
    that.notify = function(value) {
      var value = value || that.get();
      _.each(subscribers.slice(0), function(subscriber) {
        if (subscriber && !subscriber.disposed) {
          subscriber(value);
        }
      });
    };

    /* update the setter to notify after setting the value */
    that.set = _.wrap(that.set || function() { throw "Not settable"; },
      function(orig, value) {
        var result = orig(value);
        that.notify(result);
        return result;
      }
    );

    that.types['subscribable'] = true;
    return that;
  }

  /* these are for maintaining the dependency tracking code */
  var dependencies = [];

  /* make the last dependency monitor depend on a particular subscribable */
  function dependOn(item) {
    var currentDependencies = _.last(dependencies);
    if (currentDependencies) {
      currentDependencies.push(item);
    }
  }

  /* a consumer of the dependency tracking code */
  function dependentsOf(callback, context) {
    dependencies.push([]);
    callback.call(context);
    return _.unique(dependencies.pop());
  }


  /* a wrapping mixin that will cause a call to get to make the parent depend on
   * this object */
  function dependable(that) {
    that.get = _.wrap(that.get, function(orig) {
      var result = orig();
      dependOn(that);
      return result;
    });

    that.types['dependable'] = true;
    return that;
  }

  /* a simple observable is merely a
   *  dependable
   *    subscribable
   *      container
   *        of a value
   */
  function observable(value) {
    var that = dependable(subscribable(container(value)));
    that.types['observable'] = true;
    return that;
  }

  /* a pausable wrapping constructor
   *  a cause to pause will force the container to return the last evaluated
   *  value.
   *
   *  a call to resume will notify and dependers that the value will be updated
   *  with the latest version
   */
  function pausable(that) {
    var cache = "",
        paused = observable(false);

    that.get = _.wrap(that.get, function(orig) {
      if (paused()) {
        return cache;
      }
      return orig();
    });

    that.pause = function() {
      cache = that.get();
      paused(true);
    };

    that.resume = function() {
      cache = "";
      paused(false);
    };

    that.types['pausable'] = true;
    return that;
  }

  function protectable(that) {
    var my = {};

    my.value = that.get();
    my.set   = that.set;

    that.set = function(value) {
      return my.value = value;
    };

    that.commit = function() {
      my.set(my.value);
    };

    that.reset  = function() {
      my.value = that.get();
    };

    that.types['protectable'] = true;
    return that;
  }

  function dependent(that) {
    if (that.types['depender']) {
      throw "Cannot make a dependent out of a depender, switch them around";
    }
    /* that needs to be subscribable */
    var my = {};

    my.subscriptions = [];
    my.value = undefined;
    /* we don't want to depend on this */
    my.dirty = subscribable(container(true));

    my.dirty.subscribe(function(value) {
      if (value) {
        /* notify dependers that my value needs to be re-evaluated */
        that.notify();
      }
    });

    that.get = _.wrap(that.get, function(orig) {
      if (my.dirty()) {
        /* dispose the subscriptions i setup earlier (see below) */
        _.each(my.subscriptions, function(sub) {
          sub.dispose();
        });

        /* evaluate the sub get function while tracking dependencies */
        var deps = dependentsOf(function () {
          my.value = orig();
        });

        /* subscribe to all dependencies */
        my.subscriptions = _.map(deps, function (dep) {
          /* create a new function every time since they will get disposed */
          return dep.subscribe(function() { my.dirty(true); });
        });

        my.dirty(false);
      }
      return my.value;
    });

    that.types['dependent'] = true;
    return dependable(that);
  }

  /* the typical dependentObservable
   * This logic can be tricky.
   */
  function dependentObservable(o, context) {
    var that,
        my = {};

    my.get = (o.get || o).bind(context || o.owner || this);
    my.set = o.set;

    /* dependent needs to be before dependable so it doesn't depend on itself */
    that = dependent(subscribable(base(
      my.get,
      my.set
    )));

    that.types['dependentObservable'] = true;

    that.get();

    return that;
  }

  var ko = window.ko = {
    observable: observable,
    dependentObservable: dependentObservable
  };
  return ko;

})(window);


