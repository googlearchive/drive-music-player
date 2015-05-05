// Copyright 2013 Nicolas Garnier (nivco.las@gmail.com). All Rights Reserved.

// Namespace initialization.
var dmp = dmp || {};

/** If sandbox should be used. */
dmp.useSandbox = false;

/** The IDs of the Files opened in the playlist. */
dmp.fileIds = [];

/** The ID of the file currently playing. */
dmp.playingFileId = undefined;

/** The ID of the folder which was opened from the Drive UI. */
dmp.folderId = undefined;

/** The Label of the folder which was opened from the Drive UI. */
dmp.folderLabel = undefined;

/** If test user. */
dmp.testUser = false;

/**
 * First initiates authorization and then starts the audio player.
 */
dmp.init = function() {
  // If Flash is not installed and the HTML5 Player cannot be sued we display a message asking to install Flash.
  if (!dmp.ui.detectFlash() && !dmp.player.html5PlayerIsWorking()) {
    $('#flashAlert').show();
    return;
  }
  // First make sure we are authorized to access the Drive API.
  dmp.auth.initAuth(function() {
    dmp.drive.aboutGet(function(user, error) {
      console.log("about error: " + error);
      if (error == null) {
        dmp.testUser = error == null && user.emailAddress.indexOf("@google.com") != -1;
        console.log("testUser: " + dmp.testUser);
      }
      // Extracting all the file IDs to play.
      var fileIds = dmp.url.getFileIdsFromStateParam();
      for (index in fileIds) {
        dmp.playlist.audioList.push({id:fileIds[index]});
      }
      // Makes a pretty URL from the current playlist.
      dmp.url.makePrettyUrl();
      // Hide/show the empty playlist message depending songs are selected.
      dmp.ui.toggleEmptyPlaylist();
      // Builds a picker object.
      dmp.ui.buildPicker();
      // Create an entry for each songs.
      dmp.ui.createSongEntries();
      // Now we can initialize the Player and play some audio files.
      dmp.player.initPlayer();
    });
  });
};

function init() {
  if (dmp.useSandbox) {
    gapi.config.update('googleapis.config/root', 'https://content-googleapis-test.sandbox.google.com');
  }
  gapi.load('picker', {'callback': dmp.init});
}
