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
dmp.drive = dmp.drive || {};

/** MIME-Type for folders in Drive. */
dmp.drive.FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Lists the children of the given folder. Then calls the callback.
 *
 * @param{String} folderId The ID of the folder to list.
 * @param{function} callback The callback function that will be called
 *    when the folder has been listed. This function should have 1
 *    parameter which will be an array of file IDs. The second argument
 *    is an error object, which will be non-null if something goes wrong.
 * @param{int} retryCounter OPTIONAL. Number of times this function call has
 *    been retried previously call.
 * @param{Array<String>} items OPTIONAL. Items from previous folders to concatenate.
 * @param{Array<String>} folders OPTIONAL. ID of further folders to explore.
 */
dmp.drive.listFiles = function(folderId, callback, retryCounter, items, folders) {
  if(!items) {
      items = [];
  }
  if(!folders) {
      folders = [];
  }
  gapi.client.load('drive', 'v2', function() {
    gapi.client.drive.files.list({'q': "'"+folderId+"' in parents and trashed=false",'fields':'items(id, mimeType)'}).execute(function(resp){
      // We got an error object back so we can check it out.
      if (resp && resp.error) {
        console.log("Error while listing files: ", resp.error);
        // If the issue is that auth has expired we refresh and retry.
        if (resp.error.code == 401
            && resp.error.data[0].reason == "authError"
            && (retryCounter ? retryCounter == 0 : true)) {
          console.log("You have been signed out from your Google Account.");
        // For any other errors we retry once.
        } else if (!retryCounter || retryCounter == 0) {
          dmp.drive.listFiles(folderId, callback, 1, items, folders);
        // For any other errors and we already retried we call the callback.
        } else {
          callback(null, resp.error);
        }
      // We have a good response
      } else if (resp && resp.items) {
        console.log("Got items:", resp.items);
        for (var index in resp.items) {
            var item = resp.items[index];
            if (item.mimeType === dmp.drive.FOLDER_MIME_TYPE) {
                folders.push(item.id);
            } else {
                items.push(item.id);
            }
        }
        if (folders.length > 0) {
            folderId = folders.pop();
            dmp.drive.listFiles(folderId, callback, 0, items, folders);
        } else {
            callback(items, null);
        }
      // The return object has no items, maybe it's an error so we retry.
      } else if (!retryCounter || retryCounter == 0){
        dmp.drive.listFiles(folderId, callback, 1, items, folders);
      // We already retried so we simply call the callback with an error.
      } else {
        callback(null, {'message': 'Failed to list children of ' + folderId + ', already retried'});
      }
    });
  });
};

/**
 * Fetches the URL of the file of the given File Id. Then calls the
 * callback.
 *
 * @param{String} fileId The ID of the file from which to find the song.
 * @param{function} callback The callback function that will be called
 *    when the file URL has been fetched. This function should have 1
 *    parameter which will be the file's URL or an error object if
 *    something went wrong. The second argument is the file name.
 * @param{int} retryCounter OPTIONAL. Number of times this function call has
 *    been retried previously call.
 */
dmp.drive.getFileUrl = function(fileId, callback, retryCounter) {
  gapi.client.load('drive', 'v2', function() {
    gapi.client.drive.files.get({'fileId': fileId}).execute(function(resp){
      // We got an error object back so we can check it out.
      if (resp && resp.error) {
        console.log("Error while fetching the file's metadata: "
            + resp.error.message);
        // If the issue is that auth has expired we refresh and retry.
        if (resp.error.code == 401
            && resp.error.data[0].reason == "authError"
            && (retryCounter ? retryCounter == 0 : true)) {
          console.log("You have been signed out from your Google Account.");
        // For any other errors we retry once.
        } else if (!retryCounter || retryCounter == 0) {
          dmp.drive.getFileUrl(fileId, callback, 1);
        // For any other errors and we already retried we call the callback.
        } else {
          callback(null, null, resp.error, null, false, null, null, false);
        }
      // We have a good response
      } else if (resp && resp.title) {
        console.log("Got the File's URL: ", resp.downloadUrl);
        var authedCallbackUrl = resp.downloadUrl + "&access_token="
            + encodeURIComponent(dmp.getAccessToken());
        console.log("File's URL w/ auth: ", authedCallbackUrl);
        console.log("File's Data: ", resp);
        callback(authedCallbackUrl,
            resp.title,
            null,
            resp.fileExtension,
            resp.mimeType == dmp.drive.FOLDER_MIME_TYPE,
            resp.thumbnailLink,
            resp.md5Checksum,
            resp.mimeType == (dmp.playlist.PLAYLIST_MIME_TYPE + "." + dmp.APPLICATION_ID),
            resp.mimeType);
      // The return object has no title, maybe it;s an error so we retry.
      } else if (!retryCounter || retryCounter == 0){
        dmp.drive.getFileUrl(fileId, callback, 1);
      // We already retried so we simply call the callback with an error.
      } else {
        callback(null, null, {}, null, false, null, null, false);
      }
    });
  });
};

dmp.drive.aboutGet = function(callback, retryCounter) {
  gapi.client.load('drive', 'v2', function() {
    gapi.client.drive.about.get({'fields': "user/emailAddress"}).execute(function(resp){
      // We got an error object back so we can check it out.
      if (resp && resp.error) {
        console.log("Error while fetching about: ", resp.error);
        // If the issue is that auth has expired we refresh and retry.
        if (resp.error.code == 401
            && resp.error.data[0].reason == "authError"
            && (retryCounter ? retryCounter == 0 : true)) {
          console.log("You have been signed out from your Google Account.");
        // For any other errors we retry once.
        } else if (!retryCounter || retryCounter == 0) {
          dmp.drive.aboutGet(callback, 1);
        // For any other errors and we already retried we call the callback.
        } else {
          callback(null, resp.error);
        }
      // We have a good response
      } else if (resp && resp.user) {
        console.log("Got user: ", resp.user);
        callback(resp.user, null);
      // The return object has no user, maybe it's an error so we retry.
      } else if (!retryCounter || retryCounter == 0){
        dmp.drive.aboutGet(callback, 1);
      // We already retried so we simply call the callback with an error.
      } else {
        callback(null, {});
      }
    });
  });
};

// WILL NOT WORK IF CROSS ORIGIN IS NOT ENABLED ON THE IMAGE URL.
dmp.drive.uploadThumbnailFromUrl = function(fileId, albumUrl) {

  // Saving Thumb URL to properties because it can't be saved as base 64 due to XHR issues.
  gapi.client.load('drive', 'v2', function() {
    var body = {
      'key' : 'albumCoverUrl',
      'value' : albumUrl,
      'visibility' : 'PUBLIC'
    };
    var request = gapi.client.drive.properties.insert({
      'fileId' : fileId,
      'resource' : body
    });
    request.execute(function(resp) {
      if (resp.error) {
        console.log(resp.error);
        console.log(body);
      }
    });
  });

  // Trying to save the content of the image in case XHR works one day.
  if (document.images) {
    var img = new Image();
    img.src = albumUrl;
    img.onload = function() {
      try {
        var base64Pic = getBase64FromImTag(img);
        dmp.drive.uploadThumbnail(fileId, 'image/png', base64Pic);
      } catch (e) {}
    };
  }
};

function getBase64FromImTag(img) {
  // Create an empty canvas element
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  // Copy the image contents to the canvas
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // Get the data-URL formatted image
  // Firefox supports PNG and JPEG. You could check img.src to
  // guess the original format, but be aware the using "image/jpg"
  // will re-encode the image.
  var dataURL = canvas.toDataURL("image/png");

  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

dmp.drive.uploadThumbnail = function(fileId, mimetype, base64Pic, retry){
  gapi.client.load('drive', 'v2', function() {
    var urlSafeBase64Image =  dmp.drive.base64toBase64Url(base64Pic);
    var body = {'thumbnail': {'image': urlSafeBase64Image, 'mimeType': mimetype}};
    gapi.client.drive.files.patch({'fileId': fileId, 'resource': body}).execute(function(resp){
      if (!retry) {
        // We have to upload the thumb twice because of a bug in Google Drive. Will remove when fixed.
        dmp.drive.uploadThumbnail(fileId, mimetype, base64Pic, true);
      }
    });
  });
};


dmp.drive.base64toBase64Url = function(base64) {
  return base64.replace(/\+/g,'-').replace(/\//g,'_');
};

dmp.drive.saveTagsInProperty = function(fileId, title, artist, md5) {
  gapi.client.load('drive', 'v2', function() {
    var body = {
      'key' : 'md5',
      'value' : md5,
      'visibility' : 'PRIVATE'
    };
    var request = gapi.client.drive.properties.insert({
      'fileId' : fileId,
      'resource' : body
    });
    request.execute(function(resp) {
      if (resp.error) {
        console.log(resp.error);
        console.log(body);
      }
    });

    var body = {
      'key' : 'songTitle',
      'value' : title,
      'visibility' : 'PUBLIC'
    };
    var request = gapi.client.drive.properties.insert({
      'fileId' : fileId,
      'resource' : body
    });
    request.execute(function(resp) {
      if (resp.error) {
        console.log(resp.error);
        console.log(body);
      }
    });

    var body = {
      'key' : 'songArtist',
      'value' : artist,
      'visibility' : 'PUBLIC'
    };
    var request = gapi.client.drive.properties.insert({
      'fileId' : fileId,
      'resource' : body
    });
    request.execute(function(resp) {
      if (resp.error) {
        console.log(resp.error);
        console.log(body);
      }
    });
  });
};

dmp.drive.readTagsFromProperty = function(fileId, callback) {
  gapi.client.load('drive', 'v2', function() {
    var request = gapi.client.drive.properties.list({
      'fileId' : fileId
    });
    request.execute(function(resp) {
      if (!resp.items) {
        callback(null, null, null);
        if (resp.error) {
          console.log(resp.error);
        }
      } else {
        var title = null;
        var artist = null;
        var md5 = null;
        var coverUrl = null;
        for(var index in resp.items) {
          if (resp.items[index] && resp.items[index].key) {
            if (resp.items[index].key == "md5") {
              md5 = resp.items[index].value;
            } else if (resp.items[index].key == "songTitle") {
              title = resp.items[index].value;
            } else if (resp.items[index].key == "songArtist") {
              artist = resp.items[index].value;
            } else if (resp.items[index].key == "albumCoverUrl") {
              coverUrl = resp.items[index].value;
            }
          }
        }
        callback(title, artist, md5, coverUrl);
      }
    });
  });
};
