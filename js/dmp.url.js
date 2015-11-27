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
dmp.url = dmp.url || {};

/**
 * Returns the value of the given URL parameter.
 *
 * @return{String} The value of the given URL parameter.
 */
dmp.url.getUrlParameter = function(name) {
  var params = location.search;
  var param = (new RegExp(name + '=' + '(.+?)(&|$)').exec(params)||[,null])[1];
  return (param ? decodeURIComponent(param) : param);
};

/**
 * Returns the value of the given Hash parameter.
 *
 * @return{String} The value of the given Hash parameter.
 */
dmp.url.getHashParameter = function(name) {
  var hash = window.location.hash;
  hash = hash.indexOf("#") == 0 ? hash.substr(1) : hash;
  var param = (new RegExp(name + '=' + '(.+?)(&|$)').exec(hash)||[,null])[1];
  return (param ? decodeURIComponent(param) : param);
};

/**
 * Extracts the File IDs from the State parameter.
 *
 * @return{Array<String>} The File IDs extracted from the state Hash parameter.
 */
dmp.url.getFileIdsFromStateParam = function() {
  var stateParamObj = dmp.url.stringToObject(dmp.url.getHashParameter("state"));
  if (stateParamObj && stateParamObj.ids) {
    console.log("Extracted the file IDs: ", stateParamObj.ids);
    return stateParamObj.ids;
  } else {
    console.log("Extracted the file IDs: ", []);
    return [];
  }
};

/**
 * Extracts the User ID from the State parameter.
 *
 * @return{String} The User ID extracted from the state Hash parameter.
 */
dmp.url.getUserIdFromStateParam = function() {
    var stateParamObj = dmp.url.stringToObject(dmp.url.getHashParameter("state"));
    if (stateParamObj && stateParamObj.userId) {
        console.log("Extracted the User ID: ", stateParamObj.userId);
        return stateParamObj.userId;
    } else {
        console.log("No user ID found.");
        return null;
    }
};

/**
 * When a user gets redirect from Google Drive to an app using the Create
 * menu Google Drive will pass the ID of the user in the State parameter
 * which will be a serialized JSON object. This functions extracts and
 * returns the User ID from such state parameter.
 *
 * @return{String} The ID of the user or undefined if it wasn't found.
 */
dmp.url.stringToObject = function(state) {
  try {
    return JSON.parse(state);
  } catch(e) {
    return undefined;
  }
};

/**
 * Updates the URL Hash portion so that it lists the file IDs and the User ID.
 */
dmp.url.makePrettyUrl = function() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState("Music Player for Google Drive", "Music Player for Google Drive", "./");
  }
  var hashParams = [];
  if (dmp.playlist.fileId) {
    hashParams.push("playlistId=" + dmp.playlist.fileId);
  } else if (dmp.playlist.audioList.length > 0) {
    var audioList = dmp.playlist.getAudioList();
    var ids = [];
    for (var index = 0; index < audioList.length; index++) {
      ids.push(audioList[index].id);
    }
    hashParams.push("fileIds=" + ids.join(','));
  }
  if (dmp.folderId) {
    hashParams.push("folderId=" + dmp.folderId);
  }
  if (dmp.auth.userId) {
    hashParams.push("userId=" + dmp.auth.userId);
  }
  var hashParamsString = hashParams.join('&');
  // Make sure we never get an empty Hash to avoid an IE crash on the page.
  if (!hashParamsString || hashParamsString == "") {
    hashParamsString = "empty";
  }
  window.location.hash = "#" + hashParamsString;
};
