const URL_PATTERN = 'https://newsroom.ap.org/*';

const getElementByClipId = clipId => {
    const xpath = document.evaluate(`//p[contains(., '${clipId}')]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    return xpath.snapshotItem(0);

}

const handleMarkClipId = async (request, sender, sendResponse) => {
    console.log(request.ids)
    request.ids.forEach(([id, exists]) => {
        const targetElement = getElementByClipId(id);
        if(targetElement !== null){
            console.log(`change background of ${id} exists=${exists}`, targetElement)
            const bgColor = exists ? 'yellow':'red';
            targetElement.style.background = bgColor;
        }
    })
    sendResponse({farewell:'goodbye'})
}

const handlers = {
    'markClipId': handleMarkClipId
}

const main = () => {
    console.log('dom ready! main start!');
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log('got message')
            const handler = handlers[request.type];
            handler(request, sender, sendResponse);
        }
    )
}

const waitDomLoad = setInterval(() => {
    if(document.getElementById('sname') !== undefined) {
        clearInterval(waitDomLoad);
        main()
    } 
},1000)