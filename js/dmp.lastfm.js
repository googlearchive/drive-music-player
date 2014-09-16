// Copyright 2013 Nicolas Garnier (nivco.las@gmail.com). All Rights Reserved.

// Namespace initialization.
var dmp = dmp || {};
dmp.lastfm = dmp.lastfm || {};

/** The Key for the lastFM API. */
dmp.lastfm.LASTFM_API_KEY = "17c11c0b6f517f57b31d3bb701730a25";

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
  var url = "http://ws.audioscrobbler.com/2.0/?method=track.search&track="
      + encodeURIComponent(title) + "&artist="
      + encodeURIComponent(artist) + "&api_key="
      + dmp.lastfm.LASTFM_API_KEY + "&format=json&limit=1";
  $.ajax({
    url: url,
    dataType: "json",
    tryCount : 0,
    retryLimit : 2,
    success: function(data){
      albumUrl = null;
      if (data.results
          && parseInt(data.results["opensearch:totalResults"]) > 0) {
        if (data.results.trackmatches.track.image) {
          albumUrl = data.results.trackmatches.track.image[1]["#text"];
        }
      }
      if (callback) {
        callback(albumUrl);
      }
    },
    error: function() {
      this.tryCount++;
      if (this.tryCount <= this.retryLimit) {
          //try again
          $.ajax(this);
          return;
      } else {
        if (callback) {
          callback(null);
        }            
      }            
      return;
    }
  });
};
