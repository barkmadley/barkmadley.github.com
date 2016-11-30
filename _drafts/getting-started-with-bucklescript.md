---
layout: post
published: true
title: getting started with bucklescript
postclass: codepost
description: |
  A Description

---

There already exist quite a few tutorials around on how to get started using language X,
or framework Y.
I want to add to this pile of helpful guides,
by creating one of my own.
A guide for a project that is still quite early on in it's life,
but which shows great promise for advancing the rate of [OCaml][] adoption.

[OCaml]: http://www.ocaml.org/

The project I speak of is [Bucklscript][],
and it is by far one of the easiest to use versions of OCaml I have experienced to date.

[Bucklscript]: https://bloomberg.github.io/bucklescript/

Bucklescript is an OCaml to javascript compiler that aims to be 4 things:

1. easy to integrate with existing javascript software and eco-systems
2. generate readable javascript files
3. generate efficient javascript files
4. create those readable and efficient javascript files *extremely* fast.

And when I say extremely fast,
I mean ___extremely___ fast.
From my previous experiences using OCaml,
I knew that the OCaml compiler was fast,
but I wasn't ready for the Bucklescript compilers speed.

## installation

The easiest way to install Bucklescript is to do so by using the [node.js/npm][] toolchain.

[node.js/npm]: https://www.npmjs.com/

{% highlight bash %}

$ echo {} > package.json
$ npm install --save bs-platform

> bs-platform@1.3.1 postinstall /home/bark/projects/test/node_modules/bs-platform
> node scripts/install.js
...
# computer warms up for a bit
...
/home/bark/projects/test
└── bs-platform@1.3.1

npm WARN test No description
npm WARN test No repository field.
npm WARN test No license field.

{% endhighlight %}

The `npm install --save bs-platform` command works equally well in an existing npm project.
The command `yarn add bs-platform` also works if [yarn][] is your preferred toolchain.

[yarn]: https://yarnpkg.com/

In addition to installing the Bucklescript platform into your project directory,
you will also need to install the [ninja][] build system into your development environment.

[ninja]: https://ninja-build.org/

## example project

Now that you have Bucklescript installed in either an existing project,
or a new project,
the next step is to create some OCaml source files,
and a `bsconfig.json` file that tells the Bucklescript build system how to create javascript files that will execute either in the browser, or on a node.js project.

I like to put my source files inside a `src` directory.
And then create a hello world `main.ml` file.

{% highlight ocaml %}
(*src/main.ml*)
let () =
  Js.log "Hello world\n"
{% endhighlight %}

Using `Js.log` here is to make it absolutely clear that this cde is meant to be compiled to javascript.
Normal OCaml code might use the `print_endline` function.
With Bucklescript,
the compiler will translate that function into the equivalent `console.log` function call.

Before we can build our source code,
we need to tell Bucklescript where each of our source files are.
This is done using the `bsconfig.json` file.

{% highlight json %}
{
  "name": "hello world",
  "version": "1.0.0",
  "ocaml-config": {
    "sources": [
      {
        "dir": "src",
        "public" : "all",
        "files": [
          "main.ml"
        ]
      }
    ]
  }
}
{% endhighlight %}

The `bsconfig.json` format is described in more detail in the [Bucklescript documentation][],
but I will just point out that the `ocaml-config.sources[0].files` array can be replaced with a JSON object that describes a regular expression to match your source files,
for convenience if you end up needing to add many source files to your project.

[Bucklescript documentation]: https://bloomberg.github.io/bucklescript/Manual.html#_build_system_support

## building

Now comes the fun part.
Run the build command as follows:

{% highlight bash %}
$ time ./node_modules/bs-platform/bin/bsb.exe
lib/bs/.bsdeps does not exist
Regenrating build spec
ninja: Entering directory 'lib/bs'
[2/2] Building src/main.mlast.d
[3/3] Building /home/bark/projects/test/lib/ocaml/main.cmj

real    0m0.024s
user    0m0.003s
sys     0m0.007s
{% endhighlight %}

To compare,
this is roughly the same performance
(for a hello world program)
that I observe when compiling C programs.
However the speed benefits of Bucklescript scale much better as you need less code in general for the same functionality,
and after having written a few thousand lines of code,
I can attest that the build time has never exceeded 0.1 seconds.

I will also add that the normal OCaml bytecode compiler
(optimised version)
is roughly 1.5-2 times slower than the Bucklescript compiler,
and the OCaml native compiler
(optimised version)
is roughly 10 times slower.

The Bucklescript compiler also handles incremental builds extremely efficiently:

{% highlight bash %}
$ time ./node_modules/bs-platform/bin/bsb.exe
ninja: Entering directory 'lib/bs'
ninja: no work to do.

real    0m0.002s
user    0m0.000s
sys     0m0.000s
{% endhighlight %}

By default,
Bucklescript puts the compiled javascript files into the `lib/js` directory with the same directory structure as the input source directories.
So we can see that our Js.log function call is indeed turned into a console.log function call.

{% highlight javascript %}
// lib/js/src/main.js
// Generated by BUCKLESCRIPT VERSION 1.3.1 , PLEASE EDIT WITH CARE
'use strict';


console.log("hello world\n");

// Not a pure module
{% endhighlight %}

## running

Since the output is pure javascript,
the output files can be executed using the node utility,
or they can be loaded into the browser through some other means
(either by directly referencing them,
or through some further javascript bundling system such as [webpack][])

[webpack]: https://webpack.github.io/

Because of the extreme speed of the compiler,
it is well-suited to being used in an incremental automated compilation setup.
Since this setup is working within the npm/yarn eco-systems,
I turned to the nodemon tool which does a very good job of watching a directory tree for file system changes and then re-running build commands and/or restarting server processes.

{% highlight bash %}
$ nodemon -w src -w bsconfig.json -e ml,mli --exec 'time ./node_modules/bs-platform/bin/bsb.exe && node lib/js/src/main.js'

[nodemon] 1.11.0
[nodemon] to restart at any time, enter `rs`
[nodemon] watching: /home/bark/projects/test/src/* */*
[nodemon] starting `time ./node_modules/bs-platform/bin/bsb.exe && node lib/js/src/main.js`
ninja: Entering directory `lib/bs`
ninja: no work to do.

real    0m0.002s
user    0m0.000s
sys     0m0.000s
hello world

[nodemon] clean exit - waiting for changes before restart
{% endhighlight %}

Now if I edit the source code in main.ml:

{% highlight OCaml %}
(*src/main.ml*)
let () =
  print_endline "hello print_endline world\n"
{% endhighlight %}

We can observe the compilation and execution immediately on save.

{% highlight bash %}
[nodemon] restartinhg due to changes...
[nodemon] starting `time ./node_modules/bs-platform/bin/bsb.exe && node lib/js/src/main.js`
ninja: Entering directory `lib/bs`
[2/2] Building src/main.mlast.d
[0/3] Building src/main.cmj /home/bark/projects/test/lib/js/src/main.[1/3] Building src/main.cmj /home/bark/projects/test/lib/js/src/main.[3/3] Building /home/bark/projects/test/lib/ocaml/main.cmj

real    0m0.036s
user    0m0.023s
sys     0m0.003s
hello print_endline world
[nodemon] clean exit - waiting for changes before restart
{% endhighlight %}

And finally verify that indeed my claim that the print_endline/Js.log functions will output the the same compiled code:

{% highlight javascript %}
// lib/js/src/main.js
// Generated by BUCKLESCRIPT VERSION 1.3.1 , PLEASE EDIT WITH CARE
'use strict';


console.log("hello print_endline world\n");

// Not a pure module
{% endhighlight %}

## next

In summary,
I have outlined how to get up and running with a new project using the Bucklescript OCaml to javascript compiler.
This technique will also work for existing projects as long as there are no filesystem conflicts.
I also shared some tips for doing fast iterative development,
by using the `nodemon` tool.

From here to get more practical use out of a Bucklescript code base we will need to creating bindings to javascript libraries such that they can be re-used from the OCaml source code,
and then using those bindings to create efficient and type safe software that can be executed in the browser,
or in a node.js command line process.

If you want to try Bucklescript without starting a project or downloading and installing the compiler,
there is an in the browser [demo][] where you can experiment with the OCaml syntax,
and observe what the equivalent compiled javascript is.

[demo]: https://bloomberg.github.io/bucklescript/js-demo/index.html
