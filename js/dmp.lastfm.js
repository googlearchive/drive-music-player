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
dmp.lastfm = dmp.lastfm || {};

/** The Key for the lastFM API. */
dmp.lastfm.LASTFM_API_KEY = "17c11c0b6f517f57b31d3bb701730a25";

// Lets pool the requests to the Last FM API to avoid users loading tons of file to kill the app quota.
dmp.lastfm.pool = [];
dmp.lastfm.poolCounter = 0;
dmp.lastfm.poolWaitTime = 1000;

dmp.lastfm.poolNext = function() {
  if (dmp.lastfm.pool.length > 0) {
    var songData = dmp.lastfm.pool.pop();
    dmp.lastfm.poolCounter++;
    var poolCallBack = function(coverUrl) {
      dmp.lastfm.poolCounter--;
      setTimeout(dmp.lastfm.poolNext, dmp.lastfm.poolWaitTime);
      songData.callback(coverUrl);
    };
    dmp.lastfm.fetchData(songData.title, songData.artist, poolCallBack);
  }
};

/**
 * Fetches the Song's cover from the Last.fm API and pass the URL of the song
 * cover to the callback.
 *
 * @param{String} title The title of the song.
 * @param{String} artist The artist of the song.
 * @param{function} callback The callback function to be called once we got the
 *                           URL of the album cover.
 */
dmp.lastfm.getAlbumCover = function(title, artist, callback) {
  dmp.lastfm.pool.push({title: title, artist: artist, callback: callback});
  if (dmp.lastfm.poolCounter == 0) {
    dmp.lastfm.poolNext();
  }
};


dmp.lastfm.fetchData = function(title, artist, callback) {
  title = title ? title : "";
  artist = artist ? artist : "";
  var url = "//ws.audioscrobbler.com/2.0/?method=track.search&track="
      + encodeURIComponent(title.trim()) + "&artist="
      + encodeURIComponent(artist.trim()) + "&api_key="
      + dmp.lastfm.LASTFM_API_KEY + "&format=json&limit=1";
  console.log("Getting info using LastFM API: ", url);
  $.ajax({
    url: url,
    dataType: "json",
    tryCount : 0,
    retryLimit : 2,
    success: function(data) {
      var albumUrl = null;
      if (data.results && data.results.trackmatches && data.results.trackmatches.track &&
          data.results.trackmatches.track[0] && data.results.trackmatches.track[0].image) {
        albumUrl = data.results.trackmatches.track[0].image[1]["#text"];
        if (albumUrl) {
          albumUrl = albumUrl.replace("http://", "//");
        }
      }
      console.log("Found album cover for ", title, " using LastFM API: ", albumUrl);
      if (callback) {
        callback(albumUrl);
      }
    },
    error: function() {
      this.tryCount++;
      if (this.tryCount <= this.retryLimit) {
          //try again
          $.ajax(this);
      } else {
        if (callback) {
          callback(null);
        }
      }
    }
  });
};
