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

desc 'Build and start server with --auto'
task :prod do
  jekyll '--server --auto --no-future --safe --no-lsi'
end

def jekyll(opts = '')
  sh 'rm -rf _site'
  sh 'jekyll ' + opts
end

desc 'create a new branch (from master) with a new post in it'
task :post, [:date,:name] do |t, args|
  sh "git checkout wip"
  date = args.date
  name = args.name
  content = %x[cat wip/#{args.name}]
  sh "git checkout master"
  sh "git checkout -b #{date}"
  subbed_name = name.gsub(/[^a-zA-Z0-9]+/,"-")
  post_name = "_posts/#{date}-#{subbed_name}.md"
  f = File.new(post_name, "w")
  f.write(content)
  f.close
  sh "git add #{post_name}"
  sh "git commit"
end


desc 'merge branches that are based on dates (usually containing only posts) and push them to the github based on todays date'
task :merge do
  date = %x[date "+%Y-%m-%d"].strip
  sh "git checkout master"
  sh "git fetch"
  brs = %x[git branch]
  brs = brs.lines.
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


