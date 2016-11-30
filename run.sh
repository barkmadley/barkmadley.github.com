#!/bin/bash

docker run --label=jekyll --volume=$(pwd):/srv/jekyll -it -p 127.0.0.1:4000:4000 jekyll/jekyll \
  jekyll serve --watch -H 0.0.0.0 --drafts
  
