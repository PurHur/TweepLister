# TweepLister by [gab.ai/miraculix](https://gab.ai/miraculix)
## Webextension for Firefox


## Features:

* Save lists of followers 
* Display list of mutual followers
* Add favorite users to list
* Automatically follow all users in any of these lists
* Dump list in machine readable format

### WARNING: Using the follow all feature of this addon may be against the Twitter TOS

## Installation:

### From source

1. Download TweepLister from Github
2. open about:debugging in Firefox
3. Click "Load Temporary Add-on" and select any of the files in the src/ folder

When you restart Firefox you have to repeat steps 2. and 3. If you don't want to repeat these steps, install from .xpi

### From .xpi

1. Download tweeplister-1.0-an+fx-windows.xpi from the folder above (or -linux or -mac)
2. On Windows doubleclick the file, maybe you need to chose to load it with Firefox
3. Click "Install" in the popup in Firefox

Installing it from the addon menu may not work (error message about signing or so), use the doubleclick method or open it from the File menu in Firefox

## Usage:

View a Following or Followers list on Twitter and click the "Save List" button on top of the page. After collecting the data, it will automatically start the list manager.

To start the list manager you can also click the browser action (TweepLister icon).

To see mutual followers you need to collect both, the Followers and Following lists of an user.

The rest is pretty much self-explanatory

# WARNING

Note that installing addons from untrusted sources may have risky effects, like stealing your cookies, intercepting the passwords you enter on websites for which the addon requested permissions in manifest.json 

Generally you should only install addons which have been approved by addons.mozilla.org

Or ask someone who understands Javascript if the addon is safe


