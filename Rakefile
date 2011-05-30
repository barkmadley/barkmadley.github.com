# Adopted from Scott Kyle's Rakefile
# http://github.com/appden/appden.github.com/blob/master/Rakefile

task :default => :server

desc 'Build site with Jekyll'
task :build do
  jekyll
end

desc 'Build and start server with --auto'
task :server do
  jekyll '--server --auto --future'
end

def jekyll(opts = '')
  sh 'rm -rf _site'
  sh 'jekyll ' + opts
end

