chrome.action.onClicked.addListener(() => {
  chrome.windows.getCurrent({}, () => {
    chrome.windows.create({
      url: "https://music.youtube.com",
      type: "popup",
      state: "maximized"
    });
  });
});