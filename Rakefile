# Adopted from Scott Kyle's Rakefile
# http://github.com/appden/appden.github.com/blob/master/Rakefile

task :default => :server

desc 'Build site with Jekyll'
task :build do
  jekyll
end

desc 'Build and start server with --auto'
task :server do
  jekyll '--server --auto'
end

def jekyll(opts = '')
  sh 'rm -rf _site'
  sh 'jekyll ' + opts
end

desc 'create a new branch (from master) with a new post in it'
task :post, [:date,:name] do |t, args|
  date = args.date
  name = args.name
  sh "git checkout master"
  sh "git checkout -b #{date}"
  subbed_name = name.gsub(/[^a-zA-Z0-9]+/,"-")
  post_name = "_posts/#{date}-#{subbed_name}.md"
  sh "touch #{post_name}"
  sh "git add #{post_name}"
end

desc ''
task :merge do
  date = %x[date "+%Y-%m-%d"].strip
  brs = %x[git branch]
  brs = brs.lines.collect {|line| line.strip}
  brs = brs.select {|line| line != "* master"}
  brs = brs.select {|line| line <= date}
  sh "git checkout master"
  brs.each do |date|
    puts date
    sh "git merge #{date}"
    sh "git branch -d #{date}"
    sh "git push origin :#{date}"
  end
  sh "git push origin master"
end

