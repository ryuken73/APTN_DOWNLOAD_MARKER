const URL_PATTERN = 'https://newsroom.ap.org/*';

const getElementByClipId = clipId => {
    const xpath = document.evaluate(`//p[contains(., '${clipId}')]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    return xpath.snapshotItem(0);

}

function debounce(callback, limit = 100) {
    let timeout
    return function(...args) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            console.log('got message processed. debounced callback called(mark elements)');
            callback.apply(this, args)
        }, limit)
    }
}

const startLoading = element => {
    element.style.background = "red";
    element.innerHTML = "Marking...";
}

const endLoading = (element, count) => {
    element.style.background = "black";
    element.innerHTML = `Marked[${count}]`;
}

const uniq = array => {
    const uniqSet = new Set(array);
    return uniqSet.size;
}

const handleMarkClipId = (request, sender, sendResponse, element) => {
    // console.log(request.ids)
    const injectedElement = document.getElementById('markerLoadingSBS')
    startLoading(injectedElement);
    let marked = [];
    request.ids.forEach(([id, exists]) => {
        const targetElement = getElementByClipId(id);
        if(targetElement !== null){
            // console.log(`change background of ${id} exists=${exists}`, targetElement)
            const bgColor = exists ? 'yellow':'red';
            targetElement.style.background = bgColor;
            marked.push(id);
        }
    })
    setTimeout(() => {
        endLoading(injectedElement, uniq(marked));
    },500)
    sendResponse({farewell:'goodbye'})
}

const markClipDebounced = debounce(handleMarkClipId, 500);

const handlers = {
    'markClipId': markClipDebounced
}
const main = () => {
    console.log('dom ready! main start!');
    let injectElement;
    if(typeof initLoading === 'undefined'){
        const initLoading = () => {
            injectElement = document.createElement('div');
            injectElement.id = "markerLoadingSBS";
            injectElement.innerHTML = "Initializing";
            injectElement.style.background = "black";
            injectElement.style.color = "white";
            injectElement.style.position = "fixed";
            injectElement.style.top = "20px";
            injectElement.style.right = "80px";
            injectElement.style.border = "solid white 2px";
            injectElement.style.paddingRight = "10px";
            injectElement.style.paddingLeft = "10px";
            injectElement.style.borderRadius = "10px";
            injectElement.style.width = "100px";
            injectElement.style.textAlign = "center";
            injectElement.style.opacity = 0.7;
            injectElement.style.cursor = "pointer";
            injectElement.onclick = () => {
                chrome.runtime.sendMessage({type:'refreshMenu'});
            }
            document.body.appendChild(injectElement);        
        }
        initLoading()
    }
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log('got message')
            const handler = handlers[request.type];
            handler(request, sender, sendResponse, injectElement);
        }
    )
}


const waitDomLoad = setInterval(() => {
    if(document.getElementById('sname') !== undefined) {
        clearInterval(waitDomLoad);
        main()
    } 
},1000)