/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */


var gTimeoutId;
var gPageIsFollowingList = false;
var gScreenName = null;
var gUserList = new Array();
var gMutationObserver = null;
var gNavValue = 0;
var gUsersCollected = 0;
var gFollowerLists = null;
var gFollowingLists = null;

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

function getTimestamp()
{
  return Math.floor(Date.now() / 1000);
}

/* ################################################################################################## */

function observeMutations(element)
{
	var config = { attributes: false, childList: true, characterData: false };
	gMutationObserver = new MutationObserver(function(mutations) 
	{
		mutations.forEach(function(mutation) 
		{
			mutation.addedNodes.forEach(function(added_node) {
				let items = added_node.getElementsByClassName("ProfileCard js-actionable-user");
				for (let i=0; i<items.length; i++)
				{
					getUserdata(items[i]);
				}
			});
  		});  
		window.scrollTo(0,document.body.scrollHeight);

		let counter = document.getElementById("tweeplister_popup_counter");
		counter.textContent = gUsersCollected + " of " + gNavValue;
		startTimer();
		browser.runtime.sendMessage({ // don't load images
    		cancel: "ohai"
  		});
	});
	gMutationObserver.observe(element, config);
}

/* ################################################################################################## */

function startTimer()
{
		if (gTimeoutId != null) window.clearTimeout(gTimeoutId); 
		let timer = 10000;
		if (gNavValue == gUsersCollected) timer = 100;
		else if (gNavValue - gUsersCollected < 10) timer = 1000;
		else if (gNavValue - gUsersCollected < 50) timer = 5000;
		gTimeoutId = window.setTimeout(function() 
		{ 
			saveData();
		}, timer);
}

/* ################################################################################################## */

function parseTweeps(items)
{
	startTimer();
	for (let i=0; i<items.length; i++)
	{
		getUserdata(items[i]);
	}
}

/* ################################################################################################## */

function getUserdata(item)
{
	let screen_name = item.getAttribute("data-screen-name").toLowerCase();
	let user_id = item.getAttribute("data-user-id");

	if (user_id == null){
		console.error("Couldn't get user_id");
		return;
	}
	let obj = {
		userid: user_id,
		sname: screen_name
	};
	gUserList.push(obj);
	gUsersCollected++;
}

/* ################################################################################################## */

function getFollowUser()
{
	let links = document.head.getElementsByTagName("link");
	if (document.URL.indexOf("following") != -1) {
		gPageIsFollowingList = true;
	} 
	for (let i=0; i<links.length; i++)
	{
		if (links[i].getAttribute("rel") != "canonical") continue;
		let regex = /twitter\.com\/([a-zA-Z0-9_]*)/;
		let match = regex.exec(links[i].getAttribute("href"));
		if (match != null && match[1] != null)
		{
			gScreenName = match[1];
		}
	}
}

/* ################################################################################################## */

function saveData()
{
	if (gPageIsFollowingList)
	{
		let udata = gFollowingLists.find(user => user.screenname === gScreenName);
		if (udata == null) gFollowingLists.push({screenname: gScreenName, time: getTimestamp()});
		else udata.time = getTimestamp();
		let setting = browser.storage.local.set({"following_lists": gFollowingLists});
		let setting_list = browser.storage.local.set({[`following-` + gScreenName]: gUserList});
	} else {
		let udata = gFollowerLists.find(user => user.screenname === gScreenName);
		if (udata == null) gFollowerLists.push({screenname: gScreenName, time: getTimestamp()});
		else udata.time = getTimestamp();
		let setting = browser.storage.local.set({"follower_lists": gFollowerLists});
		let setting_list = browser.storage.local.set({[`tmp_followers-` + gScreenName]: gUserList});
	}
	startListManager(gScreenName);
}

/* ################################################################################################## */

function startListManager(user)
{
	window.location = browser.extension.getURL('manage.html') + "?user=" + user;
}

/* ################################################################################################## */


async function startCollection()
{
	getFollowUser();
	if (gScreenName == null) {
		console.error("Couldn't find screen name on page " + document.URL);
		throw 42;
	}
	let profilenav_list = document.body.getElementsByClassName("ProfileNav-list")[0];
	let followers = profilenav_list.getElementsByClassName("ProfileNav-item ProfileNav-item--followers")[0];
	let following = profilenav_list.getElementsByClassName("ProfileNav-item ProfileNav-item--following")[0];
	let pnav_value_followers = followers.getElementsByClassName("ProfileNav-value")[0];
	let pnav_value_following = following.getElementsByClassName("ProfileNav-value")[0];
	createPopup();
	if (gPageIsFollowingList)
	{
		gNavValue = pnav_value_following.getAttribute("data-count");
		let setting =  await browser.storage.local.get("following_lists");
		if (setting.following_lists != null) {
			gFollowingLists = setting.following_lists;
		} else gFollowingLists = new Array();
	} else {
		gNavValue = pnav_value_followers.getAttribute("data-count");
		let setting = await browser.storage.local.get("follower_lists");
		if (setting.follower_lists != null) {
			gFollowerLists = setting.follower_lists;
		} else gFollowerLists = new Array();
	}
	let page_container = document.getElementById("page-container");
	let grid_timeline = page_container.getElementsByClassName("GridTimeline-items has-items")[0];
	observeMutations(grid_timeline);
	let items = document.body.getElementsByClassName("ProfileCard js-actionable-user");
	parseTweeps(items);
	window.scrollTo(0,document.body.scrollHeight);
}

/* ################################################################################################## */

function createDiv(params)
{
	let div = document.createElement("div");
	if (params.id != null) div.setAttribute("id", params.id);
	if (params.class != null) div.setAttribute("class", params.class);
	if (params.textnode != null) div.appendChild(document.createTextNode(params.textnode));
	return div;
}

/* ################################################################################################## */

function addTweeplisterButton()
{
	let tweeplister_bar = document.getElementById("tweeplister-invisible-bar");
	if (tweeplister_bar != null)
	{
		tweeplister_bar.style.visibility = "visible";
		return;
	}

	let bar = createDiv({class: "tweeplister-bar", id: "tweeplister-invisible-bar"});




	let large_txt = createDiv({class: "large_butt", textnode: "Save List"});
	let small_txt = createDiv({class: "small_butt", textnode: "TweepLister"});
	
	let button = createDiv({ id: "tweeplister_butt", class: "tweeplister_butt"});
	button.appendChild(large_txt);
	button.appendChild(small_txt);
	button.addEventListener("click", function() { startCollection(); }, false);
	
	bar.appendChild(button);

	bar.style.visibility = "visible";
	document.body.appendChild(bar);


}

function removeTweeplisterButton()
{
	let tweeplister_bar = document.getElementById("tweeplister-invisible-bar");
	
	if (tweeplister_bar != null) {
		tweeplister_bar.style.visibility = "hidden";
	} 
}

/*
function addTweeplisterButton()
{
	let butt = document.getElementById("tweeplister_butt");
	if (butt != null) 
	{
		butt.style.visibility = "visible";
		return;
	}
	let ga = document.getElementById("global-actions");
	let large_txt = createDiv({class: "large_butt", textnode: "Save List"});
	let small_txt = createDiv({class: "small_butt", textnode: "TweepLister"});
	
	let button = createDiv({ id: "tweeplister_butt", class: "tweeplister_butt"});
	button.appendChild(large_txt);
	button.appendChild(small_txt);
	button.style.visibility = "visible";
	ga.appendChild(button);
	button.addEventListener("click", function() { startCollection(); }, false);
}

function removeTweeplisterButton()
{
	let butt = document.getElementById("tweeplister_butt");
	if (butt != null) {
		butt.style.visibility = "hidden";
	}
}

*/
/* ################################################################################################## */


function createPopup()
{
	let fill = createDiv({class: "tweeplister_fill"});
	document.body.appendChild(fill);
	fill.style.visibility = "visible";
	let popup = createDiv({class: "tweeplister_popup"});
	let popup_title = createDiv({class: "tweeplister_popup_title", textnode: "TweepLister"});
	let popup_text = createDiv({class: "tweeplister_popup_text", textnode: "Collecting data. Please wait..."});
	let popup_counter = createDiv({id: "tweeplister_popup_counter", class: "tweeplister_popup_counter", textnode: "0 of " + gNavValue});
	let button_container = createDiv({class: "tweeplister_popup_button_container"});
	let button_cancel = createDiv({id: "tl_button_cancel", class: "tl_button cancel", textnode: "CANCEL"});
	let button_submit = createDiv({id: "tl_button_submit", class: "tl_button submit", textnode: "SAVE NOW"});
	
	popup.appendChild(popup_title);
	popup.appendChild(popup_text);
	popup.appendChild(popup_counter);
	button_container.appendChild(button_cancel);
	button_container.appendChild(button_submit);

	button_cancel.addEventListener("click", function() {
		if (gTimeoutId != null) window.clearTimeout(gTimeoutId); 
		fill.parentNode.removeChild(fill);
		gMutationObserver.disconnect();
		gMutationObserver,gTimeoutId,gFollowingLists,gFollowerLists  = null;
	});

	button_submit.addEventListener("click", function() {
		if (gTimeoutId != null) window.clearTimeout(gTimeoutId); 
		gMutationObserver.disconnect();
		gMutationObserver,gTimeoutId = null;
		saveData();
	});

	popup.appendChild(button_container);
	fill.appendChild(popup);
}

/* ################################################################################################## */

function getCanonicalLinkElement()
{
	let attribute;
	let links = document.head.getElementsByTagName("link");
	for (let i=0; i<links.length; i++)
	{
		if (links[i].getAttribute("rel") == "canonical") return links[i];
	}
	return null;
}

function checkCanonicalLink(canonical)
{
	let href = canonical.getAttribute("href");

	console.log(href);

	if (href.indexOf("/followers") == -1 && href.indexOf("/following") == -1) {
		removeTweeplisterButton();
	} else {
		addTweeplisterButton();
	}
}




function monitorCanonicalLink(canonical)
{
	var config = { attributes: true };
	var observer = new MutationObserver(function(mutations) 
	{
		checkCanonicalLink(canonical);
	});
	observer.observe(canonical, config);
}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

let canonical = getCanonicalLinkElement();
if (canonical == null) throw "tweeplister: nothing to do here.";
checkCanonicalLink(canonical);
monitorCanonicalLink(canonical);

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
