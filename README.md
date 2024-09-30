# easy6502
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

Easy6502 by Nick Morgan is one-stop accessible tutorial on 6502 assembly language programming,
including a series of worked example programs which you can edit and run in the embedded emulator.

See http://skilldrick.github.io/easy6502/ for the live site.

This (original) fork is now in a strict maintenance-only mode. Pull requests are welcome for bug fixes.

Please see other active forks for further refinements and developments of the tutorial and the emulator:
https://github.com/skilldrick/easy6502/network

## Local setup

To run the project locally follow these steps.

Make sure that the latest version of Ruby is correctly installed on your system, you can use [rbenv](https://github.com/rbenv/rbenv).

Clone the repository:

```bash
git clone https://github.com/skilldrick/easy6502.git
cd easy6502
```

Create a new `Gemfile` in the root of the project with the following content:

```ruby
source 'https://rubygems.org'

gem 'jekyll'
gem 'github-pages', group: :jekyll_plugins
```

Then execute these commands:

```bash
# install the dependencies
gem install bundler
bundle install

# build the project (inside "_site" directory)
bundle exec jekyll build

# serve the project locally and watch for changes (from "_site" directory)
bundle exec jekyll serve
```
