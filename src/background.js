/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

const BLOCK_PATTERN = "https://pbs.twimg.com/*";
var gBlockStarted = false;

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

function cancel(requestDetails) {
  return {cancel: true};
}

function handleMessage(request, sender, sendResponse) {

	if (request.cancel != null)
	{
		if (gBlockStarted == false)
		{
			gBlockStarted = true;
			console.log("starting to block");
			browser.webRequest.onBeforeRequest.addListener(
			  cancel,
			  {urls: [BLOCK_PATTERN], types: ["image"]},
			  ["blocking"]
			);
		}
		browser.alarms.clearAll()
		browser.alarms.create("hax", {
			  when: Date.now() + 5000
		});
	} else
//	if (request.followhax != null)
//	{
//		followHax(request.followhax);
//	} else
//	if (request.needhaxdata != null)
//	{
//		console.log("got haxdata request");
//	} else
	if (request.opentab != null)
	{
		browser.tabs.create({
    		url: request.opentab,
    		index: sender.tab.index + 1
  		});
	}
}

/* ################################################################################################## */
/*
async function followHax(haxurl)
{
	let tab = await browser.tabs.create({ url: haxurl });
	browser.tabs.executeScript(tab.id, { file: "/followhax.js" });
}
*/
/* ################################################################################################## */


function handleAlarm(alarmInfo) {
	console.log("removing block listener");
	gBlockStarted = false;

	browser.webRequest.onBeforeRequest.removeListener(
	  cancel,
	  {urls: [BLOCK_PATTERN], types: ["image"]},
	  ["blocking"]
	);
}

async function loadManager(tab)
{
	await browser.tabs.create({ url:browser.extension.getURL('manage.html') });
	//browser.tabs.executeScript(tab.id, { file: "/manage.js" });
}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

browser.browserAction.onClicked.addListener((tab) => {
 loadManager(tab);
});

browser.alarms.onAlarm.addListener(handleAlarm);
browser.runtime.onMessage.addListener(handleMessage);

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
