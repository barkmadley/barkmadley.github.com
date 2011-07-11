---
layout: post
title: annotated extensible observables
postclass: codepost

---

As promised in the last post, I am providing the extensible observables code
that I described.

### The base

{% highlight javascript %}
/* Has a get/set function, and is itself a convenience functon that calls
   get/set depending on the number of arguments */
function base(get, set) {
  /* the basic get set function depending on argument length */
  var that = function() {
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
{% endhighlight %}

The base of the whole extensibility is based around this core function, which
either returns the result of the get functon, or sets the value via the set
function. The default implementation of the get/set functions is simply to throw
an error. Meaning we can define read or write only functions if we want to.

The types object is to allow us to implement enforceable dependency constraints,
we will see this in action later.

Also note that if you want to have the get/set functions to be called in the
context of a particular object, it is up to the user to specify this by manually
binding the functions to that context object.

<div class="clearfix"></div>

### A container

{% highlight javascript %}
/* the basic container object. */
function container(value) {
  var my = { value: value };

  var that = base(
    function() {
      return my.value;
    },
    function(newvalue) {
      return my.value = newvalue;
    }
  );

  that.types['container'] = true;
  return that;
}
{% endhighlight %}

A container is the most obvious use of the base function object. Store a value
locally and use the get/set behaviour of the base to retrieve and set the value.
Also annotate the types object saying that this object is a container.

<div class="clearfix"></div>

### Subscribables

{% highlight javascript %}
/* a subscribable object is one that maintains a list of subscribers and
   notifies them on set */
function subscribable(that) {
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
  that.set = _.wrap(that.set, function(orig, value) {
    var result = orig(value);
    that.notify(result);
    return result;
  });

  that.types['subscribable'] = true;
  return that;
}
{% endhighlight %}

Now we get to something more complicated, but also more useful. A subscribable
object is one that notifies its subscriber list whenever its set function is
called. It also exposes the notify function such that you can manually notify an
objects subscribers.

All callbacks given to the subscribe function will be turned into disposable
callbacks, such that they can manually be disposed of when the subscriber
wishes. How a callback is turned into a disposable callback will be described
next.

The notify function takes the current value of the base object, and for each of
its subscription functions that have not been disposed of, call that
subscription function with the value as the argument. I have used some of the
utilities that can be found within the excellent [underscore][] library. We need
to make a copy of the subscribers list to iterate over (using the `slice(0)`
technique), in case one of the subscription functions decides to dispose itself
and modify our original subscribers list.

[underscore]: http://documentcloud.github.com/underscore/

Finally we need to overwrite the set function of the base object by wrapping it
inside another function which calls the original, and then notifies its
subscribers that it's value has been updated.

As always, set the type of this to include subscribable.

<div class="clearfix"></div>

#### Disposable callbacks

{% highlight javascript %}
/* create a disposable callback from a callback */
function disposable(callback, list) {
  var that,
      my = {};
  my.managerList = list;

  that = callback;
  that.disposed = false;
  that.dispose = function() {
    that.disposed = true;
    var index = \_.indexOf(my.managerList, that);
    if (index >= 0) {
      my.managerList.splice(index, 1);
    }
  }
  my.managerList.push(that);
  return that
}
{% endhighlight %}

A disposable callback can be disposed of, obviously. It will also remove itself from
the list of callbacks that is its manager (hopefully severing any links to it
such that it can be garbage collected). At the same time it will set its
disposed property to be true, which should be a good indication that calling the
function is unadvised. This disposable callback structure is primarily used in
the subscribable mixin function, but it might be useful elsewhere as well.

<div class="clearfix"></div>

### Library internals: Dependency Tracking

{% highlight javascript %}
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
{% endhighlight %}

In order to perform dependency tracking for dependent observables, we need to
know when an observables `get` function is called. In order to do this we keep a
stack (implemented as an array in this case) of all the dependencies that a
tracker might be interested in.

When we want a consumer to depend on us, we take the last array in
`dependencies` and push outselves onto it. Since there may be no-one who wants
our dependency, we have to check that there is a current dependency array before
pushing ourselves onto it.

If we want to track (or consume) what the dependencies are for a callback, we
first push an empty array onto the `dependencies` stack, run the callback (which
will hopefully fill up our `dependencies` array) and then pop it off, returning
a `unique`d version of the list (so we don't subscribe to the same object
unnecessarily).

### Dependable

