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
dmp.player = dmp.player || {};


/**
 * Checks if the HTML5 player of the current browser can play most common file formats.
 */
dmp.player.html5PlayerIsWorking = function() {
  try {
    var html5Player = new Audio();
    return html5Player.canPlayType('audio/mpeg') && html5Player.canPlayType('audio/mp4');
  } catch (e) {
    // Starting an HTML5 player failed.
    return false;
  }
};

/**
 * Initializes the Player and starts playing if there is a song.
 */
dmp.player.hasFlash = false;
dmp.player.flash = "no_flash";
dmp.player.initPlayer = function() {
  var solution = "html";
  // In the HTML5 player support most formats (like Chrome) then we only use the HTML5 player and not the Flash player.
  if (swfobject.hasFlashPlayerVersion("9.0.0")) {
      dmp.player.flash = "flash_ok";
      dmp.player.hasFlash = true;
      solution = "html,flash";
  }
  // Show an error message after 1 second for users who have a flash blocker when we need flash.
  var flashBlockerDetectionTimer = window.setTimeout(function() {
      if(ga) {
        ga('send', 'event', 'error', 'show_flash_blocker');
      }
      $('#flashAlert').show();
    }, 1000);
  // Initialize the Player.
  $("#jqueryPlayerContainer").jPlayer({
      ended: dmp.player.playNext,
      swfPath: "/third-party/jplayer/js",
      errorAlerts: false,
      solution: solution,
      supplied: "mp3,m4a,wav,oga,webma,fla,flac",
      keyEnabled: true,
      preload:"auto",
      error: function(event) {
        // This works around a Chrome bug where long files stop playing/loading after some time.
        var time = $("#jqueryPlayerContainer").data("jPlayer").status.currentTime;
        if (time != 0) {
          dmp.player.playFile(dmp.playlist.getCurrentSongId(), undefined, time);
        } else {
          try {
            $(".artist", $("#file-" + dmp.playlist.getCurrentSongId()))
                .text("Sorry! We are unable to play this song. More...")
                .addClass("error").attr("colspan", "2")
                .attr("title", "Your browser might not support this audio format." +
                    (dmp.player.hasFlash ? "" : " Try installing Flash."));
              $(".title", $("#file-" + dmp.playlist.getCurrentSongId())).hide();

              // Tracking errors in GA.
              if(ga && dmp.player.currentMime.indexOf(dmp.playlist.PLAYLIST_MIME_TYPE) === -1 &&
                  dmp.player.currentMime !== dmp.drive.FOLDER_MIME_TYPE) {
                  if (dmp.player.currentExtenstion === undefined) {
                      ga('send', 'event', 'player', 'format_not_supported',
                          dmp.player.currentExtenstion +' - ' +
                          dmp.player.currentMime);
                  } else {
                      ga('send', 'event', 'player', 'format_not_supported',
                          dmp.player.currentExtenstion + ' - ' +
                          dmp.player.currentMime + ' - ' +
                          dmp.player.flash + ' - ' +
                          navigator.browserInfo.browser);
                  }
              }
            } catch (e) {}
        }
      },
      ready: function() {
        window.clearTimeout(flashBlockerDetectionTimer);
        $('#flashAlert').hide();
        // Start playing if we have songs.
        if (dmp.playlist.getAudioList().length > 0) {
          dmp.player.playNext();
        }
        // Removing the hider.
        $("#hider").hide();
      }
  });
};

/**
 * Depends on looping settings finds the ID of the next song to play and
 * plays it.
 *
 * @param{boolean} fromError true if the last song read resulted in an error and
 *     we immediately skipped it.
 */
dmp.player.playNext = function(e, fromError) {
  var playingIndex = dmp.playlist.getCurrentSongIndex();

  // True if we should stop becasue we are not repeating and we ended the last song of the playlist.
  var shouldStopAtTheEnd = (playingIndex == dmp.playlist.getAudioList().length - 1)
      && $(".jp-repeat-off").is(":visible")
      && (e && e.type != "keydown");

  // If we are not looping on the same song we find the next song's ID
  // If the event is from a keydown we force next song even if looping.
  if ((!($(".jp-repeat-one").is(":visible")) || (e && (e.type == "keydown" || e.type == "click"))) && dmp.playlist.getAudioList().length > 1) {
    if ($(".jp-shuffle").is(":visible")) {
      // In the case of shuffle (but not when using arrows to browse) we choose a random song.
      var nextRandomPlayingIndex = Math.floor(Math.random() * dmp.playlist.getAudioList().length);
      while (playingIndex === nextRandomPlayingIndex) {
        nextRandomPlayingIndex = Math.floor(Math.random() * dmp.playlist.getAudioList().length);
      }
      playingIndex = nextRandomPlayingIndex;
    } else {
      // We take the next song's ID or we go back to the start of the list.
      playingIndex = playingIndex == dmp.playlist.getAudioList().length - 1 ?
          0 : playingIndex + 1;
    }
    console.log("Next song index is: " + playingIndex);
    if (playingIndex == 0 && fromError) {
      $("#jqueryPlayerContainer").jPlayer("clearMedia");
      return;
    }
  } else {
    if (playingIndex == 0 && fromError) {
      $("#jqueryPlayerContainer").jPlayer("clearMedia");
      return;
    } else if(ga) {
      ga('send', 'event', 'player', 'replay');
    }
  }

  if (playingIndex == -1) {
    playingIndex = 0;
  }

  var nextSongInfo = dmp.playlist.getAudioList()[playingIndex];
  if (nextSongInfo) {
    console.log("Now playing song: " + JSON.stringify(nextSongInfo));
    dmp.player.playFile(nextSongInfo.id, shouldStopAtTheEnd);
  } else {
    dmp.playlist.setCurrentSongId("");
  }
};

/**
 * Depends on looping settings finds the ID of the next song to play and
 * plays it.
 *
 * @param{boolean} fromError true if the last song read resulted in an error and
 *     we immediately skipped it.
 */
dmp.player.playPrevious = function(e, fromError) {
  var playingIndex = dmp.playlist.getCurrentSongIndex();
  // If we are not looping on the same song we find the next song's ID or if the event is from a keydown.
  if ($(".jp-repeat").is(":visible") || e.type == "keydown" || e.type == "click") {
    // We take the next song's ID or we go back to the start of the list.
    playingIndex = playingIndex == 0 ?
        dmp.playlist.getAudioList().length - 1 : playingIndex - 1;
    console.log("Next song index is: " + playingIndex);
    if (playingIndex == 0 && fromError) {
      $("#jqueryPlayerContainer").jPlayer("clearMedia");
      return;
    }
  } else {
    if (playingIndex == 0 && fromError) {
      $("#jqueryPlayerContainer").jPlayer("clearMedia");
      return;
    }
  }
  var nextSongInfo = dmp.playlist.getAudioList()[playingIndex];
  if (nextSongInfo) {
    console.log("Now playing song: " + nextSongInfo);
    dmp.player.playFile(nextSongInfo.id);
  } else {
    dmp.playlist.setCurrentSongId("");
  }
};

/**
 * Plays the song of the given ID.
 */
dmp.player.currentlyLoaded = undefined;
dmp.player.currentExtenstion = undefined;
dmp.player.currentMime = undefined;
dmp.player.playFile = function(songId, stop, tracktime) {
  dmp.playlist.setCurrentSongId(songId);
  dmp.drive.getFileUrl(songId,
      function(fileUrl, fileName, error, fileExtension, isFolder, thumb, md5, isPlaylist, mimeType) {
        if (error) {
          dmp.player.playNext(null, true);
        } else if(isFolder) {
            // Do nothing as if it is a folder we're likely to be currently loading its children.
        } else if(isPlaylist) {
          // Do nothing as if it is a playlist we're likely to be currently loading its children.
        } else {
          $(".playing").removeClass("playing");
          $("#file-" + songId).addClass("playing");
          if (dmp.player.currentlyLoaded != fileUrl) {
            var setMediaValue = {};
            fileExtension = fileExtension.toLowerCase();
            // map some extensions
            var extensionMapping = {
                "ogg":"oga",
                "ogv":"oga",
                "webm":"webma",
                "mp4":"m4a",
                "m4b":"m4a",
                "m4r":"m4a",
                "m4v":"m4a",
                "wave":"wav",
                "flv":"fla",
                "f4v":"fla",
                "f4p":"fla",
                "f4a":"fla",
                "f4b":"fla"
            };

            var mimeMapping = {
                "audio/mpeg3":"mp3",
                "audio/x-mpeg-3":"mp3",
                "audio/mp3":"mp3",
                "audio/mpeg":"mp3",
                "audio/mp4":"m4a",
                "audio/mpg":"mp3",
                "audio/mp4a-latm":"m4a",
                "audio/ogg":"oga",
                "application/ogg":"oga",
                "audio/webm":"webma",
                "audio/wav":"wav",
                "audio/x-wav":"wav",
                "audio/wave":"wav",
                "audio/x-flv":"fla",
                "audio/x-flac":"flac",
                "video/mp4":"m4a",
                "video/x-mpeg":"m4a",
                "video/webm":"webma",
                "video/x-flv":"fla"
            };

            if (extensionMapping[fileExtension]) {
              fileExtension = extensionMapping[fileExtension];
            }
            if (!fileExtension) {
              fileExtension = mimeMapping[mimeType];
            }

            if(ga) {
              if(!fileExtension) {
                ga('send', 'event', 'player', 'play', "mime: " + mimeType);
              } else {
                ga('send', 'event', 'player', 'play', fileExtension);
              }
            }

            setMediaValue[fileExtension] = fileUrl;
            dmp.player.currentlyLoaded = fileUrl;
            dmp.player.currentExtenstion = fileExtension;
            dmp.player.currentMime = mimeType;
            $("#jqueryPlayerContainer").jPlayer("setMedia", setMediaValue);
          }

          if (stop) {
            $("#jqueryPlayerContainer").jPlayer("stop");
          } else if (tracktime) {
            $("#jqueryPlayerContainer").jPlayer("play", tracktime);
          } else{
            $("#jqueryPlayerContainer").jPlayer("play");
          }
        }
      }
  );
};

// Key binding shortcuts
$(document).keydown(function(e) {
  // Right arrow key.
  if (e.keyCode == 39) {
      if(ga) {
          ga('send', 'event', 'player', 'next_key');
      }
    dmp.player.playNext(e);
    return false;
  }
  // Left arrow key.
  if (e.keyCode == 37) {
      if(ga) {
          ga('send', 'event', 'player', 'previous_key');
      }
    dmp.player.playPrevious(e);
    return false;
  }
});
