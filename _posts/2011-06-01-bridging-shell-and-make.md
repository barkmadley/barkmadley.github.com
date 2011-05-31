---
layout: post
title: bridging shell and make
---

Recently at work I was tasked with updating our build system to be more stable
and maintainable in the future. We had previously built a cobbled together Makefile
based project that worked for a few specific types of builds but it was very
fragile and interdependant. For example in order to build the version of our product
that worked with the eclipse plugin we would have to run:
{% highlight bash %}make ECLIPSE=true{% endhighlight %}

In order to build for the visualstudio extension:
{% highlight bash %}make VS=true WINDOWS=true{% endhighlight %}

The problem came when we wanted to support windows versions of the eclipse platform.
This required that we be able to run:
{% highlight bash %}make ECLIPSE=true WINDOWS=true{% endhighlight %}
But there was a snag, since some of the functionality for the visual studio build
was flagged as being "windows" and some of it as being "vs", this did not mix well
with the "eclipse" functionality. At the time we hacked together a new target:
{% highlight bash %}make ECLIPSE_ON_WINDOWS=true{% endhighlight %}
And we felt dirty ever since.

Come around to the next time we needed a new target (this time would be a
CMDLINE_ON_WINDOWS=true abomination) and I said no. I am going to fix this situation.
I went for orthogonal as much as I could, so that it would be possible to build
all different configurations, such as a x64-Linux-VS build. I then wrote some error
checking and the makefile was happy. In addition we have some shell scripts which
are affected by the behaviour of the makefile, and so I thought it would be
pertinent to try to make them both speak the same language.

In order achieve this I needed to figure out the semantics of Makefile
variables/arguments.

* If a variable is defined in the environment, you need to use make -e to get it into
a makefile variable
* If a variable is defined on the commandline, then it will overwrite the definition
in the makefile.
* If a variable is not defined in either of the above, and it is in the file,
use that definition.

So the desired order of evaluation goes:

* in file
* environment
* commandline

I start off by processing all the default values for the given variables:
{% highlight bash %}
for line in `cat defaults`; do
  if [[ "$line" == \#* ]]; then
    continue # skip comments
  fi
{% endhighlight %}
the defaults file is a series of lines which look like VAR=val. These variable
value pairs are extracted below
{% highlight bash %}
  LINE_VAR=`echo $line | sed -e "s/=.*//"`
  LINE_VAL=`echo $line | sed -e "s/$LINE_VAR=//"`
{% endhighlight %}
I need to be able to see if the variable has been set before, so here I use
an eval to see what is in the current variable, and if it has, use that value
and export the pair
{% highlight bash %}
  eval "LINE_VAR_VAL=\$$LINE_VAR"
  # previously exported values overwrite defaults
  if [ "$LINE_VAR_VAL" != "" ]; then
    LINE_VAL=$LINE_VAR_VAL
  fi
  export $LINE_VAR=$LINE_VAL
done
{% endhighlight %}
Finally I go through the arguments array and overwrite any environment variables
that are specified. The script that uses this one will have to refer to ALL_ARGS
after they have been processed here.
{% highlight bash %}

# arguments that are VAR=something overwrite
NEW_ARGS=""
for ARG in "$@"
do
  if [[ "$ARG" =~ ^[A-Z].*=.* ]]; then
    eval $ARG
  else
    NEW_ARGS="$NEW_ARGS $ARG"
  fi
done
ALL_ARGS="$NEW_ARGS"
{% endhighlight %}

This simplish hack has allowed me to standardise on a set of variables which control
the logic of building, while maintaining orthogonality.

