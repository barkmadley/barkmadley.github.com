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

The set of differences between shell and Makefile syntax and behaviour is quite
large as it turns out, 


