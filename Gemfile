ruby "2.7.2"

source 'https://rubygems.org'
git_source(:github) do |repo_name|
  repo_name = "#{repo_name}/#{repo_name}" unless repo_name.include?("/")
  "https://github.com/#{repo_name}.git"
end

gem "rake"
gem "foreman"
gem "dotenv"
gem 'discordrb'
gem 'discordrb-webhooks'
gem 'chronic'
gem 'chronic_duration'
gem 'dotiw'
gem 'pg'
gem 'sequel'
gem 'activesupport'
gem 'require_all'
gem 'sinatra'
gem 'puma'

group :development, :test do
  gem 'sqlite3'
  gem 'rspec'
  gem 'timecop'
  gem 'pry'
end

group :test do
  gem 'database_cleaner-sequel'
end
