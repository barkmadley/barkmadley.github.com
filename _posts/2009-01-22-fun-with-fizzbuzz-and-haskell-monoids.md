---
layout: post
title: fun with fizzbuzz and haskells monoids
description: |
  A simple implementation of the FizzBuzz toy problem that is also extensible
  using a aggregation abstraction known as Monoids.

---
In this short article I will be exploring FizzBuzz, and showing how the monoidal approach helps combine the logic of the problem in a reasonable way when compared to the naive solution.

The problem of FizzBuzz
-----------------------

The FizzBuzz problem has been written about extensively many times before, most
commonly as a way to exspanss the failure of the majority of programmers
applying for jobs [to][fizzbuzz codinghorror] [grok][fizzbuzz imran]
[it][fizzbuzz raganwald].

[fizzbuzz codinghorror]: http://www.codinghorror.com/blog/archives/000781.html
[fizzbuzz imran]: http://imranontech.com/2007/01/24/using-fizzbuzz-to-find-developers-who-grok-coding/
[fizzbuzz raganwald]: http://weblog.raganwald.com/2007/01/dont-overthink-fizzbuzz.html

The problem itself is as follows

{% highlight text %}
Write a program that prints the numbers from 1 to 100.
But for multiples of three print "Fizz" instead of the
number and for the multiples of five print "Buzz".
For numbers which are multiples of both three and five
print "FizzBuzz".
{% endhighlight %}

Naive Haskell implementation of FizzBuzz
----------------------------------------

To attack the problem using Haskell, I split the problem into a purely function one, with a main that does the heavy IO lifting. This took me all of 2 seconds to write down, especially the if exspanssions.

{% highlight haskell %}
fizz, buzz :: Num a => a -> Bool
fizz n = n `mod` 3 == 0
buzz n = n `mod` 5 == 0
fizzbuzz :: Num a => a -> String
fizzbuzz n = if fizz n && buzz n then "FizzBuzz" else
    if fizz n then "Fizz" else
        if buzz n then "Buzz" else show n
main :: IO ()
main = mapM (putStrLn . fizzbuzz) [1..100] >> return ()
{% endhighlight %}

The main problem I have with this implementation is that it doesn't compose the fizz and buzz functions very well into a coherent fizzbuzz. It is very imperative, in that it checks a, then b, then c etc. If you think that this approach will suffice then you don't have to continue reading, but I do have more to say.

Monoids
-------
Monoids have been getting a lot of blog attention very recently because of an
article [Brian Hurt][] wrote about his thoughts on Haskell, which included a
contraversial statement about monoids, so [everyone][sigfpe] and
[their][apfelmus] [mum][sigfpe2] decided to write about them. I am adding to the
hysteria even though it is a dead horse, except that my goal is merely to
solidify their usefulness in my mind by applying monoids to a not so practical
application.

[brian hurt]: http://enfranchisedmind.com/blog/2009/01/16/on-monoids-and-metaphor-shear/
[sigfpe]: http://sigfpe.blogspot.com/2009/01/haskell-monoids-and-their-uses.html
[apfelmus]: http://apfelmus.nfshost.com/monoid-fingertree.html
[sigfpe2]: http://sigfpe.blogspot.com/2009/01/fast-incremental-regular-expression.html

So what is a monoid? Briefly a monoid is a way to accumulate results together
into a whole result. Any data type that wants to become a monoid must support
two operations, empty and append, and follow 3 laws (not strictly speaking but
it is prefered), these are written about [here][sigfpe3].

[sigfpe3]: http://sigfpe.blogspot.com/2009/01/haskell-monoids-and-their-uses.html

The reason I thought of fizzbuzz and monoids in the same thought was the
realisation that the fizzbuzz function should be a composition of the fizz and
the buzz function, and theoretically you should be able to compose many other
modulous computations that result in strings.

Monoidal FizzBuzz
-----------------

So how would you go about composing the fizzbuzz problem? First we need to
identify the sub problems. One of the things that makes the naive solution both
uglier and less efficient is the fact that it potentially invokes 4 condition
functions, where we have only defined 2. i.e. fizz and buzz could be called
twice.

What I would like to say is that the functions fizz and buzz return something
significant, and that we want the composition of those two results to be our
final result. In this case significance is denoted by whether or not a number is
divisible by 3 or 5, and the words Fizz and Buzz which sometimes need to be
composed to be FizzBuzz. So there are 4 cases then, FizzBuzz, Fizz, Buzz and
Nothing. Haskell already has a data type that encapsulates Nothing so lets look
at the Maybe data type.

{% highlight haskell %}
data Maybe a = Just a | Nothing
{% endhighlight %}

What I got to thinking was that we can use the Maybe type to hold either Fizz,
Buzz, or FizzBuzz, and if the value is Nothing, we should show the number.

My first stab at the new fizzbuzz function might look like this

{% highlight haskell %}
fizz n = if n`mod`3 == 0 then Just "Fizz" else Nothing
buzz n = if n`mod`5 == 0 then Just "Buzz" else Nothing
fizzbuzz n = fizz n `mappend` buzz n
{% endhighlight %}

This is made possible by the monoidal instance of the Maybe and String (list)
types.

{% highlight haskell %}
instance Monoid a => Monoid (Maybe a) where
    mempty = Nothing
    mappend (Just x) (Just y) = Just (x `mappend` y)
    mappend Nothing x = x
    mappend x Nothing = x
instance Monoid [a] where
    mempty = []
    mappend = (++)
{% endhighlight %}

Note that the Maybe instance requires that the data that Maybe encapsulates needs to also be an instance of monoid, which is why the list instance is required.

Finally I needed some way to use the number instead of the result from fizzbuzz, and the maybe function provided the answer.

{% highlight haskell %}
maybe :: b -> (a -> Maybe b) -> a -> b
{% endhighlight %}

The maybe function encodes the idea of using a function that returns a maybe type, with a default value incase it happens to return the value Nothing.

The Final Solution
------------------

So the final code looks like this

{% highlight haskell %}
fizz, buzz :: Num a => a -> Maybe String
fizz n = if n `mod` 3 == 0 then Just "Fizz" else Nothing
buzz n = if n `mod` 5 == 0 then Just "Buzz" else Nothing

fizzbuzz :: Num a => a -> Maybe String
fizzbuzz n = mconcat [fizz n, buzz n]

applyfizzbuzz :: Num a => a -> String
applyfizzbuzz n = maybe (show n) id (fizzbuzz n)

main :: IO ()
main = mapM (putStrLn . applyfizzbuzz) [1..100] >> return ()
{% endhighlight %}

Where mconcat is defined as a sequential application of mappend and the next element in the list. Personally I think that this code is easier to read than the original version, while at the same time making it easy to add new conditions, for example if the problem was extended to include a check for numbers that were divisible by 7 (and print "Elfs"), the code would only been to be changed on two lines like so:

{% highlight haskell %}
elfs n = if n `mod` 7 == 0 then Just "Elfs" else Nothing
fizzbuzz n = mconcat [fizz n, buzz n, elfs n]
{% endhighlight %}

Finally a note about point free style.  I recently noticed that functions of type a to b are instances of monoids if b is an instance of monoid.  Since out functions fizz, buzz and elfs all return Maybe Monoids, then we can simply mconcat the functions together and leave out the parameters as follows.

{% highlight haskell %}
fizzbuzz' = mconcat [fizz, buzz, elfs]
{% endhighlight %}

