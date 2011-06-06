     _           _     
    | |__  _   _| |__  
    | '_ \| | | | '_ \ 
    | |_) | |_| | |_) |
    |_.__/ \__,_|_.__/ 

**bub** tries to be a dashboard for people with lots of GitHub issues. Instead of having to dig into separate repositories to find things that you need to address, you can see all of your 20+ projects on the same page (without pagination)

## Installation & Requirements

No installation necessary. There's no server component - it's all JSONP against [the GitHub API](http://develop.github.com/).

Right now there's configuration in `config.json` - specify a single key, `organization`.

Since this is a fun-times project for developers, you're going to need a decent web browser. This will never support IE. It will soon rely on niceties like localStorage.

# Behind the Scenes

Shoutouts to underscore.js, backbone, and jQuery.

# Authors

* Tom MacWright <macwright@gmail.com>
