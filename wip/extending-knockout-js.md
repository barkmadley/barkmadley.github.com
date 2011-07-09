---
layout: post
title: making knockout extendable

---

I have been exploring the [knockout][] code base for the last month or two, and
there is something that has been bothering me.

[knockout]: http://knockoutjs.com/

Extensibility isn't a requirement.

Extensibility is nice.

Also for fun.

Context problem (`this` and `new` are evil in javascript).

Example of possible extensions:

http://www.knockmeout.net/2011/05/creating-smart-dirty-flag-in-knockoutjs.html
re: diffable.

http://www.knockmeout.net/2011/03/guard-your-model-accept-or-cancel-edits.html
re: protectable.

http://www.knockmeout.net/2011/06/lazy-loading-observable-in-knockoutjs.html
re: demandable

http://www.knockmeout.net/2011/04/pausing-notifications-in-knockoutjs.html
re: pausable.

proposal: a new model of observables.


