// Copyright 2013 Nicolas Garnier (nivco.las@gmail.com). All Rights Reserved.

// Namespace initialization.
var dmp = dmp || {};
dmp.ui = dmp.ui || {};

/** The Google Picker Object. */
dmp.ui.picker = undefined;

/** The data URI of a loading image as a base64 Data URI. */
dmp.ui.LOADING_IMAGE_DATA_URI = "data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi63P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8DYlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAADMgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjDII7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA==";

/**
 * Creates the UI elements for each song with title of song inside the
 * @code{#fileContainer} table.
 */
dmp.ui.createSongEntries = function() {
  $('#fileContainer tbody').empty();
  var audioList = dmp.playlist.getAudioList();
  for (index in audioList) {
    if (audioList[index]) {
      dmp.ui.createSongEntry(audioList[index]);
    }
  }
  // Makes the song's UI elements sortable by dragging them.
  $("#fileContainer tbody").sortable({
    helper : 'clone',
    update: dmp.ui.createSongListFromDom
  }).disableSelection();
};

/**
 * Re-orders the list of Songs from the DOM elements inside the
 * @code{#fileContainer} table after a drag and drop.
 *
 * @param{Event} event The event from jQuery UI Sortable event.
 * @param{Object} ui An object containing the sorted element.
 */
dmp.ui.createSongListFromDom = function(event, ui) {
  dmp.fileIds = [];
  ui.item.parent().children().each(function(index, elem) {
    if (ui.item.equals($(elem))) {
      var fileId = $(elem).attr('id').split('file-');
      if(fileId.length == 2) {
        var indexInList = dmp.playlist.getSongIndex(fileId[1]);
        var indexInDom = index;
        if (indexInList != indexInDom) {
          var song = dmp.playlist.getAudioList()[indexInList];
          dmp.playlist.removeSong(fileId[1]);
          dmp.playlist.insertSong(indexInDom, song);
        }
      }
      dmp.url.makePrettyUrl();
    }
  });
};

// Compares if 2 jquery elements contains the same elements.
$.fn.equals = function(compareTo) {
  if (!compareTo || this.length != compareTo.length) {
    return false;
  }
  for (var i = 0; i < this.length; ++i) {
    if (this[i] !== compareTo[i]) {
      return false;
    }
  }
  return true;
};

/**
 * Creates a new File Entry in the playlist.
 *
 * @param{Object} fileInfo The Info on the file (such as ID or tags) to create a UI entry for.
 */
dmp.ui.createSongEntry = function(fileInfo) {
  // Create the empty container with loading icon for the file.
  var entryContainer = $("<tr>").attr('id','file-' + fileInfo.id).addClass('song').click(function(){dmp.player.playFile(fileInfo.id);});
  var loadingImg = $('<img>').attr('src', dmp.ui.LOADING_IMAGE_DATA_URI).css("margin-right", "10px");
  var playindicatorContainer = $('<td>').addClass('playindicator');
  var moveindicator = $('<td>').addClass('moveindicator').attr('title', 'Re-order / Move');
  var artistContainer = $('<td>').addClass('artist').text("Loading info...").prepend(loadingImg);
  var titleContainer = $('<td>').addClass('title');
  var removeButton = $('<td>').addClass('remove').attr('title','Remove').text("✕").click(function(e){
    // Removing the Entry from the list of songs.
    entryContainer.remove();
    // If this is the last song we stop the player.
    if (dmp.playlist.audioList.length == 1) {
      $("#jqueryPlayerContainer").jPlayer("clearMedia");
    // If this is the currently playing song we move to the next one.
    } else if (dmp.playlist.getCurrentSongId() == fileInfo.id) {
      dmp.player.playNext();
    }
    dmp.playlist.removeSong(fileInfo.id);
    if (dmp.playlist.audioList.length == 0) {
      dmp.playlist.setCurrentSongId("");
    }
    dmp.ui.toggleEmptyPlaylist();
    dmp.url.makePrettyUrl();
    e.stopPropagation();
  });
  entryContainer.append(playindicatorContainer).append(moveindicator).append(artistContainer).append(titleContainer).append(removeButton);
  $('#fileContainer tbody').append(entryContainer);

  // Start fetching the file's URL and title so we can extract ID3 tags.
  dmp.drive.getFileUrl(fileInfo.id, function(fileUrl, fileName, error, fileExtension, isFolder, thumbnailUrl, md5, isPlaylist){
    // If the file is a folder and not a song.
    if (isFolder) {
      $("#file-" + fileInfo.id).remove();
      dmp.playlist.removeSong(fileInfo.id);
      dmp.folderId = fileInfo.id;
      dmp.folderLabel = fileName;
      dmp.url.makePrettyUrl();
      dmp.ui.buildPicker(true);
      dmp.ui.picker.setVisible(true);
      dmp.ui.toggleEmptyPlaylist();
    } else if (isPlaylist) {
      dmp.playlist.loadPlaylist(fileInfo);
      dmp.url.makePrettyUrl();
      dmp.ui.toggleEmptyPlaylist();
    }
    else {
      if (error && error.code == 404) {
        $(".artist", $("#file-" + fileInfo.id))
            .text("You are not authorized to read this file or the file does not exist.")
            .addClass("error").attr("colspan", "2");
        $(".title", $("#file-" + fileInfo.id)).remove();
      } else if (error) {
        $(".artist", $("#file-" + fileInfo.id))
            .text("There was an error reading the file: " + error.message)
            .addClass("error").attr("colspan", "2");
        $(".title", $("#file-" + fileInfo.id)).remove();
      } else if (fileInfo.md5 && fileInfo.md5 == md5) { // If we already have all the tags cached in the playlist we display them right away.
        dmp.ui.displayID3Tags(fileInfo.id, fileInfo.title, fileInfo.artist, fileName, thumbnailUrl);
      } else if (fileUrl) { // No tags cached in the playlist we'll extract them from the file.
        dmp.drive.readTagsFromProperty(fileInfo.id, function(title, artist, savedMd5, albumCoverUrl){
          if (savedMd5 && savedMd5 == md5) {
            if (!thumbnailUrl) {
              thumbnailUrl = albumCoverUrl;
            }
            dmp.ui.displayID3Tags(fileInfo.id, title, artist, fileName, thumbnailUrl);
            dmp.playlist.addMetadataToSong(fileInfo.id, title, artist, md5);
          } else {
            // This will extract the tags from the actual file which is quite bandwith heavy (downloads 400KB) which is why we try to avoid it above by caching.
            dmp.ui.extractID3Tags(fileInfo.id, fileUrl, fileName, md5, thumbnailUrl);
          }
        });
      }
    }
  });
};

/**
 * Builds a new picker using the current auth token. You should re-launch this
 * function every time the auth changes to re-create a newly authorized picker.
 * The new picker will be accessible at @code{dmp.ui.picker}.
 */
dmp.ui.buildPicker = function() {
  // List of supported MIME Types.
  var supportedMimeType = "audio/mpeg3,audio/x-mpeg-3,video/x-mpeg,audio/mp3,audio/mpeg,audio/mp4,audio/mpg,audio/mp4a-latm,audio/ogg,audio/webm,audio/wav,audio/x-wav,audio/wave";

  // Search Songs in Drive View.
  var view = new google.picker.DocsView();
  view.setLabel("🔍\u00A0Search\u00A0Audio\u00A0Files");
  view.setMimeTypes(supportedMimeType);

  // Picker allowing users to browse folders.
  var view2 = new google.picker.DocsView();
  view2.setLabel("📂\u00A0My\u00A0Drive");
  view2.setIncludeFolders(true);
  view2.setParent("root");
  view2.setMimeTypes(supportedMimeType);

  // Recently selected items view.
  var view3 = new google.picker.View(google.picker.ViewId.RECENTLY_PICKED);
  view3.setLabel("🕣\u00A0Recently\u00A0Selected");

  // Open Playlist in Drive View.
  var view4 = new google.picker.DocsView();
  view4.setLabel("📄\u00A0Open\u00A0a\u00A0Playlist");
  view4.setIncludeFolders(false);
  view4.setMimeTypes(dmp.playlist.PLAYLIST_MIME_TYPE + "." + dmp.auth.APPLICATION_ID);


  var newPickerBuilder = dmp.useSandbox ? new google.picker.PickerBuilder("https://docs.sandbox.google.com/picker")
      : new google.picker.PickerBuilder();

  // If user opened from a folder, display it.
  if (dmp.folderId) {
    var customFolderView = new google.picker.DocsView();
    customFolderView.setLabel? customFolderView.setLabel("📂\u00A0" + dmp.folderLabel.replace(/ /g, "\u00A0")) : (customFolderView.Wd ? customFolderView.Wd("📂\u00A0" + dmp.folderLabel.replace(/ /g, "\u00A0")) : null);
    customFolderView.setIncludeFolders(true);
    customFolderView.setParent(dmp.folderId);
    customFolderView.setMimeTypes(supportedMimeType);
    newPickerBuilder.addView(customFolderView);
  }

  var newPicker = newPickerBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    .setAppId(dmp.auth.APPLICATION_ID)
    .setOAuthToken(dmp.auth.accessToken)
    .addView(view)
    .addView(view2)
    .addView(view3)
    .addView(view4)
    .setTitle("Select audio files in Google Drive")
    .setCallback(dmp.ui.pickerCallback).build();
  newPicker.setVisible(true);
  newPicker.setVisible(false);
  dmp.ui.picker = newPicker;
};

/**
 * Called when the user has selected songs using the picker. We add these songs
 * to the playlist.
 */
dmp.ui.pickerCallback = function(data) {
  if (data.action == google.picker.Action.PICKED) {
    var numberOfSongsBefore = dmp.playlist.audioList.length;
    for (var index in data.docs) {
      // If the song is not already in the playlist we add it.
      if (data.docs[index].id
          && dmp.playlist.getSongIndex(data.docs[index].id) == -1) {
        if (data.docs[index].mimeType == dmp.playlist.PLAYLIST_MIME_TYPE + "." + dmp.auth.APPLICATION_ID) {
          dmp.playlist.loadPlaylist({id: data.docs[index].id, filename: data.docs[index].name});
        } else {
          dmp.playlist.audioList.push({id: data.docs[index].id, filename: data.docs[index].name});
          dmp.ui.createSongEntry(data.docs[index]);
        }
        dmp.url.makePrettyUrl();
        dmp.ui.toggleEmptyPlaylist();
      }
    }
    // If there was no song before and we added some we start playing the first
    // one automatically.
    if(numberOfSongsBefore == 0 && data.docs.length > 0) {
      dmp.player.playNext();
    }
  }
};

/**
 * Hides or Shows the message showing an empty playlist depending if the
 * playlist is empty or not.
 */
dmp.ui.toggleEmptyPlaylist = function() {
  if (dmp.playlist.audioList.length > 0) {
    $("#empty").hide();
  } else {
    $("#empty").show();
  }
};

/**
 * Fetches and displays the ID3 tags for the given song. Also tries to
 * subsequently fetch the album cover using the LastFm API.
 *
 * @param{String} fileId The ID of the file.
 * @param{String} fileUrl The URL where the file content is.
 * @param{String} fileName The name of the file.
 * @param{String} md5 The md5 checksum of the file.
 * @param{String} thumbnailLink The thumbnail if already available.
 */
dmp.ui.extractID3Tags = function(fileId, fileUrl, fileName, md5, thumbnailLink) {
  console.log("Trying to look at ID3 tags for: " + fileName);
  ID3.loadTags(fileUrl, function(){
      var tags = ID3.getAllTags(fileUrl);
      if(tags && tags.artist && tags.title) {
        dmp.playlist.addMetadataToSong(fileId, tags.title, tags.artist, md5);
        dmp.drive.saveTagsInProperty(fileId, tags.title, tags.artist, md5);
        // If we extracted the picture from the ID3 tags we use it otherwise we try to get it in the lastfm API.
        if (tags.picture) {
          dmp.ui.displayID3Tags(fileId, tags.title, tags.artist, fileName, "data:" + (tags.mimetype ? tags.mimetype : "") + ";base64," + tags.picture);
          dmp.drive.uploadThumbnail(fileId, tags.mimetype, tags.picture);
        } else {
          dmp.lastfm.getAlbumCover(tags.title, tags.artist, function(albumUrl) {
            dmp.ui.displayID3Tags(fileId, tags.title, tags.artist, fileName, albumUrl);
            if (albumUrl) {
              dmp.drive.uploadThumbnailFromUrl(fileId, albumUrl);
            }
          });
        }
      } else {
        dmp.playlist.addMetadataToSong(fileId, null, null, md5);
        dmp.drive.saveTagsInProperty(fileId, null, null, md5);
        dmp.ui.displayID3Tags(fileId, null, null, fileName, null);
      }
  });
};

/**
 * Fetches and displays the ID3 tags for the given song. Also tries to
 * subsequently fetch the album cover using the LastFm API.
 *
 * @param{String} fileId The ID of the file.
 * @param{String} title Title of the song.
 * @param{String} artist Artist of the song.
 * @param{String} fileName The name of the file.
 * @param{String} albumCoverUrl The URL of the cover.
 */
dmp.ui.displayID3Tags = function(fileId, title, artist, fileName, albumCoverUrl) {
  if (artist && title) {
    $(".artist", $("#file-" + fileId)).text(artist);
    $(".title", $("#file-" + fileId)).text(title);
    if (albumCoverUrl) {
      $("#file-" + fileId).css("background-image", "url(" + albumCoverUrl + ")");
    }
  } else {
    $(".artist", $("#file-" + fileId)).text(fileName).addClass("noID3tags").attr("colspan", "2");
    $(".title", $("#file-" + fileId)).remove();
  }
};

// Toggles the Shuffle Button from On to Off.
dmp.ui.onShuffleOff = function(e) {
  $(".jp-shuffle-off").hide();
  $(".jp-shuffle").show();
};

// Toggles the Shuffle Button from Off to On.
dmp.ui.onShuffleOn = function(e) {
  $(".jp-shuffle").hide();
  $(".jp-shuffle-off").show();
};

//Toggles the Repeat Button.
dmp.ui.repeatToggle = function(e) {
  if ($(".jp-repeat-off").is(":visible")) {
    $(".jp-repeat-off").hide();
    $(".jp-repeat-all").show();
    $(".jp-repeat-one").hide();
  } else if ($(".jp-repeat-all").is(":visible")) {
    $(".jp-repeat-off").hide();
    $(".jp-repeat-all").hide();
    $(".jp-repeat-one").show();
  } else if ($(".jp-repeat-one").is(":visible")) {
    $(".jp-repeat-off").show();
    $(".jp-repeat-all").hide();
    $(".jp-repeat-one").hide();
  }
};

/**
 * Displays a message if the user does not have flash installed.
 *
 * @returns{boolean} True if the browser has flash installed.
 */
dmp.ui.detectFlash = function() {
  var hasFlash = false;
  try {
    hasFlash = swfobject.hasFlashPlayerVersion("1");
  } catch (e) {}
  return hasFlash;
};

// Loading tooltips.
$(function() {
  $(document).tooltip({
    position: {
      my: "center top+4",
      at: "center bottom",
      using: function(position, feedback) {
        $(this).css( position );
        $('<div>').addClass('arrow')
          .addClass(feedback.vertical)
          .addClass(feedback.horizontal)
          .appendTo(this);
      }
    }
  });
});
