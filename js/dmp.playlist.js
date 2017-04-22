/**
 * Copyright 2013 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Namespace initialization.
var dmp = dmp || {};
dmp.playlist = dmp.playlist || {};

/** The ID of the playlist Drive file. */
dmp.playlist.fileId = undefined;

/** Realtime List containing the list of audio files.
 * An audio file is described by an object with the following attributes:
 * id, title, artist, md5, filename */
dmp.playlist.audioList = [];

/** Name of the field containing the list of audio files. */
dmp.playlist.AUDIO_LIST_FIELD_NAME = "audioList";

/** Realtime String containing the currently playing song ID. */
dmp.playlist.currentSongId = undefined;

/** Name of the field containing the currently playing song ID. */
dmp.playlist.CURRENT_SONG_ID_FIELD_NAME = "currentSongId";

/** Shared name of the playlist. */
dmp.playlist.fileName = undefined;

/** Name of the field containing the Shared name of the playlist */
dmp.playlist.FILE_NAME_FIELD_NAME = "fileName";

/** Name of the newly created playlist. */
dmp.playlist.NEW_PLAYLIST_FILE_NAME = "New Playlist";

/** MIME type of the newly created playlist. */
dmp.playlist.PLAYLIST_MIME_TYPE = "application/vnd.google-apps.drive-sdk";

/** The currently opened Realtime document. */
dmp.playlist.realtimeDoc = undefined;

/** True if we're creating a ew playlist */
dmp.playlist.creatingNew = false;

/**
 * Creates a new Playlist file in Drive.
 */
dmp.playlist.createNewPlaylist = function() {
  dmp.playlist.creatingNew = true;
  $("#hiderTrans").show();
  gapi.client.load('drive', 'v2', function() {
    gapi.client.drive.files.insert({
      'resource': {
        mimeType: dmp.playlist.PLAYLIST_MIME_TYPE,
        title: dmp.playlist.NEW_PLAYLIST_FILE_NAME
      }
    }).execute(dmp.playlist.loadPlaylist);
  });

    if(ga) {
        ga('send', 'event', 'playlist', 'create');
    }
};


dmp.playlist.loadPlaylist = function(file) {
  dmp.playlist.fileId = file.id;
  $("#hiderTrans").show();
  gapi.load('drive-realtime', function() {
    dmp.playlist.fileId = file.id;
    gapi.drive.realtime.load(file.id,
        dmp.playlist.onPlaylistLoaded,
        dmp.playlist.initializeModel,
        dmp.playlist.handleErrors);
  });

    if (ga) {
        ga('send', 'event', 'playlist', 'load');
    }
};


/**
 * Handles errors thrown by the Realtime API.
 */
dmp.playlist.handleErrors = function(e) {
  if(e.type == gapi.drive.realtime.ErrorType.TOKEN_REFRESH_REQUIRED) {
    console.log("You have been signed out from your Google Account.");
  } else if(e.type == gapi.drive.realtime.ErrorType.NOT_FOUND) {
    alert("The file was not found. It does not exist or you do not have read access to the file.");
  } else {
      if(ga) {
          ga('send', 'event', 'playlist', 'unknown_error',
              e.type + " - " + e.message + " - isFatal:" + e.isFatal);
      }
      if (e.isFatal) {
          window.setTimeout(location.reload, 500);
      }
  }
};

/**
 * initializes the Realtime Model for new Playlists.
 */
dmp.playlist.initializeModel = function(model) {

  var audioList = model.createList();
  audioList.pushAll(dmp.playlist.getAudioList());
  model.getRoot().set(dmp.playlist.AUDIO_LIST_FIELD_NAME, audioList);

  var currentSongId = model.createString();
  currentSongId.setText(dmp.playlist.getCurrentSongId());
  model.getRoot().set(dmp.playlist.CURRENT_SONG_ID_FIELD_NAME, currentSongId);

  var fileName = model.createString();
  fileName.setText(dmp.playlist.NEW_PLAYLIST_FILE_NAME);
  model.getRoot().set(dmp.playlist.FILE_NAME_FIELD_NAME, fileName);
};

/**
 * initializes the Realtime Model for new Playlists.
 */
dmp.playlist.onPlaylistLoaded = function(doc) {
  dmp.playlist.realtimeDoc = doc;
  dmp.playlist.audioList = doc.getModel().getRoot().get(dmp.playlist.AUDIO_LIST_FIELD_NAME);
  dmp.playlist.fileName = doc.getModel().getRoot().get(dmp.playlist.FILE_NAME_FIELD_NAME);
  dmp.playlist.currentSongId = doc.getModel().getRoot().get(dmp.playlist.CURRENT_SONG_ID_FIELD_NAME);
  $("#playlistNameContainer").val(dmp.playlist.fileName.getText());
  if(dmp.playlist.creatingNew){
      dmp.playlist.creatingNew = false;
      $("#playlistNameContainer").focus();
      $("#playlistNameContainer").get(0).setSelectionRange(0, $("#playlistNameContainer").val().length);
  } else {
      //  Make sure the shared realtime file name is up to date.
      dmp.drive.getFileUrl(dmp.playlist.fileId, function(url, title) {
          dmp.playlist.fileName.setText(title);
          $("#playlistNameContainer").val(dmp.playlist.fileName.getText());
      });
  }
  dmp.ui.createSongEntries();
  dmp.player.playFile(dmp.playlist.getCurrentSongId());
  $("#playListControl").addClass("show");
  $("#hiderTrans").hide();
  dmp.ui.toggleEmptyPlaylist();
  dmp.url.makePrettyUrl();

};

/**
 * Changes the name of the Playlist Drive file.
 */
dmp.playlist.renamePlaylistFromInput = function() {
  $('#playlistNameContainer').attr('disabled', '');
  var body = {'title': $('#playlistNameContainer').val()};
  var renameRequest = gapi.client.drive.files.patch({
    'fileId' : dmp.playlist.fileId,
    'resource' : body
  });
  renameRequest.execute(function(resp) {
    $('#playlistNameContainer').val(resp.title);
    $('#playlistNameContainer').removeAttr('disabled');
    dmp.playlist.fileName.setText(resp.title);
  });

    if(ga) {
        ga('send', 'event', 'playlist', 'rename');
    }
};

/**
 * Stops using a playlist and reverts back to a regular list.
 */
dmp.playlist.closePlaylist = function() {
  $("#playListControl").removeClass("show");
  dmp.playlist.currentSongId = dmp.playlist.currentSongId.toString();
  dmp.playlist.audioList = dmp.playlist.audioList.asArray();
  dmp.playlist.fileId = undefined;
  dmp.playlist.fileName = undefined;
  dmp.playlist.realtimeDoc.close();
  dmp.playlist.realtimeDoc = undefined;
  dmp.url.makePrettyUrl();

    if(ga) {
        ga('send', 'event', 'playlist', 'close');
    }
};


// Accessors

dmp.playlist.getCurrentSongId = function() {
  if (dmp.playlist.currentSongId && dmp.playlist.currentSongId.toString) {
    return dmp.playlist.currentSongId.toString();
  } else if (dmp.playlist.currentSongId && dmp.playlist.currentSongId instanceof String) {
    return dmp.playlist.currentSongId;
  } else {
    return "";
  }
};

dmp.playlist.setCurrentSongId = function(newSongId) {
  if (dmp.playlist.currentSongId && dmp.playlist.currentSongId.setText) {
    dmp.playlist.currentSongId.setText(newSongId);
  } else {
    dmp.playlist.currentSongId = newSongId;
  }
};

dmp.playlist.getAudioList = function() {
  if (dmp.playlist.audioList && dmp.playlist.audioList.asArray) {
    return dmp.playlist.audioList.asArray();
  } else if (dmp.playlist.audioList) {
    return dmp.playlist.audioList;
  } else {
    return [];
  }
};

dmp.playlist.getCurrentSongIndex = function() {
  return dmp.playlist.getSongIndex(dmp.playlist.getCurrentSongId());
};

dmp.playlist.getSongIndex = function(songId) {
  if (!songId) {
    return -1;
  }
  var audioList = dmp.playlist.getAudioList();
  for (var index in audioList) {
    var songDetails = audioList[index];
    if (songId == songDetails.id) {
      return parseInt(index);
    }
  }
  return -1;
};

dmp.playlist.removeSong = function(songId) {
  var songIndex = dmp.playlist.getSongIndex(songId);
  if (songIndex != -1) {
    if (dmp.playlist.audioList && dmp.playlist.audioList.remove) {
      dmp.playlist.audioList.remove(songIndex);
    } else if (dmp.playlist.audioList && dmp.playlist.audioList.splice) {
      dmp.playlist.audioList.splice(songIndex, 1);
    }
  }
};

dmp.playlist.insertSong = function(index, songInfo) {
  if (dmp.playlist.audioList && dmp.playlist.audioList.insert) {
    dmp.playlist.audioList.insert(index, songInfo);
  } else if (dmp.playlist.audioList && dmp.playlist.audioList.splice) {
    dmp.playlist.audioList.splice(index, 0, songInfo);
  }
};

dmp.playlist.addMetadataToSong = function(songId, title, artist, md5) {
  var songIndex = dmp.playlist.getSongIndex(songId);
  if (dmp.playlist.audioList && dmp.playlist.audioList.get) {
    var song = {id: songId, title: title, artist: artist, md5: md5};
    dmp.playlist.audioList.set(songIndex, song);
  } else if (dmp.playlist.audioList && dmp.playlist.audioList instanceof Array) {
    var song = {id: songId, title: title, artist: artist, md5: md5};
    dmp.playlist.audioList[songIndex] = song;
  }
};

dmp.playlist.loadFolder = function(folderId) {
  dmp.drive.listFiles(folderId, function(items, err) {
    // Remove the folder in the URL to avoid double loading songs when re-loading.
    dmp.folderId = undefined;
    dmp.folderLabel = undefined;
    dmp.url.makePrettyUrl();
    if (err != null) {
      console.log("error:", err);
      return;
    }
    for (var i = 0; i < items.length; i++) {
      var id = items[i];
      console.log("Folder item:", id);
      dmp.playlist.audioList.push({id: id});
      dmp.ui.createSongEntry({id: id}, function() {
          dmp.playlist.removeSong(folderId);
          $("#file-" + folderId).remove();
          dmp.url.makePrettyUrl();
          if($("#jqueryPlayerContainer").data("jPlayer").status.waitForPlay) {
              dmp.player.playNext();
          }
      });
      dmp.ui.toggleEmptyPlaylist();
      dmp.url.makePrettyUrl();
    }
    if(items.length == 0) {
      dmp.playlist.removeSong(folderId);
      $("#file-" + folderId).remove();
      dmp.url.makePrettyUrl();
      dmp.ui.toggleEmptyPlaylist();
    }
  });
};
