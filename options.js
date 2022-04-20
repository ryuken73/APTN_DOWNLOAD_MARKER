const urlInput = document.getElementById('sbssrUrl');
const submitBtn = document.getElementById('submit');
const clearBtn = document.getElementById('clear');

const widthInput = document.getElementById('imageWidth');
const widthSubmitBtn = document.getElementById('submitWidth');
const widthClearBtn = document.getElementById('clearWidth');

const fromDaysInput = document.getElementById('fromDays');
const fromDaysSubmitBtn = document.getElementById('submitFromDays');
const fromDaysClearBtn = document.getElementById('clearFromDays');

const defaultURL = 'http://10.10.1.14:3002/infra/sbssr/api';
const defaultWidth = 500;
const defaultFromDays = 7;

const optionData = [
    {key :'sbssrUrl', defaultValue: defaultURL, input: urlInput, submit: submitBtn, clear:clearBtn},
    {key :'imageWidth', defaultValue: defaultWidth, input: widthInput, submit: widthSubmitBtn, clear:widthClearBtn},
    {key :'fromDays', defaultValue: defaultFromDays, input: fromDaysInput, submit: fromDaysSubmitBtn, clear:fromDaysClearBtn},
]
/*
const savedKey = 'sbssrUrl';
const savedWidth = 'imageWidth';
const savedFromDays = 'fromDays';
*/

const restore_options = () => {
    optionData.map((data) => {
        const {key, defaultValue, input, submit, clear} = data;
        chrome.storage.local.get(key, (result) => {
            console.log(result);
            console.log(result[key]);
            if(result[key] == undefined){
                // set default value
                console.log('result empty!');
                chrome.storage.local.set({[key]:defaultValue}, () => {
                    console.log(`set default value : ${defaultValue}`);
                    input.value = defaultValue;
                });
                return;
            }
            console.log('result not empty!')
            input.value = result[key];
        })
    })
    /*
    // set default url
    chrome.storage.local.get(savedKey, (result) => {
        console.log(result);
        console.log(result[savedKey]);
        if(result[savedKey] == undefined){
            // set default value
            console.log('result empty!');
            chrome.storage.local.set({sbssrUrl:defaultURL}, () => {
                console.log(`set default value : ${defaultURL}`);
                urlInput.value = defaultURL;
            });
            return;
        }
        console.log('result not empty!')
        urlInput.value = result[savedKey];
    })
    // set default image width
    chrome.storage.local.get(savedWidth, (result) => {
        console.log(result);
        console.log(result[savedWidth]);
        if(result[savedWidth] == undefined){
            // set default value
            console.log('result empty!');
            chrome.storage.local.set({savedWidth:defaultWidth}, () => {
                console.log(`set default width value : ${defaultWidth}`);
                widthInput.value = defaultWidth;
            });
            return;
        }
        console.log('result not empty!')
        widthInput.value = result[savedWidth];
    })
    */
}

optionData.map(data => {
    const {key, input, submit, clear} = data;
    submit.addEventListener('click', (e) => {
        const result = input.value;
        alert(`saved! ${result}`);
        chrome.storage.local.set({[key]:result}, () => console.log(`set local storage : ${result}`));
    })
    
    clear.addEventListener('click', (e) => {
        alert(`clear value!`);
        try {
            chrome.storage.local.remove(key, (result) => {
                console.log('delete callback!')
                console.log(result);
            })
        } catch (err) {
            console.error(err)
        }
    })
})

/*
submitBtn.addEventListener('click', (e) => {
    const url = urlInput.value;
    alert(`saved! ${url}`);
    chrome.storage.local.set({[savedKey]:url}, () => console.log(`set local storage : ${url}`));
})

clearBtn.addEventListener('click', (e) => {
    alert(`clear value!`);
    try {
        chrome.storage.local.remove(savedKey, (result) => {
            console.log('delete callback!')
            console.log(result);
        })
    } catch (err) {
        console.error(err)
    }
})

widthSubmitBtn.addEventListener('click', (e) => {
    const width = widthInput.value;
    alert(`saved! ${width}`);
    chrome.storage.local.set({[savedWidth]:width}, () => console.log(`set local storage : ${width}`));
})

widthClearBtn.addEventListener('click', (e) => {
    alert(`clear value!`);
    try {
        chrome.storage.local.remove(savedWidth, (result) => {
            console.log('delete callback!')
            console.log(result);
        })
    } catch (err) {
        console.error(err)
    }
})
*/


document.addEventListener('DOMContentLoaded', restore_options);