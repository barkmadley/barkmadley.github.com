---
layout: post
title: a knockout contacts manager

---

As a follow up to my [previous post](/2011/06/19/a-knockout-todo-list.html)
where I rewrote the [spine](http://maccman.github.com/spine/) todo list demo
into the knockout style, I decided to take a crack at one of the [other
examples](http://maccman.github.com/spine/#h-examples) that is posted on the
spine documentation site. Specifically the [CRUD
Contacts](http://maccman.github.com/spine.contacts/) example.  I was also able
to make a few enhancements to the example as some of the boundary interactions
were not up to my personal standards of quality.

{% highlight javascript %}
function contact(options) {
  var contact = ko.mapping.fromJS(options.data);

  contact.fullName = ko.dependentObservable(function() {
    var fullName = contact.firstName() + " " + contact.lastName();
    if (fullName === " ") {
      return null;
    } else {
      return fullName;
    }
  }, contact);

  return contact;
}
{% endhighlight %}

To start off with, we define a function for how our contact model will be
created. This is very simple, I use the mapping plugin because like all good
programmers I am lazy. When we come to the newContact method later on we will
see what the actual structure of a contact is. At this point we only need to
augment the structure with one dependentObservable which represents the fullname
of the contact (and if neither the first nor the last name are set, we return
null).

{% highlight javascript %}
var mappingOptions = {
  'contacts': {
    'key': function(item) {
      return ko.utils.unwrapObservable(item.id);
    },
    'create': contact
  }
};

/* initial state */
var defaultData = '{"contacts":[],"editing":false,"filter":"","selectedContactIdx":null,"id":0}';
/* load from local storage if possible */
var jsonData = (window.localStorage && localStorage['contacts']) || defaultData;

window.viewModel = ko.mapping.fromJSON(jsonData, mappingOptions);
{% endhighlight %}

Using the above contact function, and a key mapping that says that the identity
of a contact is determined by its id property, we create the actual view model
object with either the data from the local storage API, or some nice defaults.
The style of this initialisation is primarily due to laziness and simplicity.
The model itself is comprised of a filter string, a selected contact idenfier,
an auto incrementing id, an editing boolean (which represents if we are in the
editing state or not) and an initialy empty list of contacts.

The top level HTML for this demo is a bit longer than I normally like to put in
a single code block, so I will split it and explain each part in turn. Both
parts are wrapped in a div with id "wrapper".

{% highlight html %}
<div id="sidebar">
  <div class="search">
    <input data-bind="value: filter, valueUpdate: 'keyup'" type="search" placeholder="Search" results="0" incremental="true" autofocus>
  </div>

  <ul class="items"
    data-bind="template: {
      name: 'contactsTemplate',
      foreach: filteredContacts,
      templateOptions: {
        selectContact: selectContactIdx,
        selectEdit: selectEditContactIdx,
        selectedContact: isSelectedContact
      }
    }"></ul>

  <footer>
    <button data-bind="click: newContact">New contact</button>
  </footer>
</div>

<div class="vdivide"></div>
{% endhighlight %}

The sidebar contains the new contact button, which will call the newContact
function, and the search bar, which mirrors the value of the filter property,
which is simple enough, however it also influences the next part, which is a
rather sophisticated use of the template binding, though way of the foreach
binding: filteredContacts. This template binding also passes along a few helper
functions for managing the state of the selectedContactIdx property (which
should reflect the most recently clicked on contact, influencing which contact
is being edited or viewed).

{% highlight javascript %}
viewModel.newContact = function (event) {
  var blankContact = {
    "firstName": "",
    "lastName":"",
    "email": "",
    "mobile":"",
    "work":"",
    "address":"",
    "notes":"",
    "id": this.id()
  };
  this.contacts.push(contact({data: blankContact}))
  this.id(blankContact.id + 1);
  this.selectedContactIdx(blankContact.id);
  this.editing(true);
};
{% endhighlight %}

The new contact function creates a empty contact object and pushes it to the
contacts array. The auto increment logic of the id property is handled here.
After adding the contact to the list, we want to select the new contact, and
also start editing it.

{% highlight javascript %}
viewModel.filteredContacts = ko.dependentObservable(function () {
  var filter = this.filter();
  if (filter == "") {
    return this.contacts();
  }
  return ko.utils.arrayFilter(this.contacts(), function (item) {
    return ko.utils.arrayFilter(["firstName", "lastName", "email", "mobile", "work", "address", "notes"], function (attr) {
      return ko.utils.unwrapObservable(item[attr]).indexOf(filter) >= 0;
    }).length > 0;
  });
}, viewModel);
{% endhighlight %}

FilteredContacts is a dependent property that is added to the viewModel after
applying the mapping. The filter is pretty simple to understand, only return
contacts that contain the filter string in any of their string fields. The style
of the code is very functional as that is my background.

{% highlight javascript %}
viewModel.selectedContact = ko.dependentObservable(function () {
  return this.contacts()[this.contacts.mappedIndexOf({ id: this.selectedContactIdx() })];
}, viewModel);
{% endhighlight %}

Knowing which contact is currently selected is handled by the selectedContact
dependent property. It uses a unique feature of the mapping plugin that extends
observable arrays to be able to perform lookups of the index of a sub objects
identity key. In this case we perform the lookup based on the id field of
contact objects.

{% highlight javascript %}
viewModel.isSelectedContact = function (idx) {
  return ko.utils.unwrapObservable(idx) === viewModel.selectedContactIdx();
};
viewModel.selectContactIdx = function (idx) {
  return function() {
    viewModel.selectedContactIdx(ko.utils.unwrapObservable(idx));
    viewModel.editing(false);
  }
};
viewModel.selectEditContactIdx = function (idx) {
  return function() {
    viewModel.selectedContactIdx(ko.utils.unwrapObservable(idx));
    viewModel.editing(true);
  }
};
{% endhighlight %}

The next couple of functions are different ways to interact with the
selectedContactIdx property. With isSelectedContact we want to know if an id is
the currently selected id. selectContactIdx sets the selectedContactIdx
property, and also sets the editing context to be false, although sometimes we
do want to enter the editing mode (i.e. we double click on a contact in the
sidebar), so we have that option as well. These callbacks are implemented as
functions that return functions because we want to preserve the id to use based
on which contact is clicked.

{% highlight html %}
<script type="text/html" id="contactsTemplate">
  <li class="item" data-bind="click: $item.selectContact(id()),
    event: { dblclick: $item.selectEdit(id()) },
    css: { current: $item.selectedContact(id()) }">
    <img src="/images/missing.png" />
    <span class="name" data-bind="text: (fullName() || 'No Name'), css: { empty: !fullName() }"></span>
    <span class="cta">&gt;</span>
  </li>
</script>
{% endhighlight %}

This brings me to the contactsTemplate. While the instantiation of this template
is quite complex because of the amount of behaviour that is associated with it,
the structure itself is very simple. We have an li element that contains some
callbacks (that are passed in via the templateOptions), and a text field which
displays a contacts full name or the string 'No Name'. Other things are when to
apply the particular CSS styles that transform the list item to mean different
things, such as 'this is the currently selected contact', and 'there is no name
associated with this contact'.

{% highlight html %}
<div id="contacts" data-bind="css: { editing: editing, hidden: !selectedContact() }">
  <div class="show">
    <ul class="options">
      <li class="optEdit" data-bind="click: setEditing(true)">Edit contact</li>
      <li class="optEmail" data-bind="click: emailContact">Email contact</li>
    </ul>
    <div class="content"
      data-bind="template: { name: 'contactTemplate', data: selectedContact }"></div>
  </div>

  <div class="edit">
    <ul class="options">
      <li class="optSave default" data-bind="click: setEditing(false)">Save contact</li>
      <li class="optDestroy" data-bind="click: deleteContact">Delete contact</li>
    </ul>
    <div class="content"
      data-bind="template: { name: 'editContactTemplate', data: selectedContact }"></div>
  </div>
</div>
{% endhighlight %}

The second half of the top level HTML represents the working area of the
contacts application. There are two halfs, which represent the two different
states it can be in. Either editing, or not editing. I have also included
additional logic that will hide the working area if there is no selected contact
(this is generally only true of an empty contact list). There are seperate
actions you can perform while in either state. Generally these are to switch
between the two working states, but also there is an email button (that will
attempt to email the contact, which mirrors the functionality found in the spine
example) and a delete button, which is only viewable when editing a contact.

{% highlight javascript %}
viewModel.setEditing = function(v) {
  return function () {
    viewModel.editing(v);
  };
};
{% endhighlight %}

The setEditing callback is really a callback that returns a callback similar to
the selectContact callback used in the sidebar. The reason for doing this is
because click handlers are evaluated when they are created, and then the result
is evaluated once per click. This function returning a function style works with
this behaviour, and since it is a closure, it will never forget what it should
be putting in the editing observable.

{% highlight javascript %}
viewModel.deleteContact = function (event) {
  var id = viewModel.selectedContactIdx();
  var idx = viewModel.contacts.mappedIndexOf({ id: id });
  viewModel.contacts.mappedRemove({ id: id });
  if (viewModel.contacts().length) {
    if (idx >= viewModel.contacts().length) {
      idx--;
    }
    viewModel.selectedContactIdx(viewModel.contacts()[idx].id());
  } else {
    viewModel.selectedContactIdx(null);
  }
  viewModel.editing(false);
};
{% endhighlight %}

The deleteContact callback is a bit more involved. First I need to find the
currently selected contact, as well as where it is in the list of contacts (the
contact id does not necessarily match up with index within the contacts list).
Then using the mappedRemove convenience function I then attempt to select the
contact that took its place in the contacts list, or the previous one if we are
at the end of the list. Also we should go out of editing mode so miss-clicks
don't delete more than we needed.

{% highlight html %}
<script type="text/html" id="contactTemplate">
  <label>
    <span>Name</span>
    <div data-bind="text: (fullName() || 'No Name'), css: {empty: !fullName() }"></div>
  </label>

  <label>
    <span>Email</span>
    <div data-bind="text: (email() || 'Blank'), css: { empty: !email() }"></div>
  </label>

  <label data-bind="css: { hidden: !mobile() }">
    <span>Mobile number</span>
    ${mobile}
  </label>

  <label data-bind="css: { hidden: !work() }">
    <span>Work number</span>
    ${work}
  </label>

  <label data-bind="css: { hidden: !address() }">
    <span>Address</span>
    <pre>${address}</pre>
  </label>

  <label>
    <span>Notes</span>
    <div data-bind="css: { empty: !notes() }, text: (notes() || 'Blank')"></div>
  </label>
</script>
{% endhighlight %}

{% highlight html %}
<script type="text/html" id="editContactTemplate">
  <label>
    <span>First name</span>
    <input type="text" name="first_name" data-bind="value: first_name" autofocus>
  </label>

  <label>
    <span>Last name</span>
    <input type="text" name="last_name" data-bind="value: last_name">
  </label>

  <label>
    <span>Email</span>
    <input type="text" name="email" data-bind="value: email">
  </label>

  <label>
    <span>Mobile number</span>
    <input type="text" name="mobile" data-bind="value: mobile">
  </label>

  <label>
    <span>Work number</span>
    <input type="text" name="work" data-bind="value: work">
  </label>

  <label>
    <span>Address</span>
    <textarea name="address" data-bind="value: address"></textarea>
  </label>

  <label>
    <span>Notes</span>
    <textarea name="notes" data-bind="value: notes"></textarea>
  </label>
</script>
{% endhighlight %}

Finally we have the two halfs of the work space that bind to the values found in
the contacts data structure. For brevity in the show template I am using the
default value technique to avoid using if statements. I also found that using if
statements directly in the templates didn't work very reliably, so I instead
used the css binding to apply the hidden class where appropriate.



