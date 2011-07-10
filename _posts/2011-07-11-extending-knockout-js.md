---
layout: post
title: making knockout extendable
scripts:
- http://www.assoc-amazon.com/s/link-enhancer?tag=barkmadley-20&o=1

description: |
  A post about a potential redesign of the core observable functionality of the
  KnockoutJS data binding library. Adding to observable() = read,
  observable(value) = write, to include observable.get() = read,
  observable.set(value), and all the possibilities this provides.

---

I have been exploring the [knockout][] code base for the last month or two, and
there is something that has been bothering me. It doesn't appear to have a
consistent object model, or operational model for observables, aside from the
obvious `observable()` is a read and `observable(value)` is a write.
Unfortunately there are no hooks to extend those read and write operations such
that you can create simple extensions that encapsulate advanced behaviour such
as pausing notifications and caching/committing logic. These extensions are
possible, but they are by no means nice to implement, and least of all they are
not implemented consistently.

[knockout]: http://knockoutjs.com/

For example pausing the notifications that get propagated by observables and
dependentObservables when they are written to, such that you could write to an
observable multiple times, but only need to notify subscribers once such that
they do not perform unnecessary computation. [Ryan Niemeyer][] has implemented
such a [pausable observable][], however what if I want to have this behaviour on an
observable array, or a dependent observable. I may be able to reuse some of that
code, but I would inevitably be reinventing some aspects of the code, and in
the case of observable arrays, I would have to reimplement all of the
[convenience methods][] for modifying the underlying observable and then performing
the notifications. And while it is perfectly valid to work with what we have
right now and forget about extensibility of the core library, it is nice to be
able to encapsulate the logic of this functionality cleanly, without mixing it
together with the other concerns.

[Ryan Niemeyer]: http://knockmeout.net/
[pausable observable]: http://www.knockmeout.net/2011/04/pausing-notifications-in-knockoutjs.html
[convenience methods]: https://github.com/SteveSanderson/knockout/blob/master/src/subscribables/observableArray.js#L10

So I embarked on a journey of discovery into the realm of observables and
notifications and came up with a nice way to implement them that allows for
extensibility, in fact they are themselves built up from extensible components
that was designed in a style inspired by the functional constructor section of
the inheritance chapter of Douglas Crockfords book: <a href="http://www.amazon.com/gp/product/0596517742/ref=as_li_tf_tl?ie=UTF8&tag=barkmadley-20&linkCode=as2&camp=217145&creative=399381&creativeASIN=0596517742">JavaScript: The Good Parts</a><img src="http://www.assoc-amazon.com/e/ir?t=barkmadley-20&l=as2&o=1&a=0596517742&camp=217145&creative=399381" width="1" height="1" border="0" alt="" style="border:none !important; margin:0px !important;" />
(kindle version: <a href="http://www.amazon.com/gp/product/B0026OR2ZY/ref=as_li_tf_tl?ie=UTF8&tag=barkmadley-20&linkCode=as2&camp=217145&creative=399373&creativeASIN=B0026OR2ZY">JavaScript: The Good Parts</a><img src="http://www.assoc-amazon.com/e/ir?t=barkmadley-20&l=as2&o=1&a=B0026OR2ZY&camp=217145&creative=399373" width="1" height="1" border="0" alt="" style="border:none !important; margin:0px !important;" />,
either is definitely recommened reading for everyone writing javascript).
Basically it outlines the basic structure of a constructor and a mixin
constructor for javascript. A construct created a new object (called that), and
then creates some private state, some private methods, and finally the public
interface is connected to the that object. A mixin constructor works in a
similar way, except that it accepts the `that` object as a parameter, and only
adds to its existing functionality. Using these two types of constructors means
that you avoid all problems that come from javascript `this` context (or at least push
the problem into the programmers hands, while not adding to it).
I did this for three reasons:

1. To provide the extension points that I would like to see in the base
   knockoutjs library
2. To make a cleaner version of the existing code
3. For fun.

The structure of the library is based on the core functionality of knockout
observables, `observable()` is a read, and `observable(value)` is a write, but
it also exposes two methods on the observable so you can directly call
`observable.get()` and `observable.set(value)`. Since these methods are part of the
observables external interface, and since javascript functions are objects that
you can overwrite willy nilly, then you can replace/extend these methods to
provide additional functionality based around reading and writing an observable.

Some examples of what I am talking about.

<dl>
<dt class="bigger">Pausable</dt>
<dd>

<div class="left half">
Compare this javascript from <a href="http://www.knockmeout.net/2011/04/pausing-notifications-in-knockoutjs.html">Ryans
blog</a>:

{% highlight javascript %}
//wrapper for a dependentObservable that can pause its subscriptions 
ko.pauseableDependentObservable = function(evaluatorFunction, evaluatorFunctionTarget) {
    var cachedValue = "";
    var isPaused = ko.observable(false);

    //the dependentObservable that we will return
    var result = ko.dependentObservable(function() {
        if (!isPaused()) {
            //call the actual function that was passed in
            return evaluatorFunction.call(evaluatorFunctionTarget);
        }
        return cachedValue;
    }, evaluatorFunctionTarget);

    //keep track of our current value and set the pause flag to release our actual subscriptions
    result.pause = function() {
        cachedValue = this();
        isPaused(true);
    }.bind(result);

    //clear the cached value and allow our dependentObservable to be re-evaluated
    result.resume = function() {
        cachedValue = "";
        isPaused(false);
    }

    return result;
};

{% endhighlight %}
</div>
<div class="right half">
To the equivalent mixin constructor:
{% highlight javascript %}
function pausable(that) {
  var cache = "",
      paused = observable(false),
      original = that.get;

  /* replace the getter with an optional call to the original getter */
  that.get = function() {
    if (paused()) {
      return cache;
    }
    return original();
  });

  /* add a pause function that sets the cached state */
  that.pause = function() {
    cache = that.get();
    paused(true);
    /* force dependers to depend on paused instead of that */
    that.notify();
  };

  /* add a resume function that resets the cached state */
  that.resume = function() {
    cache = "";
    paused(false);
  };

  /* some type checking */
  that.types['pausable'] = true;
  return that;
}
{% endhighlight %}
</div>

<div class="clearfix"></div>

<p>
Even though my code is slightly longer, we can see that not only is my version of pausable cleaner and more focused, it
is also able to wrap any observable, observableArray or dependentObservable and
make it pausable.
</p>

</dd>
<dt class="bigger">Protectable</dt>
<dd>

<div class="left half">
Compare this javascript from <a href="http://www.knockmeout.net/2011/03/guard-your-model-accept-or-cancel-edits.html">Ryans
blog</a>:
{% highlight javascript %}
//wrapper to an observable that requires accept/cancel
ko.protectedObservable = function(initialValue) {
    //private variables
    var actualValue = ko.observable(initialValue);
    var tempValue = initialValue;

    //dependentObservable that we will return
    var result = ko.dependentObservable({
        //always return the actual value
        read: function() {
           return actualValue();
        },
        //stored in a temporary spot until commit
        write: function(newValue) {
             tempValue = newValue;
        }
    });

    //if different, commit temp value
    result.commit = function() {
        if (tempValue !== actualValue()) {
             actualValue(tempValue);
        }
    };

    //force subscribers to take original
    result.reset = function() {
        actualValue.valueHasMutated();
        tempValue = actualValue();   //reset temp value
    };

    return result;
};
{% endhighlight %}
</div>
<div class="right half">
To the equivalent mixin constructor:
{% highlight javascript %}
function protectable(that) {
  var my = {};

  my.value = that.get();
  /* save a copy of the original set function */
  my.set   = that.set;

  /* replace the set function to one that writes to my.value */
  that.set = function(value) {
    return my.value = value;
  };

  /* call the original set with the latest value */
  that.commit = function() {
    my.set(my.value);
  };

  /* ignore all writes since the last commit */
  that.reset  = function() {
    my.value = that.get();
  };

  that.types['protectable'] = true;
  return that;
}
{% endhighlight %}
</div>

<div class="clearfix"></div>

<p>
In this case it is definitely clear that having an extensivle observable object
is a win for readability and understandability. Especially since we don't need
to explicitly store the original observable as a seperate thing, requiring us to
redundantly redefine a read function since we don't need to overwrite it.
</p>

</dd>
<dt class="bigger">Diffable</dt>
<dd>

<p>
Ryan didn't create a reusable single observable dirty flag, but I thought I
might see how it might be implemented anyway.
</p>

{% highlight javascript %}
function dirtiable(that) {
  var my = {};
  my.original = that.get();
  my.set = that.set;
  my.dirty = observable(false);

  that.set = function(value) {
    my.dirty(true);
    return my.set(value);
  };

  that.dirty = function() {
    return my.dirty();
  };

  that.clean = function() {
    my.dirty(false);
  };

  return that;
}
{% endhighlight %}


</dd>
</dl>

In the next post I will give the full working code, annotated with explanatory
comments. Also I don't mean to pick on Ryan so much in this blog post, but his
are some of the best examples of building useful reusable components to
complement the knockoutjs library.

