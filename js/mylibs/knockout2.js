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

  /* the basic container object.
   * Has a get/set function, and is itself a convenience functon that calls
   * get/set depending on the number of arguments */
  function container(value, o) {
    var that,
        my = {};
    my.value = value;

    /* the basic get/set function depending on argument length */
    that = function() {
      if (arguments.length > 0 && that.set) {
        that.set(arguments[0]);
      }
      return that.get();
    };

    that.get = (o && o.get) || function() {
      return my.value;
    };

    that.set = (o && o.set) || function(value) {
      return my.value = value;
    };

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

    return that;
  }

  /* these are for maintaining the dependency tracking code */
  var dependencies = [];
  function dependOn(item) {
    var currentDependencies = _.last(dependencies);
    if (currentDependencies) {
      currentDependencies.push(item);
    }
  }

  /* a wrapping mixin that will cause a call to get to make the parent depend on
   * this object */
  function dependable(that) {
    that.get = _.wrap(that.get, function(orig) {
      var result = orig();
      dependOn(that);
      return result;
    });

    return that;
  }

  /* a consumer of the dependency tracking code */
  function depender(that) {

    that.dependents = function(callback, context) {
      dependencies.push([]);
      callback.call(context);
      return _.unique(dependencies.pop());
    };

    return that;
  }

  /* a simple observable is merely a
   *  dependable
   *    subscribable
   *      container
   *        of a value
   */
  function observable(value) {
    var that;
    that = dependable(subscribable(container(value)));
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

    return that;
  }

  /* the typical dependentObservable
   * This logic can be tricky.
   */
  function dependentObservable(o, context) {
    var that,
        my = {};

    my.get = (o.get || o).bind(context || this);
    my.set = (o.set || function() { throw "Not settable"; });

    my.subscriptions = [];
    my.value = undefined;
    my.dirty = subscribable(container(true));

    my.dirty.subscribe(function(value) {
      if (value) {
        /* notify dependers that my value needs to be re-evaluated */
        that.notify();
      }
    });

    my.evaluate = function() {
      /* dispose the subscriptions i setup earlier (see below) */
      _.each(my.subscriptions, function(sub) {
        sub.dispose();
      });

      /* evaluate the sub get function while tracking dependencies */
      var deps = that.dependents(function () {
        my.value = my.get();
      });

      /* subscribe to all dependencies */
      my.subscriptions = _.map(deps, function (dep) {
        /* create a new function every time since they will get disposed */
        return dep.subscribe(function() { my.dirty(true); });
      });

      my.dirty(false);
    };

    that = container(undefined, {
      get: function() {
        if (my.dirty()) {
          my.evaluate();
        }
        return my.value;
      },
      set: my.set
    });

    that = depender(dependable(subscribable(that)));

    my.evaluate();

    return that;
  }

  var ko = window.ko = {
    observable: observable,
    dependentObservable: dependentObservable
  };
  return ko;

})(window);


