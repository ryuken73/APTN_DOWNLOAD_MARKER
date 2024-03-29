const URL_PATTERN = 'https://newsroom.ap.org/*';
const PARENT_CONTEXT_ID = 'markDownloadedParent';

// filenameRegex not support orring like '.*\.mp4$||.*\.mpg$'
// use separate options for mp4 and mpg.
const MP4_MEDIA_FILE_QUERY_OPTIONS = {
    mime: 'video/mp4',
    filenameRegex: ".*\.mp4$",
    state: 'complete',
    orderBy: ['-endTime']
}
const MPG_MEDIA_FILE_QUERY_OPTIONS = {
    mime: 'video/mpeg',
    filenameRegex: ".*\.mpg$",
    state: 'complete',
    orderBy: ['-endTime']
}
const MESSAGE_TO_MARK = 'markClipId'

const sendMessage = options => {
    const {type, ids, message} = options;
    // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.query({url:[URL_PATTERN]}, function(tabs) {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {type, ids, message}, function(response) {
                const error = chrome.runtime.lastError;
                if(error){
                    console.error(error)
                    chrome.runtime.lastError = null;
                } else {
                    console.log(response);
                }
            });
        })
    });
}

// const APTN_CLIP_REGEXP = /(^\d{3,10})_/;
// to cope with cctv1231233 like id
const APTN_CLIP_REGEXP = /^([0-9a-zA-Z]{3,10})_/;
const DEFAULT_ID = '999999';
const downloadSearch = options => {
    return new Promise((resolve, reject) => {
        chrome.downloads.search(options,(downloadItems) => {
            resolve(downloadItems);
        });
    })
}
const getDownloadedList = queryOptions => {
    return new Promise((resolve, reject) => {
        const getListPromises = queryOptions.map(downloadSearch);
        Promise.all(getListPromises)
        .then(arrays => {
            resolve(arrays.flat())
        })
    })
};

const extractShortName = downloadItems => {
    // console.log(downloadItems);
    const mp4FileNamesFull = downloadItems.map(item => item.filename);
    const mp4FileNamesShort = mp4FileNamesFull.map(fullname => {
        return fullname.split('\\').pop();
    })
    return Promise.resolve({mp4FileNamesShort, downloadItems})
}

const isAPTNClip = fname => {
    return APTN_CLIP_REGEXP.test(fname);    
}

const extractAPTNId = ({mp4FileNamesShort, downloadItems}) => {
    const APTNClips = mp4FileNamesShort.filter(fname => isAPTNClip(fname));
    const clipIds = APTNClips.map(clipname => {
        const result = APTN_CLIP_REGEXP.exec(clipname)
        const clipId = result === null ? DEFAULT_ID : result[1];
        return clipId;
    })
    // console.log('in extractAPTNID:', downloadItems)
    return {clipIds, downloadItems};
}

const refreshMark = () => {
    // limit query downloadItem by downloaed time, not works!
    // but default count limit is 1000. think that's enough
    // const fromTimestamp = Date.now() - 60000;
    // MP4_MEDIA_FILE_QUERY_OPTIONS.endedAfter = fromTimestamp.toString();
    // MPG_MEDIA_FILE_QUERY_OPTIONS.endedAfter = fromTimestamp.toString();

    getDownloadedList([MP4_MEDIA_FILE_QUERY_OPTIONS, MPG_MEDIA_FILE_QUERY_OPTIONS])
    .then(extractShortName)
    .then(extractAPTNId)
    .then(({clipIds, downloadItems}) => {
        const ids = clipIds.map(id => {
            const regexp = new RegExp(`${id}_`);
            const exists = downloadItems.find(item => regexp.test(item.filename)).exists;
            return [id, exists];
        })
        console.log(`send message:`, ids);
        sendMessage({type: MESSAGE_TO_MARK, ids})
    })
}

function debounce(callback, limit = 100) {
    let timeout
    return function(...args) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            // console.log('debounced callback called(refresh marker)');
            callback.apply(this, args)
        }, limit)
    }
}

const debouncedRefreshMark = debounce(refreshMark, 500);

const onClickHandlerContext  = async (info, tab) => {
    // console.log(info, tab)
    refreshMark();
}

const refreshContextMenu = () => {

   refreshMark();
   chrome.contextMenus.removeAll(async () => {
        chrome.contextMenus.create({
            "id" : PARENT_CONTEXT_ID,
            "contexts" : ["all"],
            "title" : "APTN : Refresh Downloaded",
            "documentUrlPatterns" : [URL_PATTERN]
        });
    })
}

chrome.contextMenus.onClicked.addListener(onClickHandlerContext);

console.log('background outer start!');

// when browser connects aptn newsroom, popup.html activate
chrome.runtime.onInstalled.addListener(function() {
    // show popup.html 
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
        conditions: [new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {hostEquals: 'newsroom.ap.org'},
        })
        ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });

});

const fireRefresh = (details) => {
    const NEWS_ROOM_URL = 'https://newsroom.ap.org';
    const skipRegExp = /ts$|m3u8$/;
    if(details.initiator !== NEWS_ROOM_URL){
        // console.log('do not refresh because web request is not for ap newsroom');
        return
    }
    if(skipRegExp.test(details.url)){
        // console.log('do not refresh because web request is HLS request');
        return
    }
    debouncedRefreshMark();
}

// when any tab connects target, attach webRequest Listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // console.log(changeInfo, tab);
    const captureRegExp = /http.*newsroom.*/;
    if(changeInfo.status !== 'complete' || !(captureRegExp.test(tab.url))){
        return;
    }
    console.log('attach webRequest complete listener!!')
    chrome.webRequest.onCompleted.addListener(fireRefresh ,{urls: ['<all_urls>']});
    // if(changeInfo.status === 'complete' && tab.url){
    //    const targetUrl = URL_PATTERN.replace('*','');
    //    tab.url.startsWith(targetUrl) && refreshContextMenu();
    // }
})

chrome.downloads.onChanged.addListener(
    function(downloadDelta){
        // console.log(downloadDelta);
        if(downloadDelta.exists?.current === false){
            console.log('file deleted id=', downloadDelta.id);
            return;
        }
        if(downloadDelta.state?.current === 'complete'){
            refreshMark()
            return
        }
    }
)

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
    // if content script send refreshMenu command..
      if (request.type == "refreshMenu"){
        console.log('receive refresh menu');
        refreshContextMenu();
        sendResponse({message: "refresh complete!"});
      } 
      if (request.type == "ping"){
        console.log('received ping');
        sendMessage({type:"alive", message: "pong"});
      }
});