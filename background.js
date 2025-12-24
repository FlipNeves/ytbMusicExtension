chrome.action.onClicked.addListener((tab) => {
  chrome.windows.getCurrent({}, (window) => {
    chrome.windows.create({
      url: "https://music.youtube.com",
      type: "popup",
      state: "maximized"
    });
  });
});