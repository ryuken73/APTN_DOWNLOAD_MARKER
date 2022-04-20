const URL_PATTERN = 'https://newsroom.ap.org/*';
const convertBlobToBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
});

// content script cannot access original web page's variables and functions
// so, i cannot use element.setValue() which provided by websqaure
// refer to https://stackoverflow.com/questions/12395722/can-the-window-object-be-modified-from-a-chrome-extension,
// try injecting script into web page

const getImageWidth = () => {
    return new Promise((resolve,reject) => {
        const widthKey = 'imageWidth';
        try {
            chrome.storage.local.get(widthKey, (result) => {
                const width = result[widthKey] || 500;
                resolve(width);
            })
        } catch (error) {
            console.error(error);
            reject(error)
        }
    })
}

const getBaseURL = () => {
    return new Promise((resolve,reject) => {
        const savedKey = 'sbssrUrl';
        try {
            chrome.storage.local.get(savedKey, (result) => {
                const url = result[savedKey] || 'http://10.10.1.14:3002/infra/sbssr/api';
                resolve(url)
            })
        } catch (error) {
            console.error(error);
            reject(error)
        }
    })
}

const getImageList = async imageList => {
    try {
        console.table(imageList);
        const baseUrl = await getBaseURL();
        const getImgPromises = imageList.map( async (image) => {
            const {file_id} = image;
            const SR_GETIMG_URL = `${baseUrl}/sr/attach/${file_id}`;
            const rawResponse = await fetch(SR_GETIMG_URL);
            const response = await rawResponse.blob();
            return response;
        })
        const imageBlobs = await Promise.all(getImgPromises);
        return imageBlobs;

    } catch (err) {
        console.error(err);
        return [];
    }
}

const runEmbedded = (args) => {
    // by injecting script, i can access original web page's variable's and functions
    // sname, sdeptname and sdetails are websqaure's component.

    const padZero = (num) => {
        if(num < 10){
            return '0'+num;
        }
        return num.toString();
    }
    
    const getDayShort = (dateTime) => {
        if(dateTime){
            const date = (dateTime instanceof Date) ? dateTime : new Date(parseInt(dateTime));
            const year = date.getFullYear();
            const month = padZero(date.getMonth() + 1);
            const day = padZero(date.getDate());
            const hour = padZero(date.getHours());
            const minute = padZero(date.getMinutes());
            const second = padZero(date.getSeconds());
            
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        }
        return null;
    }

    try {
        const {user_nm, dept_nm, sr_body, handphone_nbr, replies} = args
        sname.setValue(user_nm);
        sdeptname.setValue(dept_nm);
        sdetails.setValue(sr_body);
        tel.setValue(handphone_nbr);
        sreqkind.setSelectedIndex(1);
        console.log(args);
        let replyString = ''
        for (const reply of replies) {
            const {save_dd, body} = reply;
            replyString += `${getDayShort(save_dd)} :
${body} \n`;
        }
        console.log(replyString);
        srdetails.setValue(replyString);
    } catch (err) {
        console.error(err);
    }

}
const embed = (fn, args) => {
    const script = document.createElement("script");
    script.text = `(${fn.toString()})(${args});`;
    document.documentElement.appendChild(script);
}

const handleFillForm = async (request, sender, sendResponse) => {
    // when background js send fillForm message
    const args = JSON.stringify(request.srBody);
    // to set websquare's component data, use id.setValue() ( learn by youtube)
    // but, content script cannot access original web page's variables and functions
    // so, cannot use element.setValue() which provided by websqaure
    // refer to stackoverflow,  injecting script into web page and pass arguments is only solution
    embed(runEmbedded, args);
    sendResponse({farewell:'goodbye'})

    // add image to dext5 body
    const {imageList} = request.srBody;
    const imageBlobs = await getImageList(imageList);
    /// find dex5 body element in iframe
    const outerFrame = document.getElementById('WEC');
    const innerFrame = outerFrame.contentWindow.document.getElementById('dext_frame_WEC');    
    const dextFrame = innerFrame.contentWindow.document.getElementById('dext5_design_WEC');
    const innerDoc = dextFrame.contentDocument || iframe.contentWindow.document;
    /// remove previous images
    // console.log(innerDoc.getElementsByTagName('image'));
    const dext5Body = innerDoc.getElementById('dext_body');    
    // get image width from local storage
    const savedWidth = await getImageWidth();
    console.log(`savedWdith : ${savedWidth}`);
    /// append image (as base64)
    imageBlobs.map(async blob => {

        const base64Img = await convertBlobToBase64(blob);
        // append original image
        // const imgTag = innerDoc.createElement('image');
        // dext5Body.append(imgTag);
        // imgTag.setAttribute('src', base64Img);
        
        /// append small image
        const canvas = innerDoc.createElement('canvas');
        const image = new Image();
        image.src = base64Img;
        image.onload = () => {
            const width = savedWidth;
            const scaleFactor = width / image.width;
            const height = image.height * scaleFactor;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image,0,0,width,height);
            // direct appending canvas show images well but can't not be saved (dext5)
            // dext5Body.append(canvas);
            ctx.canvas.toBlob( async blob => {
                const modifiedBase64Img = await convertBlobToBase64(blob);
                const imgTag = innerDoc.createElement('image');
                dext5Body.append(imgTag);
                imgTag.setAttribute('src', modifiedBase64Img);
            })
        }

    })

    // remove previous link
    try {
        document.getElementById('applySR').remove();
    } catch (err) {
        console.log('previous button not exists!');
    }
    // add srApply link
    const srApplyLink = document.createElement('a');
    srApplyLink.setAttribute('href', '#');
    srApplyLink.setAttribute('id', 'applySR');
    srApplyLink.innerHTML="SR연동접수";
    document.getElementById('group98').appendChild(srApplyLink); 
    //

    // srApplyLink's click handler
    srApplyLink.addEventListener('click', async (e) => {
        // send to sr-server case was applied
        try {
            console.log('update sr')
            const {case_id, user_id, user_nm, dept_nm, sr_body} = request.srBody;
            const baseUrl = await getBaseURL();
            const SR_GETBODY_URL = `${baseUrl}/sr/body/${case_id}`;
            const fetchOptions = {
                method : 'PUT',
                body : JSON.stringify({
                    user_id, 
                    user_nm,
                    dept_nm,
                    sr_body,
                    siis_saved_flag : 'Y'
                }),
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            }
            const rawResponse = await fetch(SR_GETBODY_URL, fetchOptions);
            const response = await rawResponse.json();
            if(response.success) {
                console.log(`change siis_saved_flag to Y success! ${case_id}`);
                // original button event trigger
                const originalApplyBtn = document.getElementById('btnreceipt');
                originalApplyBtn.dispatchEvent(new Event('click'));
                chrome.runtime.sendMessage({type: "refreshMenu"}, function(response) {
                    console.log(response.message);
                });
                return response.result;
            }            
            return [];
        } catch (err) {
            console.error(err);
            return [];
        }
    })
}

const getElementByClipId = clipId => {
    const xpath = document.evaluate(`//p[contains(., '${clipId}')]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    return xpath.snapshotItem(0);

}

const handleMarkClipId = async (request, sender, sendResponse) => {
    // when background js send fillForm message
    // const ids = JSON.stringify(request.ids);
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
    'fillForm' : handleFillForm,
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





