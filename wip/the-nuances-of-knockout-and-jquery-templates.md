---
layout: post
title: the nuances of using knockout with jquery templates
description: |
  Using knockoutjs with jquery templates can be an infuriating experience for
  many newcomers, and this post is a way to explain some of the inner workings
  of the template binding and how they relate to some of the problems that can
  arrise.

---

A [question][] was posed on the knockout [forum][] the other day that I see some
people struggle with over and over again when combining [knockout][] with jquery
[templates][]. This problem usually manifests itself as a problem with input
[focus][], or odd view model [updating][] behaviour, and even strange DOM
manipulations, depending on which browser the user is testing in. Now whenever I
see it I look for one thing, the dreaded `${}`.

In order to explain the solution, I need to explain a little bit about how
[knockout][] interacts with jquery [templates][] in the first place. It all
starts with the [template binding][]. This very [flexible][template
flexibility] binding conceptually works in two stages. The first stage is to
generate the DOM that will be inserted as a child of the node that has the
template binding. This is what jquery [templates][] are used for. The second
stage is to take all the data bind attributes from the generated DOM, and apply
them to the particular data object that is the context for this DOM render
(passed into the binding as either the data or foreach parameter and if neither
is present it defaults back to the original view model object). In reality this
two stage process is handled with a very complicated process involving
[template rewriting][] and [DOM memoization][] with the rendering happening in
the middle.

This process is monitored for all accesses to knockout observables using the
[standard "wrap the action inside a dependent observable trick"][template DO],
and this is how it is possible that a template will re render itself when you
update an observable value using the `${}` syntax. Now this in an of itself is
not a problem. The problem only arrises when you mix and match this `${}` syntax
with the more knockout specific inner data-binding technique. When you decide to
have a template that combines the power of knockout to very simply insert
textual values into the DOM, while at the same time rendering some kind of form
that allows you to edit those values in place, then when you edit a value that will cause
the template to re-render, then the input elements sometimes disappear too
quickly, sometimes they disappear too slowly. The user doesn't see most of this
thanks to the speed of javascript execution in modern browsers, but in the
background, knockout is diligently destroying and recreating DOM elements each
time an observable is updated.

The [simplest example][] of this problem is shown below:
<iframe style="width: 100%; height: 200px; border: solid 1px black;" src="http://jsfiddle.net/8f6mm/embedded/result,js,html"></iframe>

Editing the name property (on key up to cause the error to manifest, this
example would be fine without it) causes the input box to lose focus. Yet this
is perfectly valid if the DOM elements involved are being updated based on
data-bind attributes.

[simplest example]: http://jsfiddle.net/8f6mm/
[template DO]:https://github.com/SteveSanderson/knockout/blob/master/src/templating/templating.js#L57
[updating]: https://groups.google.com/forum/#!topic/knockoutjs/P3VO-4oBzlE
[focus]: https://groups.google.com/forum/#!searchin/knockoutjs/focus/knockoutjs/QwmT4tKjzLM/y97kvFdGyVwJ
[question]: https://groups.google.com/forum/#!topic/knockoutjs/P3VO-4oBzlE "knockout with jquery tmpl"
[forum]: https://groups.google.com/forum/#!forum/knockoutjs "knockout forums"
[knockout]: http://knockoutjs.com/ "knockout js"
[templates]: http://api.jquery.com/category/plugins/templates/ "jquery templates"
[template binding]: https://github.com/SteveSanderson/knockout/blob/master/src/templating/templating.js#L107
[template flexibility]: http://www.knockmeout.net/2011/03/quick-tip-reusing-template-by-passing.html
[template rewriting]: https://github.com/SteveSanderson/knockout/blob/master/src/templating/templateRewriting.js
[DOM memoization]: https://github.com/SteveSanderson/knockout/blob/master/src/memoization.js

