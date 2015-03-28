---
layout: post
title: hidden scrollbars are bad for usability
scripts:
- /js/libs/sb/shadowbox.js
stylesheets:
- /js/libs/sb/shadowbox.css
description: |
  A post describing why scrollbars that affect what you can see on a web page,
  but which are themselves hidden are a usability hazzard.

---

{% assign desc1 = 'figure 1. lack of scrollbar' %}
<figure>
<a href="{% if site.safe %}http://barkmadley.com{% endif %}/img/scrollbars_1.png" title="{{desc1}}" rel="shadowbox[slideshow]">
<img src="{% if site.safe %}http://barkmadley.com{% endif %}/img/scrollbars_1.png" alt="{{desc1}}" /></a>
<figcaption>{{ desc1 }}</figcaption>
</figure>

I was recently looking over a gist someone had posted when I noticed I had
become annoyed at the placement of the scrollbar along the bottom of the code
snippet. While browsing the middle of the code, the interaction of the overflow
of the text area, along with the long nature of the code made it extremely
difficult to read and understand what is going on. See figure 1 for an example
of what I mean.

This problem is alleviated somewhat by my macbooks two finger scroll gesture
which allows me to scroll any part of the web page that is covered by the mouse
cursor (this also applies to tablet devices where the scroll gesture is usually
just dragging). However I came to this website while I was at work, where I have
a linux box that has a basic 3 button mouse with a vertical mouse wheel. In that
situation there are only two options, to scroll down to the bottom of the code
where there is a scroll bar, or to use the selection overflow scrolling
behaviour.

{% assign desc2 = 'figure 2. added scrollbar' %}
<figure>
<a href="{% if site.safe %}http://barkmadley.com{% endif %}/img/scrollbars_2.png" title="{{desc2}}" rel="shadowbox[slideshow]">
<img src="{% if site.safe %}http://barkmadley.com{% endif %}/img/scrollbars_2.png" alt="{{desc2}}" /></a>
<figcaption>{{ desc2 }}</figcaption>
</figure>

In my opinion this situation is less than ideal, and there is a better way. Not
only to make scrolling easier, but it also makes it more apparent how much
content is in the overflow area.

My proposal is to show the scrollbars on elements that are visible on the
screen. Figure 2 shows figure 1 with a visible scrollbar. There are some
problems with always showing scroll bars, particularly if there are many
elements that are all visible on the screen that have the overflow css property
set. This could mean that an opt-in approach would be better. Perhaps adding a
new style of overflow style, a "always-visible" value would allow developers to
make easier to use scroll bars for content that doesn't fit entirely on a single
page.

If we are to live without the aid of a clean CSS implementation, how can we save
ourselves from falling into this usability trap? By simply not allowing any
element that will scroll on the x-axis to be taller than the y-axis. For many
applications this is not feasible. It might even be worth attempting to find a
way to implement this using purely javascript. I shall have to dedicate some
time to creating an example in my things page.

