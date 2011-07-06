---
layout: post
title: future posts with jekyll
data: |
  {% unless site.safe %} <!-- This is only true when run on github -->
  <header>
    <h2>work in progress</h2>
  </header>
  <ul class="posts">
  {% for pag in site.pages %}
    {% if pag.url contains '/wip/' %}
    <li>
      <a href="{{ pag.url }}">{{ pag.title }}</a>
    </li>
    {% endif %}
  {% endfor %}
  </ul>
  {% endunless %}

description: |
  A post describing how I setup a custom scheme for scheduling when posts will
  appear on my jekyll and github backed blog.

---

Since I created a [jekyll][] based website that will contain all my future
postings I started thinking about how I would handle the scenario whereby I
would like to write now, but publish later. This capability would allow me to
queue up some posts quickly, but spread out the publishing time to make it look
like I have been writing on a consistent timeline. While this may be similar to
lying, I think that at the very least it would be an intellectual exercise to
come up with a capable scheme to accomplish this goal, especially since all the
major publishing platforms allow this functionality.

[jekyll]: https://github.com/mojombo/jekyll/

I did consider just using the [future][] setting that is baked into jekyll,
however this presented a few limitations and extra work on my part to make it
work in a seemless manner (I would have to do needless commits anyway since
github only regenerates the site when you push a commit). I figured I might
learn some more of the intricacies of git, as well as make something a little
bit more flexible.

[future]: https://github.com/mojombo/jekyll/wiki/Configuration

The overall design is to have two main branches, the master branch which is what
github uses as the base for the jekyll build, and the work in progress branch
which I keep locally and it holds the ideas I have for future posts. When a post
has been fully baked I will pick a date and move it to it's own branch, which
will be named based on the date I pick to publish it.

I created a rake task in my [rakefile][] that simplifies the steps that are
required to create the dated branch. This will slurp a file from the wip folder
(only available on the wip branch) and create a new branch based on a date that
is passed in as an argument.

[rakefile]: https://github.com/barkmadley/barkmadley.github.com/blob/master/Rakefile

{% highlight ruby %}
desc 'create a new branch (from master) with a new post in it'
task :post, [:date,:name] do |t, args|
  sh "git checkout wip"
  date = args.date
  name = args.name
  content = %x[cat wip/#{args.name}.md]
  sh "git checkout master"
  sh "git checkout -b #{date}"
  subbedname = name.gsub(/[^a-zA-Z0-9]+/,"-")
  postname = "_posts/#{date}-#{subbedname}.md"
  f = File.new(postname, "w")
  f.write(content)
  f.close
  sh "git add #{postname}"
  sh "git commit" # this will open the commit vim instance
end
{% endhighlight %}

With the content safely committed to its own branch, I can just wait until the
publish date to merge and push. Or I could simplify that to a single command and
automate it in a cronjob. To help this along I also created a simple rake task.
This will merge in all branches that are older or equal to todays date into the
master branch, and then push those changes to the github remote repository.

{% highlight ruby %}
desc 'merge branches that are based on dates (usually containing only posts) and push them to the github based on todays date'
task :merge do
  date = %x[date "+%Y-%m-%d"].strip
  sh "git checkout master"
  sh "git fetch"
  %x[git branch].lines.
    map    {|line| line.strip}.
    select {|line| line.match(/^\d\d\d\d-\d\d-\d\d$/)}.
    select {|line| line <= date}.
    each do |date|
    puts date
    sh "git merge #{date}"
    sh "git branch -d #{date}"
    %x[git push origin :#{date}]
  end
  sh "git push origin master"
end
{% endhighlight %}

Using these two rake tasks I am able to have a workflow that works for me.

{%highlight bash %}
git checkout wip
vim wip/somefile.md
# write write write
# possibly commit changes
rake post[2011-06-06,somefile]
git commit # this commits 2011-06-06-somefile.md into the 2011-06-06 branch
# when it is 2011-06-06 or in a cronjob
rake merge
{% endhighlight %}

In addition to this I have also made it easier to preview my work in progress
pages by using the site.pages enumeration to see what I have in the pipeline.

{% highlight html %}
{{ page.data }}
{% endhighlight %}

I am very happy with this setup for now, and I am sure there will be more tweaks
and improvements to it in the future.

