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
  jekyll '--server --auto --future --safe --no-lsi'
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
  wip_name = "wip/#{name}.md"
  content = %x[cat #{wip_name}]
  sh "git checkout master"
  sh "git checkout -b #{date}"
  subbed_name = name.gsub(/[^a-zA-Z0-9]+/,"-")
  post_name = "_posts/#{date}-#{subbed_name}.md"
  f = File.new(post_name, "w")
  f.write(content)
  f.close
  sh "git add #{post_name}"
  sh "git commit -m 'new post for #{date}'"
  sh "git checkout wip"
  sh "git rm #{wip_name}"
  sh "git commit -m 'moved to branch #{date} as a post'"
  sh "git checkout master"
  sh "git push origin #{date}"
  sh "git push origin wip"
end


desc 'merge branches that are based on dates (usually containing only posts) and push them to the github based on todays date'
task :merge do
  date = %x[date "+%Y-%m-%d"].strip
  sh "git fetch"
  local_branches = %x[git branch].lines.map {|line| line.strip.gsub(/^\*/,"").strip}
  %x[git branch -r].lines.
    map {|line| line.strip}.
    each do |remote|
      # merge remote branches into local ones
      local = remote.gsub(/origin\//,"")
      sh "git branch #{local}" unless local_branches.include? local
      sh "git checkout #{local}"
      sh "git merge #{remote}"
    end
  sh "git checkout master"
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


