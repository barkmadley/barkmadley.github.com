---
layout: post
title: a knockout todo list
postclass: codepost
description: |
  A blog post explaining how to use the knockout javascript library to create a
  todo list app that is backed by local storage.

---

A few nights ago I was hanging around the [knockoutjs mailing
list](http://groups.google.com/group/knockoutjs?lnk=srg) when I came across a
piece of [example code](https://github.com/sharpoverride/TodoListKnockoutJS)
that I noticed was in desperate need of repair. The author also claims that he
is only learning, but sometimes I scratch my own itch just because I can.

The original code is based on the [spine](http://maccman.github.com/spine/)
[example](http://maccman.github.com/spine/#h-examples) [todo list
application](https://github.com/maccman/spine.todos) which uses browser local
storage to implement it's backend. (Also note that [the
design](http://localtodos.com/) was originally done by [Jerome
Gravel-Niquet](http://jqn.me) for the
[backbone](http://documentcloud.github.com/backbone/) javascript library)

I have two versions which I am proud of now, one using [unobtrusive data
binding](http://joel.net/wordpress/index.php/2011/06/unobtrusive-data-binding-for-knockout-js/)
along with a
[hack](https://github.com/barkmadley/barkmadley.github.com/commit/e840637ea46e7a08a67f868529d143bbae650be9#L1L61)
to be able to unobtrusively modify template code. The other version using that
simply sprinkles data-bind attributes on the html itself, as I personally perfer
this method I will use it as my canonical example of how a knockoutjs app should
work.

my example
----------

The javascript starts by creating a viewModel object that is the basis for all
data and interaction found on the page. This is done by local storage to load the
initial state and then using the [mapping plugin](http://knockoutjs.com/documentation/plugins-mapping.html)
to automatically create the viewModel fields we are interested in.

{% highlight javascript %}
function task(options) {
  /* ommitted until later */
}
task.options = {
  "key": function (data) { return ko.utils.unwrapObservable(data.id); },
  "create": task
};

/* initial state is an empty task list and an empty task string, and id of 0 */
var defaultData = '{"tasks":[],"taskName":"","id":0}';
/* load from local storage if possible */
var jsonData = (window.localStorage && localStorage['todos']) || defaultData;

window.viewModel = ko.mapping.fromJSON(jsonData, { "tasks": task.options });
{% endhighlight %}

The call to fromJSON has an options parameter which will determine how it will
behave when creating and modifying the tasks list. The "key" option determines
the identity of the task objects in the tasks list, while the "create" option
specifies a callback that will be used to create each task. Before going into
how each task looks and behaves lets see how the tasks array is manipulated by
the viewModel and the corresponding html

<div class="clearfix"></div>

{% highlight html %}
<div id="views">
  <div id="tasks">
    <h2>todos</h2>
    <p>
      <input id="addTaskInput" type="text" placeholder="What needs to be done?"
        data-bind="value: taskName, event: { keyup: addTask }" />
    </p>
    <div class="items" data-bind="template: { name: 'tasksTemplate', foreach: tasks }"></div>
    <footer>
      <a class="clear" data-bind="click: clearCompleted, visible: completed().length > 0">Clear completed</a>
      <div class="count"><span data-bind="text: openTasks">&nbsp;</span> left</div>
    </footer>
  </div>
</div>
{% endhighlight %}

The basic layout of the html is simple, and taken from the inspiring example
applications. The noteworthy parts are the data-bind attributes that are
sprinkled in the appropriate places:

* There is a input textbox which has the same value as the viewModels taskName
  and also will run the addTask callback on the keyup event.
* A container div that will render the template 'tasksTemplate' for each task in
  the tasks list.
* A clear anchor/button that is only visible depending on the length of the
  completed property, and clicking will fire the clearCompleted callback
* A count div that contains a span that holds the text of the openTasks
  property.

We have mentioned some properties that have not been created on our view model
yet so lets look at their definition. Some of them are merely attaching the
callback functions to the viewModel, others are dependentObservables, which will
get evaluated both when they are created, and also when the properties that they
access are modified (see the MVVM pattern description
[here](http://knockoutjs.com/documentation/dependentObservables.html))

<div class="clearfix"></div>

{% highlight javascript %}
/* add a new task when you hit enter */
viewModel.addTask = function (event) {
  var taskName = this.taskName();
  if (event.keyCode == '13' && taskName != "") {
    var id = this.id();
    this.id(id + 1);
    this.tasks.push( task( { "parent": this.tasks, "data": { "id": id, "name": taskName, "isDone": false } } ) );
    this.taskName("");
  }
};
{% endhighlight %}

The addTask callback function will merely look at the taskName property and then
create a new task if the Enter/Return key is pressed and the taskName is not
empty (I personally find empty todo items useless). Of note is the tasks.push
line, where we emulate the call to task that the mapping plugin performs, this
allows us to define the task function once. We also have an incrementing global
id so it is easier to identify the tasks (either to a server with a combination
of user id/task id or just locally if there are more complex operations that
will need to be performed later).

<div class="clearfix"></div>

{% highlight javascript %}
/* list of completed tasks */
viewModel.completed = ko.dependentObservable(function () {
  return ko.utils.arrayFilter(this.tasks(), function(item) {
    return item.isDone();
  });
}, viewModel);
{% endhighlight %}

The completed list is a list of tasks that are flagged as done. Using the
arrayFilter function to simplify the definition by abstracting the loop.

<div class="clearfix"></div>

{% highlight javascript %}
/* the number of tasks that are not completed */
viewModel.openTasks = ko.dependentObservable(function () {
  return this.tasks().length - this.completed().length;
}, viewModel);
{% endhighlight %}

The openTasks number is merely the number of tasks - the number of completed
tasks.

<div class="clearfix"></div>

{% highlight javascript %}
/* clear all the completed tasks, simple enough */
viewModel.clearCompleted = function (event) {
  this.tasks.removeAll(this.completed());
};
{% endhighlight %}

The clearCompleted callback simply removes all the tasks that are in the
completed list. removeAll is a function on the ko.observableArray class, which
is the type of the tasks property (created by the mapping plugin).

<div class="clearfix"></div>

{% highlight javascript %}
/* this is a DO that looks at all relevant observables and saves when
   something changes.
 */
viewModel.syncer = ko.dependentObservable(function () {
  localStorage['todos'] = ko.mapping.toJSON(viewModel);
}, viewModel);
{% endhighlight %}

This is a very simple way to keep the local storage data in sync with what is on
the screen. The ko.mapping.toJSON call walks the entire viewModel object graph,
allowing the syncer dependant observable to subscribe to everything so
everything will always be in sync.

The way that templates work in ko is by using the jQuery template engine, and
then modifying the template to enable the inner data-bind attributes to be
processed after the template has been rendered.

<div class="clearfix"></div>

{% highlight html %}
<script type="text/html" class="hidden kotemplate" id="tasksTemplate">
  <div class="item"
    data-bind="css: { done: isDone, editing: isEditing }, event: { dblclick: startEdit }">
    <div class="view" title="Double click to edit...">
      <input type="checkbox" data-bind="checked: isDone">
      <span data-bind="text: name"></span>
      <a class="destroy" data-bind="click: remove"></a>
    </div>
    <div class="edit">
      <input type="text"
        data-bind="value: name, event: { keyup: endEditEnter, blur: endEdit }" />
    </div>
  </div>
</script>
{% endhighlight %}

The tasksTemplate gets rendered for each task in the tasks list as noted above,
and also the properties that it references are properties of the task object,
not the viewModel object. To access the task object itself you can use the $data
variable. In order to access the tasks list or the viewModel object you will
need to add them to the
[templateOptions](http://knockoutjs.com/documentation/template-binding.html#note_6_passing_additional_data_to_your_template_using_)
property when you specify the template, template options are placed on the $item
variable.

The data bindings are as follows:

* The outer item div will have the css class done, then the task is marked as
  done, the css class editing when it is marked as such, and if you double click
  on it, the startEdit callback will be called (presumably setting the isEditing
  property to true).
* The checkbox will show the state of the isDone property.
* A span which contains the text of the name property. This is importantly
  designed as a data-bind as opposed to using the jQuery template syntax "${ name
  }" because the latter will cause a complete re-render of the template (causing
  all sorts of interactivity problems) while you edit the textbox. There are
  other ways to avoid this (like keep a copy and only save to the name property
  when you finish editing), but I liked it better to just avoid the problem and
  rely more heavily on knockout. If you need additional styling you can use a
  dependent observable to wrap the text, or a sub-template depending on how deep
  the rabbit hole goes.
* There is also a destroy anchor/button that will call the remove callback when
  clicked.
* The textbox holds the value of the name property, and the keyup and blur
  events will try to set the isEditing property to false.
* Whether the edit div or the item div are shown at a given time is determined
  by the editing class in pure css.

<div class="clearfix"></div>

{% highlight javascript %}
function task(options){
  /* base properties */
  var task = ko.mapping.fromJS(options.data, { 'ignore': ["isEditing"] });
  /* behaviour properties */

  /* hide/show parts of the view
NOTE: it is important that the view does not get re-rendered
   */
  task.isEditing = ko.observable(false);

  task.remove = function (event) {
    options.parent.mappedRemove({ "id": task.id });
  };
  task.startEdit = function (event) {
    task.isEditing(true);
    $(event.currentTarget).find(".edit input").focus();
  };
  task.endEdit = function () {
    task.isEditing(false);
  };
  task.endEditEnter = function () {
    event.keyCode == '13' && task.endEdit();
  };
  return task;
}
{% endhighlight %}

In the definition of the task object, we initially perform a mapping from the
data object to a task object. We want to ignore the isEditing property here so
it doesn't get saved into local storage later. We also add the isEditing
property manually, and the relevant callbacks. An interesting callback is the
remove callback, which accesses the tasks array (which is the parent of each task
according to the mapping plugin). It will remove the current task based on it's
id using a mapping plugin extension for simplicity.

I am very happy with how this turned out and you can [try
it](http://barkmadley.com/things/todos-obtrusive.html) for yourself, and view
the
[source](https://github.com/barkmadley/barkmadley.github.com/blob/master/things/todos-obtrusive.html).
One additional consequence of storing the entire viewModel in local storage is
that it also stores the taskName and id properties, meaning that the textbox
will be filled in with whatever state you left it in when you reload the page.

<div class="clearfix"></div>

