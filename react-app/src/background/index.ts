chrome.action.onClicked.addListener((_tab: chrome.tabs.Tab) => {
  chrome.windows.getCurrent({}, (_window: chrome.windows.Window) => {
    chrome.windows.create({
      url: "https://music.youtube.com",
      type: "popup",
      state: "maximized"
    });
  });
});