---
layout: post
title: annotated extensible observables
postclass: codepost
description: |
  An annotated overview of the code behind a model for extensible observables
  that mimic the behaviour of knockout observables, but are what I consider to
  be cleanly implemented.

---

As promised in the [last post][], I am providing the extensible observables code
that I described.

[last post]: /2011/07/11/extending-knockout-js/

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

  /* this is for checking decorator type dependencies */
  that.types = {};
  return that;
}
{% endhighlight %}

The `base` of the whole extensibility is based around this core function, which
either returns the result of the get functon, or sets the value via the set
function. The default implementation of the get/set functions is simply to throw
an error. Meaning we can define read or write only functions if we want to.

The `types` object is to allow us to implement enforceable dependency
constraints, we will see this in action later.

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

A `container` is the most obvious use of the base function object. Store a value
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

Now we get to something more complicated, but also more useful. A `subscribable`
object is one that notifies its subscriber list whenever its set function is
called. It also exposes the notify function such that you can manually notify an
objects subscribers.

All callbacks given to the `subscribe` function will be turned into disposable
callbacks, such that they can manually be disposed of when the subscriber
wishes. How a callback is turned into a disposable callback will be described
next.

The `notify` function takes the current value of the base object, and for each of
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
    var index = _.indexOf(my.managerList, that);
    if (index >= 0) {
      my.managerList.splice(index, 1);
    }
  }
  my.managerList.push(that);
  return that
}
{% endhighlight %}

A `disposable` callback can be disposed of, obviously. It will also remove
itself from the list of callbacks that is its manager (hopefully severing any
links to it such that it can be garbage collected). At the same time it will set
its disposed property to be true, which should be a good indication that calling
the function is unadvised. This disposable callback structure is primarily used
in the subscribable <strike>mixin</strike> decorator function, but it might be useful elsewhere as well.

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

<div class="clearfix"></div>

### Being Dependable

{% highlight javascript %}
/* a decorator that will cause a call to get to make the parent depend on
   this object */
function dependable(that) {
  that.get = _.wrap(that.get, function(orig) {
    var result = orig();
    dependOn(that);
    return result;
  });

  that.types['dependable'] = true;
  return that;
}
{% endhighlight %}

Being `dependable` is quite easy. We simply have to take a the current getter,
and make it call the `dependOn` utility with ourselves as the argument.

<div class="clearfix"></div>

### Knowing what you depend on: Dependents

{% highlight javascript %}
function dependent(that) {
  if (that.types['dependable']) {
    throw "Cannot make a dependent out of a dependable, switch them around";
  }
  /* that needs to be subscribable */
  if (!that.types['subscribable']) {
    throw "dependent is assumed to be subscribable";
  }
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
  return that;
}
{% endhighlight %}

There is a simple type check here to make sure you do not create this object the
wrong way around. A `dependent` that is already a dependable will go into an
infinite loop (alternatively you can filter out the current dependent from the
dependents of itself and then re-add itself to the dependencies list, but this
way is simpler). We will also be using the subscribability of the given object.

A `dependent` needs to track the dependencies that it subscribes to, a cached
copy of its value so it doesn't unnecessarily recompute every time, as well as a
subscribable container that represents whether or not the current value needs to
be re-evaluated (`dirty`). The reason the dirty flag is not dependable (making
it a fully fledged observable) is so other dependents do not depend on this flag
(it is for internal use only).

Internally we subscribe to the dirty flag, and if its new value is truthy, we
want to notify our own subscribers.

Finally we want to overwrite the given objects get function with one that is
more complicated. We only want to re-evaluate the value if the value is dirty,
and if it isn't we simply return the cached value. If the value is dirty we want
to dispose our current subscription list, and then reevaluate the original get
while tracking the dependents that get accessed in the original `get` callback.
We now have a list of dependents, we turn them into our current subscription
list by subscribing to each of them with a callback that will set the dirty flag
to `true`. Finally the object is marked as being clean and return the newly
evaluated cached value.

And of course we set the type to include 'dependents'.

<div class="clearfix"></div>

### The observables

{% highlight javascript %}
/* a simple observable is merely a
   dependable
     subscribable
       container
         of a value
 */
function observable(value) {
  var that = dependable(subscribable(container(value)));
  that.types['observable'] = true;
  return that;
}
{% endhighlight %}

This part almost seems anti climactic. Because I have already defined all the
complex behaviour in constructors and <strike>mixin constructors</strike> decorators, an observable is
really just a convenience. As the comment says, and the code reflects, an
`observable` is a dependable and subscribable container that initially holds the
given value.

For consistency I have added the observable as part of the types object.

<div class="clearfix"></div>

### Dependent Observables

{% highlight javascript %}
/* a dependentObservable is a
   dependent/dependable
     subscribable
       based around a get and possibly a set function
 */
function dependentObservable(o, context) {
  var that,
      my = {};

  my.get = (o.get || o).bind(context || o.owner || this);
  my.set = o.set;

  that = dependable(dependent(subscribable(base(
    my.get,
    my.set
  ))));

  that.types['dependentObservable'] = true;

  that.get();

  return that;
}
{% endhighlight %}

A `dependentObservable` is similarly simple in concept, but the interface given
by knockout can be slightly confusing. You can call the constructor with either,
a single read only function (`dO(function(){ ... })`), a single read only
function with a `context` parameter (`dO(function(){ ... }, this)`) an object
with a `get` field (`dO({ get: function() { ... } })`), an object with a `get`
and a `set` field (`dO({ get: function() { ... }, set: function(value) { ... }
})`), an object with `get`, `set` and `owner` fields, any of the previously
mentioned objects and a context with this to bind to. Overall the interface
would be simpler if you could only pass in a `get` and `set` function and leave
the function binding to the programmer.

The important details are that a `dependentObservable` is merely a dependable,
dependency tracking, subscribable, base object with some user supplied get and
set functions. We then set the type and initiate the dependency tracking by
calling the `get` function.

<div class="clearfix"></div>

### Finally

I am sure that there are more improvements and refactorings that could make the
code clearer, especially with the `dependent` <strike>mixin</strike> decorator (which is by far the most
complex). For now I am publishing this with no intent to replace the code in
[knockout][], but as inspiration for the future of the library.

[knockout]: http://knockoutjs.com/

##### Updated 2011-07-15

I changed the terminology from `mixin` to `decorator` since that more exactly
describes what is happening.
