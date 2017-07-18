/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

var gSpamDelay = 3;
var gFollowMaxUsers = 100;

const VERSION = browser.runtime.getManifest().version;

var gSaveListLock = false;
var gSomethingWentWrongOnTwitter = false;
var gTabIndex = 1;
var gMyScreenName = null;
var gAuthToken = null;

var gFollowerLists = new Array();
var gFollowingLists = new Array();
var gFavoriteIds = new Array();

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */


function arrayUnique(array) {
    var a = array.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
}

Element.prototype.insertChildAtIndex = function(child, index) {
  if (!index) index = 0
  if (index >= this.children.length) {
    this.appendChild(child)
  } else {
    this.insertBefore(child, this.children[index])
  }
}

function getTimestamp()
{
  return Math.floor(Date.now() / 1000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function getUriParams()
{
	var $_GET = {},
	    args = location.search.substr(1).split(/&/);
	for (var i=0; i<args.length; ++i) {
	    var tmp = args[i].split(/=/);
	    if (tmp[0] != "") {
	        $_GET[decodeURIComponent(tmp[0])] = decodeURIComponent(tmp.slice(1).join("").replace("+", " "));
	    }
	}
	return $_GET;
}

function xhrGet(url)
{
	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);
	xhr.setRequestHeader('User-Agent',"w3m/0.52");
	xhr.send();
	return xhr;
}

function compareScreenname(a,b) {
  if (a.screenname < b.screenname)
    return -1;
  if (a.screenname > b.screenname)
    return 1;
  return 0;
}

function compareSname(a,b) {
  if (a.sname < b.sname)
    return -1;
  if (a.sname > b.sname)
    return 1;
  return 0;
}


/* ################################################################################################## */
/* ################################################################################################## */
// list owner list things
/* ################################################################################################## */
/* ################################################################################################## */



async function populateListownerList()
{
	let available_lists = new Array();
	let settings =  await browser.storage.local.get(["following_lists", "follower_lists"]);
	if (settings.follower_lists != null) {
		gFollowerLists = settings.follower_lists;
		available_lists = available_lists.concat(settings.follower_lists);
	
	}
	if (settings.following_lists != null) {
		gFollowingLists = settings.following_lists;
		available_lists = arrayUnique(available_lists.concat(settings.following_lists)); 
	
	}
	if (available_lists.length < 1) return;

	available_lists.sort(compareScreenname);
	
	let div_available_1 = document.getElementById("tl_available_lists_1");
	let div_available_2 = document.getElementById("tl_available_lists_2");
	let div_available_3 = document.getElementById("tl_available_lists_3");

	let list_divs = [ div_available_1, div_available_2, div_available_3 ];

	div_available_1.textContent = "";
	div_available_2.textContent = "";
	div_available_3.textContent = "";

	let tmp_list = new Array();
	let idx = 0;
	let max_idx = list_divs.length;

	for (let i=0; i<available_lists.length; i++)
	{

		if (tmp_list.indexOf(available_lists[i].screenname) != -1) continue;
		tmp_list.push(available_lists[i].screenname);
		let uitem = createListownerItem({ screenname: available_lists[i].screenname });
		gTabIndex++;

		list_divs[idx].appendChild(uitem);
		idx++;
		if (idx == max_idx) idx = 0;
	}
}

function createListownerItem(params)
{
	let container = document.createElement("div");
	container.setAttribute("class", "tl_listowner_container");

	let menu_butt = document.createElement("label");
	menu_butt.setAttribute("class", "tl_listowner_menu");
	menu_butt.textContent = "♻️";
	//menu_butt.setAttribute("data-screen-name", params.screenname);
	menu_butt.addEventListener("click", function(e) { listOwnerMenuButtClicked( params.screenname, e )});

	let user_item = document.createElement("label");
	user_item.setAttribute("class", "tl_user_item");
	//user_item.setAttribute("id", "id-" + params.screenname);
	user_item.textContent = params.screenname;
	user_item.addEventListener("click", function() { populateFavorites(); listOwnerSelected(params.screenname); } );
	user_item.setAttribute("tabindex", gTabIndex);

	container.appendChild(user_item);
	container.appendChild(menu_butt);

	return container;
}

function listOwnerMenuButtClicked( screenname, e) {

	let listowner_popup = document.getElementById("listowner_popup");
	listowner_popup.setAttribute("data-screen-name", screenname);

	let pu_bg = document.getElementById("popup_background");
	pu_bg.style.visibility = "visible";

	listowner_popup.style.left = e.clientX;
	listowner_popup.style.top = e.clientY;

	listowner_popup.style.visibility = "visible";
}



async function removeListOwner(screenname)
{
		let settings =  await browser.storage.local.get(["following_lists", "follower_lists"]);
		let list1 = new Array();

		for (let i=0; i<settings.follower_lists.length; i++)
		{
			if (settings.follower_lists[i].screenname != screenname) list1.push(settings.follower_lists[i]);
		}

		let list2 = new Array();
		for (let i=0; i<settings.following_lists.length; i++)
		{
			if (settings.following_lists[i].screenname != screenname) list2.push(settings.following_lists[i]);
		}

		browser.storage.local.set({"following_lists": list2});
		browser.storage.local.set({"follower_lists": list1});

		browser.storage.local.remove([`followers-` + screenname]);
		browser.storage.local.remove([`following-` + screenname]); 

		populateListownerList();
}

/* ################################################################################################## */

async function listOwnerSelected(user)
{

	let div_followers = document.getElementById("tl_list_followers");
	let div_following = document.getElementById("tl_list_following");
	let div_mutuals = document.getElementById("tl_list_mutuals");
	let table_container = document.getElementById("tl_table_container");

	div_followers.innerHTML = "";
	div_following.innerHTML = "";
	div_mutuals.innerHTML = "";

	table_container.style.visibility = "hidden";

	let settings =  await browser.storage.local.get([`tmp_followers-` + user, `followers-` + user]);
	if (settings[`tmp_followers-` + user] != null)
	{
		if (settings[`followers-` + user] != null)
		{
			compareUserlists(settings[`tmp_followers-` + user], settings[`followers-` + user]);
		} 
		let setting_new = await browser.storage.local.set({[`followers-` + user]: settings[`tmp_followers-` + user]});
		settings[`tmp_followers-` + user].sort(compareSname);

	} else {
		if (settings[`followers-` + user] != null)
		{
			settings[`followers-` + user].sort(compareSname);
		}
	}
	let settings2 =  await browser.storage.local.get([`following-` + user]);
	if (settings2[`following-` + user] != null) settings2[`following-` + user].sort(compareSname);
	let mutuals;
	if (settings[`tmp_followers-` + user] != null)
	{
		addToListDiv( { div: div_followers, users: settings[`tmp_followers-` + user] });
		mutuals = getMutuals(settings2[`following-` + user], settings[`tmp_followers-` + user]);
		browser.storage.local.remove([`tmp_followers-` + user]);
		settings[`tmp_followers-` + user] = new Array(); // free memory
	} else {
		addToListDiv( { div: div_followers, users: settings[`followers-` + user] });
		mutuals = getMutuals(settings2[`following-` + user], settings[`followers-` + user]);
	}
	addToListDiv( { div: div_following, users: settings2[`following-` + user] });
	addToListDiv( { div: div_mutuals, users: mutuals });
	console.warn("fix me udata undefined");
	let udata = gFollowerLists.find(storage_user => storage_user.screenname === user);
	let time = 0;
	if (udata != null) {
		time = udata.time;
		div_followers.setAttribute("screen_name", udata.screenname);
	}
	div_followers.setAttribute("last_update", time);
	updateSubtitle( { sub: "subtitle_followers", updated: time  });

	time = 0;
	udata = gFollowingLists.find(storage_user => storage_user.screenname === user);
	if (udata != null) {
		time = udata.time;
		div_following.setAttribute("screen_name", udata.screenname);
	}
	div_following.setAttribute("last_update", time);
	updateSubtitle( { sub: "subtitle_following", updated: time  });
	updateListTitles();
	table_container.style.visibility = "visible";
}

/* ################################################################################################## */
/* ################################################################################################## */
// userlist things
/* ################################################################################################## */
/* ################################################################################################## */

function createUserlistItem(params)
{
	let user_item = document.createElement("label");
	user_item.setAttribute("class", "tl_userlist_item");
	let sp = document.createElement("span");
	let buttf = document.createElement("label");
	buttf.setAttribute("class", "tl_userlist_item_butt favorite");
	let buttd = document.createElement("label");
	buttd.setAttribute("class", "tl_userlist_item_butt delete");
	let cont = document.createElement("div");
	cont.setAttribute("class", "tl_userlist_container");
	if (params.div.id != "tl_list_favorites") sp.appendChild(buttf);
	else sp.appendChild(buttd);
	sp.appendChild(user_item);
	cont.appendChild(sp);
	return cont;
}

function addUlistItemData(clone, params)
{
	gTabIndex++;

	let item = clone.getElementsByClassName("tl_userlist_item")[0];
	let buttonf = clone.getElementsByClassName("tl_userlist_item_butt favorite")[0];
	let buttond = clone.getElementsByClassName("tl_userlist_item_butt delete")[0];
	let is_fav = false;
	item.textContent = params.sname;
	clone.setAttribute("data-user-id", params.userid);
	item.setAttribute("tabindex", gTabIndex);

	item.addEventListener("click", function(e) { listUserSelected(clone, e) });

	if (buttonf != null) {
		buttonf.addEventListener("click", function() { addToFavorites(clone) } );
		buttonf.textContent = "⭐️";
		buttonf.title = "Add to favorites";

		if (gFavoriteIds.indexOf(params.userid) != -1)
		{
			buttonf.style.background = "yellow";
			is_fav = true;
		}
	}
	if (buttond != null) {
		buttond.addEventListener("click", function() { removeFromFavorites(clone) } );
		buttond.textContent = "❌";
		buttond.title = "Remove from favorites";
	}
	return is_fav;
}

function listUserSelected(container_element, e)
{
	let user_id = container_element.getAttribute("data-user-id");
	let tl_userlist_item = container_element.getElementsByClassName("tl_userlist_item")[0];
	let screen_name = tl_userlist_item.textContent;
	let listuser_popup = document.getElementById("listuser_popup");
	listuser_popup.setAttribute("data-user-id", user_id);
	listuser_popup.setAttribute("data-screen-name", screen_name);
	listuser_popup.style.left = e.clientX;
	listuser_popup.style.top = e.clientY;
	listuser_popup.style.visibility = "visible";
	let popup_background = document.getElementById("popup_background");
	popup_background.style.visibility = "visible";
}

/* ################################################################################################## */
/* ################################################################################################## */
// favorites things
/* ################################################################################################## */
/* ################################################################################################## */

async function saveFavoriteList(list_div)
{
	if (gSaveListLock) {
		//console.log("not saving to reduce spam");
		return;
	}
	gSaveListLock = true;

	await sleep(2000);
	let tmp_list = new Array();
	let childs = list_div.getElementsByClassName("tl_userlist_item");
	for (let i=0; i<childs.length; i++)
	{
		let child_sname = childs[i].textContent;
		let container = childs[i].parentNode.parentNode;
		tmp_list.push({ sname: child_sname, userid: container.getAttribute("data-user-id") });
	}
	if (list_div.id == "tl_list_favorites") browser.storage.local.set({[`favorites-all`]: tmp_list});
	gSaveListLock = false;
}


function removeFromFavorites(id)
{
	id.parentNode.removeChild(id);
	saveFavoriteList(document.getElementById("tl_list_favorites"));	
	updateListTitles();
}

function addToFavorites(id)
{
	let buttonf = id.getElementsByClassName("tl_userlist_item_butt favorite")[0];
	buttonf.style.background = "yellow";
	let user_id = id.getAttribute("data-user-id");
	let screen_name = id.getElementsByClassName("tl_userlist_item")[0].textContent.toLowerCase();
	let div_favorites = document.getElementById("tl_list_favorites");
	let childs = div_favorites.getElementsByClassName("tl_userlist_item");
	for (let i=0; i<childs.length; i++)
	{
		let container = childs[i].parentNode.parentNode;
		let child_userid = container.getAttribute("data-user-id");
		let child_sname = childs[i].textContent.toLowerCase();
		if (child_userid == user_id) return; // do not add to or save list
	}
	let userlist_item_container = createUserlistItem( { div: div_favorites });
	addUlistItemData(userlist_item_container, 
	{ 
			sname: screen_name, 
			userid: user_id
	});
	div_favorites.insertChildAtIndex(userlist_item_container, 0);
	saveFavoriteList(div_favorites);	
	updateListTitles();
}

async function populateFavorites()
{
	let div_favorites = document.getElementById("tl_list_favorites");
	div_favorites.innerHTML = "";
	let settings =  await browser.storage.local.get([`favorites-all` ]);
	settings[`favorites-all`].sort(compareSname);
	favoriteIdsToVar(settings[`favorites-all`]);
	addToListDiv( { div: div_favorites, users: settings[`favorites-all`] });
	let tools_favorites = document.getElementById("tools_favorites");
	if (settings[`favorites-all`].length > 0)
	{
		title_favorites.textContent = "Favorites: " + settings[`favorites-all`].length;
		tools_favorites.style.visibility = "visible";
	} else {
		title_favorites.textContent = "No Favorites";
		tools_favorites.style.visibility = "hidden";
	}
	return true;
}

function favoriteIdsToVar(favs)
{
	for (let i=0; i<favs.length; i++) gFavoriteIds.push(favs[i].userid);
}

/* ################################################################################################## */
/* ################################################################################################## */

function getMutuals(list1, list2)
{
	let mutuals = new Array();
	if (list1 == null || list2 == null) return mutuals;
	for (let i=0; i<list2.length; i++)
	{
		let uid = list2[i].userid;
		let u = list1.find(user => user.userid === uid);
		if (u != null) mutuals.push(u);
	}
	return mutuals;
}

/* ################################################################################################## */
/* ################################################################################################## */
// follow unfollow things
/* ################################################################################################## */
/* ################################################################################################## */

function createFuUserItem(params)
{
	let user_item = document.createElement("div");
	user_item.setAttribute("class", "tl_user_item fu_popup");
	user_item.setAttribute("data-user-id", params.id);
	user_item.textContent = params.screenname;	
	user_item.addEventListener("click", function(e) {
		fuUserSelected(user_item, e);
	});
	return user_item;
}

function fuUserSelected(user_item, e)
{

	let user_id = user_item.getAttribute("data-user-id");
	let screen_name = user_item.textContent;
	let listuser_popup = document.getElementById("listuser_popup");
	listuser_popup.setAttribute("data-user-id", user_id);
	listuser_popup.setAttribute("data-screen-name", screen_name);
	listuser_popup.style.left = e.clientX;
	listuser_popup.style.top = e.clientY;
	listuser_popup.style.visibility = "visible";

	let popup_background = document.getElementById("popup_background");
	popup_background.style.visibility = "visible";
}

function compareUserlists(temp_list, old_list)
{
	let unfollowed = new Array();
	let followed = new Array();
	for (let i=0; i<temp_list.length; i++)
	{
		let uid = temp_list[i].userid;
		let u = old_list.find(user => user.userid === uid);
		if (u == null) followed.push(temp_list[i]);
	}
	for (let i=0; i<old_list.length; i++)
	{
		let uid = old_list[i].userid;
		let u = temp_list.find(user => user.userid === uid);
		if (u == null) unfollowed.push(old_list[i]);
	}

	let list_element_u = document.getElementById("fu_column_unfollowed");
	let list_element_f = document.getElementById("fu_column_followed");
	let follow_unfollow_popup = document.getElementById("follow_unfollow_popup");
	let popup_background = document.getElementById("popup_background");
	follow_unfollow_popup.style.left = Math.floor(document.body.clientWidth / 2) - 
										Math.floor(follow_unfollow_popup.clientWidth / 2);
	list_element_f.innerHTML = "";
	list_element_u.innerHTML = "";

	if (unfollowed.length > 0)
	{
		for (let i=0; i<unfollowed.length; i++)
		{
			let child = createFuUserItem({id: unfollowed[i].userid, screenname: unfollowed[i].sname})
			list_element_u.appendChild(child);
		}
		follow_unfollow_popup.style.visibility = "visible";
		popup_background.style.visibility = "visible";
	}

	if (followed.length > 0)
	{
		for (let i=0; i<followed.length; i++)
		{
			let child = createFuUserItem({id: followed[i].userid, screenname: followed[i].sname})
			list_element_f.appendChild(child);
		}
		follow_unfollow_popup.style.visibility = "visible";
		popup_background.style.visibility = "visible";
	}
}

/* ################################################################################################## */
/* ################################################################################################## */
// label update things
/* ################################################################################################## */
/* ################################################################################################## */

function updateSubtitle(params)
{
	let days_ago = 0;
	var hours_ago = Math.floor( ( getTimestamp() - params.updated ) / 3600 );
	if (hours_ago > 48) {
		days_ago = Math.floor( hours_ago / 24 );
		hours_ago = hours_ago % 24;
	}
	
	if (days_ago == 0) document.getElementById(params.sub).textContent = "Last collection: " + hours_ago + " hours ago";
	else document.getElementById(params.sub).textContent = "Last collection: " + days_ago + " days ago";
}

async function updateListTitles()
{
	let title_followers = document.getElementById("title_followers");
	let title_following = document.getElementById("title_following");
	let title_mutuals = document.getElementById("title_mutuals");
	let title_favorites = document.getElementById("title_favorites");

	let list_followers = document.getElementById("tl_list_followers");
	let list_following = document.getElementById("tl_list_following");
	let list_mutuals = document.getElementById("tl_list_mutuals");
	let list_favorites = document.getElementById("tl_list_favorites");

	let users_followers = list_followers.getElementsByClassName("tl_userlist_item");
	let users_following = list_following.getElementsByClassName("tl_userlist_item");
	let users_mutuals = list_mutuals.getElementsByClassName("tl_userlist_item");
	let users_favorites = list_favorites.getElementsByClassName("tl_userlist_item");

	let tools_followers = document.getElementById("tools_followers");
	let tools_following = document.getElementById("tools_following");
	let tools_mutuals = document.getElementById("tools_mutuals");

	if (users_mutuals.length > 0)
	{
		title_mutuals.textContent = "Mutuals: " + users_mutuals.length;
		tools_mutuals.style.visibility = "visible";
	} else {
		title_mutuals.textContent = "No Mutuals";
		tools_mutuals.style.visibility = "hidden";
	}

	if (users_followers.length > 0)
	{
		title_followers.textContent = "Followers: " + users_followers.length;
		tools_followers.style.visibility = "visible";
	} else {
		title_followers.textContent = "No Followers";
		tools_followers.style.visibility = "hidden";
	}

	if (users_following.length > 0)
	{
		title_following.textContent = "Following: " + users_following.length;
		tools_following.style.visibility = "visible";
	} else {
		title_following.textContent = "No Following";
		tools_following.style.visibility = "hidden";
	}


}

/* ################################################################################################## */
/* ################################################################################################## */
// shitter things
/* ################################################################################################## */
/* ################################################################################################## */

async function requestTwitterFollow(auth_token, screen_name)
{
	if (gSomethingWentWrongOnTwitter) await sleep(60000);
	gSomethingWentWrongOnTwitter = false;

	if (screen_name == null || auth_token == null) {
		 console.error("wtf fix me");
		 return;
	}
	console.log("following " + screen_name);
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://mobile.twitter.com/' + screen_name + '/follow', true);
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.onload =  function () {

    	if (this.responseText.indexOf("Something went wrong") != -1)
    	{
    		gSomethingWentWrongOnTwitter = true;
    		console.error("Something went wrong...");
    	}


	};
	xhr.send('authenticity_token=' + auth_token + "&commit=Follow");
}

/* ################################################################################################## */

function getAuthToken()
{
	let xhr = xhrGet("https://mobile.twitter.com/compose/tweet");
	let regex = /name=\"authenticity_token\" type=\"hidden\" value=\"([a-f0-9]*)/;
	let match = regex.exec(xhr.responseText);
	if (match != null && match[1] != null)
	{
//		console.log("Got auth token");
		return match[1];
	} else {
		console.error("tweeplister: failed to get auth_token");
	}
	return null;
}

function getMyScreenName()
{
	let xhr = xhrGet("https://mobile.twitter.com/account");
	let regex = /\(@([a-zA-Z0-9_]*)\) on Twitter</;
	let match = regex.exec(xhr.responseText);
	if (match != null && match[1] != null)
	{
		console.log("Got my screenname: " + match[1]);
		return match[1];
	} else console.error("tweeplister: failed to get my screenname");
	return null;
}

async function getMyTwitterData()
{	
	gMyScreenName = getMyScreenName();
	gAuthToken = getAuthToken();

	let tl_status = document.getElementById("tl_status");
	if (gMyScreenName != null) 	tl_status.textContent = "Logged in as @" + gMyScreenName;
	if (gAuthToken == null) tl_status.textContent = "Couldn't receive authenticity_token, can not follow users";
}

/* ################################################################################################## */
/* ################################################################################################## */
// general list things
/* ################################################################################################## */
/* ################################################################################################## */

function addToListDiv(params)
{
	if (params.users == null)
	{
		console.warn("no users found");
		return;
	}

	let userlist_item_container = createUserlistItem( {div: params.div });
	for (let i=0; i<params.users.length; i++)
	{
		let clone = userlist_item_container.cloneNode(true);
		let is_fav = addUlistItemData(clone, 
		{ 
			sname: params.users[i].sname, 
			userid: params.users[i].userid
		});

		if ( is_fav && params.div.id != "tl_list_favorites") params.div.insertChildAtIndex(clone, 0);
		else params.div.appendChild(clone);
		
	}
}

async function followAll(id)
{
	let tl_status = document.getElementById("tl_status");
	let count = 0;
	let already_following_count = 0;
	if (gFollowingLists != null) {
		let time = null;
		for (let i=0; i<gFollowingLists.length; i++)
		{
			if (gFollowingLists[i].screenname.toLowerCase() == gMyScreenName.toLowerCase())
			{
				time = gFollowingLists[i].time;
				break;
			} 
		}
		if (time != null)
		{
			
			if (getTimestamp() - time > 3600) {
				tl_status.textContent = "Following list needs moar update " + Math.floor( (getTimestamp() - time) / 60 )+ " minutes";
				return;
			}
		} else {
			tl_status.textContent = "no can do";
			return;
		}

	}

	let settings =  await browser.storage.local.get([`following-` + gMyScreenName.toLowerCase()]);
	let following_list = null;
	if (settings != null ) 
	{
		following_list = settings[`following-` + gMyScreenName.toLowerCase()];
		if (following_list == null)
		{
			tl_status.textContent = "fail";
			return;
		}
	} else {
		tl_status.textContent = "fail";
		return;
	}

	tl_status.textContent = "Following...";

	let users = id.getElementsByClassName("tl_userlist_item");

	for (let i=0; i<users.length; i++)
	{

		let u = following_list.find(user => user.sname.toLowerCase() === users[i].textContent.toLowerCase());

		if (u != null) {
			already_following_count++;
			tl_status.textContent = "already following " + u.sname + " (" + count + " of " + users.length 
					+ ", already followed " + already_following_count + ")";
			continue;
		} else count++;
		
		tl_status.textContent = "Following: " + users[i].textContent 
				+ "(" + count + " of " + users.length 
				+ ", already followed " + already_following_count + ")";
		requestTwitterFollow(gAuthToken, users[i].textContent);

		if (count > gFollowMaxUsers) {
			tl_status.textContent += " [ script stopped ]";
			break;
		}
		await sleep(gSpamDelay * 1000);
	}
}

/* ################################################################################################## */

function deleteAll(id)
{
	if (id.id == "tl_list_favorites")
	{
		browser.storage.local.remove([`favorites-all`]);
	} else
	if (id.id == "tl_list_followers")
	{
		browser.storage.local.remove([`followers-` + id.getAttribute("screen_name")])
	}
	id.innerHTML = "";
	updateListTitles();
}

/* ################################################################################################## */

function dumpList(userlist)
{
	let uid;
	let sname;
	let user_obj;
	let tmp_list = new Array();
	let users = userlist.getElementsByClassName("tl_userlist_item");

	let list_owner = userlist.getAttribute("screen_name");

	for(let i=0; i<users.length; i++)
	{
		uid = users[i].parentNode.parentNode.getAttribute("data-user-id");
		sname = users[i].textContent;
		user_obj = { user_id: uid, screen_name: sname };
		tmp_list.push(user_obj); 
	}

	document.head.innerHTML = "";
	document.title = list_owner + " list: " + userlist.id;
	document.body.innerHTML = "";

	let pre = document.createElement("pre");
	pre.textContent = "data-user-id , data-screen-name.toLowerCase() \\n";
	for (let i=0; i<tmp_list.length; i++)
	{
		pre.textContent += "\n" + tmp_list[i].user_id + "," + tmp_list[i].screen_name;  
	}
	document.body.appendChild(pre);
}

/* ################################################################################################## */
/* ################################################################################################## */
// popup things
/* ################################################################################################## */
/* ################################################################################################## */

function closePopups(params)
{
	for (let i=0; i<params.length; i++)
	{
		params[i].style.visibility = "hidden";
	}
}

function listenPopupButtons()
{

	let button_profile = document.getElementById("popup_button_profile");
	let button_follow = document.getElementById("popup_button_follow");
	let popup_background = document.getElementById("popup_background");

	let listuser_popup = document.getElementById("listuser_popup");
	let follow_unfollow_popup = document.getElementById("follow_unfollow_popup");

	let listowner_popup = document.getElementById("listowner_popup");
	let button_lo_delete = document.getElementById("lo_button_delete");
	let button_lo_refresh = document.getElementById("lo_button_refresh");

	button_lo_refresh.addEventListener("click", function() {
		closePopups([popup_background, listowner_popup]);
		browser.runtime.sendMessage({
    		opentab: "https://twitter.com/" + listowner_popup.getAttribute("data-screen-name") + "/followers"
  		});
		browser.runtime.sendMessage({
    		opentab: "https://twitter.com/" + listowner_popup.getAttribute("data-screen-name") + "/following"
  		});
	});

	button_lo_delete.addEventListener("click", function() {
	
		closePopups([popup_background, listowner_popup]);
		removeListOwner(listowner_popup.getAttribute("data-screen-name"));
	});

	popup_background.addEventListener("click", function() {
		closePopups([popup_background, listuser_popup, follow_unfollow_popup, listowner_popup]);
	});

	button_profile.addEventListener("click", function() {
		
		let user_id = listuser_popup.getAttribute("data-user-id");
		browser.runtime.sendMessage({
    		opentab: "https://twitter.com/intent/user?user_id=" + user_id
  		});

  		if (follow_unfollow_popup.style.visibility == "visible") closePopups([listuser_popup]);
  		else closePopups([listuser_popup, popup_background]);
	});
	button_follow.addEventListener("click", function() {
		
		let screen_name = listuser_popup.getAttribute("data-screen-name");
		requestTwitterFollow(gAuthToken, listuser_popup.getAttribute("data-screen-name"));
  		closePopups([popup_background, listuser_popup, follow_unfollow_popup]);
	});
}

/* ################################################################################################## */
/* ################################################################################################## */
// event listeners
/* ################################################################################################## */
/* ################################################################################################## */

function listenToolButtons()
{

	let list_followers = document.getElementById("tl_list_followers");
	let list_following = document.getElementById("tl_list_following");
	let list_favorites = document.getElementById("tl_list_favorites");
	let list_mutuals = document.getElementById("tl_list_mutuals");

	let flw_all_flw = document.getElementById("bt_followers_follow");
	let flw_all_mut = document.getElementById("bt_mutuals_follow");
	let flw_all_fin = document.getElementById("bt_following_follow");
	let flw_all_fav = document.getElementById("bt_favorites_follow");

	let dump_flw = document.getElementById("bt_followers_dump");
	let dump_mut = document.getElementById("bt_mutuals_dump");
	let dump_fin = document.getElementById("bt_following_dump");
	let dump_fav = document.getElementById("bt_favorites_dump");

	let del_all_fin = document.getElementById("bt_following_delete");
	let del_all_flw = document.getElementById("bt_followers_delete");
	let del_all_fav = document.getElementById("bt_favorites_delete");

	flw_all_flw.addEventListener("click", function() { followAll(list_followers)});
	flw_all_mut.addEventListener("click", function() { followAll(list_mutuals)});
	flw_all_fin.addEventListener("click", function() { followAll(list_following)});
	flw_all_fav.addEventListener("click", function() { followAll(list_favorites)});

	dump_flw.addEventListener("click", function() { dumpList(list_followers) });
	dump_mut.addEventListener("click", function() { dumpList(list_mutuals) });
	dump_fin.addEventListener("click", function() { dumpList(list_following) });
	dump_fav.addEventListener("click", function() { dumpList(list_favorites) });

	del_all_fin.addEventListener("click", function() { deleteAll(list_following) });
	del_all_flw.addEventListener("click", function() { deleteAll(list_followers) });
	del_all_fav.addEventListener("click", function() { deleteAll(list_favorites) });
}

function updateSettingsButts()
{
	let butt = document.getElementById("dropbtn-maxfollows");
	butt.textContent = "Max Follows: " + gFollowMaxUsers;

	butt = document.getElementById("dropbtn-interval");
	butt.textContent = "Follow Interval: " + gSpamDelay + "s";
}

function listenSettingsButtons()
{
	let dropdown_interval = document.getElementById("dd-interval");
	let dropdown_maxfollows = document.getElementById("dd-maxfollows");
	let dropdown_about = document.getElementById("dd-about");

	updateSettingsButts();

	dropdown_maxfollows.addEventListener("click", function(e) {
		let data = e.target.getAttribute("data");
		if (data == null) return;
		gFollowMaxUsers = data;
		updateSettingsButts();
	});

	dropdown_interval.addEventListener("click", function(e) {
		let data = e.target.getAttribute("data");
		if (data == null) return;
		gSpamDelay = data;
		updateSettingsButts();
	});

	dropdown_about.addEventListener("click", function(e) {
		let win = window.open("https://github.com/Miraculix200/TweepLister", '_blank');
  		win.focus();
	});

}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

populateListownerList();
populateFavorites();

let params = getUriParams();
if (params.user != null) listOwnerSelected(params.user);

getMyTwitterData();
listenToolButtons();
listenPopupButtons();
listenSettingsButtons();

document.title = "TweepLister List Manager";
document.getElementById("tl-heading").textContent = "TweepLister v" + VERSION;

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
